'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, FileText, CheckCircle2, Percent } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Assignment, Content, User as UserProfile } from '@/lib/types';
import { StudentPerformanceChart } from './student-performance-chart';

interface StudentReportProps {
  studentId: string;
}

export function StudentReport({ studentId }: StudentReportProps) {
  const [studentProfile, setStudentProfile]   = useState<UserProfile | null>(null);
  const [assignmentsWithContent, setAssignmentsWithContent] = useState<(Assignment & { contentTopic?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const supabase = getSupabaseClient();

    const fetchAll = async () => {
      setIsLoading(true);

      // 1. Fetch student profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', studentId)
        .single();

      if (profileData) {
        setStudentProfile({
          ...profileData,
          firstName: profileData.first_name ?? '',
          lastName:  profileData.last_name  ?? '',
          avatarUrl: profileData.avatar_url,
        } as UserProfile);
      }

      // 2. Fetch all assignments for this learner
      const { data: rawAssignments } = await supabase
        .from('assignments')
        .select('*')
        .eq('learner_id', studentId);

      if (!rawAssignments || rawAssignments.length === 0) {
        setAssignmentsWithContent([]);
        setIsLoading(false);
        return;
      }

      // 3. For each assignment fetch the content topic
      const enhanced = await Promise.all(
        rawAssignments.map(async (row) => {
          // Normalise snake_case → camelCase
          const assign: Assignment = {
            id:                row.id,
            contentId:         row.content_id,
            learnerId:         row.learner_id,
            teacherId:         row.teacher_id,
            classId:           row.class_id,
            dueDate:           row.due_date,
            status:            row.status,
            submissionContent: row.submission_content,
            gradeReceived:     row.grade_received,
            feedback:          row.feedback,
            submittedAt:       row.submitted_at,
          };

          let contentTopic = 'Unknown Topic';
          if (assign.contentId) {
            const { data: contentData } = await supabase
              .from('content')
              .select('topic')
              .eq('id', assign.contentId)
              .single();
            if (contentData) contentTopic = contentData.topic;
          }

          return { ...assign, contentTopic };
        })
      );

      setAssignmentsWithContent(enhanced);
      setIsLoading(false);
    };

    fetchAll();
  }, [studentId]);

  const gradedAssignments = useMemo(
    () => assignmentsWithContent.filter(a => a.status === 'graded' && a.gradeReceived),
    [assignmentsWithContent]
  );

  const averageScore = useMemo(() => {
    if (gradedAssignments.length === 0) return 0;
    const total = gradedAssignments.reduce((acc, a) => {
      const match = a.gradeReceived!.match(/\d+/);
      return acc + (match ? parseInt(match[0], 10) : 0);
    }, 0);
    return Math.round(total / gradedAssignments.length);
  }, [gradedAssignments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading student report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-3" />
            {studentProfile?.firstName} {studentProfile?.lastName}'s Report
          </CardTitle>
          <CardDescription>{studentProfile?.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Total Assignments</p>
              <p className="text-2xl font-bold">{assignmentsWithContent.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Graded Assignments</p>
              <p className="text-2xl font-bold">{gradedAssignments.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Percent className="h-8 w-8 text-blue-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Average Score</p>
              <p className="text-2xl font-bold">{averageScore}%</p>
              <Progress value={averageScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Performance Over Time</CardTitle></CardHeader>
        <CardContent>
          <StudentPerformanceChart assignments={gradedAssignments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assignment Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentsWithContent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No assignments found for this student.
                  </TableCell>
                </TableRow>
              )}
              {assignmentsWithContent.map((assign) => (
                <TableRow key={assign.id}>
                  <TableCell className="font-medium">{assign.contentTopic}</TableCell>
                  <TableCell>
                    {assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{assign.status}</TableCell>
                  <TableCell className="text-right font-medium">
                    {assign.gradeReceived || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
