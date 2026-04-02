\'use client\';

import React, { useState } from \'react\';
import { generateGrade1English } from \'@/ai/flows/grade1-english\';
import { useFirestore, useUser } from \'@/firebase\';
import { collection, addDoc, serverTimestamp } from \'firebase/firestore\';

const materialOptions = [
  { id: \'phonicsBook\', label: \'Phonics Book 1 (Full Booklet)\' },
  { id: \'readingComprehensionA\', label: \"Reading Comprehension - \'a\' Sound\" },
  { id: \'spellingTr\', label: \"Spelling Practice - \'tr\' Blends\" },
  { id: \'displayPack\', label: \'Classroom Display Pack (Alphabet Posters)\' },
  { id: \'improvementTracker\', label: \'Subject Improvement Plan Tracker\' },
  { id: \'handwritingSheet\', label: \'Handwriting Practice Sheet (Head, Tummy, Tail)\' },
  { id: \'abcBooklet\', label: \'ABC Handwriting Booklet\' },
  { id: \'classroomLabels\', label: \'Classroom Item Labels\' },
];

export default function Grade1EnglishGenerator() {
  const { user } = useUser();
  const db = useFirestore();
  const [selectedType, setSelectedType] = useState(\'\');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState(\'\');
  const [saved, setSaved] = useState(false);

  const generate = async () => {
    if (!selectedType || !user) return;
    setLoading(true);
    setError(\'\');
    setResult(null);
    setSaved(false);

    try {
      // Pass userId to the flow for Firebase storage
      const data = await generateGrade1English({ materialType: selectedType as any, userId: user.uid });

      setResult(data);

      // Save to Firebase Content Archive with new CAPS metadata
      await addDoc(collection(db, \'teachers\', user.uid, \'generatedContent\'), {
        teacherId: user.uid,
        grade: \'1\',
        subject: \'English Home Language\',
        topic: data.title,
        contentType: materialOptions.find(o => o.id === selectedType)?.label || selectedType,
        content: data.content,
        description: data.description, // Save description
        assessmentCriteria: data.assessmentCriteria, // Save assessment criteria
        successIndicators: data.successIndicators, // Save success indicators
        memo: \'\',
        rubric: \'\',
        createdAt: serverTimestamp(),
        modelUsed: \'gemini31Pro\', // Indicate the model used
        capsAligned: true, // Indicate CAPS alignment
      });

      setSaved(true);
    } catch (err: any) {
      setError(err.message || \'Generation failed\');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"max-w-6xl mx-auto space-y-6\">
      <div className=\"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6\">
        {materialOptions.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedType(item.id)}
            className={`p-6 text-left rounded-[2rem] transition-all ${
              selectedType === item.id
                ? \'bg-primary text-white shadow-xl\'
                : \'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border\'
            }`}
          >
            <p className=\"font-semibold text-sm sm:text-base\">{item.label}</p>
          </button>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={!selectedType || loading || !user}
        className=\"w-full py-5 text-lg font-bold rounded-[2rem] bg-gradient-to-r from-indigo-500 to-blue-500 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all\"
      >
        {loading ? \'Generating Content...\' : \'Generate & Save to Archive\'}
      </button>

      {error && <p className=\"text-destructive mt-6 text-center font-semibold\">{error}</p>}
      {saved && <p className=\"text-green-600 dark:text-green-400 mt-6 text-center font-bold\">✅ Generated and saved to your Content Archive!</p>}

      {result && (
        <div className=\"mt-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 font-patrick-hand\">
          <h2 className=\"text-4xl font-bold mb-8 text-primary\">
            {result.title}
          </h2>
          <p className=\"text-blue-100\">CAPS Aligned • Saved to Firebase</p>

          <div
            className=\"prose dark:prose-invert max-w-none text-xl leading-relaxed font-comic-neue\"
            dangerouslySetInnerHTML={{ __html: result.content }}
          />

          {/* New: CAPS Assessment Section */}
          <div className=\"mt-12 border-t pt-8\">
            <h3 className=\"text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4\">CAPS Assessment Criteria</h3>
            <div className=\"bg-blue-50 dark:bg-blue-950 p-6 rounded-2xl\">
              <div dangerouslySetInnerHTML={{ __html: result.assessmentCriteria }} />
            </div>

            {result.successIndicators && result.successIndicators.length > 0 && (
              <>
                <h4 className=\"font-semibold mt-8 mb-3\">Success Indicators (Observable):</h4>
                <ul className=\"list-disc pl-6 space-y-2\">
                  {result.successIndicators.map((item: string, i: number) => (
                    <li key={i} className=\"text-lg\">{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
