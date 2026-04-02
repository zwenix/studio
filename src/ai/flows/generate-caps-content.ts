\'use server\';

import { z } from \'zod\';
import { ai } from \'../../genkit\';
import { googleAI, gemini31Pro } from \'@genkit-ai/google-genai\'; // Import gemini31Pro
import { buildContentCreatorPrompt } from \'@/ai/prompts\';
import { db } from \'@/firebase\'; // Import Firebase db
import { collection, addDoc, serverTimestamp } from \'firebase/firestore\'; // Import Firestore functions

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string().describe(\'The grade level (R, 1-12, or custom).\'),
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
  userId: z.string(), // Added userId
});
export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo?: string;
  rubric?: string;
  docId?: string; // Added docId to output
  assessmentCriteria?: string; // Added assessmentCriteria
  successIndicators?: string[]; // Added successIndicators
};

function mapCategoryToPromptType(category: string, contentType: string): \'poster\' | \'worksheet\' | \'study_guide\' | \'visual_aid\' {
  const lowerContentType = contentType.toLowerCase();
  
  if (lowerContentType.includes(\'poster\') || lowerContentType.includes(\'visual\')) {
      return \'poster\';
  }
  if (lowerContentType.includes(\'worksheet\') || lowerContentType.includes(\'exercise\') || lowerContentType.includes(\'homework\') || category === \'Assignments, Exercises & Tasks\') {
      return \'worksheet\';
  }
  if (lowerContentType.includes(\'study guide\') || lowerContentType.includes(\'notes\') || lowerContentType.includes(\'booklet\')) {
      return \'study_guide\';
  }
  if (category === \'Teaching Tools & Aids\') {
       return \'visual_aid\';
  }
  
  return \'worksheet\'; // fallback
}

async function generateImage(prompt: string, subject: string, grade: string): Promise<string> {
  const enrichedPrompt = [
    `Educational illustration for South African Grade ${grade} ${subject}.`,
    prompt,
    \'Style: bright, clear, child-friendly flat illustration.\',
    \'No text overlays, no logos, no watermarks, no emojis.\',
    \'Suitable for printing on A4 classroom worksheets.\',
    \'Diverse South African children and environments where people are shown.\',
  ].join(\' \');

  try {
    const response = await ai.generate({
      model: googleAI.gemini31FlashImage, // Use the correct alias for image generation
      prompt: enrichedPrompt,
      config: { 
        responseMimeType: \'image/jpeg\', // Request JPEG for broader compatibility
        responseModality: \'image\', // Request image output
      },
      output: { format: \'media\' },
    });
    
    if (response.media?.[0]?.url) return response.media[0].url;
    
    // Deeper check for inline data if the API returns it differently
    const parts = (response as any).candidates?.[0]?.message?.content ?? [];
    for (const part of parts) {
      if (part?.media?.url) return part.media.url;
      if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.error(\'Image generation failed:\', e);
  }

  return \'\';
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
            Objective: ${input.objective || \'N/A\'}. 
            Learner Profile: ${input.learnerProfile || \'General\'}. 
            Duration: ${input.duration || \'N/A\'}. 
            Additional Instructions: ${input.additionalInstructions || \'None\'}
            Teacher Name to include if applicable: ${input.teacherName || \'Educator\'}
        `,
    });

    const response = await ai.generate({
      model: gemini31Pro, // Using gemini31Pro for CAPS content, as per request
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      config: {
        temperature: 0.65,
        maxOutputTokens: 5000,
        version: \'3.1\',
        thinkingLevel: \'medium\',
        responseMimeType: \'application/json\',
      },
      output: { format: \'json\' },
    });

    if (!response.text) {
      throw new Error(\'Content generation returned no output.\');
    }
    
    let parsedContent: any;
    try {
        parsedContent = JSON.parse(response.text);
    } catch (e) {
        console.error(\"Failed to parse JSON from model, falling back to raw text:\", response.text);
        return { content: response.text }; // Fallback to raw text if JSON parsing fails
    }

    let finalHtmlContent = parsedContent.content_html || ''; // Expecting content_html from the prompt
    
    // --- IMAGE GENERATION LOGIC ---
    if (parsedContent.image_prompt || parsedContent.visual_brief) {
        const promptToUse = parsedContent.image_prompt || parsedContent.visual_brief?.description || parsedContent.visual_brief?.main_scene;
        
        if (promptToUse) {
            const dataUri = await generateImage(promptToUse, input.subject, input.grade);
            
            if (dataUri) {
                // Insert the image HTML into the final content
                finalHtmlContent += `\n<div class=\"my-6 text-center\">\n  <img\n    src=\"${dataUri}\"\n    alt=\"Educational illustration: ${promptToUse.substring(0, 80)}\"\n    class=\"rounded-xl shadow-lg mx-auto max-h-[400px] w-auto\"\n    style=\"max-width:100%;height:auto;\"\n  />\n</div>\n`;
            } else {
                finalHtmlContent += `\n<!-- Image Generation Failed for Prompt: ${promptToUse} -->\n`;
            }
        }
    }
    
    // Constructing the assessment criteria and success indicators if available
    let assessmentCriteria = parsedContent.assessmentCriteria || '';
    let successIndicators = parsedContent.successIndicators || [];

    let memoHtml = '';
    if (parsedContent.memo_if_requested?.included && parsedContent.memo_if_requested?.answers) {
         memoHtml += `<h2>Memorandum</h2>`;
         parsedContent.memo_if_requested.answers.forEach((ans: any) => {
             memoHtml += `<p><strong>${ans.question_number}.</strong> ${ans.answer}</p>`;
         });
    }

    // Save to Firebase Content Archive
    const docRef = await addDoc(collection(db, \'teachers\', input.userId, \'generatedContent\'), {
      teacherId: input.userId,
      grade: input.grade,
      subject: input.subject,
      topic: input.topic,
      contentType: input.contentType,
      category: input.category,
      content: finalHtmlContent,
      description: parsedContent.description || \'\',
      assessmentCriteria: assessmentCriteria,
      successIndicators: successIndicators,
      memo: memoHtml,
      rubric: parsedContent.rubric || \'\',
      createdAt: serverTimestamp(),
      modelUsed: \'gemini31Pro\',
      capsAligned: true,
    });

    return { 
        content: finalHtmlContent,
        memo: memoHtml,
        rubric: parsedContent.rubric,
        docId: docRef.id,
        assessmentCriteria: assessmentCriteria,
        successIndicators: successIndicators,
    };
  } catch (error) {
    console.error(\'generateCAPSContent error:\', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : \'Unknown error\'}`
    );
  }
}