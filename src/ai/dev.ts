'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-caps-content.ts';
import '@/ai/flows/generate-memos-rubrics.ts';
import '@/ai/flows/extract-text-from-images.ts';
import '@/ai/flows/ai-tutor-flow.ts';
import '@/ai/flows/tts-flow.ts';
import '@/ai/flows/autograder-flow.ts';
import '@/ai/flows/generate-mock-assessment.ts';
