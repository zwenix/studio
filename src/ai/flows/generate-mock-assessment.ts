'use server';

/**
 * @fileOverview Generates mock assessments using Groq.
 */

import { groqGenerateJSON } from '@/ai/groq-client';
import { z } from 'zod';

const GenerateMockAssessmentInputSchema = z.object({
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  difficulty: z.string().optional(),
  assessmentFormat: z.string().optional(),
  length: z.string().optional(),
});

export type GenerateMockAssessmentInput = z.infer<typeof GenerateMockAssessmentInputSchema>;

const GenerateMockAssessmentOutputSchema = z.object({
  content: z.string(),
  memo: z.string(),
  rubric: z.string(),
});

export type GenerateMockAssessmentOutput = z.infer<typeof GenerateMockAssessmentOutputSchema>;

export async function generateMockAssessment(input: GenerateMockAssessmentInput): Promise<GenerateMockAssessmentOutput> {
  const prompt = `You are an expert AI assistant that helps students prepare for their exams by creating practice assessments.

Generate a short practice assessment based on the grade, subject, and topic specified.
The assessment should be designed to test the student's knowledge.

Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Difficulty: ${input.difficulty || 'Medium'}
Format: ${input.assessmentFormat || 'mixed'}
Length: ${input.length || '10 questions'}

CRITICAL: Return the output as JSON with 'content', 'memo', and 'rubric' as clean HTML strings. 
For Grades R-7, wrap content in <div class="font-patrick-hand"> and use emojis.
Conclude 'content' with a horizontal rule and footnote: <em>Created using EduAICompanion. All rights reserved by Zwelakhe Msuthu 2026.</em>`;

  return groqGenerateJSON<GenerateMockAssessmentOutput>([
    { role: 'system', content: prompt }
  ]);
}
