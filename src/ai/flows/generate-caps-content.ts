'use server';

import { z } from 'zod';
import { ai } from '../../genkit';

// --- INPUT/OUTPUT SCHEMAS ---
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
  userId: z.string(),
});
export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo?: string;
  rubric?: string;
  docId?: string;
  assessmentCriteria?: string;
  successIndicators?: string[];
};

// --- PROMPT ENGINEERING SYSTEM ---

const MASTER_SYSTEM_PROMPT = `
You are an expert South African CAPS-aligned educational content designer and senior graphic designer specializing in primary and high school learning materials for South African classrooms.

Your task is to generate BEAUTIFUL, PROFESSIONAL, PRINT-READY classroom materials (worksheets, posters, study guides, infographics, flashcards, diagrams, mind maps, etc.) that are:
• 100% aligned to the South African CAPS curriculum
• Age-appropriate and highly engaging for South African learners
• Culturally relevant (include South African contexts, diversity, local animals, landmarks, people, languages where appropriate)
• Visually sophisticated — NEVER use cheap clipart, emojis, or low-quality icons
• Designed with modern educational graphic design principles (clear hierarchy, generous white space, consistent color palette, professional typography)

STYLE REQUIREMENTS (MANDATORY):
- Illustration style: Clean, vibrant, semi-realistic digital illustrations (think award-winning children’s educational books published by Oxford University Press or Maskew Miller Longman — NOT cartoonish or childish beyond the grade level)
- Color palette: Rich but controlled South African-inspired colors (earth tones, bright accents, ocean blues, savanna oranges/greens, rainbow nation diversity)
- Typography: Clean sans-serif fonts for body; bold display fonts only for titles when appropriate
- Layout: Professional grid-based design with perfect alignment, balanced margins, breathing room
- NO emojis, NO smiley faces, NO generic stick figures, NO low-resolution icons

When generating any material, you MUST output:
1. Complete HTML content (with inline styles) for the document.
2. A separate, extremely detailed image generation prompt that will produce a stunning, high-resolution, print-ready illustration.
You are never satisfied with mediocre visuals — aim for materials that South African teachers would proudly display in their classrooms or submit to the DBE as exemplars.
`;

const IMAGE_GOLDEN_RULE = "Ultra-detailed digital illustration, professional educational graphic design, vibrant colors, perfect composition, sharp focus, 300 DPI print quality, award-winning children's non-fiction book style, no text overlays (text will be added separately), no borders, no frames, no watermarks, no emojis, no cartoonish exaggeration, suitable for South African classroom display, museum-quality detail.";

function getSpecificPromptTemplate(contentType: string, grade: string, subject: string, topic: string) {
  const lowerType = contentType.toLowerCase();
  
  if (lowerType.includes('poster') || lowerType.includes('wall chart') || lowerType.includes('visual')) {
    return `
      Create a stunning, museum-quality educational poster for South African Grade ${grade} ${subject} learners on the CAPS topic: "${topic}"

      Design specifications:
      - Size: A2 or A1 portrait orientation, 300 DPI print-ready
      - Style: Modern semi-realistic digital illustration blended with clean educational graphic design
      - Color palette: Vibrant South African-inspired colors (savanna sunset oranges, acacia greens, indigo twilight, rich ochre) with high contrast for readability
      - Background: Subtle textured gradient or beautiful contextual South African scene relevant to the topic (e.g., Kruger bushveld for ecosystems, Table Mountain for geography, rural Eastern Cape classroom for inclusive education, etc.)
      - Main illustration: One large, breathtaking central illustration that captures the core concept (photorealistic quality but still illustrated, no photos)
      - Typography hierarchy: Large bold title at top, Clear section headings, Body text readable from a distance.
      - Include 4-6 key fact boxes or callouts with bullet points
      - Add relevant, beautifully illustrated smaller supporting images around the edges
      - Include the South African coat of arms or CAPS logo discreetly in the bottom corner
      - Diversity: Show South African children from different backgrounds learning together where people are depicted

      Make this the most beautiful educational poster a South African teacher has ever hung in their classroom.
    `;
  } else if (lowerType.includes('worksheet') || lowerType.includes('exercise') || lowerType.includes('homework')) {
    return `
      Design a comprehensive CAPS-aligned worksheet/task for Grade ${grade} ${subject} on "${topic}".
      
      Visual Enhancement:
      Create ONE stunning hero illustration at the top that occupies 25-30% of the page. 
      The illustration must be:
      - Directly related to the specific CAPS topic
      - Set in a recognizable South African context
      - Semi-realistic digital painting style (like children's non-fiction books)
      - Emotionally engaging and curiosity-sparking
      - High detail, rich colors, perfect composition
      
      Additionally, include 2-3 smaller spot illustrations throughout the worksheet to break up text and maintain visual interest. Ensure ample space for learners to write their answers.
    `;
  } else if (lowerType.includes('infographic') || lowerType.includes('mind map')) {
    return `
      Design a visually spectacular CAPS-aligned infographic/mind map on "${topic}" for Grade ${grade} ${subject}.

      Requirements:
      - Central concept in the middle with radiating branches
      - Each branch has a beautifully illustrated icon (custom drawn, not generic)
      - South African contextual examples throughout
      - Color-coded sections with perfect visual hierarchy
      - Style: Modern flat design with subtle textures and depth
      - Include real South African case studies or examples where possible
    `;
  } else if (lowerType.includes('diagram')) {
    return `
      Create a crystal-clear, beautifully illustrated scientific diagram of "${topic}" specifically adapted for South African Grade ${grade} learners in ${subject}.

      Show the process occurring in a real South African landscape:
      - Water cycle: Include Table Mountain, Drakensberg, or Karoo
      - Food chain: Use indigenous animals (lion, impala, acacia tree, vulture, etc.)
      - Rock cycle: Feature South African geological formations
      - Plant structure: Use protea, aloe, or fynbos species

      Style: Clean, labeled, semi-realistic illustration with arrows, soft shadows, and depth. National Geographic kids magazine quality.
    `;
  } else {
    // Default Study Guide/Notes fallback
    return `
      Design a comprehensive, highly visual study guide/resource for Grade ${grade} ${subject} on "${topic}".
      Include stunning, relevant South African contextual illustrations to anchor the core concepts. Use clear visual hierarchy, callout boxes for key facts, and professional typography.
    `;
  }
}

// --- IMAGE GENERATOR HELPER ---
async function generateImage(prompt: string, subject: string, grade: string): Promise<string> {
  const enrichedPrompt = `${prompt}\n\n${IMAGE_GOLDEN_RULE}`;

  try {
    const response = await ai.generate({
      model: 'googleai/imagen-3.0-generate-001', 
      prompt: enrichedPrompt,
      output: { format: 'media' },
    });
    
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

// --- MAIN FLOW ---
export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {
  try {
    // 1. DYNAMICALLY IMPORT FIREBASE (Fixes the SSR 500 crash on page load)
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { firebaseConfig } = await import('@/firebase/config');
    
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    const specificInstructions = getSpecificPromptTemplate(input.contentType, input.grade, input.subject, input.topic);
    
    const userPrompt = `
      REQUESTED CONTENT:
      - Grade: ${input.grade}
      - Subject: ${input.subject}
      - Topic: ${input.topic}
      - Content Type: ${input.contentType}
      - Term: ${input.term || 'General'}
      - Language: ${input.language || 'English'}
      
      ADDITIONAL CONTEXT:
      - Objective: ${input.objective || 'N/A'}
      - Learner Profile: ${input.learnerProfile || 'General South African Classroom'}
      - Duration: ${input.duration || 'N/A'}
      - Extra Instructions: ${input.additionalInstructions || 'None'}
      - Teacher Name: ${input.teacherName || 'Educator'}

      SPECIFIC DESIGN INSTRUCTIONS:
      ${specificInstructions}

      OUTPUT FORMAT INSTRUCTIONS:
      You MUST return your response as a valid JSON object. Do not wrap it in markdown formatting (no code blocks). Return ONLY the raw JSON object structured exactly like this:
      {
        "content_html": "<The complete HTML for the document, using ONLY inline CSS styles. No classes.>",
        "description": "<A brief 1-sentence summary of the content>",
        "assessmentCriteria": "<HTML string of CAPS assessment criteria if applicable, else empty string>",
        "successIndicators": ["indicator 1", "indicator 2"],
        "memo_if_requested": {
          "included": true,
          "answers": [
            { "question_number": "1", "answer": "Answer text" }
          ]
        },
        "rubric": "<HTML string of a grading rubric if applicable, else empty string>",
        "image_prompt": "<The highly detailed, beautifully descriptive image generation prompt based on the specific design instructions>"
      }
    `;

    const response = await ai.generate({
      model: 'googleai/gemini-3.1-pro-preview',
      system: MASTER_SYSTEM_PROMPT,
      prompt: userPrompt,
      config: {
        temperature: 0.65,
      },
      output: { format: 'json' },
    });

    if (!response.text) {
      throw new Error('Content generation returned no output.');
    }
    
    // Safely parse JSON by removing Markdown wrappers robustly
    let cleanText = response.text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
    cleanText = cleanText.trim();
    
    let parsedContent: any;
    try {
        parsedContent = JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse JSON from model, falling back to raw text:", cleanText);
        return { content: cleanText }; 
    }

    let finalHtmlContent = parsedContent.content_html || ''; 
    
    // Handle Image Generation if an image prompt was provided
    if (parsedContent.image_prompt) {
        const dataUri = await generateImage(parsedContent.image_prompt, input.subject, input.grade);
        
        if (dataUri) {
            finalHtmlContent = `
              <div style="margin-bottom: 24px; text-align: center;">
                <img src="${dataUri}" alt="Educational Illustration" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />
              </div>
              ${finalHtmlContent}
            `;
        } else {
            finalHtmlContent = `\n${finalHtmlContent}`;
        }
    }
    
    let assessmentCriteria = parsedContent.assessmentCriteria || '';
    let successIndicators = parsedContent.successIndicators || [];

    // Construct the Memo HTML
    let memoHtml = '';
    if (parsedContent.memo_if_requested?.included && parsedContent.memo_if_requested?.answers) {
         memoHtml += `<h2 style="color: #1a56db; font-size: 1.25rem; font-weight: bold; margin-bottom: 1rem;">Memorandum</h2>`;
         parsedContent.memo_if_requested.answers.forEach((ans: any) => {
             memoHtml += `<p style="margin-bottom: 0.5rem;"><strong style="color: #374151;">${ans.question_number}.</strong> <span style="color: #4b5563;">${ans.answer}</span></p>`;
         });
    }

    // Save strictly to the Firestore Content Archive
    const docRef = await addDoc(collection(db, 'teachers', input.userId, 'generatedContent'), {
      teacherId: input.userId,
      grade: input.grade,
      subject: input.subject,
      topic: input.topic,
      contentType: input.contentType,
      category: input.category,
      content: finalHtmlContent,
      description: parsedContent.description || '',
      assessmentCriteria: assessmentCriteria,
      successIndicators: successIndicators,
      memo: memoHtml,
      rubric: parsedContent.rubric || '',
      createdAt: serverTimestamp(),
      modelUsed: 'gemini-3.1-pro-preview',
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
    console.error('generateCAPSContent error:', error);
    throw new Error(
      `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}