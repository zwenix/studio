There are two separate problems causing images to not appear:

Problem 1: imageSearchTool is defined using ai.defineTool() from Genkit. Now that generate-caps-content.ts no longer goes through Genkit's flow system, calling imageSearchTool({ query }) still works as a plain async function — but the underlying pexels client and Pixabay fetch are fine. The real issue is...

Problem 2: The Groq model, when asked to produce JSON, inconsistently includes the VISUAL_AIDS section inside the JSON string. Because the content is now a JSON field (not free-form text), Groq often embeds the VISUAL_AIDS block as escaped HTML or omits it entirely — making the regex html.match(/VISUAL_AIDS[\s\S]*$/i) find nothing, so zero images get fetched.

The fix is to restructure the prompt to return image descriptions as a separate JSON array instead of embedding them in the HTML string. This makes parsing reliable and completely independent of how Groq formats the content.

Here is the complete replacement for src/ai/flows/generate-caps-content.ts:

ts
'use server';

import { z } from 'zod';
import { groqGenerateJSON } from '@/ai/groq-client';
import { createClient } from 'pexels';

// ─── Types ────────────────────────────────────────────────────────────────────

const GradeSchema = z.enum(['R','1','2','3','4','5','6','7','8','9','10','11','12']);

const GenerateCAPSContentInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.enum(['Teaching Tools & Aids', 'Exercises, Tasks & Assessments', 'Class Management & Admin']),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  numberOfActivities: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

// Internal type Groq returns — images as a clean separate array
type GroqCAPSResponse = {
  content: string;
  memo: string;
  rubric: string;
  visualAids: Array<{ id: string; query: string }>;
};

// ─── Image fetcher (direct, no Genkit tool dependency) ───────────────────────

async function fetchImage(query: string): Promise<string> {
  // 1. Try Pexels
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client = createClient(pexelsKey);
      const response = await client.photos.search({ query, per_page: 1, orientation: 'landscape' });
      if ('photos' in response && response.photos.length > 0) {
        return response.photos[0].src.large;
      }
    } catch (e) {
      console.error('Pexels failed for query:', query, e);
    }
  }

  // 2. Fallback to Pixabay
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) {
        return data.hits[0].largeImageURL;
      }
    } catch (e) {
      console.error('Pixabay failed for query:', query, e);
    }
  }

  return '';
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  // Step 1: Ask Groq to generate content WITH image placeholders and a clean visualAids array
  const output = await groqGenerateJSON<GroqCAPSResponse>(
    [
      {
        role: 'system',
        content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the specified grade:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring activities.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Subject-appropriate academic rigour.

IMAGE PLACEHOLDER RULES (CRITICAL):
- Where an image would enhance learning, insert a placeholder tag exactly like this: [IMAGE:VA1], [IMAGE:VA2], etc.
- Use 2 to 4 images per piece of content — place them at logical points in the HTML.
- In the "visualAids" array in your JSON response, list each image with its id and a detailed English search query.
- Example visualAids entry: { "id": "VA1", "query": "South African children learning mathematics classroom" }
- DO NOT include a VISUAL_AIDS text section in the content HTML — use only the JSON array.

OUTPUT FORMAT — return ONLY this JSON object, nothing else:
{
  "content": "<HTML string with [IMAGE:VA1] placeholders embedded at appropriate points>",
  "memo": "<HTML memo with answers and explanations>",
  "rubric": "<HTML rubric with criteria and mark allocations>",
  "visualAids": [
    { "id": "VA1", "query": "detailed search query for image 1" },
    { "id": "VA2", "query": "detailed search query for image 2" }
  ]
}`,
      },
      {
        role: 'user',
        content: `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Duration: ${input.duration || 'N/A'} minutes
Number of Activities: ${input.numberOfActivities || 'N/A'}
Additional Instructions: ${input.additionalInstructions || 'None'}`,
      },
    ],
    { max_tokens: 8192, temperature: 0.7 }
  );

  // Step 2: Replace [IMAGE:VAx] placeholders with real images
  let html = output.content || '';
  const visualAids: Array<{ id: string; query: string }> = output.visualAids || [];

  if (visualAids.length > 0) {
    // Fetch all images in parallel for speed
    const imageResults = await Promise.all(
      visualAids.map(async (va) => ({
        id: va.id,
        query: va.query,
        url: await fetchImage(va.query),
      }))
    );

    for (const result of imageResults) {
      // Match both [IMAGE:VA1] and [IMAGE: VA1] (with or without space)
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
      if (result.url) {
        const imgHtml = `<div class="my-6 text-center">
  <img
    src="${result.url}"
    alt="${result.query}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px]"
    style="width:auto;height:auto;max-width:100%;"
  />
  <p class="text-xs text-muted-foreground mt-2 italic">${result.query}</p>
</div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        // No image found — remove placeholder silently
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Step 3: Clean up any stray [IMAGE:VAx] tags that didn't get matched
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}
What changed and why
The core fix is that visualAids is now a separate JSON array returned by Groq, not a text block embedded inside the HTML string. This is far more reliable because:

Groq no longer needs to format a special VISUAL_AIDS text section with exact regex-parseable syntax inside an HTML string inside a JSON value — that triple-encoding was the reason it kept failing
All image fetches now happen in parallel (Promise.all) instead of sequentially, so content loads faster
The fetchImage function is called directly (no Genkit tool wrapper needed), eliminating the dependency on ai.defineTool which required the Genkit runtime
The regex now handles both [IMAGE:VA1] and [IMAGE: VA1] (with and without space) to be robust against Groq's formatting variations
Also make sure your next.config.mjs has pixabay.com and images.pexels.com in remotePatterns so Next.js actually serves the images:

js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'images.pexels.com' },
    { protocol: 'https', hostname: 'pixabay.com' },
    { protocol: 'https', hostname: 'cdn.pixabay.com' },  // add this — Pixabay CDN
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: 'i.ibb.co' },
    { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
  ],
},
# 🎓 EduAI Companion

<div align="center">
  <img src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI Companion Logo" width="120px" />
  <p>
    <strong>Personalized Learning, Powered by AI.</strong>
  </p>
  <p>
    An intelligent educational platform designed to empower teachers, engage students, and inform parents.
  </p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.x-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-18.x-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/Firebase-v11-orange?logo=firebase" alt="Firebase">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v3-blue?logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/AI-Google_Gemini-blue?logo=google" alt="Google Gemini">
</p>

---

## 🚀 Overview

**EduAI Companion** is a cutting-edge web application built to revolutionize the educational landscape in South Africa and beyond. By leveraging the power of Google's Gemini AI through Genkit, it provides a suite of intelligent tools that automate administrative tasks for teachers, offer personalized support for students, and deliver insightful progress reports to parents.

Our mission is to reduce teacher burnout, make learning more accessible and engaging, and create a collaborative educational ecosystem.

## ✨ Core Features

EduAI Companion is packed with features designed for every user role:

| Feature | Description | Target Users |
| :--- | :--- | :--- |
| 🤖 **AI Content Generator** | Instantly create CAPS-compliant lesson plans, exercises, assessments, and posters for any grade, subject, and topic. | Teachers, Admins |
| ✍️ **AI Autograding** | Automatically grade submitted assignments using a custom rubric, providing instant, detailed feedback to students. | Teachers |
| 🔍 **OCR & Handwriting Recognition** | Upload a photo of a handwritten document or worksheet, and the AI will extract the text for digital use or grading. | Teachers, Students |
| 🧪 **Practice Assessments** | Students can generate mock tests on specific topics to prepare for exams, complete them, and receive an automated grade. | Students |
| 🏫 **Class & Student Management** | Teachers can create classes, manage student rosters, and view all class-related activities from a central dashboard. | Teachers |
| 📊 **Progress Reports** | Visualize student performance over time with charts and detailed breakdowns of assignment scores and feedback. | Teachers, Parents, Students |
| 📢 **Communication Portal** | Teachers can post announcements to an entire class, ensuring parents and students stay informed. | Teachers, Parents, Students |

## 🛠️ Tech Stack

This project is built on a modern, robust, and scalable technology stack:

- **Frontend:** [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/), [ShadCN/UI](https://ui.shadcn.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore, App Hosting)
- **Generative AI:** [Google Gemini](https://gemini.google.com/) via [Firebase Genkit](https://firebase.google.com/docs/genkit)
- **Form Management:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
- **Deployment:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 🔧 Getting Started

To get this project running locally, follow these steps.

### Prerequisites

- Node.js (v20 or later recommended)
- `npm` or a compatible package manager
- A Firebase project with Firestore and Authentication enabled.
- A Google AI Gemini API key.

### 1. Set Up Environment Variables

Create a `.env` file in the root of your project and add your Gemini API key:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### 2. Install Dependencies

Install all the required packages using npm:

```bash
npm install
```

### 3. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📜 Available Scripts

- `npm run dev`: Starts the application in development mode.
- `npm run dev:genkit`: Starts the Genkit development UI locally (requires `dotenv-cli`).
- `npm run build`: Creates a production-ready build of the application.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase for potential errors.
- `npm run genkit:dev`: Starts the Genkit development UI for testing AI flows.

## 📂 Project Structure

The codebase is organized to maintain a clean separation of concerns:

```
/src
├── ai/                # All Genkit AI flows and configuration
├── app/               # Next.js App Router pages and layouts
├── components/        # Reusable React components (UI, layout, etc.)
├── firebase/          # Firebase configuration, providers, and custom hooks
├── hooks/             # Custom React hooks
├── lib/               # Utility functions, type definitions, and static data
└── styles/            # Global CSS styles
```

## 🤝 Contributing

This project is developed and maintained in Firebase Studio. Contributions and suggestions are welcome! Please feel free to discuss changes and make recommendations.

## 📄 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Developed by <strong>Zwelakhe Msuthu</strong> &copy; 2026
</p>
