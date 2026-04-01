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

async function generateImage(prompt: string, subject: string, grade: string): Promise<string> {
  const enrichedPrompt = [
    `Educational illustration for South African Grade ${grade} ${subject}.`,
    prompt,
    'Style: bright, clear, child-friendly flat illustration.',
    'No text overlays, no logos, no watermarks, no emojis.',
    'Suitable for printing on A4 classroom worksheets.',
    'Diverse South African children and environments where people are shown.',
  ].join(' ');

  try {
    const response = await ai.generate({
      model: 'googleai/gemini-flash-live-latest', // Changed to a multimodal-capable model for images
      prompt: enrichedPrompt,
      config: { responseModalities: ['IMAGE'] },
      output: { format: 'media' },
    });
    
    // The exact property path might vary slightly depending on the SDK version, checking standard locations
    if (response.media?.url) return response.media.url;
    
    const parts = (response as any).candidates?.[0]?.message?.content ?? [];
    for (const part of parts) {
      if (part?.media?.url) return part.media.url;
      if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.error('Image generation failed:', e);
  }

  return '';
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
      model: 'googleai/gemini-pro-latest',
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      output: { format: 'json' },
    });

    if (!response.text) {
      throw new Error('Content generation returned no output.');
    }
    
    let parsedContent: any;
    try {
        parsedContent = JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse JSON from model, falling back to raw text:", response.text);
        return { content: response.text };
    }

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

    if (parsedContent.worksheet_sections) {
        parsedContent.worksheet_sections.forEach((section: any) => {
            finalMarkdown += `## ${section.section_title}\n`;
            if (section.section_instructions) finalMarkdown += `*${section.section_instructions}*\n\n`;
            section.questions?.forEach((q: any) => {
                finalMarkdown += `**${q.number}.** ${q.question} (${q.marks} marks)\n\n`;
            });
        });
    }

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

    if (parsedContent.poster_text?.key_points) {
        parsedContent.poster_text.key_points.forEach((point: string) => finalMarkdown += `- ${point}\n`);
        finalMarkdown += `\n`;
    }
    
    // --- RESTORED AND FIXED IMAGE GENERATION LOGIC ---
    if (parsedContent.image_prompt || parsedContent.visual_brief) {
        const promptToUse = parsedContent.image_prompt || parsedContent.visual_brief?.description || parsedContent.visual_brief?.main_scene;
        
        if (promptToUse) {
            const dataUri = await generateImage(promptToUse, input.subject, input.grade);
            
            if (dataUri) {
                finalMarkdown += `\n<div class="my-6 text-center">
  <img
    src="${dataUri}"
    alt="Educational illustration: ${promptToUse.substring(0, 80)}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px] w-auto"
    style="max-width:100%;height:auto;"
  />
</div>\n`;
            } else {
                finalMarkdown += `\n---\n*[Image Generation Failed for Prompt: ${promptToUse}]*\n`;
            }
        }
    }
    
    if (finalMarkdown === '' && parsedContent) {
         finalMarkdown = JSON.stringify(parsedContent, null, 2);
    }

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
