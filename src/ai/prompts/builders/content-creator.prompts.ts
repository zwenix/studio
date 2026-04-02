import { BuiltPrompt, BaseEduInput } from '../core/prompt-types';
import {
  GLOBAL_EDU_SYSTEM_RULES,
  VISUAL_QUALITY_RULES,
  VISUAL_NEGATIVE_CONSTRAINTS,
  JSON_ONLY_RULE,
} from '../core/global-rules';
import {
  POSTER_SCHEMA_HINT,
  WORKSHEET_SCHEMA_HINT,
  STUDY_GUIDE_SCHEMA_HINT,
} from '../core/json-schema-formatters';
import { joinSections, cleanMultiline } from '../core/prompt-utils';

export type ContentType = 'poster' | 'worksheet' | 'study_guide' | 'visual_aid';

export interface ContentCreatorInput extends BaseEduInput {
  contentType: ContentType;
  purpose?: string;
  stylePreference?: string;
  outputSize?: 'A4' | 'A3' | 'Letter' | 'Screen';
  includeMemo?: boolean;
  difficultyLevel?: string;
  numberOfQuestions?: number;
  desiredLength?: string;
  examFocus?: string;
}

export function buildContentCreatorPrompt(input: ContentCreatorInput): BuiltPrompt {
  switch (input.contentType) {
    case 'poster':
      return buildPosterPrompt(input);
    case 'worksheet':
      return buildWorksheetPrompt(input);
    case 'study_guide':
      return buildStudyGuidePrompt(input);
    case 'visual_aid':
      return buildVisualAidPrompt(input);
    default:
      return buildWorksheetPrompt(input);
  }
}

export function buildPosterPrompt(input: ContentCreatorInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    VISUAL_QUALITY_RULES,
    `
Create a CAPS-aligned classroom poster design package for a South African school.

Your job is NOT to generate a random poster.
Your job is to design a high-quality educational poster specification for print or classroom display.

The poster must:
- teach one clear concept
- use concise, learner-friendly wording
- have a strong visual hierarchy
- be readable from 1.5 to 2 metres away when printed on A3
- avoid clutter
- avoid tiny icons
- avoid emojis
- avoid overloading the poster with text
- include one dominant visual scene or diagram that directly supports the topic

Important:
- The image prompt must request a polished, appealing, child-safe, classroom-quality illustration.
- The image prompt must explicitly forbid emojis, tiny icons, watermark text, illegible labels, cluttered infographic styling, and decorative clipart.
- The design must look like a professionally prepared school poster, not a social media graphic.
- Create illustration only. Do not rely on text embedded inside the image as the primary teaching method.

Generate content in **beautifully formatted HTML**. Do NOT use markdown. Do NOT use plain text.
Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>, <img> if images are described) for formatting.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Create a CAPS-aligned classroom poster design package.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Term: ${input.term ?? 'Not specified'}
- Language: ${input.language ?? 'English'}
- Poster purpose: ${input.purpose ?? 'Teach the core concept clearly to learners'}
- Output size: ${input.outputSize ?? 'A3'}
- Style preference: ${input.stylePreference ?? 'Modern, clean, educational'}
- Teacher notes/preferences: ${input.notes ?? 'None'}
- Must include South African context: yes

Poster requirements:
- Use no more than 3 to 5 core teaching points.
- The visual must carry the teaching load, not dense text.
- Prioritise legibility, balance, and educational usefulness.
- Suitable for classroom wall display.

Negative constraints for the visual prompt:
${VISUAL_NEGATIVE_CONSTRAINTS}

${POSTER_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: POSTER_SCHEMA_HINT,
  };
}

export function buildWorksheetPrompt(input: ContentCreatorInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Create a CAPS-aligned worksheet for a South African classroom.

The worksheet must:
- match the learner’s grade and reading level
- clearly support the stated topic
- use simple, clean formatting
- avoid unnecessary decoration
- include clear instructions
- balance recall, understanding, and application where appropriate
- be printable on A4
- be suitable for classwork or homework use

If visuals are needed:
- include a visual_brief
- include an image_prompt
- include visuals only if they directly support learning
- do not suggest emojis or decorative icons

Generate content in **beautifully formatted HTML**. Do NOT use markdown. Do NOT use plain text.
Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>, <img> if images are described) for formatting.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Create a CAPS-aligned worksheet.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Term: ${input.term ?? 'Not specified'}
- Language: ${input.language ?? 'English'}
- Number of questions: ${input.numberOfQuestions ?? 10}
- Difficulty level: ${input.difficultyLevel ?? 'Grade-appropriate mixed difficulty'}
- Include memo: ${input.includeMemo ? 'Yes' : 'No'}
- Special instructions: ${input.notes ?? 'None'}

${WORKSHEET_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: WORKSHEET_SCHEMA_HINT,
  };
}

export function buildStudyGuidePrompt(input: ContentCreatorInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Create a CAPS-aligned study guide for South African learners.

The study guide must:
- explain the topic clearly at grade level
- use short sections and meaningful headings
- define key terms
- include worked examples where appropriate
- highlight common mistakes
- include quick self-check questions
- use learner-friendly language
- be visually clean and easy to revise from

Generate content in **beautifully formatted HTML**. Do NOT use markdown. Do NOT use plain text.
Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>, <img> if images are described) for formatting.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Create a CAPS-aligned study guide.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Term: ${input.term ?? 'Not specified'}
- Language: ${input.language ?? 'English'}
- Desired length: ${input.desiredLength ?? '1 to 2 pages'}
- Exam prep focus: ${input.examFocus ?? 'General understanding and revision'}
- Special instructions: ${input.notes ?? 'None'}

${STUDY_GUIDE_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: STUDY_GUIDE_SCHEMA_HINT,
  };
}

export function buildVisualAidPrompt(input: ContentCreatorInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    VISUAL_QUALITY_RULES,
    `
Create a CAPS-aligned visual aid package for classroom use.

The visual aid must:
- support one clear learning goal
- be easy for learners to interpret
- avoid decorative clutter
- include a concise teacher-facing design plan
- include a high-quality image prompt for educational illustration only
- be suitable for print or display

Generate content in **beautifully formatted HTML**. Do NOT use markdown. Do NOT use plain text.
Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>, <img> if images are described) for formatting.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Create a classroom visual aid package.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Term: ${input.term ?? 'Not specified'}
- Language: ${input.language ?? 'English'}
- Purpose: ${input.purpose ?? 'Support teaching of the topic visually'}
- Output size: ${input.outputSize ?? 'A4'}
- Style preference: ${input.stylePreference ?? 'Clean educational illustration'}
- Notes: ${input.notes ?? 'None'}

Return JSON with:
- curriculum_alignment (string)
- learning_goal (string)
- learner_level (string)
- content_html (string, full HTML content)
- design_spec (string)
- visual_brief (string)
- image_prompt (string)
- teacher_notes (string)

Negative constraints:
${VISUAL_NEGATIVE_CONSTRAINTS}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
  };
}
