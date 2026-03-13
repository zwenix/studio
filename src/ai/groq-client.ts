'use server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function groqGenerate(
  messages: GroqMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment variables.');

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

// For flows that need structured JSON output
export async function groqGenerateJSON<T>(
  messages: GroqMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<T> {
  const messagesWithJsonInstruction: GroqMessage[] = [
    ...messages.slice(0, -1),
    {
      ...messages[messages.length - 1],
      content:
        messages[messages.length - 1].content +
        '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.',
    },
  ];

  const raw = await groqGenerate(messagesWithJsonInstruction, options);

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Groq returned invalid JSON: ${cleaned.substring(0, 200)}`);
  }
}
