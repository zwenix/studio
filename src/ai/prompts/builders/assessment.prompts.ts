import { BuiltPrompt } from '../core/prompt-types';
import { GLOBAL_EDU_SYSTEM_RULES, JSON_ONLY_RULE } from '../core/global-rules';
import { ASSESSMENT_SCHEMA_HINT } from '../core/json-schema-formatters';
import { cleanMultiline, joinSections } from '../core/prompt-utils';

export interface MockAssessmentInput {
  subject: string;
  grade: string;
  term?: string;
  topics: string[];
  marks: number;
  duration: string;
  assessmentType: string;
  cognitiveRequirements?: string;
  language?: string;
  notes?: string;
}

export function buildMockAssessmentPrompt(input: MockAssessmentInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Generate a CAPS-style mock assessment for a South African school.

Requirements:
- align to CAPS style and grade expectations
- include an appropriate spread of question types
- ensure mark allocation is fair and clear
- use clear instructions
- avoid ambiguous wording
- match the requested duration and total marks
- include South African context where relevant but not forced
- ensure internal consistency across questions, marks, and memo
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Generate a CAPS-style mock assessment.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Term: ${input.term ?? 'Not specified'}
- Topic(s): ${input.topics.join(', ')}
- Marks: ${input.marks}
- Duration: ${input.duration}
- Assessment type: ${input.assessmentType}
- Cognitive level requirements: ${input.cognitiveRequirements ?? 'Balanced grade-appropriate spread'}
- Language: ${input.language ?? 'English'}
- Special notes: ${input.notes ?? 'None'}

${ASSESSMENT_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: ASSESSMENT_SCHEMA_HINT,
  };
}
