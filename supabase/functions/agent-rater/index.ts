// Agent Rater Edge Function
// Triggered by pg_cron every 30 minutes.
// Batches unrated generations and runs all 5 agents in parallel.
//
// Deploy: supabase functions deploy agent-rater
// Schedule: select cron.schedule('rate-generations', '*/30 * * * *', $$
//   select net.http_post(
//     url := 'https://<project-ref>.supabase.co/functions/v1/agent-rater',
//     headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
//   );
// $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const BATCH_SIZE = 20
const EXEMPLAR_THRESHOLD = 4.0
const ANTI_EXEMPLAR_THRESHOLD = 2.0
const MIN_AGENT_VOTES_FOR_AUTO_QUEUE = 3

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!

  // 1. Fetch active agent raters
  const { data: agents, error: agentsErr } = await supabase
    .from('agent_raters')
    .select('*')
    .eq('active', true)

  if (agentsErr || !agents?.length) {
    return new Response(JSON.stringify({ error: 'No active agents', detail: agentsErr }), { status: 500 })
  }

  // 2. Fetch unrated generations (no agent ratings yet, older than 10 minutes)
  const { data: generations, error: genErr } = await supabase
    .from('generations')
    .select(`
      id, brand, task_type, brief, output,
      ratings!left(id, rater_type)
    `)
    .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (genErr) {
    return new Response(JSON.stringify({ error: 'Failed to fetch generations', detail: genErr }), { status: 500 })
  }

  // Filter to only generations with 0 agent ratings
  const unrated = (generations || []).filter((g: any) => {
    const agentRatings = (g.ratings || []).filter((r: any) => r.rater_type === 'agent')
    return agentRatings.length === 0
  })

  if (unrated.length === 0) {
    return new Response(JSON.stringify({ message: 'No unrated generations', processed: 0 }))
  }

  // 3. For each generation, run all agents in parallel
  const results = await Promise.allSettled(
    unrated.map(async (gen: any) => {
      const agentResults = await Promise.allSettled(
        agents.map(async (agent: any) => {
          const rating = await callAgent(agent, gen, openaiKey)
          if (!rating) return null

          // Find or create agent user
          const agentUserId = await ensureAgentUser(supabase, agent.name)

          // Compute weighted overall for this agent
          const scores = {
            hook: rating.score_hook,
            specificity: rating.score_specificity,
            voice_fit: rating.score_voice_fit,
            tension: rating.score_tension,
            originality: rating.score_originality,
          }
          const overall = computeWeightedOverall(scores, agent)

          await supabase.from('ratings').insert({
            generation_id: gen.id,
            rater_id: agentUserId,
            rater_type: 'agent',
            agent_name: agent.name,
            score_hook: rating.score_hook,
            score_specificity: rating.score_specificity,
            score_voice_fit: rating.score_voice_fit,
            score_tension: rating.score_tension,
            score_originality: rating.score_originality,
            overall,
            notes: rating.notes,
          })

          return { agentName: agent.name, overall, scores, notes: rating.notes }
        })
      )

      const successfulRatings = agentResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)

      if (successfulRatings.length >= MIN_AGENT_VOTES_FOR_AUTO_QUEUE) {
        // Recompute weighted overall across all agent votes using view
        const { data: viewData } = await supabase
          .from('generation_weighted_scores')
          .select('weighted_overall, human_rating_count')
          .eq('generation_id', gen.id)
          .single()

        const weightedOverall = viewData?.weighted_overall
        const humanCount = viewData?.human_rating_count || 0

        if (weightedOverall != null && humanCount === 0) {
          if (weightedOverall >= EXEMPLAR_THRESHOLD) {
            await supabase.from('review_queue').upsert({
              generation_id: gen.id,
              queue_type: 'exemplar',
              agent_votes: successfulRatings,
              status: 'pending',
            }, { onConflict: 'generation_id' })
          } else if (weightedOverall <= ANTI_EXEMPLAR_THRESHOLD) {
            await supabase.from('review_queue').upsert({
              generation_id: gen.id,
              queue_type: 'anti_exemplar',
              agent_votes: successfulRatings,
              status: 'pending',
            }, { onConflict: 'generation_id' })
          }
        }
      }

      return { generationId: gen.id, agentsRan: successfulRatings.length }
    })
  )

  const processed = results.filter(r => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ message: 'Done', processed, total: unrated.length }))
})

async function callAgent(agent: any, gen: any, openaiKey: string): Promise<any> {
  const userMessage = `Brief: ${gen.brief}\n\nOutput:\n${gen.output}`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: agent.model,
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) return null

  try {
    const parsed = JSON.parse(content)
    // Validate all keys present
    if (!('score_hook' in parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function computeWeightedOverall(scores: Record<string, number | null>, agent: any): number | null {
  const weightMap: Record<string, number> = {
    hook: agent.weight_hook,
    specificity: agent.weight_specificity,
    voice_fit: agent.weight_voice_fit,
    tension: agent.weight_tension,
    originality: agent.weight_originality,
  }

  let weightedSum = 0
  let totalWeight = 0
  for (const [dim, score] of Object.entries(scores)) {
    if (score != null) {
      const weight = weightMap[dim] ?? 1
      weightedSum += score * weight
      totalWeight += weight
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null
}

// Cache of agent name → user id to avoid repeated inserts
const agentUserCache: Record<string, string> = {}

async function ensureAgentUser(supabase: any, agentName: string): Promise<string> {
  if (agentUserCache[agentName]) return agentUserCache[agentName]

  const nickname = `agent_${agentName.toLowerCase().replace(/\s+/g, '_')}`

  // Try to find existing agent user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname)
    .single()

  if (existing?.id) {
    agentUserCache[agentName] = existing.id
    return existing.id
  }

  // Create agent user with vote_weight = 1.0
  const { data: created } = await supabase
    .from('users')
    .insert({ nickname, role: 'anonymous', vote_weight: 1.0 })
    .select('id')
    .single()

  agentUserCache[agentName] = created.id
  return created.id
}
