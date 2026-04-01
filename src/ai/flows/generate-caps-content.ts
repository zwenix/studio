'use server';

import { z } from 'zod';
import { ai } from '../../genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { buildContentCreatorPrompt } from '@/ai/prompts';

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1-12, or custom).'),
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.string(),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});
export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo?: string;
  rubric?: string;
};

function mapCategoryToPromptType(category: string, contentType: string): 'poster' | 'worksheet' | 'study_guide' | 'visual_aid' {
  const lowerContentType = contentType.toLowerCase();
  
  if (lowerContentType.includes('poster') || lowerContentType.includes('visual')) {
      return 'poster';
  }
  if (lowerContentType.includes('worksheet') || lowerContentType.includes('exercise') || lowerContentType.includes('homework') || category === 'Assignments, Exercises & Tasks') {
      return 'worksheet';
  }
  if (lowerContentType.includes('study guide') || lowerContentType.includes('notes') || lowerContentType.includes('booklet')) {
      return 'study_guide';
  }
  if (category === 'Teaching Tools & Aids') {
       return 'visual_aid';
  }
  
  return 'worksheet'; // fallback
}

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  try {
    const promptType = mapCategoryToPromptType(input.category, input.contentType);
    
    const promptParams = buildContentCreatorPrompt({
        contentType: promptType,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        term: input.term,
        language: input.language,
        notes: `
            Content Type specifically requested: ${input.contentType}. 
            Objective: ${input.objective || 'N/A'}. 
            Learner Profile: ${input.learnerProfile || 'General'}. 
            Duration: ${input.duration || 'N/A'}. 
            Additional Instructions: ${input.additionalInstructions || 'None'}
            Teacher Name to include if applicable: ${input.teacherName || 'Educator'}
        `,
    });

    const response = await ai.generate({
      model: googleAI.model('gemini-3.1-pro-preview'),
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      output: { format: 'json' },
    });

    if (!response.text) {
      throw new Error('Content generation returned no output.');
    }
    
    // Attempt to parse the JSON response from the model
    let parsedContent: any;
    try {
        parsedContent = JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse JSON from model, falling back to raw text:", response.text);
        return { content: response.text };
    }

    // Convert the structured JSON back into markdown for the frontend editor
    let finalMarkdown = '';
    
    if (parsedContent.title || parsedContent.poster_text?.title) {
        finalMarkdown += `# ${parsedContent.title || parsedContent.poster_text.title}\n\n`;
    }
    
    if (parsedContent.subtitle || parsedContent.poster_text?.subtitle) {
        finalMarkdown += `*${parsedContent.subtitle || parsedContent.poster_text.subtitle}*\n\n`;
    }

    if (parsedContent.instructions) {
        finalMarkdown += `**Instructions:**\n${Array.isArray(parsedContent.instructions) ? parsedContent.instructions.join('\n') : parsedContent.instructions}\n\n`;
    }

    // Worksheets
    if (parsedContent.worksheet_sections) {
        parsedContent.worksheet_sections.forEach((section: any) => {
            finalMarkdown += `## ${section.section_title}\n`;
            if (section.section_instructions) finalMarkdown += `*${section.section_instructions}*\n\n`;
            section.questions?.forEach((q: any) => {
                finalMarkdown += `**${q.number}.** ${q.question} (${q.marks} marks)\n\n`;
            });
        });
    }

    // Study Guides
    if (parsedContent.summary_sections) {
        parsedContent.summary_sections.forEach((section: any) => {
            finalMarkdown += `## ${section.heading}\n\n`;
            if (Array.isArray(section.content)) {
                section.content.forEach((c: string) => finalMarkdown += `${c}\n\n`);
            } else {
                 finalMarkdown += `${section.content}\n\n`;
            }
        });
    }
    
    if (parsedContent.key_terms) {
         finalMarkdown += `## Key Terms\n\n`;
         parsedContent.key_terms.forEach((term: any) => {
             finalMarkdown += `- **${term.term}:** ${term.definition}\n`;
         });
         finalMarkdown += `\n`;
    }

    // Posters
    if (parsedContent.poster_text?.key_points) {
        parsedContent.poster_text.key_points.forEach((point: string) => finalMarkdown += `- ${point}\n`);
        finalMarkdown += `\n`;
    }
    
    // Image Prompts (we output this as a comment or note for the teacher since we removed auto-image generation to save latency/errors)
    if (parsedContent.image_prompt) {
         finalMarkdown += `\n---\n*Suggested Visual:* ${parsedContent.image_prompt}\n`;
    }
    
    // Fallback if structure wasn't strictly followed
    if (finalMarkdown === '' && parsedContent) {
         finalMarkdown = JSON.stringify(parsedContent, null, 2);
    }

    // Extract Memo if it exists
    let memoMarkdown = '';
    if (parsedContent.memo_if_requested?.included && parsedContent.memo_if_requested?.answers) {
         memoMarkdown += `## Memorandum\n\n`;
         parsedContent.memo_if_requested.answers.forEach((ans: any) => {
             memoMarkdown += `**${ans.question_number}.** ${ans.answer}\n\n`;
         });
    }

    return { 
        content: finalMarkdown,
        memo: memoMarkdown,
    };
  } catch (error) {
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
