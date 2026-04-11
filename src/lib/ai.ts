'use server';
export interface AIMessage { role: 'user' | 'assistant'; content: string; }
interface GenerateOptions { maxTokens?: number; temperature?: number; history?: AIMessage[]; }

async function claudeGenerate(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system: systemPrompt, messages: [...history, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Claude ${response.status}: ${await response.text()}`);
  return (await response.json()).content[0].text;
}

async function groqGenerate(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }], max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}: ${await response.text()}`);
  return (await response.json()).choices[0].message.content;
}

export async function generateText(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<string> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGroq      = !!process.env.GROQ_API_KEY;
  if (!hasAnthropic && !hasGroq) throw new Error('No AI API keys configured.');
  if (hasAnthropic) {
    try { const r = await claudeGenerate(prompt, systemPrompt, opts); console.log('[AI] Claude: ok'); return r; }
    catch (e: any) { console.warn('[AI] Claude failed, trying Groq:', e.message); if (!hasGroq) throw e; }
  }
  console.log('[AI] Using Groq...');
  return groqGenerate(prompt, systemPrompt, opts);
}

export async function generateJSON<T>(prompt: string, systemPrompt: string, opts: GenerateOptions = {}): Promise<T> {
  const sys = `${systemPrompt}\n\nCRITICAL: Respond ONLY with a single valid JSON object. No markdown fences. Start with { and end with }.`;
  const raw = await generateText(prompt, sys, opts);
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  try { return JSON.parse(cleaned) as T; }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0,300)}`);
  }
}
