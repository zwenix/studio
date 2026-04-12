import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export const VisualAidInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    targetAudience: { type: 'string' },
    format: { type: 'string' },
  },
  required: ['topic', 'targetAudience', 'format'],
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

function buildPrompt(input: { topic: string; targetAudience: string; format: string }) {
  return 'Generate highly descriptive visual aid concepts and graphic organiser instructions for the topic: ' +
    input.topic +
    ', tailored for ' +
    input.targetAudience +
    ' using the format: ' +
    input.format +
    '.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'Failed to generate visual aid.' : 'Failed to generate visual aid.';
}

export async function generateVisualAid(input: { topic: string; targetAudience: string; format: string }) {
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
    console.warn('Anthropic Visual Aid generation failed. Using Groq fallback.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : 'Failed to generate visual aid.',
    };
  }
}

export const generateVisualAids = generateVisualAid;
export default generateVisualAid;
