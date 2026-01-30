import { Bot, ClipboardCheck, Mail, ScanText, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: 'AI Content Generator',
    description: 'Generate CAPS-compliant lesson plans, exercises, assessments, and more in seconds.',
  },
  {
    icon: <ClipboardCheck className="h-8 w-8 text-primary" />,
    title: 'AI Autograding',
    description: 'Automatically grade assignments, provide detailed feedback, and apply rubrics.',
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: 'AI Tutor',
    description: 'An interactive AI tutor for students to ask questions and get help with their studies.',
  },
  {
    icon: <ScanText className="h-8 w-8 text-primary" />,
    title: 'OCR & Handwriting Tool',
    description: 'Convert printed or handwritten text from images into editable digital text.',
  },
  {
    icon: <Mail className="h-8 w-8 text-primary" />,
    title: 'Communication Portal',
    description: 'Seamlessly communicate with students and parents through an integrated messaging system.',
  },
   {
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    title: 'Class Management',
    description: 'Manage your classes, track student progress, and view performance analytics.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-headline font-bold text-xl">
            <Bot className="h-7 w-7 text-primary" />
            <span>EduAI Companion</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="relative w-full py-24 md:py-32 lg:py-40 bg-gradient-to-br from-primary/10 via-background to-background">
           <div className="container mx-auto text-center px-4">
              <div className="bg-accent text-accent-foreground font-semibold rounded-full px-4 py-1 inline-block mb-4 text-sm">
                The Future of Education is Here
              </div>
              <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter">
                Supercharge Your Teaching with AI
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
                EduAI Companion is an all-in-one platform that leverages artificial intelligence to streamline your workflow, engage students, and enhance learning outcomes.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
              </div>
            </div>
        </section>

        <section id="features" className="w-full py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Key Features</h2>
              <p className="mt-2 text-muted-foreground">Everything you need to create an inspiring learning environment.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col items-center text-center p-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold font-headline mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-8 flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EduAI Companion. All rights reserved.</p>
           <div className="flex items-center gap-2 font-headline font-semibold">
                <Bot className="h-5 w-5 text-primary" />
                <span>EduAI Companion</span>
            </div>
        </div>
      </footer>
    </div>
  );
}
