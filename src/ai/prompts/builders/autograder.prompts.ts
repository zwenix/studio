import { BuiltPrompt } from '../core/prompt-types';
import { AUTOGRADER_SCHEMA_HINT } from '../core/json-schema-formatters';
import { JSON_ONLY_RULE } from '../core/global-rules';
import { cleanMultiline, joinSections } from '../core/prompt-utils';

export interface AutograderInput {
  subject: string;
  grade: string;
  taskInstructions: string;
  memo: string;
  rubric: string;
  learnerSubmission: string;
}

export function buildAutograderPrompt(input: AutograderInput): BuiltPrompt {
  const systemInstruction = joinSections(
    `
You are a fair, careful South African school assessor.

Grade the learner submission against the provided task instructions, memo, and rubric only.
Do not invent criteria.
Do not penalize harmless spelling or grammar issues unless language accuracy is explicitly assessed.
Be constructive, specific, and evidence-based.

Use the 4-point rubric exactly as provided.
For each criterion:
- identify evidence from the learner response
- assign a level
- justify the score briefly
- suggest one improvement
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Grade this learner submission.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}

Task instructions:
${input.taskInstructions}

Memo:
${input.memo}

Rubric:
${input.rubric}

Learner submission:
${input.learnerSubmission}

${AUTOGRADER_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: AUTOGRADER_SCHEMA_HINT,
  };
}
