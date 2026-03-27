import { BuiltPrompt, BaseEduInput } from '../core/prompt-types';
import { GLOBAL_EDU_SYSTEM_RULES, JSON_ONLY_RULE } from '../core/global-rules';
import { LESSON_STUDIO_SCHEMA_HINT } from '../core/json-schema-formatters';
import { joinSections, cleanMultiline } from '../core/prompt-utils';

export interface LessonStudioInput extends BaseEduInput {
  durationMinutes?: number;
  languageOfLearningAndTeaching?: string;
}

export function buildLessonStudioPrompt(input: LessonStudioInput): BuiltPrompt {
  const systemInstruction = joinSections(
    GLOBAL_EDU_SYSTEM_RULES,
    `
Generate a detailed CAPS-style lesson plan for a South African teacher.

The lesson plan must include:
- Subject
- Grade
- Topic
- CAPS linkage or assumed curriculum alignment
- Lesson duration
- Learning objectives
- Prior knowledge
- Key vocabulary
- Resources needed
- Introduction / Hook
- Direct instruction / teacher input
- Guided practice
- Independent practice
- Informal assessment
- Differentiation / support / enrichment
- Classroom management notes where relevant
- Conclusion / reflection
- Homework or extension if appropriate

Quality rules:
- Make the sequence practical and realistic for a South African classroom.
- Avoid vague activities unless detailed.
- Include examples relevant to South African learners where appropriate.
- Match complexity to the grade.
- Ensure activities clearly support the objectives.
- If Foundation Phase, include concrete, oral, sensory, and visual learning where appropriate.
- If Intermediate, Senior, or FET, include cognitive progression and subject-specific skills.
`,
    JSON_ONLY_RULE
  );

  const userPrompt = cleanMultiline(`
Generate a CAPS-aligned lesson plan.

Inputs:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Term: ${input.term ?? 'Not specified'}
- Topic: ${input.topic}
- Lesson duration: ${input.durationMinutes ?? 60} minutes
- Language of learning and teaching: ${input.languageOfLearningAndTeaching ?? input.language ?? 'English'}
- Teacher notes/preferences: ${input.notes ?? 'None'}

${LESSON_STUDIO_SCHEMA_HINT}
  `);

  return {
    systemInstruction,
    userPrompt,
    expectedFormat: 'json',
    schemaHint: LESSON_STUDIO_SCHEMA_HINT,
  };
}
