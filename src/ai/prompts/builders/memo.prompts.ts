import { BuiltPrompt } from '../core/prompt-types';
import { MEMO_SCHEMA_HINT } from '../core/json-schema-formatters';
import { GLOBAL_EDU_SYSTEM_RULES, JSON_ONLY_RULE } from '../core/global-rules';
import { cleanMultiline, joinSections } from '../core/prompt-utils';

export interface MemoPromptInput {
  subject: string;
  grade: string;
  assessmentJson: string;
}

export function buildMemoPrompt(input: MemoPromptInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Generate a CAPS-style memorandum and marking guideline for the assessment described below.

Requirements:
- provide correct answers
- allocate marks clearly
- allow valid alternative answers where appropriate
- include method marks where relevant
- ensure the memo matches each question exactly
- use South African school assessment conventions
- be teacher-friendly and easy to moderate
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Generate a CAPS-style memorandum.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}

Assessment JSON:
${input.assessmentJson}

${MEMO_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: MEMO_SCHEMA_HINT,
  };
}
