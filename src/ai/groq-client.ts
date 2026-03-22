'use server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Direct REST caller for Groq API.
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
 * Robust JSON generator for Groq.
 * Uses a robust extractor to find the first '{' and last '}' to handle 
 * cases where the model includes markdown fences or extra conversational text.
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
      content: last.content + '\n\nCRITICAL: Your entire response MUST be a single valid JSON object. Do not include any text before or after the JSON. Ensure all keys and strings are double-quoted.',
    },
  ];

  const raw = await groqGenerate(augmented, options);
  
  // Find the boundaries of the JSON object
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    console.error('Raw non-JSON response from Groq:', raw);
    throw new Error(`Groq did not return a valid JSON object. Raw response was: ${raw.substring(0, 300)}...`);
  }

  const cleaned = raw.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error('Failed to parse Groq JSON. Cleaned string:', cleaned);
    // If standard parse fails, try basic cleanup of escaped characters that shouldn't be there
    try {
        const fallbackCleaned = cleaned.replace(/\\n/g, ' ').replace(/\\r/g, '');
        return JSON.parse(fallbackCleaned) as T;
    } catch (e2) {
        throw new Error('Groq returned malformed JSON. Please try again.');
    }
  }
}
