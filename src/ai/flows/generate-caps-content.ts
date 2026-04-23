import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export interface CAPSInput {
  grade: string;
  subject: string;
  topic: string;
  duration?: string;
}

export const CAPSInputSchema = {
  type: 'object',
  properties: {
    grade: { type: 'string' },
    subject: { type: 'string' },
    topic: { type: 'string' },
    duration: { type: 'string' },
  },
  required: ['grade', 'subject', 'topic'],
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

function buildPrompt(input: CAPSInput) {
  const durationText = input.duration ? ' for ' + input.duration : '';

  return 'Create a detailed South African CAPS-aligned lesson plan for Grade ' +
    input.grade +
    ' ' +
    input.subject +
    ' covering ' +
    input.topic +
    durationText +
    '. Include learning objectives, introduction, main activity, assessment, and differentiation.';
}

function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text ?? 'No content generated.' : 'No content generated.';
}

async function runAnthropic(prompt: string) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return extractAnthropicText(response.content as Array<{ type: string; text?: string }>);
}

async function runGroq(prompt: string) {
  const client = getGroqClient();
  const response = await client.chat.completions.create({
    model: 'llama3-70b-8192',
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' && content.length > 0 ? content : 'No content generated.';
}

export async function generateCAPSContent(input: CAPSInput) {
  const prompt = buildPrompt(input);

  try {
    return {
      provider: 'Anthropic',
      content: await runAnthropic(prompt),
    };
  } catch (error) {
    console.warn('Anthropic primary generation failed. Falling back to Groq.', error);

    return {
      provider: 'Groq',
      content: await runGroq(prompt),
    };
  }
}

export const generateCapsContent = generateCAPSContent;
export default generateCAPSContent;

// ─── Backward-compat type aliases ────────────────────────────────────────────
// content-creator-client.tsx imports these names.
export type GenerateCAPSContentInput = CAPSInput & {
  subject:                string;
  topic:                  string;
  contentType?:           string;
  category?:              string;
  term?:                  string;
  language?:              string;
  learnerProfile?:        string;
  objective?:             string;
  additionalInstructions?: string;
  teacherName?:           string;
  signatureUrl?:          string;
};

export type GenerateCAPSContentOutput = {
  provider: string;
  content:  string;
  memo?:    string;
  rubric?:  string;
};
