// Prof Bee Copywriting Agent v1.1
// OpenAI API | Single-file React app | window.localStorage as storage

const { useState, useEffect, useCallback, useRef } = React;

// ─── Config (centralized in .env) ───────────────────────────────────────────
// API key is entered via GUI (session-only, never persisted).
// Model name is set in .env as VITE_OPENAI_MODEL (for bundler builds)
// or via window.__PROFBEE_MODEL__ (injected by server). Falls back to 'gpt-4o'.
const ENV_MODEL = (typeof window !== 'undefined' && window.__PROFBEE_MODEL__)
  || 'gpt-4o';

// ─── Storage helpers ─────────────────────────────────────────────────────────
const storage = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} }
};

const getExemplars = (brand, task) => storage.get(`exemplars:${brand}:${task}`) || [];
const setExemplars = (brand, task, arr) => storage.set(`exemplars:${brand}:${task}`, arr);
const getCorrections = (brand, task) => storage.get(`corrections:${brand}:${task}`) || [];
const setCorrections = (brand, task, arr) => storage.set(`corrections:${brand}:${task}`, arr);
const getAlwaysRules = () => storage.get('rules:always') || [];
const setAlwaysRules = (arr) => storage.set('rules:always', arr);
const getTaskRules = (task) => storage.get(`rules:${task}`) || [];
const setTaskRules = (task, arr) => storage.set(`rules:${task}`, arr);
const getVersionLog = () => storage.get('system_prompt:version_log') || [];
const setVersionLog = (arr) => storage.set('system_prompt:version_log', arr);

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Constants ───────────────────────────────────────────────────────────────
const BRANDS = [
  { id: 'profbee', label: 'Professor Bee', short: 'Prof Bee' },
  { id: 'wnr', label: 'Walden & Rooz', short: 'WnR' },
  { id: 'nctr', label: 'NCTR', short: 'NCTR' }
];

const TASKS = [
  { id: 'ig_caption', label: 'IG Caption' },
  { id: 'tiktok_caption', label: 'TikTok Caption' },
  { id: 'ad_copy', label: 'Ad Copy' },
  { id: 'video_script', label: 'Video Script' },
  { id: 'product_desc', label: 'Product Desc' },
  { id: 'email', label: 'Email' }
];

const TASK_LABELS = Object.fromEntries(TASKS.map(t => [t.id, t.label]));
const BRAND_LABELS = Object.fromEntries(BRANDS.map(b => [b.id, b.label]));

// ─── Base system prompt ───────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are a copywriting agent for Prof Bee Holding, an Indonesian honey company operating three distinct brands. You write copy that is precise, specific, and commercially grounded. You never write generic health claims without support. You never blend brand voices. You do not use filler enthusiasm.

---

BRAND CONTEXT

PROFESSOR BEE
Role: Category educator and trust layer. Decodes honey for the urban educated class.
Tone: Scientific, clear, confident without chest-thumping. Like a careful teacher, not an angry whistleblower. The word "decode" is central to this brand.
Content jobs: category decoding, myth busting, sensory education, sourcing transparency, consumer literacy, industry reform framing.
What to avoid: cheap promotional behavior, overselling, jargon overload, preachy tone.

WALDEN & ROOZ (WnR)
Role: Premium craft honey brand. Turns honey into a refined, sensory, giftable experience.
Tone: Calm, assured, tasteful, reverent, quiet status. Like how someone talks about fine wine or single-origin coffee, not how they sell supplements.
Content jobs: sensory storytelling (aroma, nectar source, color, mouthfeel, finish), provenance and place, batch individuality, ritual and use context, packaging as object, craft legitimacy.
Hard constraints: NEVER blend voices with NCTR. NEVER make health claims without support. WnR honey is strictly single-origin, never blended. Do not imply otherwise.
Variants: Acacia, Mango, Rambutan, Signature. Each has distinct flavor profile.
Price range: 220,000–450,000 IDR per jar. Target: discerning Jakarta buyers, gifting.
What to avoid: mass-market tone, discount energy, generic health clichés, loud CTAs.

NCTR
Role: Everyday mass-market honey platform. Useful, practical, scalable.
Tone: Simple, energetic, useful. The buyer should think: "This fits my life."
Content jobs: use-case education, problem-solution framing, before-after narratives, habit formation, family relevance, practical offers, social proof from everyday users.
Channels: TikTok-first for content, marketplaces (Tokopedia/Shopee), affiliates.
Price range: 110,000–140,000 IDR per jar.
Segments: Active/runners, cooking/F&B, daily households, moms, youth.
What to avoid: vague lofty language, over-aesthetic content, WnR tone.

---

BRAND DISTINCTION TEST
If the copy could belong to any of the three brands, it has failed.
Each piece of copy must be answerable: which brand customer question does this answer?
- Professor Bee answers: "Can I trust what I am being told about honey?"
- WnR answers: "What does excellent honey look and feel like?"
- NCTR answers: "How does honey help me in real daily life?"

---

INDONESIAN MARKET GROUND TRUTH
- Indonesian consumers do not gather organically. They require deliberate shepherding.
- Cheap-feeling campaigns are ignored regardless of message quality.
- Being "part of something" must feel costly and exclusive to be valued (WnR).
- Generic health claims are tuned out. Specific sensory and use-case claims land.
- The core WnR consumer insight: "aku baru tau madu ada rasanya" — provocation-first, not education-first. Make people feel they have been missing something.

---

PLATFORM NOTES
- WnR is IG-first. Copy should suit static image captions: atmosphere over urgency.
- NCTR is TikTok-first. Copy should hook in the first line. Energy, not elegance.
- IG captions and TikTok captions are different tasks. Do not write one as the other.

---

OUTPUT FORMAT
Return only the requested copy. No preamble, no explanation, no meta-commentary.
If you need to ask a clarifying question, ask it before writing, not after.
Write in the language specified in the brief (default: Indonesian unless stated otherwise).`;

// ─── Assemble full system prompt ──────────────────────────────────────────────
function assembleSystemPrompt(brand, task) {
  let prompt = BASE_SYSTEM_PROMPT;

  const alwaysRules = getAlwaysRules();
  if (alwaysRules.length > 0) {
    prompt += '\n\n---\n\nHARD RULES (always apply):\n';
    alwaysRules.forEach(r => { prompt += `- ${r.text}\n`; });
  }

  const taskRules = getTaskRules(task);
  if (taskRules.length > 0) {
    prompt += `\n\nRULES FOR THIS TASK TYPE (${TASK_LABELS[task]}):\n`;
    taskRules.forEach(r => { prompt += `- ${r.text}\n`; });
  }

  const exemplars = getExemplars(brand, task)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  if (exemplars.length > 0) {
    prompt += `\n\nEXEMPLARS FOR THIS BRAND + TASK (match this quality):\n`;
    exemplars.forEach((ex, i) => {
      prompt += `\nExemplar ${i + 1} [rating: ${ex.rating}/5]:\nBrief: ${ex.input_brief}\nOutput: ${ex.output}\n`;
    });
  }

  return prompt;
}

// ─── OpenAI API call ──────────────────────────────────────────────────────────
async function callOpenAI(apiKey, model, systemPrompt, userBrief) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userBrief }
      ]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Small shared components ──────────────────────────────────────────────────
function Btn({ onClick, children, variant = 'primary', className = '', disabled = false, small = false }) {
  const base = `font-medium transition-colors cursor-pointer border ${small ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;
  const variants = {
    primary: 'bg-amber-700 border-amber-600 text-amber-50 hover:bg-amber-600',
    ghost: 'bg-transparent border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100',
    danger: 'bg-transparent border-red-800 text-red-400 hover:bg-red-900 hover:text-red-200',
    amber: 'bg-transparent border-amber-700 text-amber-500 hover:bg-amber-900 hover:text-amber-300'
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
    >{children}</button>
  );
}

function Card({ children, className = '' }) {
  return <div className={`border border-stone-700 bg-stone-900 p-4 ${className}`}>{children}</div>;
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-medium text-stone-400 mb-1 uppercase tracking-wide">
      {children}{required && <span className="text-amber-500 ml-1">*</span>}
    </label>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4, mono = false, className = '' }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 text-sm placeholder-stone-500 focus:border-amber-700 ${mono ? 'mono' : ''} ${className}`}
    />
  );
}

function Stars({ rating, onRate, size = 'text-4xl' }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${size} select-none cursor-pointer transition-colors`}
          style={{ color: n <= (hover || rating) ? '#c8860a' : '#3a3028' }}
          onMouseEnter={() => setHover(n)}
          onClick={() => onRate(n)}
        >★</span>
      ))}
    </div>
  );
}

function TagBrand({ brand }) {
  const colors = { profbee: 'text-green-400 border-green-800', wnr: 'text-purple-300 border-purple-800', nctr: 'text-amber-400 border-amber-800' };
  return (
    <span className={`text-xs border px-2 py-0.5 mono ${colors[brand] || 'text-stone-400 border-stone-700'}`}>
      {BRAND_LABELS[brand] || brand}
    </span>
  );
}

function TagTask({ task }) {
  return <span className="text-xs border border-stone-700 text-stone-400 px-2 py-0.5 mono">{TASK_LABELS[task] || task}</span>;
}

// ─── Brand segmented control ──────────────────────────────────────────────────
function BrandSelector({ value, onChange }) {
  const styles = {
    profbee: { base: 'brand-profbee', label: 'Professor Bee', sub: 'educator · trust' },
    wnr: { base: 'brand-wnr', label: 'Walden & Rooz', sub: 'craft · sensory' },
    nctr: { base: 'brand-nctr', label: 'NCTR', sub: 'everyday · scale' }
  };
  return (
    <div className="flex gap-2">
      {BRANDS.map(b => {
        const s = styles[b.id];
        const active = value === b.id;
        return (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            className={`flex-1 border px-3 py-3 text-left transition-colors cursor-pointer bg-transparent border-stone-700 text-stone-400 ${s.base} ${active ? 'active' : 'hover:text-stone-200'}`}
          >
            <div className={`text-xs font-semibold ${b.id === 'nctr' ? 'font-bold tracking-wide' : ''}`}>{s.label}</div>
            <div className="text-xs opacity-60 mt-0.5">{s.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Task segmented control ───────────────────────────────────────────────────
function TaskSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {TASKS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-xs border cursor-pointer transition-colors ${value === t.id ? 'border-amber-600 text-amber-400 bg-amber-950' : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200 bg-transparent'}`}
        >{t.label}</button>
      ))}
    </div>
  );
}

// ─── Generate View ────────────────────────────────────────────────────────────
function GenerateView({ apiKey, setApiKey, model }) {
  const [brand, setBrand] = useState('wnr');
  const [task, setTask] = useState('ig_caption');
  const [lang, setLang] = useState('Indonesian');
  const [brief, setBrief] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [showExemplarForm, setShowExemplarForm] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [exemplarNotes, setExemplarNotes] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [keyConfirmed, setKeyConfirmed] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [savedBadge, setSavedBadge] = useState('');
  const [correction, setCorrection] = useState({ what_worked: '', what_failed: '', why_it_failed: '', extracted_rule: '', corrected_output: '' });
  const isFirstRun = !storage.get('__seeded__');

  useEffect(() => {
    if (apiKey) setKeyConfirmed(true);
  }, [apiKey]);

  useEffect(() => {
    if (isFirstRun && !brief) {
      setBrief('WnR Acacia IG caption, Indonesian, provocation hook about honey having flavor');
    }
  }, []);

  const generate = useCallback(async () => {
    if (!apiKey) { setError('Enter your OpenAI API key first.'); return; }
    if (!brief.trim()) { setError('Brief cannot be empty.'); return; }
    setLoading(true);
    setError('');
    setOutput(null);
    setRating(0);
    setShowExemplarForm(false);
    setShowCorrectionForm(false);
    try {
      const sysPrompt = assembleSystemPrompt(brand, task);
      const userBrief = `Brand: ${BRAND_LABELS[brand]}\nTask: ${TASK_LABELS[task]}\nLanguage: ${lang}\nBrief: ${brief}`;
      const text = await callOpenAI(apiKey, model, sysPrompt, userBrief);
      setOutput({ text, brand, task, brief, lang, date: new Date().toISOString() });
      storage.set('__seeded__', true);
    } catch (e) {
      setError(e.message || 'API call failed.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, model, brand, task, lang, brief]);

  const handleRate = (n) => {
    setRating(n);
    setShowExemplarForm(false);
    setShowCorrectionForm(false);
    if (n >= 4) setShowExemplarForm(true);
    else setShowCorrectionForm(true);
  };

  const saveExemplar = () => {
    const arr = getExemplars(output.brand, output.task);
    const entry = {
      id: uuid(), date: output.date, brand: output.brand, task_type: output.task,
      input_brief: output.brief, output: output.text, rating, notes: exemplarNotes
    };
    if (arr.length >= 10) {
      const minIdx = arr.reduce((mi, e, i, a) => e.rating < a[mi].rating ? i : mi, 0);
      arr.splice(minIdx, 1);
    }
    arr.push(entry);
    setExemplars(output.brand, output.task, arr);
    setSavedBadge('Exemplar saved.');
    setShowExemplarForm(false);
    setExemplarNotes('');
    setTimeout(() => setSavedBadge(''), 3000);
  };

  const saveCorrection = () => {
    if (!correction.what_failed || !correction.why_it_failed || !correction.extracted_rule || !correction.corrected_output) {
      setError('Please fill all required correction fields.');
      return;
    }
    const entry = {
      id: uuid(), date: new Date().toISOString(),
      brand: output.brand, task_type: output.task,
      agent_output: output.text,
      what_worked: correction.what_worked,
      what_failed: correction.what_failed,
      why_it_failed: correction.why_it_failed,
      extracted_rule: correction.extracted_rule,
      corrected_output: correction.corrected_output
    };
    const arr = getCorrections(output.brand, output.task);
    arr.unshift(entry);
    setCorrections(output.brand, output.task, arr);
    // Push extracted rule to task rules
    const rules = getTaskRules(output.task);
    rules.push({ id: uuid(), text: correction.extracted_rule, date: new Date().toISOString(), source: 'correction' });
    setTaskRules(output.task, rules);
    setSavedBadge(`Rule saved: "${correction.extracted_rule}"`);
    setShowCorrectionForm(false);
    setCorrection({ what_worked: '', what_failed: '', why_it_failed: '', extracted_rule: '', corrected_output: '' });
    setTimeout(() => setSavedBadge(''), 4000);
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output.text).then(() => {
      setCopiedBadge(true);
      setTimeout(() => setCopiedBadge(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* First-run banner */}
      {isFirstRun && (
        <div className="border border-amber-800 bg-amber-950 px-4 py-3 text-sm text-amber-300">
          No exemplars yet. Rate your first output 4+ and save it. That is how the agent learns.
        </div>
      )}

      {/* API Key */}
      <Card>
        {keyConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>🔒</span><span>Key active</span>
            <button onClick={() => { setKeyConfirmed(false); setApiKey(''); }} className="ml-auto text-xs text-stone-500 hover:text-stone-300 cursor-pointer">change</button>
          </div>
        ) : (
          <div>
            <Label>OpenAI API Key</Label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && keyInput.trim()) { setApiKey(keyInput.trim()); setKeyConfirmed(true); } }}
                placeholder="sk-..."
                className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 text-sm focus:border-amber-700 mono"
              />
              <Btn onClick={() => { if (keyInput.trim()) { setApiKey(keyInput.trim()); setKeyConfirmed(true); } }}>Confirm</Btn>
            </div>
            <p className="text-xs text-stone-500 mt-1">Stays in this session only — never saved to storage.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <Label>Brand</Label>
            <BrandSelector value={brand} onChange={setBrand} />
          </Card>

          <Card>
            <Label>Task Type</Label>
            <TaskSelector value={task} onChange={setTask} />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <Label>Language</Label>
              <div className="flex gap-1">
                {['Indonesian', 'English'].map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 text-xs border cursor-pointer transition-colors ${lang === l ? 'border-amber-600 text-amber-400 bg-amber-950' : 'border-stone-700 text-stone-500 hover:text-stone-300 bg-transparent'}`}
                  >{l}</button>
                ))}
              </div>
            </div>
            <Label required>Brief</Label>
            <Textarea
              value={brief}
              onChange={setBrief}
              placeholder="What do you need? Be specific: variant, hook angle, use case."
              rows={5}
            />
          </Card>

          <Btn onClick={generate} disabled={loading || !brief.trim()} className="w-full py-3 text-base">
            {loading ? 'Generating...' : 'Generate'}
          </Btn>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-4">
          {output ? (
            <>
              <Card>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <TagBrand brand={output.brand} />
                  <TagTask task={output.task} />
                  <span className="text-xs text-stone-500 mono">{new Date(output.date).toLocaleDateString()}</span>
                  <button
                    onClick={copy}
                    className="ml-auto text-xs text-stone-400 hover:text-amber-400 cursor-pointer border border-stone-700 px-2 py-0.5 transition-colors"
                  >{copiedBadge ? 'Copied!' : 'Copy'}</button>
                </div>
                <details className="mb-3">
                  <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-300">Brief</summary>
                  <p className="text-xs text-stone-400 mt-1 pl-2 border-l border-stone-700">{output.brief}</p>
                </details>
                <pre className="mono text-sm text-stone-100 whitespace-pre-wrap leading-relaxed">{output.text}</pre>
                <div className="flex gap-2 mt-3">
                  <Btn onClick={generate} variant="ghost" small>Regenerate</Btn>
                </div>
              </Card>

              {/* Rating widget */}
              <Card className="flex flex-col items-center py-6">
                <p className="text-xs text-stone-500 uppercase tracking-widest mb-4">Rate this output</p>
                <Stars rating={rating} onRate={handleRate} size="text-5xl" />
                {rating === 0 && (
                  <p className="text-xs text-amber-700 mt-3">Rate before generating again</p>
                )}
              </Card>

              {/* Exemplar save flow */}
              {showExemplarForm && (
                <Card className="slide-in border-green-900">
                  <p className="text-sm text-green-400 font-medium mb-3">Save as Exemplar?</p>
                  <Label>What made this work? (optional)</Label>
                  <Textarea value={exemplarNotes} onChange={setExemplarNotes} rows={3} placeholder="Why this is a strong example..." />
                  <div className="flex gap-2 mt-3">
                    <Btn onClick={saveExemplar}>Save Exemplar</Btn>
                    <Btn onClick={() => setShowExemplarForm(false)} variant="ghost">Skip</Btn>
                  </div>
                </Card>
              )}

              {/* Correction flow */}
              {showCorrectionForm && (
                <Card className="slide-in border-red-900">
                  <p className="text-sm text-red-400 font-medium mb-1">Correction</p>
                  <p className="text-xs text-stone-500 mb-4">The output above stays visible for reference.</p>

                  <div className="mb-3">
                    <Label>What worked (optional)</Label>
                    <Textarea value={correction.what_worked} onChange={v => setCorrection(c => ({ ...c, what_worked: v }))} rows={2} />
                  </div>
                  <div className="mb-3">
                    <Label required>What failed</Label>
                    <Textarea value={correction.what_failed} onChange={v => setCorrection(c => ({ ...c, what_failed: v }))} rows={2} />
                  </div>
                  <div className="mb-3">
                    <Label required>Why it failed — the principle behind it</Label>
                    <Textarea value={correction.why_it_failed} onChange={v => setCorrection(c => ({ ...c, why_it_failed: v }))} rows={2} placeholder="Forces generalization, not venting." />
                  </div>
                  <div className="mb-3">
                    <Label required>Extracted rule (one sentence, generalizable)</Label>
                    <Textarea value={correction.extracted_rule} onChange={v => setCorrection(c => ({ ...c, extracted_rule: v }))} rows={2} mono placeholder="This is the compounding unit." />
                  </div>
                  <div className="mb-4">
                    <Label required>Corrected output — what it should have been</Label>
                    <Textarea value={correction.corrected_output} onChange={v => setCorrection(c => ({ ...c, corrected_output: v }))} rows={4} mono />
                  </div>
                  <Btn onClick={saveCorrection}>Save Correction</Btn>
                </Card>
              )}

              {/* Saved badge */}
              {savedBadge && (
                <div className="fade-badge border border-amber-700 bg-amber-950 px-4 py-2 text-sm text-amber-300 mono">
                  ✓ {savedBadge}
                </div>
              )}
            </>
          ) : (
            <Card className="flex items-center justify-center h-64 text-stone-600 text-sm">
              {loading ? 'Generating copy...' : 'Output will appear here.'}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exemplars View ───────────────────────────────────────────────────────────
function ExemplarsView() {
  const [activeBrand, setActiveBrand] = useState('wnr');
  const [activeTask, setActiveTask] = useState('ig_caption');
  const [exemplars, setExemplarsState] = useState([]);
  const [editNotes, setEditNotes] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedOutput, setExpandedOutput] = useState({});

  const reload = useCallback(() => {
    setExemplarsState(getExemplars(activeBrand, activeTask));
  }, [activeBrand, activeTask]);

  useEffect(() => { reload(); }, [reload]);

  // Count all exemplars
  let totalCount = 0;
  let combosWithData = 0;
  BRANDS.forEach(b => TASKS.forEach(t => {
    const arr = getExemplars(b.id, t.id);
    totalCount += arr.length;
    if (arr.length > 0) combosWithData++;
  }));

  const deleteEx = (id) => {
    const arr = exemplars.filter(e => e.id !== id);
    setExemplars(activeBrand, activeTask, arr);
    setExemplarsState(arr);
    setDeleteConfirm(null);
  };

  const saveNotes = (id) => {
    const arr = exemplars.map(e => e.id === id ? { ...e, notes: editNotes[id] ?? e.notes } : e);
    setExemplars(activeBrand, activeTask, arr);
    setExemplarsState(arr);
    setEditNotes(n => { const x = { ...n }; delete x[id]; return x; });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Exemplars</h2>
        <span className="text-xs text-stone-500 mono">{totalCount} exemplars across {combosWithData} combinations</span>
      </div>

      {/* Brand tabs */}
      <div className="flex gap-1 border-b border-stone-700 pb-0">
        {BRANDS.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBrand(b.id)}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b-2 -mb-px ${activeBrand === b.id ? 'border-amber-600 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
          >{b.label}</button>
        ))}
      </div>

      {/* Task sub-tabs */}
      <div className="flex flex-wrap gap-1">
        {TASKS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTask(t.id)}
            className={`px-3 py-1 text-xs border cursor-pointer transition-colors ${activeTask === t.id ? 'border-amber-600 text-amber-400 bg-amber-950' : 'border-stone-700 text-stone-500 hover:text-stone-300 bg-transparent'}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Exemplar cards */}
      {exemplars.length === 0 ? (
        <Card className="text-center py-10 text-stone-600 text-sm">
          No exemplars yet for {BRAND_LABELS[activeBrand]} · {TASK_LABELS[activeTask]}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {exemplars.sort((a, b) => b.rating - a.rating).map(ex => (
            <Card key={ex.id}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars rating={ex.rating} onRate={() => {}} size="text-lg" />
                  <span className="text-xs text-stone-500 mono">{new Date(ex.date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1">
                  {deleteConfirm === ex.id ? (
                    <>
                      <Btn onClick={() => deleteEx(ex.id)} variant="danger" small>Delete</Btn>
                      <Btn onClick={() => setDeleteConfirm(null)} variant="ghost" small>Cancel</Btn>
                    </>
                  ) : (
                    <Btn onClick={() => setDeleteConfirm(ex.id)} variant="danger" small>Delete</Btn>
                  )}
                </div>
              </div>

              <details className="mb-2">
                <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-300">Brief</summary>
                <p className="text-xs text-stone-400 mt-1 pl-2 border-l border-stone-700">{ex.input_brief}</p>
              </details>

              <div className="mb-3">
                <pre className={`mono text-sm text-stone-200 whitespace-pre-wrap leading-relaxed ${!expandedOutput[ex.id] ? 'line-clamp-3' : ''}`} style={!expandedOutput[ex.id] ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}>
                  {ex.output}
                </pre>
                <button
                  onClick={() => setExpandedOutput(s => ({ ...s, [ex.id]: !s[ex.id] }))}
                  className="text-xs text-amber-600 hover:text-amber-400 cursor-pointer mt-1"
                >{expandedOutput[ex.id] ? 'Collapse' : 'Expand'}</button>
              </div>

              <div>
                <Label>Notes</Label>
                {editNotes[ex.id] !== undefined ? (
                  <div className="flex gap-2">
                    <input
                      value={editNotes[ex.id]}
                      onChange={e => setEditNotes(n => ({ ...n, [ex.id]: e.target.value }))}
                      className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 px-2 py-1 text-xs focus:border-amber-700"
                    />
                    <Btn onClick={() => saveNotes(ex.id)} small>Save</Btn>
                    <Btn onClick={() => setEditNotes(n => { const x = { ...n }; delete x[ex.id]; return x; })} variant="ghost" small>Cancel</Btn>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 flex-1">{ex.notes || '—'}</span>
                    <Btn onClick={() => setEditNotes(n => ({ ...n, [ex.id]: ex.notes || '' }))} variant="ghost" small>Edit</Btn>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Correction Log View ──────────────────────────────────────────────────────
function CorrectionLogView() {
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterTask, setFilterTask] = useState('all');
  const [expanded, setExpanded] = useState({});

  const allCorrections = [];
  BRANDS.forEach(b => TASKS.forEach(t => {
    getCorrections(b.id, t.id).forEach(c => allCorrections.push(c));
  }));
  allCorrections.sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = allCorrections.filter(c => {
    if (filterBrand !== 'all' && c.brand !== filterBrand) return false;
    if (filterTask !== 'all' && c.task_type !== filterTask) return false;
    return true;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(allCorrections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profbee-corrections-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Correction Log</h2>
        <Btn onClick={exportJSON} variant="ghost" small>Export All as JSON</Btn>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => setFilterBrand('all')}
            className={`px-3 py-1 text-xs border cursor-pointer transition-colors ${filterBrand === 'all' ? 'border-amber-600 text-amber-400 bg-amber-950' : 'border-stone-700 text-stone-500 bg-transparent'}`}
          >All brands</button>
          {BRANDS.map(b => (
            <button
              key={b.id}
              onClick={() => setFilterBrand(b.id)}
              className={`px-3 py-1 text-xs border cursor-pointer transition-colors ${filterBrand === b.id ? 'border-amber-600 text-amber-400 bg-amber-950' : 'border-stone-700 text-stone-500 bg-transparent'}`}
            >{b.short}</button>
          ))}
        </div>
        <select
          value={filterTask}
          onChange={e => setFilterTask(e.target.value)}
          className="bg-stone-800 border border-stone-600 text-stone-300 text-xs px-2 py-1 focus:border-amber-700"
        >
          <option value="all">All tasks</option>
          {TASKS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-10 text-stone-600 text-sm">No corrections yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(c => (
            <Card key={c.id}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <TagBrand brand={c.brand} />
                <TagTask task={c.task_type} />
                <span className="text-xs text-stone-500 mono">{new Date(c.date).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-stone-400 mb-2"><span className="text-stone-500">Failed: </span>{c.what_failed.slice(0, 120)}{c.what_failed.length > 120 ? '...' : ''}</p>
              <p className="text-sm text-amber-400 mono border-l-2 border-amber-700 pl-3 mb-2">{c.extracted_rule}</p>

              {expanded[c.id] ? (
                <div className="border-t border-stone-700 pt-3 mt-2 flex flex-col gap-2">
                  {c.what_worked && (
                    <div><Label>What worked</Label><p className="text-xs text-stone-400">{c.what_worked}</p></div>
                  )}
                  <div><Label>What failed</Label><p className="text-xs text-stone-400">{c.what_failed}</p></div>
                  <div><Label>Why it failed</Label><p className="text-xs text-stone-400">{c.why_it_failed}</p></div>
                  <div><Label>Agent output</Label><pre className="mono text-xs text-stone-400 whitespace-pre-wrap">{c.agent_output}</pre></div>
                  <div><Label>Corrected output</Label><pre className="mono text-xs text-stone-200 whitespace-pre-wrap">{c.corrected_output}</pre></div>
                  <button onClick={() => setExpanded(s => ({ ...s, [c.id]: false }))} className="text-xs text-stone-500 hover:text-stone-300 cursor-pointer text-left">Collapse</button>
                </div>
              ) : (
                <button onClick={() => setExpanded(s => ({ ...s, [c.id]: true }))} className="text-xs text-stone-500 hover:text-amber-400 cursor-pointer">Expand full entry</button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rules card ───────────────────────────────────────────────────────────────
function RuleCard({ rule, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rule.text);
  return (
    <div className="border border-stone-700 p-3 flex gap-3">
      <div className="flex-1">
        {editing ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 px-2 py-1 text-xs mono focus:border-amber-700"
            />
            <Btn onClick={() => { onEdit({ ...rule, text }); setEditing(false); }} small>Save</Btn>
            <Btn onClick={() => { setText(rule.text); setEditing(false); }} variant="ghost" small>Cancel</Btn>
          </div>
        ) : (
          <p className="text-sm mono text-stone-200">{rule.text}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-stone-600 mono">{new Date(rule.date).toLocaleDateString()}</span>
          <span className={rule.source === 'correction' ? 'rule-tag-correction' : 'rule-tag-manual'}>
            [{rule.source || 'manual'}]
          </span>
        </div>
      </div>
      {!editing && (
        <div className="flex gap-1">
          <Btn onClick={() => setEditing(true)} variant="ghost" small>Edit</Btn>
          <Btn onClick={onDelete} variant="danger" small>✕</Btn>
        </div>
      )}
    </div>
  );
}

// ─── System Prompt View ───────────────────────────────────────────────────────
function SystemPromptView() {
  const [previewBrand, setPreviewBrand] = useState('wnr');
  const [previewTask, setPreviewTask] = useState('ig_caption');
  const [alwaysRules, setAlwaysRulesState] = useState(getAlwaysRules());
  const [taskRules, setTaskRulesState] = useState({});
  const [showBasePrompt, setShowBasePrompt] = useState(false);
  const [addingAlways, setAddingAlways] = useState(false);
  const [newAlwaysText, setNewAlwaysText] = useState('');
  const [addingTask, setAddingTask] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [versionLog, setVersionLogState] = useState(getVersionLog());
  const [addingVersion, setAddingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({ version_label: '', summary: '' });

  const reloadRules = () => {
    setAlwaysRulesState(getAlwaysRules());
    const tr = {};
    TASKS.forEach(t => { tr[t.id] = getTaskRules(t.id); });
    setTaskRulesState(tr);
  };

  useEffect(() => {
    reloadRules();
    setVersionLogState(getVersionLog());
  }, []);

  const assembled = assembleSystemPrompt(previewBrand, previewTask);

  // Always rules management
  const addAlwaysRule = () => {
    if (!newAlwaysText.trim()) return;
    const arr = [...alwaysRules, { id: uuid(), text: newAlwaysText.trim(), date: new Date().toISOString(), source: 'manual' }];
    setAlwaysRules(arr);
    setAlwaysRulesState(arr);
    setNewAlwaysText('');
    setAddingAlways(false);
  };

  const editAlwaysRule = (rule) => {
    const arr = alwaysRules.map(r => r.id === rule.id ? rule : r);
    setAlwaysRules(arr);
    setAlwaysRulesState(arr);
  };

  const deleteAlwaysRule = (id) => {
    const arr = alwaysRules.filter(r => r.id !== id);
    setAlwaysRules(arr);
    setAlwaysRulesState(arr);
  };

  // Task rules management
  const getTaskRulesLocal = (task) => taskRules[task] || [];

  const addTaskRule = (task) => {
    if (!newTaskText.trim()) return;
    const arr = [...getTaskRulesLocal(task), { id: uuid(), text: newTaskText.trim(), date: new Date().toISOString(), source: 'manual' }];
    setTaskRules(task, arr);
    setTaskRulesState(s => ({ ...s, [task]: arr }));
    setNewTaskText('');
    setAddingTask(null);
  };

  const editTaskRule = (task, rule) => {
    const arr = getTaskRulesLocal(task).map(r => r.id === rule.id ? rule : r);
    setTaskRules(task, arr);
    setTaskRulesState(s => ({ ...s, [task]: arr }));
  };

  const deleteTaskRule = (task, id) => {
    const arr = getTaskRulesLocal(task).filter(r => r.id !== id);
    setTaskRules(task, arr);
    setTaskRulesState(s => ({ ...s, [task]: arr }));
  };

  const logVersion = () => {
    if (!newVersion.version_label || !newVersion.summary) return;
    const entry = { date: new Date().toISOString(), ...newVersion };
    const arr = [entry, ...versionLog];
    setVersionLog(arr);
    setVersionLogState(arr);
    setNewVersion({ version_label: '', summary: '' });
    setAddingVersion(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-stone-100">System Prompt</h2>

      {/* Live preview */}
      <Card>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-3">Live Preview</p>
        <div className="flex gap-3 mb-4 flex-wrap">
          <div>
            <Label>Brand</Label>
            <select value={previewBrand} onChange={e => setPreviewBrand(e.target.value)} className="bg-stone-800 border border-stone-600 text-stone-300 text-xs px-2 py-1 focus:border-amber-700">
              {BRANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Task</Label>
            <select value={previewTask} onChange={e => setPreviewTask(e.target.value)} className="bg-stone-800 border border-stone-600 text-stone-300 text-xs px-2 py-1 focus:border-amber-700">
              {TASKS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-stone-700 pt-3 flex flex-col gap-2">
          <details>
            <summary
              className="text-xs text-stone-500 cursor-pointer hover:text-stone-300"
              onClick={() => setShowBasePrompt(!showBasePrompt)}
            >Base prompt (click to expand)</summary>
            <pre className="mono text-xs text-stone-400 whitespace-pre-wrap mt-2 max-h-48 overflow-y-auto">{BASE_SYSTEM_PROMPT}</pre>
          </details>

          <div>
            <p className="text-xs text-stone-500 mb-1">Hard rules active: {alwaysRules.length}</p>
            {alwaysRules.map(r => <p key={r.id} className="text-xs mono text-stone-300 pl-2 border-l border-stone-700 mb-0.5">- {r.text}</p>)}
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-1">Task rules active ({TASK_LABELS[previewTask]}): {getTaskRulesLocal(previewTask).length}</p>
            {getTaskRulesLocal(previewTask).map(r => <p key={r.id} className="text-xs mono text-stone-300 pl-2 border-l border-amber-900 mb-0.5">- {r.text}</p>)}
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-1">Exemplars loaded ({BRAND_LABELS[previewBrand]} · {TASK_LABELS[previewTask]}): {getExemplars(previewBrand, previewTask).sort((a,b)=>b.rating-a.rating).slice(0,3).length}</p>
            {getExemplars(previewBrand, previewTask).sort((a,b)=>b.rating-a.rating).slice(0,3).map((ex, i) => (
              <p key={ex.id} className="text-xs text-stone-400 pl-2 border-l border-stone-800 mb-0.5">
                [{i+1}] {ex.output.slice(0, 60)}...
              </p>
            ))}
          </div>

          <p className="text-xs text-stone-600 mono">Total prompt length: ~{assembled.length} chars</p>
        </div>
      </Card>

      {/* Always rules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-stone-200">Hard Rules (always apply)</p>
          <Btn onClick={() => setAddingAlways(true)} variant="amber" small>+ Add Rule</Btn>
        </div>
        {addingAlways && (
          <div className="flex gap-2 mb-2 slide-in">
            <input
              value={newAlwaysText}
              onChange={e => setNewAlwaysText(e.target.value)}
              placeholder="One sentence, generalizable rule..."
              className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 text-sm mono focus:border-amber-700"
            />
            <Btn onClick={addAlwaysRule} small>Save</Btn>
            <Btn onClick={() => { setAddingAlways(false); setNewAlwaysText(''); }} variant="ghost" small>Cancel</Btn>
          </div>
        )}
        {alwaysRules.length === 0 && !addingAlways && (
          <p className="text-xs text-stone-600 border border-stone-800 p-3">No hard rules yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {alwaysRules.map(r => (
            <RuleCard key={r.id} rule={r} onEdit={editAlwaysRule} onDelete={() => deleteAlwaysRule(r.id)} />
          ))}
        </div>
      </div>

      {/* Task-specific rules */}
      <div>
        <p className="text-sm font-medium text-stone-200 mb-3">Task-Specific Rules</p>
        {TASKS.map(t => {
          const rules = getTaskRulesLocal(t.id);
          return (
            <div key={t.id} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <TagTask task={t.id} />
                <Btn onClick={() => setAddingTask(t.id)} variant="amber" small>+ Add Rule</Btn>
              </div>
              {addingTask === t.id && (
                <div className="flex gap-2 mb-2 slide-in">
                  <input
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Rule specific to this task type..."
                    className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 px-3 py-2 text-sm mono focus:border-amber-700"
                  />
                  <Btn onClick={() => addTaskRule(t.id)} small>Save</Btn>
                  <Btn onClick={() => { setAddingTask(null); setNewTaskText(''); }} variant="ghost" small>Cancel</Btn>
                </div>
              )}
              {rules.length === 0 && addingTask !== t.id && (
                <p className="text-xs text-stone-700 pl-2">No rules.</p>
              )}
              <div className="flex flex-col gap-2">
                {rules.map(r => (
                  <RuleCard key={r.id} rule={r} onEdit={(updated) => editTaskRule(t.id, updated)} onDelete={() => deleteTaskRule(t.id, r.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Version log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-stone-200">Version Log</p>
          <Btn onClick={() => setAddingVersion(true)} variant="amber" small>+ Log Version</Btn>
        </div>
        {addingVersion && (
          <Card className="mb-3 slide-in">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-none w-28">
                <Label>Version label</Label>
                <input
                  value={newVersion.version_label}
                  onChange={e => setNewVersion(v => ({ ...v, version_label: e.target.value }))}
                  placeholder="v1.2"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-2 py-1 text-sm mono focus:border-amber-700"
                />
              </div>
              <div className="flex-1">
                <Label>Summary</Label>
                <input
                  value={newVersion.summary}
                  onChange={e => setNewVersion(v => ({ ...v, summary: e.target.value }))}
                  placeholder="One-line description of what changed and why"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 px-2 py-1 text-sm focus:border-amber-700"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Btn onClick={logVersion} small>Save</Btn>
              <Btn onClick={() => setAddingVersion(false)} variant="ghost" small>Cancel</Btn>
            </div>
          </Card>
        )}
        {versionLog.length === 0 ? (
          <p className="text-xs text-stone-600 border border-stone-800 p-3">No versions logged yet.</p>
        ) : (
          <div className="border border-stone-700">
            <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-stone-700 text-xs text-stone-500 uppercase tracking-wide">
              <span>Version</span><span>Date</span><span>Summary</span>
            </div>
            {versionLog.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-stone-800 text-xs hover:bg-stone-800 transition-colors">
                <span className="mono text-amber-400">{v.version_label}</span>
                <span className="text-stone-500 mono">{new Date(v.date).toLocaleDateString()}</span>
                <span className="text-stone-300">{v.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const VIEWS = [
  { id: 'generate', label: 'Generate' },
  { id: 'exemplars', label: 'Exemplars' },
  { id: 'corrections', label: 'Correction Log' },
  { id: 'system', label: 'System Prompt' }
];

// ─── App root ─────────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState('generate');
  const [apiKey, setApiKey] = useState('');
  const model = ENV_MODEL;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-amber-400 tracking-wide">PROF BEE</h1>
          <p className="text-xs text-stone-600">Copywriting Agent</p>
        </div>
        <nav className="flex gap-1">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 text-xs cursor-pointer transition-colors border-b-2 ${view === v.id ? 'border-amber-600 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >{v.label}</button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        {view === 'generate' && <GenerateView apiKey={apiKey} setApiKey={setApiKey} model={model} />}
        {view === 'exemplars' && <ExemplarsView />}
        {view === 'corrections' && <CorrectionLogView />}
        {view === 'system' && <SystemPromptView />}
      </main>

      <footer className="border-t border-stone-800 px-6 py-2 text-xs text-stone-700 flex items-center justify-between">
        <span>Prof Bee Holding · Copywriting Agent v1.1</span>
        <span className="mono">model: {model}</span>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
