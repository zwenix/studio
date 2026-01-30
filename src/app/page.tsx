import { ClipboardCheck, Mail, ScanText, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const features = [
  {
    icon: <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Content Generator" width={32} height={32} />,
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
    <div className="flex flex-col min-h-dvh bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-headline font-bold text-xl">
            <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={28} height={28} />
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
        <section className="relative w-full pt-24 pb-12 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32">
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-background to-background -z-10"></div>
           <div className="container mx-auto text-center px-4">
              <div className="bg-accent text-accent-foreground font-semibold rounded-full px-4 py-1 inline-block mb-4 text-sm">
                The Future of Education is Here
              </div>
              <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter">
                Supercharge Your Teaching with AI
              </h1>
              <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground">
                EduAI Companion is an all-in-one platform that leverages artificial intelligence to streamline your workflow, engage students, and enhance learning outcomes. Spend less time on admin and more time inspiring young minds.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started for Free <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">Explore Features</Link>
                </Button>
              </div>
            </div>
        </section>

        <section id="features" className="w-full py-16 md:py-24 lg:py-32 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Everything You Need in One Platform</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">From lesson planning to parent communication, we've got you covered. Here's how we help.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col text-left p-6 transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold font-headline mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm flex-1">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        <section className="w-full py-16 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                    <div className="bg-accent text-accent-foreground font-semibold rounded-full px-4 py-1 inline-block mb-4 text-sm">
                        Built for Educators
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Focus on What Matters Most: Teaching</h2>
                    <p className="mt-4 text-muted-foreground">
                        Our powerful AI tools are designed to be intuitive and easy to use, so you can integrate them into your classroom without a steep learning curve. Automate grading, generate creative lesson ideas, and communicate effortlessly, all from one central hub.
                    </p>
                     <Button size="lg" asChild className="mt-6">
                        <Link href="/signup">Start Your Free Trial</Link>
                    </Button>
                </div>
                <div className="order-1 md:order-2">
                    <Image 
                        src="https://picsum.photos/seed/landing-feature/600/500" 
                        alt="Teacher using a laptop in a classroom"
                        data-ai-hint="teacher classroom laptop"
                        width={600} 
                        height={500} 
                        className="rounded-xl shadow-2xl" 
                    />
                </div>
            </div>
        </section>

      </main>

      <footer className="border-t bg-background">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <p>&copy; {new Date().getFullYear()} EduAI Companion. All rights reserved.</p>
           <div className="flex items-center gap-2 font-headline font-semibold">
                <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={20} height={20} />
                <span>EduAI Companion</span>
            </div>
        </div>
      </footer>
    </div>
  );
}
