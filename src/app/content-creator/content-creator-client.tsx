'use client';

/**
 * Content Creator — Complete Overhaul
 * Three distinct labs:
 * 1. 🎓 Assessments & Teaching Tools Lab
 * 2. 🎨 Visual Aids & Media Tools
 * 3. 📋 General & Admin Documents
 */

import React, { useState, useMemo } from 'react';
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
import { generateCAPSContent, type GenerateCAPSContentInput, type GenerateCAPSContentOutput } from '@/ai/flows/generate-caps-content';
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
            {t && 'estimatedMarks' in t && t.estimatedMarks && (
              <Badge variant="secondary" className="text-xs">{String(t.estimatedMarks as any)}</Badge>
            )}
            {t && 'estimatedDuration' in t && t.estimatedDuration && (
              <Badge variant="secondary" className="text-xs">{String(t.estimatedDuration as any)}</Badge>
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
  const [activePreviewTab, setActivePreviewTab] = useState<'content' | 'memo' | 'rubric' | 'assessment'>('content');

  // Results state
  const [teachingResult, setTeachingResult] = useState<GenerateCAPSContentOutput | null>(null);
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

  // ─── Admin Docs State ─────────────────────────────────────────────────────

  const [a_category, setA_Category] = useState('');
  const [a_type, setA_Type] = useState('');
  const [a_grade, setA_Grade] = useState('');
  const a_subjects = useMemo(() => {
    if (!a_grade) return [];
    const gradeData = educationalData[a_grade as keyof typeof educationalData];
    return gradeData ? Object.keys(gradeData) : [];
  }, [a_grade]);
  const [a_subject, setA_Subject] = useState('');
  const [a_customSubject, setA_CustomSubject] = useState('');
  const a_topics = useMemo(() => {
    if (!a_grade || !a_subject) return [];
    const gradeData = educationalData[a_grade as keyof typeof educationalData];
    return gradeData && gradeData[a_subject] ? gradeData[a_subject] : [];
  }, [a_grade, a_subject]);
  const [a_schoolName, setA_SchoolName] = useState('');
  const [a_teacherName, setA_TeacherName] = useState('');
  const [a_principalName, setA_PrincipalName] = useState('');
  const [a_date, setA_Date] = useState('');
  const [a_language, setA_Language] = useState('English');
  const [a_purpose, setA_Purpose] = useState('');
  const [a_keyPoints, setA_KeyPoints] = useState('');
  const [a_tone, setA_Tone] = useState('');
  const [a_replySlip, setA_ReplySlip] = useState(false);
  const [a_extraInstructions, setA_ExtraInstructions] = useState('');

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleGenerateTeaching = async () => {
    const finalSubject = t_subject === 'Other' ? t_customSubject : t_subject;
    const finalTopic = t_topic === 'Other' ? t_customTopic : t_topic;

    if (!t_type || !t_grade || !finalSubject || !finalTopic || !user?.uid) {
      toast({ title: 'Missing fields', description: 'Please select Type, Grade, Subject, Topic, and ensure you are logged in.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setTeachingResult(null);
    setActivePreviewTab('content');
    try {
      const input: GenerateCAPSContentInput = {
        category: t_category,
        contentType: t_type,
        grade: t_grade,
        subject: finalSubject,
        topic: finalTopic,
        term: t_term,
        language: t_language,
        objective: t_objective,
        learnerProfile: t_profile,
        additionalInstructions: t_extraInstructions,
        teacherName: user?.displayName || '',
        userId: user.uid,
      };
      const result = await generateCAPSContent(input);
      setTeachingResult(result);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Generation failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVisual = async () => {
    const finalSubject = v_subject === 'Other' ? v_customSubject : v_subject;
    const finalTopic = v_topic === 'Other' ? v_customTopic : v_topic;
    if (!v_type || !v_grade || !finalSubject || !finalTopic) {
      toast({ title: 'Missing fields', description: 'Please select Type, Grade, Subject, and Topic.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setVisualResult(null);
    try {
      const input: VisualAidInput = {
        visualType: v_type,
        grade: v_grade,
        subject: finalSubject,
        topic: finalTopic,
        language: v_language,
        colorScheme: v_colorScheme,
        style: v_style,
        specificContent: v_specificContent,
        quantity: v_quantity,
        generateImage: v_generateImage,
        additionalInstructions: v_extraInstructions,
      };
      const result = await generateVisualAid(input);
      setVisualResult(result);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Generation failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAdmin = async () => {
    const finalSubject = a_subject === 'Other' ? a_customSubject : a_subject;
    if (!a_type || !a_purpose) {
      toast({ title: 'Missing fields', description: 'Please select a Document Type and describe the Purpose.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setAdminResult(null);
    try {
      const input: AdminDocInput = {
        documentType: a_type,
        schoolName: a_schoolName,
        principalName: a_principalName,
        teacherName: a_teacherName,
        grade: a_grade,
        subject: finalSubject,
        date: a_date,
        language: a_language,
        purpose: a_purpose,
        keyPoints: a_keyPoints,
        tone: a_tone,
        includeSignatureLine: true,
        includeReplySlip: a_replySlip,
        additionalInstructions: a_extraInstructions,
      };
      const result = await generateAdminDoc(input);
      setAdminResult(result);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Generation failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast({ title: "Not logged in", description: "Please sign in to save content.", variant: "destructive" });
      return;
    }

    const result = activeTab === "teaching" ? teachingResult 
                 : activeTab === "visual" ? visualResult 
                 : activeTab === "admin" ? adminResult 
                 : null;

    if (!result) return;

    setIsSaving(true);
    try {
      const data = {
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        tab: activeTab,
        type: activeTab === "teaching" ? "teaching" : activeTab === "visual" ? "visual-aid" : "admin-doc",
        ...(activeTab === "teaching" && teachingResult && {
          content: teachingResult.content || "",
          memo: teachingResult.memo || "",
          rubric: teachingResult.rubric || "",
          assessment: teachingResult.assessmentCriteria || "",
          successIndicators: teachingResult.successIndicators || [],
        }),
        ...(activeTab === "visual" && visualResult && {
          content: visualResult.content,
          printInstructions: visualResult.printInstructions,
          description: visualResult.description,
        }),
        ...(activeTab === "admin" && adminResult && {
          content: adminResult.content,
          notes: adminResult.notes,
        }),
      };

      await addDoc(collection(firestore, "teachers", user.uid, "generatedContent"), data);

      toast({
        title: "Content successfully saved in the Archive",
        description: "You can find it in the Archive tab.",
      });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handlePrint = () => {
    const printContent = document.getElementById("printable-content");
    if (printContent) {
      const original = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = original;
      window.location.reload();
    }
  };

  const hasResult = (activeTab === 'teaching' && !!teachingResult)
    || (activeTab === 'visual' && !!visualResult)
    || (activeTab === 'admin' && !!adminResult);

  // ─── Form Fields ──────────────────────────────────────────────────────────

  const FieldRow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('grid grid-cols-2 gap-4', className)}>{children}</div>
  );

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
        {label}{required && <span className="text-yellow-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );

  const selectClass = "bg-white/10 border-white/20 text-white [&_*]:text-foreground";
  const inputClass = "bg-white/10 border-white/20 text-white placeholder:text-white/40";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col">
      {/* Page Header */}
      <div className="px-4 sm:px-8 pt-6 pb-4 no-print">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Content Creator Studio</h1>
            <p className="text-muted-foreground mt-1">
              Generate world-class, CAPS-aligned educational content in seconds.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href="/content-archive">
                <BookOpen className="mr-2 h-4 w-4" /> Archive
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-0 border-t">

        {/* ─── LEFT PANEL: Form ────────────────────────────────────────────── */}
        <div
          className="border-r overflow-y-auto bg-slate-900 text-white no-print"
          style={{ maxHeight: 'calc(100vh - 140px)', overflowAnchor: 'none' }}
        >
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            setTeachingResult(null);
            setVisualResult(null);
            setAdminResult(null);
          }}>
            {/* Tab Navigation */}
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 p-4">
              <TabsList className="grid grid-cols-4 bg-white/5 rounded-2xl h-auto p-1 gap-1">
                <TabsTrigger
                  value="teaching"
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs font-semibold"
                >
                  <FlaskConical className="h-5 w-5" />
                  <span className="hidden sm:block">Teaching Lab</span>
                  <span className="sm:hidden">Teach</span>
                </TabsTrigger>
                <TabsTrigger
                  value="visual"
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400 text-xs font-semibold"
                >
                  <Palette className="h-5 w-5" />
                  <span className="hidden sm:block">Visual Aids</span>
                  <span className="sm:hidden">Visual</span>
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl data-[state=active]:bg-slate-600 data-[state=active]:text-white text-slate-400 text-xs font-semibold"
                >
                  <FileText className="h-5 w-5" />
                  <span className="hidden sm:block">Admin Docs</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
                <TabsTrigger
                  value="grade1"
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-white text-slate-400 text-xs font-semibold"
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="hidden sm:block">Grade 1 Packs</span>
                  <span className="sm:hidden">Gr 1</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── TEACHING TOOLS TAB ──────────────────────────────────────── */}
            <TabsContent value="teaching" className="p-5 space-y-5 m-0">
              <div>
                <p className="text-xs text-blue-300 font-semibold uppercase tracking-widest mb-1">🎓 Assessments & Teaching Tools Lab</p>
                <p className="text-slate-400 text-xs">Lesson plans, worksheets, tests, memos, rubrics — perfectly CAPS-aligned.</p>
              </div>

              {/* Category + Type */}
              <FieldRow>
                <Field label="Category" required>
                  <Select value={t_category} onValueChange={v => { setT_Category(v); setT_Type(''); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(TEACHING_CATEGORIES).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Document Type" required>
                  <Select value={t_type} onValueChange={setT_Type} disabled={!t_category}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {t_category && TEACHING_CATEGORIES[t_category]?.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              {/* Grade + Language */}
              <FieldRow>
                <Field label="Grade" required>
                  <Select value={t_grade} onValueChange={v => { setT_Grade(v); setT_Subject(''); setT_Topic(''); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language">
                  <Select value={t_language} onValueChange={setT_Language}>
                    <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              {/* Subject */}
              <Field label="Subject" required>
                <Select value={t_subject} onValueChange={v => { setT_Subject(v); setT_Topic(''); }} disabled={!t_grade}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {t_subjects.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    <SelectItem value="Other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
                {t_subject === 'Other' && (
                  <Input className={cn(inputClass, 'mt-2')} placeholder="Enter subject name" defaultValue={t_customSubject} onBlur={e => setT_CustomSubject(e.target.value)} />
                )}
              </Field>

              {/* Topic */}
              <Field label="Topic / Strand" required>
                <Select value={t_topic} onValueChange={setT_Topic} disabled={!t_subject}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {t_topics.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="Other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
                {t_topic === 'Other' && (
                  <Input className={cn(inputClass, 'mt-2')} placeholder="Enter topic name" defaultValue={t_customTopic} onBlur={e => setT_CustomTopic(e.target.value)} />
                )}
              </Field>

              {/* Term + Difficulty */}
              <FieldRow>
                <Field label="Term">
                  <Select value={t_term} onValueChange={setT_Term}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Term" /></SelectTrigger>
                    <SelectContent>
                      {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Difficulty">
                  <Select value={t_difficulty} onValueChange={setT_Difficulty}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Difficulty" /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              {/* Duration + Items */}
              <FieldRow>
                <Field label="Duration">
                  <Input className={inputClass} placeholder="e.g. 45 min" defaultValue={t_duration} onBlur={e => setT_Duration(e.target.value)} />
                </Field>
                <Field label="No. of Questions">
                  <Input className={inputClass} placeholder="e.g. 15" defaultValue={t_items} onBlur={e => setT_Items(e.target.value)} />
                </Field>
              </FieldRow>

              {/* Memo + Rubric Toggles */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={t_memo} onCheckedChange={setT_Memo} id="t-memo" />
                  <Label htmlFor="t-memo" className="text-sm text-slate-300 cursor-pointer">Include Memo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={t_rubric} onCheckedChange={setT_Rubric} id="t-rubric" />
                  <Label htmlFor="t-rubric" className="text-sm text-slate-300 cursor-pointer">Include Rubric</Label>
                </div>
              </div>

              <AdvancedSection label="Advanced Options">
                <Field label="Learning Objective">
                  <Textarea className={cn(inputClass, 'min-h-[72px]')} placeholder="What should learners know/do by the end?" defaultValue={t_objective} onBlur={e => setT_Objective(e.target.value)} />
                </Field>
                <Field label="Learner Profile / Needs">
                  <Textarea className={cn(inputClass, 'min-h-[72px]')} placeholder="e.g. 35 learners, mixed ability, some with reading barriers..." defaultValue={t_profile} onBlur={e => setT_Profile(e.target.value)} />
                </Field>
                <Field label="Differentiation Required">
                  <Input className={inputClass} placeholder="e.g. Extension for advanced, simplified for support group" defaultValue={t_differentiation} onBlur={e => setT_Differentiation(e.target.value)} />
                </Field>
                <Field label="Additional Instructions">
                  <Textarea className={cn(inputClass, 'min-h-[72px]')} placeholder="Any other specific requirements..." defaultValue={t_extraInstructions} onBlur={e => setT_ExtraInstructions(e.target.value)} />
                </Field>
              </AdvancedSection>

              <Button
                onClick={handleGenerateTeaching}
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="mr-2 h-5 w-5" /> Generate {t_type || 'Content'}</>
                )}
              </Button>
            </TabsContent>

            {/* ── VISUAL AIDS TAB ──────────────────────────────────────────── */}
            <TabsContent value="visual" className="p-5 space-y-5 m-0">
              <div>
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-widest mb-1">🎨 Visual Aids & Media Tools</p>
                <p className="text-slate-400 text-xs">Posters, labels, flashcards, diagrams, word walls — eye-catching classroom resources.</p>
              </div>

              <FieldRow>
                <Field label="Category" required>
                  <Select value={v_category} onValueChange={v => { setV_Category(v); setV_Type(''); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(VISUAL_TYPES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Visual Type" required>
                  <Select value={v_type} onValueChange={setV_Type} disabled={!v_category}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {v_category && VISUAL_TYPES[v_category]?.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              <FieldRow>
                <Field label="Grade" required>
                  <Select value={v_grade} onValueChange={v => { setV_Grade(v); setV_Subject(''); setV_Topic(''); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Language">
                  <Select value={v_language} onValueChange={setV_Language}>
                    <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              <Field label="Subject" required>
                <Select value={v_subject} onValueChange={v => { setV_Subject(v); setV_Topic(''); }} disabled={!v_grade}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {v_subjects.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    <SelectItem value="Other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
                {v_subject === 'Other' && (
                  <Input className={cn(inputClass, 'mt-2')} placeholder="Enter subject name" defaultValue={v_customSubject} onBlur={e => setV_CustomSubject(e.target.value)} />
                )}
              </Field>

              <Field label="Topic / Theme" required>
                <Select value={v_topic} onValueChange={setV_Topic} disabled={!v_subject}>
                  <SelectTrigger className={selectClass}><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    {v_topics.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="Other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
                {v_topic === 'Other' && (
                  <Input className={cn(inputClass, 'mt-2')} placeholder="Enter topic name" defaultValue={v_customTopic} onBlur={e => setV_CustomTopic(e.target.value)} />
                )}
              </Field>

              <FieldRow>
                <Field label="Colour Scheme">
                  <Select value={v_colorScheme} onValueChange={setV_ColorScheme}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Colours" /></SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Design Style">
                  <Select value={v_style} onValueChange={setV_Style}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Style" /></SelectTrigger>
                    <SelectContent>
                      {VISUAL_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              <Field label="Quantity / Size">
                <Input className={inputClass} placeholder="e.g. 12 labels, A4 portrait, 26 alphabet cards" defaultValue={v_quantity} onBlur={e => setV_Quantity(e.target.value)} />
              </Field>

              <Field label="Specific Content to Include">
                <Textarea className={cn(inputClass, 'min-h-[80px]')} placeholder="Specific words, concepts, numbers, or items you want included..." defaultValue={v_specificContent} onBlur={e => setV_SpecificContent(e.target.value)} />
              </Field>

              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4">
                <Switch checked={v_generateImage} onCheckedChange={setV_GenerateImage} id="v-image" />
                <div>
                  <Label htmlFor="v-image" className="text-sm font-semibold text-slate-200 cursor-pointer">
                    🖼️ Generate AI Image (Imagen 4 Fast)
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">Slower but adds an AI-generated illustration to your visual</p>
                </div>
              </div>

              <AdvancedSection label="Additional Options">
                <Field label="Extra Instructions">
                  <Textarea className={cn(inputClass, 'min-h-[72px]')} placeholder="Any other requirements..." defaultValue={v_extraInstructions} onBlur={e => setV_ExtraInstructions(e.target.value)} />
                </Field>
              </AdvancedSection>

              <Button
                onClick={handleGenerateVisual}
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Visual...</>
                ) : (
                  <><ImageIcon className="mr-2 h-5 w-5" /> Create {v_type || 'Visual Aid'}</>
                )}
              </Button>
            </TabsContent>

            {/* ── ADMIN DOCS TAB ───────────────────────────────────────────── */}
            <TabsContent value="admin" className="p-5 space-y-5 m-0">
              <div>
                <p className="text-xs text-slate-300 font-semibold uppercase tracking-widest mb-1">📋 General & Admin Documents</p>
                <p className="text-slate-400 text-xs">Professional school documents — letters, notices, permits, reports.</p>
              </div>

              <FieldRow>
                <Field label="Category" required>
                  <Select value={a_category} onValueChange={v => { setA_Category(v); setA_Type(''); }}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(ADMIN_TYPES).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Document Type" required>
                  <Select value={a_type} onValueChange={setA_Type} disabled={!a_category}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {a_category && ADMIN_TYPES[a_category]?.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              <Field label="Purpose / Key Message" required>
                <Textarea
                  className={cn(inputClass, 'min-h-[88px]')}
                  placeholder="What is this document for? e.g. 'Inform parents about the Grade 7 camp from 10-12 June' or 'Thank parents for attending the meeting and share key decisions'"
                  defaultValue={a_purpose}
                  onBlur={e => setA_Purpose(e.target.value)}
                />
              </Field>

              <FieldRow>
                <Field label="Language">
                  <Select value={a_language} onValueChange={setA_Language}>
                    <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tone">
                  <Select value={a_tone} onValueChange={setA_Tone}>
                    <SelectTrigger className={selectClass}><SelectValue placeholder="Tone" /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>

              <Field label="Key Points to Cover">
                <Textarea
                  className={cn(inputClass, 'min-h-[72px]')}
                  placeholder="List specific points, e.g: Date, Time, Venue, Cost (R150), What to bring, Permission deadline"
                  defaultValue={a_keyPoints}
                  onBlur={e => setA_KeyPoints(e.target.value)}
                />
              </Field>

              <AdvancedSection label="Admin & General Tab">
                <FieldRow>
                  <Field label="School Name">
                    <Input className={inputClass} placeholder="e.g. Themba Primary School" defaultValue={a_schoolName} onBlur={e => setA_SchoolName(e.target.value)} />
                  </Field>
                  <Field label="Date">
                    <Input className={inputClass} type="date" defaultValue={a_date} onBlur={e => setA_Date(e.target.value)} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Teacher Name">
                    <Input className={inputClass} placeholder="Your name" defaultValue={a_teacherName} onBlur={e => setA_TeacherName(e.target.value)} />
                  </Field>
                  <Field label="Principal Name">
                    <Input className={inputClass} placeholder="Principal's name" defaultValue={a_principalName} onBlur={e => setA_PrincipalName(e.target.value)} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Grade / Class">
                    <Select value={a_grade} onValueChange={v => { setA_Grade(v); setA_Subject(''); }}>
                      <SelectTrigger className={selectClass}><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(educationalData).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Subject">
                    <Select value={a_subject} onValueChange={setA_Subject} disabled={!a_grade}>
                      <SelectTrigger className={selectClass}><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {a_subjects.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        <SelectItem value="Other">Other (specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                    {a_subject === 'Other' && (
                      <Input className={cn(inputClass, 'mt-2')} placeholder="Enter subject name" defaultValue={a_customSubject} onBlur={e => setA_CustomSubject(e.target.value)} />
                    )}
                  </Field>
                </FieldRow>
                <div className="flex items-center gap-2">
                  <Switch checked={a_replySlip} onCheckedChange={setA_ReplySlip} id="a-reply" />
                  <Label htmlFor="a-reply" className="text-sm text-slate-300 cursor-pointer">Include Tear-Off Reply Slip</Label>
                </div>
                <Field label="Additional Instructions">
                  <Textarea className={cn(inputClass, 'min-h-[72px]')} placeholder="Any specific requirements..." defaultValue={a_extraInstructions} onBlur={e => setA_ExtraInstructions(e.target.value)} />
                </Field>
              </AdvancedSection>

              <Button
                onClick={handleGenerateAdmin}
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-slate-600 hover:bg-slate-500 text-white font-bold text-base"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
                ) : (
                  <><ClipboardList className="mr-2 h-5 w-5" /> Generate {a_type || 'Document'}</>
                )}
              </Button>
            </TabsContent>
            <TabsContent value="grade1" className="p-5 space-y-5 m-0">
              <Grade1EnglishGenerator />
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── RIGHT PANEL: Preview ─────────────────────────────────────────── */}
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          <PreviewPanel
            isLoading={isLoading}
            activeTab={activeTab}
            activePreviewTab={activePreviewTab}
            setActivePreviewTab={setActivePreviewTab}
            teachingResult={teachingResult}
            visualResult={visualResult}
            adminResult={adminResult}
            isSaving={isSaving}
            onSave={handleSave}
            onPrint={handlePrint}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          header, nav, aside, footer { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}