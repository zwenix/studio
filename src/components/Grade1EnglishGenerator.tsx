'use client';

import React, { useState } from 'react';
import { generateGrade1English } from '@/ai/flows/grade1-english';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

const materialOptions = [
  { id: 'phonicsBook', label: 'Phonics Book 1 (Full Booklet)' },
  { id: 'readingComprehensionA', label: "Reading Comprehension - 'a' Sound" },
  { id: 'spellingTr', label: "Spelling Practice - 'tr' Blends" },
  { id: 'displayPack', label: 'Classroom Display Pack (Alphabet Posters)' },
  { id: 'improvementTracker', label: 'Subject Improvement Plan Tracker' },
  { id: 'handwritingSheet', label: 'Handwriting Practice Sheet (Head, Tummy, Tail)' },
  { id: 'abcBooklet', label: 'ABC Handwriting Booklet' },
  { id: 'classroomLabels', label: 'Classroom Item Labels' },
];

/** 700 KB — leaves room for other fields inside the 1 MB Firestore document limit */
const INLINE_MAX_BYTES = 700 * 1024;

export default function Grade1EnglishGenerator() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'save-failed'>('idle');

  const generate = async () => {
    if (!selectedType || !user) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSaveStatus('idle');

    try {
      // ── Step 1: Generate ────────────────────────────────────────────────
      const data = await generateGrade1English({
        materialType: selectedType as any,
        userId: user.uid,
      });

      // Show content immediately — never block the teacher on the save step
      setResult(data);

      // ── Step 2: Archive (isolated — save failure never hides content) ───
      try {
        const encoder = new TextEncoder();
        const contentBytes = encoder.encode(data.content).length;

        let inlineContent = data.content;
        let contentStorageUrl: string | undefined;

        if (contentBytes > INLINE_MAX_BYTES) {
          // Content exceeds Firestore's 1 MB limit → upload to Firebase Storage.
          // Firebase Storage supports objects up to 5 TB — full integrity preserved.
          const path = `generated-content/${user.uid}/${Date.now()}-grade1.html`;
          const fileRef = storageRef(storage, path);
          await uploadString(fileRef, data.content, 'raw', {
            contentType: 'text/html; charset=utf-8',
          });
          contentStorageUrl = await getDownloadURL(fileRef);
          inlineContent = ''; // content field in Firestore stays empty; URL is source of truth
        }

        await addDoc(collection(db, 'teachers', user.uid, 'generatedContent'), {
          teacherId: user.uid,
          grade: '1',
          subject: 'English Home Language',
          topic: data.title,
          contentType: materialOptions.find(o => o.id === selectedType)?.label || selectedType,
          content: inlineContent,
          ...(contentStorageUrl ? { contentStorageUrl } : {}),
          description: data.description,
          assessmentCriteria: data.assessmentCriteria,
          successIndicators: data.successIndicators,
          memo: '',
          rubric: '',
          // Timestamp.fromDate instead of serverTimestamp(): serverTimestamp() resolves
          // to null locally, so orderBy('createdAt') silently excludes the document.
          createdAt: Timestamp.fromDate(new Date()),
          modelUsed: 'gemini-3.1-pro-preview',
          capsAligned: true,
        });

        setSaveStatus('saved');
      } catch (saveErr: any) {
        console.error('[Grade1] Archive save failed (content still visible):', saveErr);
        setSaveStatus('save-failed');
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {materialOptions.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedType(item.id)}
            className={`p-6 text-left rounded-[2rem] transition-all ${
              selectedType === item.id
                ? 'bg-primary text-white shadow-xl'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border'
            }`}
          >
            <p className="font-semibold text-sm sm:text-base">{item.label}</p>
          </button>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={!selectedType || loading || !user}
        className="w-full py-5 text-lg font-bold rounded-[2rem] bg-gradient-to-r from-indigo-500 to-blue-500 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
      >
        {loading ? 'Generating Content...' : 'Generate & Save to Archive'}
      </button>

      {error && (
        <p className="text-destructive mt-6 text-center font-semibold">{error}</p>
      )}
      {saveStatus === 'saved' && (
        <p className="text-green-600 dark:text-green-400 mt-6 text-center font-bold">
          ✅ Generated and saved to your Content Archive!
        </p>
      )}
      {saveStatus === 'save-failed' && (
        <p className="text-amber-600 dark:text-amber-400 mt-6 text-center font-semibold">
          ⚠️ Content generated! Archive save failed — please Print or Export to keep a copy.
        </p>
      )}

      {result && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 font-patrick-hand">
          <h2 className="text-4xl font-bold mb-8 text-primary">{result.title}</h2>
          <p className="text-muted-foreground text-sm mb-6">CAPS Aligned • Grade 1 English Home Language</p>

          <div
            className="prose dark:prose-invert max-w-none text-xl leading-relaxed font-comic-neue"
            dangerouslySetInnerHTML={{ __html: result.content }}
          />

          {result.assessmentCriteria && (
            <div className="mt-12 border-t pt-8">
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                CAPS Assessment Criteria
              </h3>
              <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-2xl">
                <div dangerouslySetInnerHTML={{ __html: result.assessmentCriteria }} />
              </div>

              {result.successIndicators && result.successIndicators.length > 0 && (
                <>
                  <h4 className="font-semibold mt-8 mb-3">Success Indicators (Observable):</h4>
                  <ul className="list-disc pl-6 space-y-2">
                    {result.successIndicators.map((indicator: string, i: number) => (
                      <li key={i} className="text-lg">{indicator}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
