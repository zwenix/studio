import { VISUAL_NEGATIVE_CONSTRAINTS } from '../core/global-rules';
import { cleanMultiline } from '../core/prompt-utils';

export interface ImagePromptBuildInput {
  purpose: string;
  subject: string;
  grade: string;
  topic: string;
  visualGoal: string;
  mustInclude: string[];
  saContext?: string[];
  style?: string;
  orientation?: 'portrait' | 'landscape';
  printSize?: 'A4' | 'A3' | 'Screen';
}

export function buildEducationalImagePrompt(input: ImagePromptBuildInput): string {
  const mustIncludeText = input.mustInclude.map(item => `- ${item}`).join('\n');
  const saContextText = (input.saContext ?? ['Use South African school-appropriate and culturally relevant context where suitable.'])
    .map(item => `- ${item}`)
    .join('\n');

  return cleanMultiline(`
Create a high-resolution educational illustration for a South African classroom.

Purpose:
${input.purpose}

Audience:
Grade ${input.grade} learners studying ${input.subject}

Topic:
${input.topic}

Visual goal:
${input.visualGoal}

Style requirements:
- child-safe
- polished
- modern classroom illustration
- visually engaging but not cluttered
- age-appropriate for Grade ${input.grade}
- ${input.style ?? 'clean educational illustrated style'}
- strong focal point
- clear shapes and educational details
- suitable for print on ${input.printSize ?? 'A4'}

Composition:
- ${input.orientation ?? 'portrait'} orientation
- one dominant scene or diagram
- uncluttered background
- enough clear space for layout if needed
- large, visible educational elements
- no tiny details that disappear when printed

Must include:
${mustIncludeText}

South African context:
${saContextText}

${VISUAL_NEGATIVE_CONSTRAINTS}

Output should feel like:
a professionally designed school classroom visual aid.

Create illustration only. Do not make text the main content of the image.
  `);
}
