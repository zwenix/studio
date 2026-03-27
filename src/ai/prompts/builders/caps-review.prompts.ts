import { BuiltPrompt } from '../core/prompt-types';
import { CAPS_REVIEW_SCHEMA_HINT } from '../core/json-schema-formatters';
import { GLOBAL_EDU_SYSTEM_RULES, JSON_ONLY_RULE } from '../core/global-rules';
import { cleanMultiline, joinSections } from '../core/prompt-utils';

export interface CAPSReviewInput {
  subject: string;
  grade: string;
  term?: string;
  topic: string;
  contentType: string;
  generatedContent: string;
}

export function buildCAPSReviewPrompt(input: CAPSReviewInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Review the supplied educational content for likely CAPS alignment and classroom suitability in a South African school.

Check for:
1. grade appropriateness
2. topic relevance
3. learner reading level
4. likely CAPS-style structure
5. factual accuracy
6. assessment suitability if applicable
7. South African classroom usefulness
8. clarity of instructions
9. visual design suitability if learner-facing
10. any over-complexity, under-complexity, or curriculum mismatch

If weak, revise the content.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Review this generated content.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Term: ${input.term ?? 'Not specified'}
- Topic: ${input.topic}
- Content type: ${input.contentType}

Generated content:
${input.generatedContent}

${CAPS_REVIEW_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: CAPS_REVIEW_SCHEMA_HINT,
  };
}
