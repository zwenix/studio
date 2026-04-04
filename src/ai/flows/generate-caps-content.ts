'use server';

import { z } from 'zod';
import { ai } from '../../genkit';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Safely initialize Firebase for server-side usage (Prevents 'getApp()' crashes on hot reloads)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

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

const IMAGE_GOLDEN_RULE = `Ultra-detailed digital illustration, professional educational graphic design, vibrant colors, perfect composition, sharp focus, 300 DPI print quality, award-winning children's non-fiction book style, no text overlays (text will be added separately), no borders, no frames, no watermarks, no emojis, no cartoonish exaggeration, suitable for South African classroom display, museum-quality detail.`;

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
      // Use the correct Imagen 3 model alias
      model: 'googleai/imagen-3.0-generate-001', 
      prompt: enrichedPrompt,
      output: { format: 'media' },
    });
    
    if (response.media?.url) return response.media.url;
    
    // Deeper check for inline data if the API returns it differently
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
      You MUST return your response as a valid JSON object. Do not wrap it in markdown formatting (like \`\`\`json). Return ONLY the raw JSON object structured exactly like this:
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
        maxOutputTokens: 8000,
      },
      output: { format: 'json' },
    });

    if (!response.text) {
      throw new Error('Content generation returned no output.');
    }
    
    // Safely parse the JSON by stripping any markdown code fences Gemini might accidentally include
    const cleanText = response.text.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(cleanText);

    // --- IMAGE GENERATION ---
    let imageUrl = '';
    if (parsed.image_prompt) {
      imageUrl = await generateImage(parsed.image_prompt, input.subject, input.grade);
    }

    // --- HTML POST-PROCESSING ---
    // Inject the generated image into the HTML if a placeholder exists or at the top
    let finalHtml = parsed.content_html;
    if (imageUrl) {
      const imageHtml = `
        <div style="width: 100%; margin-bottom: 30px; text-align: center;">
          <img src="${imageUrl}" alt="${input.topic}" style="width: 100%; max-width: 800px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e0e0e0;" />
        </div>
      `;
      
      if (finalHtml.includes('<!-- IMAGE_PLACEHOLDER -->')) {
        finalHtml = finalHtml.replace('<!-- IMAGE_PLACEHOLDER -->', imageHtml);
      } else {
        // Insert after the first <div> or <body> tag if found, otherwise at the top
        const insertIndex = finalHtml.indexOf('>') + 1;
        finalHtml = finalHtml.slice(0, insertIndex) + imageHtml + finalHtml.slice(insertIndex);
      }
    }

    // --- MEMO FORMATTING ---
    let memoHtml = '';
    if (parsed.memo_if_requested?.included) {
      memoHtml = `
        <div style="font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6;">
          <h1 style="color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px;">Memorandum: ${input.topic}</h1>
          <p><strong>Grade:</strong> ${input.grade} | <strong>Subject:</strong> ${input.subject}</p>
          <div style="margin-top: 20px;">
            ${parsed.memo_if_requested.answers.map((a: any) => `
              <div style="margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #1a56db;">
                <p><strong>Question ${a.question_number}:</strong></p>
                <p>${a.answer}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // --- FIREBASE PERSISTENCE ---
    let docId = '';
    try {
      const docRef = await addDoc(collection(db, 'generatedContent'), {
        userId: input.userId,
        grade: input.grade,
        subject: input.subject,
        topic: input.topic,
        contentType: input.contentType,
        category: input.category,
        content: finalHtml,
        memo: memoHtml || null,
        rubric: parsed.rubric || null,
        assessmentCriteria: parsed.assessmentCriteria || null,
        successIndicators: parsed.successIndicators || [],
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        metadata: {
          term: input.term,
          language: input.language,
          objective: input.objective,
        }
      });
      docId = docRef.id;
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      // Continue even if DB save fails, so user gets their content
    }

    return {
      content: finalHtml,
      memo: memoHtml,
      rubric: parsed.rubric,
      docId: docId,
      assessmentCriteria: parsed.assessmentCriteria,
      successIndicators: parsed.successIndicators,
    };

  } catch (error) {
    console.error('CAPS Content Generation Error:', error);
    return {
      content: `
        <div style="padding: 20px; border: 1px solid #f87171; background: #fef2f2; color: #991b1b; border-radius: 8px;">
          <h2 style="margin-top: 0;">Generation Error</h2>
          <p>We encountered an issue generating your CAPS content. Please try again or refine your topic.</p>
          <p style="font-size: 12px; opacity: 0.7;">Details: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `,
    };
  }
}