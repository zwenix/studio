import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export const AdminDocInputSchema = {
  type: 'object',
  properties: {
    docType: { type: 'string' },
    schoolContext: { type: 'string' },
    specificDetails: { type: 'string' },
  },
  required: ['docType', 'schoolContext'],
  additionalProperties: false,
};

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY.');
  }

  return new Anthropic({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY.');
  }

  return new Groq({ apiKey });
}

function buildPrompt(input: { docType: string; schoolContext: string; specificDetails: string }) {
  return 'Draft a professional school administrative document. Type: ' +
    input.docType +
    '. Context: ' +
    input.schoolContext +
    '. Details: ' +
    input.specificDetails +
    '. Ensure precise academic tone.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? '' : '';
}

export async function generateAdminDoc(input: { docType: string; schoolContext: string; specificDetails: string }) {
  const prompt = buildPrompt(input);

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      provider: 'Anthropic',
      content: extractAnthropicText(response.content as Array<{ type: string; text?: string }>),
    };
  } catch (error) {
    console.warn('Anthropic failed. Routing to Groq LLM.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : '',
    };
  }
}

export const generateAdminDocs = generateAdminDoc;
export default generateAdminDoc;

// ─── Named type aliases for content-creator-client.tsx ───────────────────────
export type AdminDocInput  = { docType: string; schoolContext: string; specificDetails: string; };
export type AdminDocOutput = { provider: string; content: string; };
