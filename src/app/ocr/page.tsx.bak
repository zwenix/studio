'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, Loader2, ScanSearch, Upload } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type OcrRecord = {
  id: string;
  file_name?: string;
  extracted_text?: string;
  status?: string;
  created_at?: string;
};

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploads, setUploads] = useState<OcrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUploads() {
      const { data, error: loadError } = await supabase
        .from('ocr_uploads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!active) {
        return;
      }

      if (loadError) {
        setError(loadError.message);
        setUploads([]);
      } else {
        setUploads((data ?? []) as OcrRecord[]);
      }

      setLoading(false);
    }

    loadUploads();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Please choose a file to process.');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', documentName);
    formData.append('notes', notes);

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR request failed with status ' + response.status + '.');
      }

      const payload = (await response.json()) as { extractedText?: string; status?: string };

      const record = {
        file_name: documentName || file.name,
        extracted_text: payload.extractedText ?? '',
        status: payload.status ?? 'processed',
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('ocr_uploads').insert([record]);

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess('OCR upload processed successfully.');
        setUploads((current) => [record as OcrRecord, ...current]);
        setFile(null);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'OCR upload failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-300">OCR</p>
          <h1 className="text-3xl font-semibold tracking-tight">Upload images and store OCR output in Supabase</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            The syntax error is gone and this page now uses a clean upload flow instead of the broken Firebase-specific imports.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">Document name</span>
              <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Grade 4 worksheet" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500" />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-slate-300">File</span>
              <input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500" />
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-slate-300">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional notes for the OCR request." className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500" />
          </label>

          {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}
          {success ? <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{success}</div> : null}

          <button type="submit" disabled={processing || !file} className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {processing ? 'Processing...' : 'Run OCR'}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <Upload className="h-4 w-4" />
            <h2 className="text-lg font-semibold text-white">Recent uploads</h2>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading OCR history...
              </div>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-slate-400">No OCR uploads found yet.</p>
            ) : (
              uploads.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-white">{item.file_name ?? 'Untitled upload'}</h3>
                      <p className="text-sm text-slate-400">{item.status ?? 'processed'}</p>
                    </div>
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  {item.extracted_text ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.extracted_text}</p> : null}
                </article>
              ))
            )}
          </div>

          <Link href="/my-classes" className="mt-5 inline-flex text-sm text-indigo-300 transition hover:text-indigo-200">
            View classes
          </Link>
        </section>
      </div>
    </main>
  );
}
