'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-supabase-user';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const materialOptions = [
  { id: 'phonicsBook', label: 'Phonics Book 1 (Full Booklet)' },
  { id: 'sightWords', label: 'Sight Words Practice' },
  { id: 'readingComprehension', label: 'Reading Comprehension Passages' },
];

export default function Grade1EnglishGenerator() {
  const { user } = useUser();
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const { toast } = useToast();

  const supabase = createClient();

  const generateMaterial = async () => {
    if (!selectedMaterial || !user) return;

    setLoading(true);
    try {
      // TODO: Replace with your actual AI generation logic (Claude / Anthropic)
      const response = await fetch('/api/generate-grade1-english', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialType: selectedMaterial, userId: user.id }),
      });

      const data = await response.json();
      setGeneratedContent(data.content || 'Content generated successfully!');

      toast({
        title: "Success",
        description: "Grade 1 English material generated!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate material",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Grade 1 English Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Material Type</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="">Choose material...</option>
            {materialOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={generateMaterial} disabled={loading || !selectedMaterial} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Material'
          )}
        </Button>

        {generatedContent && (
          <div className="mt-4 p-4 bg-muted rounded-md whitespace-pre-wrap">
            {generatedContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}