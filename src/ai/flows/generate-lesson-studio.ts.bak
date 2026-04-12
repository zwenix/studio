import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export interface LessonStudioInput {
  topic: string;
  phase: string;
  grade: string;
}

export const LessonStudioInputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    phase: { type: 'string' },
    grade: { type: 'string' },
  },
  required: ['topic', 'phase', 'grade'],
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

function buildPrompt(input: LessonStudioInput) {
  return 'Create a CAPS-aligned lesson plan for ' +
    input.phase +
    ' Grade ' +
    input.grade +
    ' on the topic ' +
    input.topic +
    '. Include overview, objectives, materials, activities, assessment, and differentiation.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'No lesson content generated.' : 'No lesson content generated.';
}

export async function generateLessonStudio(input: LessonStudioInput) {
  const prompt = buildPrompt(input);

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      provider: 'Anthropic',
      content: extractAnthropicText(response.content as Array<{ type: string; text?: string }>),
    };
  } catch (error) {
    console.warn('Anthropic lesson generation failed. Falling back to Groq.', error);

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    return {
      provider: 'Groq',
      content: typeof content === 'string' && content.length > 0 ? content : 'No lesson content generated.',
    };
  }
}

export const generateLessonStudioContent = generateLessonStudio;
export default generateLessonStudio;
