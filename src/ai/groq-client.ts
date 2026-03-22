'use server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Direct REST caller for Groq API to avoid incompatible Genkit plugins.
 */
export async function groqGenerate(
  messages: GroqMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set.');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

/**
 * Structured JSON generator for Groq.
 */
export async function groqGenerateJSON<T>(
  messages: GroqMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<T> {
  const last = messages[messages.length - 1];
  const augmented: GroqMessage[] = [
    ...messages.slice(0, -1),
    {
      ...last,
      content: last.content + '\n\nCRITICAL: Your entire response MUST be a single valid JSON object. No markdown fences, no explanation, no text before or after the JSON.',
    },
  ];

  const raw = await groqGenerate(augmented, options);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Groq returned invalid JSON. Raw response: ${cleaned.substring(0, 300)}`);
  }
}
