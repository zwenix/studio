'use server';

/**
 * EduAI Companion — Unified AI Client
 * Primary:  Anthropic Claude (claude-sonnet-4-20250514)
 * Failover: Groq (llama-3.3-70b-versatile)
 *
 * All existing system prompts and user prompts are preserved
 * exactly as written in your original flows — only the transport
 * layer has changed (Genkit removed, direct API calls added).
 */

export interface AIMessage {
  role:    'user' | 'assistant';
  content: string;
}

interface GenerateOptions {
  maxTokens?:   number;
  temperature?: number;
  history?:     AIMessage[];
}

// ── Anthropic Claude ──────────────────────────────────────────────────────────
async function claudeGenerate(
  prompt:       string,
  systemPrompt: string,
  opts:         GenerateOptions = {}
): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system:     systemPrompt,
      messages:   [...history, { role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.content[0].text as string;
}

// ── Groq (Failover) ───────────────────────────────────────────────────────────
// Mirrors the original groq-client.ts model choice
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function groqGenerate(
  prompt:       string,
  systemPrompt: string,
  opts:         GenerateOptions = {}
): Promise<string> {
  const { maxTokens = 8192, temperature = 0.7, history = [] } = opts;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages:    [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user',   content: prompt },
      ],
      max_tokens:  maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

// ── Public API — auto failover ────────────────────────────────────────────────

/**
 * Generate plain text.
 * Tries Claude first — automatically falls back to Groq on any error.
 */
export async function generateText(
  prompt:       string,
  systemPrompt: string,
  opts:         GenerateOptions = {}
): Promise<string> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGroq      = !!process.env.GROQ_API_KEY;

  if (!hasAnthropic && !hasGroq) {
    throw new Error(
      'No AI API keys configured. Set ANTHROPIC_API_KEY and/or GROQ_API_KEY in your environment.'
    );
  }

  if (hasAnthropic) {
    try {
      const result = await claudeGenerate(prompt, systemPrompt, opts);
      console.log('[AI] Claude: success');
      return result;
    } catch (err: any) {
      console.warn('[AI] Claude failed — falling back to Groq:', err.message);
      if (!hasGroq) throw err;
    }
  }

  console.log('[AI] Using Groq fallback...');
  return groqGenerate(prompt, systemPrompt, opts);
}

/**
 * Generate a structured JSON response.
 * Adds a JSON enforcement instruction to the system prompt,
 * then parses and returns the result.
 */
export async function generateJSON<T>(
  prompt:       string,
  systemPrompt: string,
  opts:         GenerateOptions = {}
): Promise<T> {
  // Append JSON enforcement — mirrors the original groqGenerateJSON approach
  const jsonSystem = `${systemPrompt}

CRITICAL: Your entire response MUST be a single valid JSON object. No markdown fences, no explanation, no text before or after the JSON.`;

  const raw = await generateText(prompt, jsonSystem, opts);

  // Strip any markdown fences that slipped through
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i,     '')
    .replace(/```\s*$/i,     '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: extract the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch {}
    }
    throw new Error(
      `AI returned invalid JSON. Raw response (first 300 chars):\n${cleaned.slice(0, 300)}`
    );
  }
}
