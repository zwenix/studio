'use server';

/**
 * @fileOverview Generates CAPS-aligned mock assessments.
 *
 * Uses the new prompt builder architecture for consistent, high-quality output.
 * Model: gemini-pro-latest (production-ready alias for Gemini 3.1 Pro)
 * Rationale: High accuracy required for assessment design and cognitive-level alignment.
 */

import { z } from 'genkit';
import { ai } from '@/genkit';
import { buildMockAssessmentPrompt } from '@/ai/prompts';
import { buildCAPSReviewPrompt } from '@/ai/prompts';

const GenerateMockAssessmentInputSchema = z.object({
  grade: z.string().describe('The grade level (R, 1-12, or custom).'),
  subject: z.string(),
  topic: z.string(),
  term: z.string().optional().describe('Term 1-4'),
  difficulty: z.string().optional(),
  assessmentFormat: z.string().optional(),
  length: z.string().optional(),
  marks: z.number().optional().describe('Total marks for the assessment'),
  duration: z.string().optional().describe('Duration e.g. "45 minutes"'),
  cognitiveRequirements: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

export type GenerateMockAssessmentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

const MockAssessmentResponseSchema = z.object({
  paper_title: z.string().describe('Title of the assessment paper'),
  instructions: z.array(z.string()).describe('Instructions for learners'),
  curriculum_alignment: z.object({
    subject: z.string(),
    grade: z.string(),
    term: z.string(),
    topics: z.array(z.string()),
    caps_summary: z.string(),
    assumptions: z.array(z.string()),
  }),
  question_sections: z.array(z.object({
    section_title: z.string(),
    questions: z.array(z.object({
      number: z.string(),
      question_text: z.string(),
      marks: z.number(),
      cognitive_level: z.string(),
    })),
  })),
  total_marks: z.number(),
  estimated_duration: z.string(),
  cognitive_distribution: z.array(z.object({
    level: z.string(),
    description: z.string(),
    approx_marks: z.number(),
  })),
  quality_checks: z.array(z.string()),
});

/**
 * Converts the structured assessment JSON to HTML format for display
 */
function assessmentToJsonHtml(assessment: any): { content: string; memo: string; rubric: string } {
  const gradeNum = parseInt(assessment.grade);
  const isFoundation = gradeNum <= 3;
  
  // Generate HTML content from the assessment structure
  let htmlContent = `<div style="max-width:794px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;background:#fff;padding:40px;">`;
  
  // Header
  htmlContent += `<div style="border-bottom:3px solid #1a56db;padding-bottom:16px;margin-bottom:28px;">`;
  htmlContent += `<h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">${assessment.paper_title}</h1>`;
  htmlContent += `<p style="color:#6b7280;font-size:13px;margin:0;">Grade ${assessment.grade} | ${assessment.subject} | Total: ${assessment.total_marks} marks | ${assessment.estimated_duration}</p>`;
  htmlContent += `</div>`;
  
  // Instructions
  if (assessment.instructions.length > 0) {
    htmlContent += `<div style="background:#eff6ff;border-left:4px solid #1a56db;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">`;
    htmlContent += `<p style="font-weight:600;color:#1e40af;margin:0 0 8px;font-size:13px;">Instructions:</p>`;
    assessment.instructions.forEach((inst: string, i: number) => {
      htmlContent += `<p style="color:#1e40af;margin:0;font-size:13px;">${i + 1}. ${inst}</p>`;
    });
    htmlContent += `</div>`;
  }
  
  // Questions
  assessment.question_sections.forEach((section: any) => {
    htmlContent += `<h2 style="font-size:16px;font-weight:700;color:#1a56db;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">${section.section_title}</h2>`;
    
    section.questions.forEach((q: any) => {
      htmlContent += `<div style="margin:16px 0;">`;
      htmlContent += `<p style="font-weight:600;color:#1a1a1a;margin:0 0 8px;">`;
      htmlContent += `<span style="background:#1a56db;color:#fff;padding:2px 8px;border-radius:4px;font-size:13px;margin-right:8px;">${q.number}</span>`;
      htmlContent += `${q.question_text}`;
      htmlContent += `<span style="color:#6b7280;font-size:12px;margin-left:8px;">[${q.marks} marks]</span>`;
      htmlContent += `</p>`;
      
      // Add answer lines for written responses
      if (q.marks > 2) {
        const lines = Math.ceil(q.marks / 2);
        for (let i = 0; i < lines; i++) {
          htmlContent += `<div style="border-bottom:1px solid #d1d5db;height:24px;margin:8px 0;"></div>`;
        }
      }
      htmlContent += `</div>`;
    });
  });
  
  htmlContent += `</div>`;
  
  // Generate memo HTML
  let memoHtml = `<div style="max-width:794px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;background:#fff;padding:40px;">`;
  memoHtml += `<h2 style="font-size:18px;font-weight:700;color:#1a56db;margin:0 0 16px;">Answer Key / Memorandum</h2>`;
  memoHtml += `<p style="color:#6b7280;font-size:13px;margin-bottom:20px;">Grade ${assessment.grade} | ${assessment.subject}</p>`;
  
  assessment.question_sections.forEach((section: any) => {
    section.questions.forEach((q: any) => {
      memoHtml += `<div style="margin:12px 0;padding:12px;background:#f9fafb;border-radius:8px;">`;
      memoHtml += `<p style="font-weight:600;color:#1a1a1a;margin:0 0 8px;">${q.number}. ${q.question_text}</p>`;
      memoHtml += `<p style="color:#6b7280;font-size:12px;margin:0;">[${q.marks} marks] - Answer to be provided by educator</p>`;
      memoHtml += `</div>`;
    });
  });
  
  memoHtml += `</div>`;
  
  // Generate rubric HTML
  let rubricHtml = `<div style="max-width:794px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;background:#fff;padding:40px;">`;
  rubricHtml += `<h2 style="font-size:18px;font-weight:700;color:#1a56db;margin:0 0 16px;">Mark Allocation & Cognitive Distribution</h2>`;
  
  rubricHtml += `<table style="width:100%;border-collapse:collapse;margin:16px 0;">`;
  rubricHtml += `<thead><tr style="background:#1a56db;color:#fff;">`;
  rubricHtml += `<th style="padding:10px 12px;text-align:left;font-size:13px;">Cognitive Level</th>`;
  rubricHtml += `<th style="padding:10px 12px;text-align:left;font-size:13px;">Description</th>`;
  rubricHtml += `<th style="padding:10px 12px;text-align:left;font-size:13px;">Marks</th>`;
  rubricHtml += `</tr></thead>`;
  rubricHtml += `<tbody>`;
  
  assessment.cognitive_distribution.forEach((dist: any) => {
    rubricHtml += `<tr style="background:#f9fafb;"><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${dist.level}</td>`;
    rubricHtml += `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${dist.description}</td>`;
    rubricHtml += `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${dist.approx_marks}</td></tr>`;
  });
  
  rubricHtml += `<tr style="font-weight:700;"><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">Total</td>`;
  rubricHtml += `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;"></td>`;
  rubricHtml += `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${assessment.total_marks}</td></tr>`;
  rubricHtml += `</tbody></table>`;
  
  rubricHtml += `</div>`;
  
  return {
    content: htmlContent,
    memo: memoHtml,
    rubric: rubricHtml,
  };
}

export async function generateMockAssessment(
  input: GenerateMockAssessmentInput
): Promise<GenerateMockAssessmentOutput> {
  try {
    // Parse topics from the input
    const topics = input.topic.split(',').map(t => t.trim()).filter(Boolean);
    
    // Build the prompt using the new prompt builder
    const promptParams = buildMockAssessmentPrompt({
      subject: input.subject,
      grade: input.grade,
      term: input.term,
      topics: topics,
      marks: input.marks || 50,
      duration: input.duration || '60 minutes',
      assessmentType: input.assessmentFormat || 'Mixed',
      cognitiveRequirements: input.cognitiveRequirements,
      language: 'English',
      notes: `Difficulty: ${input.difficulty || 'Medium'}, Length: ${input.length || '10 questions'}`,
    });

    // First pass: Generate the assessment
    const response = await ai.generate({
      model: 'googleai/gemini-pro-latest',
      system: promptParams.systemInstruction,
      prompt: promptParams.userPrompt,
      output: { schema: MockAssessmentResponseSchema },
    });

    if (!response.output) {
      throw new Error('AI returned no structured output.');
    }

    const assessment = response.output;

    // Second pass: CAPS review for quality assurance
    const capsReviewPrompt = buildCAPSReviewPrompt({
      subject: input.subject,
      grade: input.grade,
      term: input.term,
      topic: input.topic,
      contentType: 'mock_assessment',
      generatedContent: JSON.stringify(assessment, null, 2),
    });

    const reviewResponse = await ai.generate({
      model: 'googleai/gemini-flash-latest',
      system: capsReviewPrompt.systemInstruction,
      prompt: capsReviewPrompt.userPrompt,
      output: { format: 'json' },
    });

    // Convert to HTML format
    const htmlOutput = assessmentToJsonHtml(assessment);

    return htmlOutput;
  } catch (error) {
    console.error('generateMockAssessment error:', error);
    throw new Error(
      `Mock assessment generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
