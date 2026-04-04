'use client';

/**
 * Content Creator — Complete Overhaul
 * Three distinct labs:
 * 1. 🎓 Assessments & Teaching Tools Lab
 * 2. 🎨 Visual Aids & Media Tools
 * 3. 📋 General & Admin Documents
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Sparkles, Printer, Save, Trash2, Download,
  FlaskConical, Palette, FileText, Eye, BookOpen, GraduationCap,
  ChevronDown, ChevronUp, Zap, ClipboardList, ImageIcon, Settings2, RefreshCw
} from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { educationalData } from '@/lib/educational-data';
import { generateCAPSContent, type GenerateCAPSContentInput, type GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content'; // Updated import to generateCAPSContent
import Grade1EnglishGenerator from "@/components/Grade1EnglishGenerator";
import { generateVisualAid, type VisualAidInput, type VisualAidOutput } from '@/ai/flows/generate-visual-aids';
import { generateAdminDoc, type AdminDocInput, type AdminDocOutput } from '@/ai/flows/generate-admin-docs';
import type { Teacher } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const TEACHING_CATEGORIES: Record<string, string[]> = {
  'Lesson Plans & Notes': [
    'Lesson Plan', 'Daily Lesson Notes', 'Weekly Lesson Plan', 'Unit Plan',
    'Learning Activity', 'Study Guide / Learning Notes', 'Revision Pack',
  ],
  'Classroom Tasks & Exercises': [
    'Worksheet', 'Homework Task', 'Classroom Exercise', 'Group Activity',
    'Reading Comprehension', 'Writing Task', 'Research Task',
  ],
  'Assessments': [
    'Controlled Test', 'Examination', 'Formal Assessment Task (FAT)',
    'Investigation', 'Project Brief', 'Case Study', 'Oral/Speech Task',
    'Practical Task / Experiment', 'Portfolio Task', 'Diagnostic Assessment',
  ],
  'Memos & Rubrics': [
    'Marking Memo', 'Assessment Rubric', 'Analytical Rubric',
    'Holistic Rubric', 'Checklist / Self-Assessment',
  ],
};

const VISUAL_TYPES: Record<string, string[]> = {
  'Classroom Displays': [
    'Educational Poster', 'Word Wall', 'Vocabulary Display',
    'Alphabet Chart', 'Number Chart / Number Line', 'Times Tables Chart',
    'Classroom Rules Poster', 'Topic Anchor Chart',
  ],
  'Learning Cards': [
    'Flashcards (Term + Definition)', 'Vocabulary Cards', 'Formula Reference Cards',
    'Timeline Cards', 'Matching Cards', 'Cut-out Activity Cards',
  ],
  'Diagrams & Maps': [
    'Mind Map / Concept Map', 'Educational Diagram', 'Infographic',
    'Process Flow Diagram', 'Comparison Chart',
  ],
  'Labels & Organizers': [
    'Classroom Labels / Signs', 'Book Labels', 'Book Cover Design',
    'Certificate Template', 'Award / Sticker Template',
  ],
};

const ADMIN_TYPES: Record<string, string[]> = {
  'Parent Communication': [
    'Letter to Parents', 'General Notice to Parents', 'Permission Slip',
    'Meeting Invitation', 'Progress Update Letter', 'Report Comment Template',
  ],
  'School Administration': [
    'General School Notice', 'Timetable Template', 'Attendance Register',
    'Subject Improvement Plan', 'School Calendar Event Notice',
  ],
  'Learner-Facing': [
    'Disciplinary Notice', 'Classroom Rules', 'Homework Policy Letter',
    'Detention Notice', 'Achievement Certificate',
  ],
};

const LANGUAGES = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Sepedi', 'Setswana'];
const DIFFICULTIES = ['Easy (Lower Order Thinking)', 'Medium (Mixed)', 'Challenging (Higher Order)', 'Mixed (Bloom\'s Progression)'];
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
const COLOR_SCHEMES = ['Bright Primary Colors', 'Pastel Soft', 'School Navy & Gold', 'Green & Nature', 'Monochrome Professional', 'Rainbow Fun'];
const VISUAL_STYLES = ['Modern & Clean', 'Playful Cartoon', 'Professional Academic', 'Bold & Graphic', 'Minimalist'];
const TONES = ['Formal & Professional', 'Warm & Friendly', 'Informative & Clear', 'Urgent & Important'];

// ─── Preview Component ────────────────────────────────────────────────────────

function ContentPreview({ html, label }: { html: string; label: string }) {
  if (!html) return null;
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {label}
      </h3>
      <div
        style={{
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 0,
          minHeight: 200,
          overflow: 'hidden',
        }}
      >
        {/* CSS Reset container — ensures rendered HTML is isolated from app styles */}
        <div
          style={{
            all: 'initial',
            display: 'block',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#1a1a1a',
            lineHeight: 1.6,
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

// ─── Section Expander ─────────────────────────────────────────────────────────

function AdvancedSection({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-t"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          {label}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="space-y-4 pt-4 pb-2">{children}</div>}
    </div>
  );
}

// ─── Preview Panel (defined OUTSIDE ContentCreatorClient to prevent remounting) ──

interface PreviewPanelProps {
  isLoading: boolean;
  activeTab: string;
  activePreviewTab: 'content' | 'memo' | 'rubric' | 'assessment';
  setActivePreviewTab: (tab: 'content' | 'memo' | 'rubric' | 'assessment') => void;
  teachingResult: GenerateCAPSContentOutput | null;
  visualResult: VisualAidOutput | null;
  adminResult: AdminDocOutput | null;
  isSaving: boolean;
  onSave: () => void;
  onPrint: () => void;
}

const PreviewPanel = React.memo(function PreviewPanel({
  isLoading,
  activeTab,
  activePreviewTab,
  setActivePreviewTab,
  teachingResult,
  visualResult,
  adminResult,
  isSaving,
  onSave,
  onPrint,
}: PreviewPanelProps) {
  const t = teachingResult;
  const v = visualResult;
  const a = adminResult;

  const hasMemo = t?.memo && t.memo.trim().length > 50;
  const hasRubric = t?.rubric && t.rubric.trim().length > 50;
  const hasAssessment = t?.assessmentCriteria && t.assessmentCriteria.trim().length > 0;
  const hasSuccessIndicators = t?.successIndicators && t.successIndicators.length > 0;

  const hasResult =
    (activeTab === 'teaching' && !!t) ||
    (activeTab === 'visual' && !!v) ||
    (activeTab === 'admin' && !!a);

  return (
    <div className="flex flex-col h-full">
      {/* Preview Toolbar */}
      {hasResult && (
        <div className="flex items-center justify-between gap-2 p-4 border-b bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            {activeTab === 'teaching' && (
              <>
                <button
                  onClick={() => setActivePreviewTab('content')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                    activePreviewTab === 'content'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  📄 Content
                </button>
                {hasMemo && (
                  <button
                    onClick={() => setActivePreviewTab('memo')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                      activePreviewTab === 'memo'
                        ? 'bg-green-600 text-white'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    ✅ Memo
                  </button>
                )}
                {hasRubric && (
                  <button
                    onClick={() => setActivePreviewTab('rubric')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                      activePreviewTab === 'rubric'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    📊 Rubric
                  </button>
                )}
                {(hasAssessment || hasSuccessIndicators) && (
                  <button
                    onClick={() => setActivePreviewTab('assessment')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-full transition-all',
                      activePreviewTab === 'assessment'
                        ? 'bg-orange-600 text-white'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    ⭐ Assessment
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {t?.estimatedMarks && (
              <Badge variant="secondary" className="text-xs">{t.estimatedMarks}</Badge>
            )}
            {t?.estimatedDuration && (
              <Badge variant="secondary" className="text-xs">{t.estimatedDuration}</Badge>
            )}
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span className="hidden sm:inline ml-1">Save</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-3 w-3" />
              <span className="hidden sm:inline ml-1">Print</span>
            </Button>
          </div>
        </div>
      )}

      {/* Preview Body */}
      <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Generating world-class educational content...
            </p>
          </div>
        ) : !hasResult ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 opacity-40">
            <div className="h-24 w-24 rounded-3xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              {activeTab === 'teaching' && <FlaskConical className="h-12 w-12 text-slate-400" />}
              {activeTab === 'visual' && <Palette className="h-12 w-12 text-slate-400" />}
              {activeTab === 'admin' && <FileText className="h-12 w-12 text-slate-400" />}
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-500">Your content will appear here</p>
              <p className="text-sm text-slate-400 mt-1">Fill in the form and click Generate</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 print:p-0">
            {/* TEACHING */}
            {activeTab === 'teaching' && t && (
              <>
                {activePreviewTab === 'content' && (
                  <ContentPreview html={t.content} label="Main Content" />
                )}
                {activePreviewTab === 'memo' && hasMemo && (
                  <ContentPreview html={t.memo || ''} label="Answer Memo" />
                )}
                {activePreviewTab === 'rubric' && hasRubric && (
                  <ContentPreview html={t.rubric || ''} label="Assessment Rubric" />
                )}
                {activePreviewTab === 'assessment' && (hasAssessment || hasSuccessIndicators) && (
                  <div className="space-y-4">
                    {hasAssessment && (
                      <ContentPreview html={t.assessmentCriteria || ''} label="CAPS Assessment Criteria" />
                    )}
                    {hasSuccessIndicators && (
                      <div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                          Success Indicators (Observable)
                        </h3>
                        <div className="bg-white border rounded-lg p-4">
                          <ul className="list-disc pl-5 space-y-2">
                            {t.successIndicators?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* VISUAL */}
            {activeTab === 'visual' && v && (
              <div className="space-y-4">
                {v.description && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">📎 {v.description}</p>
                  </div>
                )}
                <ContentPreview html={v.content} label="Visual Aid" />
                {v.printInstructions && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">🖨️ Print Instructions</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">{v.printInstructions}</p>
                  </div>
                )}
              </div>
            )}

            {/* ADMIN */}
            {activeTab === 'admin' && a && (
              <div className="space-y-4">
                <ContentPreview html={a.content} label={a.documentType} />
                {a.notes && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">📝 Usage Notes</p>
                    <p className="text-sm text-green-800 dark:text-green-200">{a.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ContentCreatorClient() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState('teaching');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'content' | 'memo' | 'rubric' | 'assessment'>('content'); // Added 'assessment'

  // Results state
  const [teachingResult, setTeachingResult] = useState<GenerateCAPSContentOutput | null>(null); // Updated type
  const [visualResult, setVisualResult] = useState<VisualAidOutput | null>(null);
  const [adminResult, setAdminResult] = useState<AdminDocOutput | null>(null);

  const teacherRef = useMemoFirebase(() => user ? doc(firestore, 'teachers', user.uid) : null, [firestore, user]);
  const { data: teacherData } = useDoc<Teacher>(teacherRef);

  // ─── Teaching Tools State ─────────────────────────────────────────────────

  const [t_category, setT_Category] = useState('');
  const [t_type, setT_Type] = useState('');
  const [t_grade, setT_Grade] = useState('');
  const [t_subject, setT_Subject] = useState('');
  const [t_customSubject, setT_CustomSubject] = useState('');
  const [t_topic, setT_Topic] = useState('');
  const [t_customTopic, setT_CustomTopic] = useState('');
  const [t_term, setT_Term] = useState('');
  const [t_language, setT_Language] = useState('English');
  const [t_difficulty, setT_Difficulty] = useState('');
  const [t_duration, setT_Duration] = useState('');
  const [t_items, setT_Items] = useState('');
  const [t_objective, setT_Objective] = useState('');
  const [t_profile, setT_Profile] = useState('');
  const [t_differentiation, setT_Differentiation] = useState('');
  const [t_memo, setT_Memo] = useState(true);
  const [t_rubric, setT_Rubric] = useState(true);
  const [t_extraInstructions, setT_ExtraInstructions] = useState('');

  const t_subjects = useMemo(() => {
    if (!t_grade) return [];
    const gradeData = educationalData[t_grade as keyof typeof educationalData];
    return gradeData ? Object.keys(gradeData) : [];
  }, [t_grade]);
  
  const t_topics = useMemo(() => {
    if (!t_grade || !t_subject) return [];
    const gradeData = educationalData[t_grade as keyof typeof educationalData];
    return gradeData && gradeData[t_subject] ? gradeData[t_subject] : [];
  }, [t_grade, t_subject]);

  // ─── Visual Aids State ────────────────────────────────────────────────────

  const [v_category, setV_Category] = useState('');
  const [v_type, setV_Type] = useState('');
  const [v_grade, setV_Grade] = useState('');
  const v_subjects = useMemo(() => {
    if (!v_grade) return [];
    const gradeData = educationalData[v_grade as keyof typeof educationalData];
    return gradeData ? Object.keys(gradeData) : [];
  }, [v_grade]);
  const [v_subject, setV_Subject] = useState('');
  const [v_customSubject, setV_CustomSubject] = useState('');
  const [v_topic, setV_Topic] = useState('');
  const [v_customTopic, setV_CustomTopic] = useState('');
  const v_topics = useMemo(() => {
    if (!v_grade || !v_subject) return [];
    const gradeData = educationalData[v_grade as keyof typeof educationalData];
    return gradeData && gradeData[v_subject] ? gradeData[v_subject] : [];
  }, [v_grade, v_subject]);
  const [v_language, setV_Language] = useState('English');
  const [v_colorScheme, setV_ColorScheme] = useState('');
  const [v_style, setV_Style] = useState('');
  const [v_specificContent, setV_SpecificContent] = useState('');
  const [v_quantity, setV_Quantity] = useState('');
  const [v_generateImage, setV_GenerateImage] = useState(false);
  const [v_extraInstructions, setV_ExtraInstructions] = useState('');

  // ─── Admin Docs State ────────────────────────────────────────────────