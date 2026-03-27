import { BuiltPrompt } from '../core/prompt-types';
import { OCR_SCHEMA_HINT } from '../core/json-schema-formatters';
import { JSON_ONLY_RULE } from '../core/global-rules';
import { cleanMultiline, joinSections } from '../core/prompt-utils';

export interface OCRPromptInput {
  extractionGoal?: string;
}

export function buildOCRPrompt(input?: OCRPromptInput): BuiltPrompt {
  const systemInstruction = joinSections(
    `
Extract all readable text from the provided image.

Requirements:
- preserve original wording as accurately as possible
- keep headings and lists where visible
- correct only obvious OCR recognition mistakes
- do not rewrite, summarise, or simplify unless explicitly requested
- if any text is unclear, mark it as [unclear]
- if the image contains tables, reproduce them in a simple structured format
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Task: Extract text from the uploaded image.
Goal: ${input?.extractionGoal ?? 'Accurate text extraction for digitisation'}

${OCR_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: OCR_SCHEMA_HINT,
  };
}
