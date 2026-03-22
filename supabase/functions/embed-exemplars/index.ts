// Embed Exemplars Edge Function
// Generates vector embeddings for exemplars and anti-exemplars that don't have them yet.
// Run on-demand or schedule after Phase 3 migration (002_pgvector.sql).
//
// Deploy: supabase functions deploy embed-exemplars
// Trigger manually: POST https://<project-ref>.supabase.co/functions/v1/embed-exemplars

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings'
const EMBED_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 50

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!

  let embedded = 0

  // Embed exemplars without embeddings
  const { data: exemplars } = await supabase
    .from('exemplars')
    .select('id, brief, output')
    .is('embedding', null)
    .limit(BATCH_SIZE)

  for (const ex of (exemplars || [])) {
    const text = `Brief: ${ex.brief}\n\nOutput: ${ex.output}`
    const embedding = await getEmbedding(text, openaiKey)
    if (embedding) {
      await supabase.from('exemplars').update({ embedding }).eq('id', ex.id)
      embedded++
    }
  }

  // Embed anti-exemplars without embeddings
  const { data: antiExemplars } = await supabase
    .from('anti_exemplars')
    .select('id, brief, output')
    .is('embedding', null)
    .limit(BATCH_SIZE)

  for (const ex of (antiExemplars || [])) {
    const text = `Brief: ${ex.brief}\n\nOutput: ${ex.output}`
    const embedding = await getEmbedding(text, openaiKey)
    if (embedding) {
      await supabase.from('anti_exemplars').update({ embedding }).eq('id', ex.id)
      embedded++
    }
  }

  return new Response(JSON.stringify({ message: 'Embedding complete', embedded }))
})

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  const response = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
    }),
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.data?.[0]?.embedding ?? null
}
