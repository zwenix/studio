
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { SplashScreen } from '@/components/splash-screen';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sparkles, Star, Rocket, Palette, Brain, Zap, ArrowRight } from 'lucide-react';

const AdventureBox = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => (
  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center hover:scale-105 transition-all duration-500 shadow-xl group">
    <div className={`inline-flex p-4 rounded-2xl ${color} mb-6 group-hover:animate-bounce shadow-inner`}>
      <Icon className="w-10 h-10 text-white" />
    </div>
    <h4 className="text-2xl font-bold mb-3 font-patrick-hand text-white">{title}</h4>
    <p className="text-blue-100/80 font-medium">{description}</p>
  </div>
);

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-adventure');
  const robotImage = PlaceHolderImages.find(img => img.id === 'ai-robot-companion');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-600 text-white selection:bg-yellow-400 selection:text-indigo-900 overflow-x-hidden">
      {/* Magical Floating Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
        <Star className="absolute top-40 right-20 w-12 h-12 text-yellow-200 animate-float opacity-30" />
        <Star className="absolute bottom-40 left-1/4 w-10 h-10 text-purple-300 animate-wiggle opacity-20" />
        <div className="absolute top-1/4 left-1/2 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] animate-float" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full bg-indigo-950/20 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1 rounded-xl transform group-hover:rotate-12 transition-transform bg-transparent">
              <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI" width={32} height={48} />
            </div>
            <h1 className="text-2xl font-bold font-patrick-hand tracking-tight">EduAI <span className="text-yellow-400">Companion</span></h1>
          </Link>
          <div className="flex gap-4 items-center">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hidden sm:flex font-bold">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold px-6 py-2 rounded-full shadow-lg transform hover:scale-110 transition-all">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-48 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left animate-fadeInZoom">
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-full text-yellow-400 font-bold mb-8 animate-bounce">
                <Sparkles className="w-5 h-5" />
                <span>The Smartest Way to Learn!</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-bold mb-8 leading-[1.05] font-patrick-hand">
                Learning is an <span className="text-yellow-400 underline decoration-wavy underline-offset-8">Adventure!</span>
              </h2>
              <p className="text-2xl text-blue-100/80 mb-12 font-medium max-w-xl mx-auto lg:mx-0">
                Magic lesson plans, super homework help, and your very own AI robot tutor! 🚀
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button size="lg" asChild className="px-10 py-8 bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-3xl font-bold text-2xl shadow-2xl transform hover:scale-105 h-auto ring-8 ring-yellow-400/10">
                  <Link href="/signup" className="flex items-center gap-3">Start My Adventure <ArrowRight /></Link>
                </Button>
                <Button size="lg" asChild variant="outline" className="px-10 py-8 bg-white/5 border-white/20 backdrop-blur-md text-white hover:bg-white/10 rounded-3xl font-bold text-xl h-auto">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 animate-float">
                <Image 
                  src={heroImage?.imageUrl || "https://i.ibb.co/hGDJmD3/grok-image-1772581868247.jpg"} 
                  alt="Multiracial children learning together" 
                  width={800} 
                  height={600} 
                  className="rounded-[4rem] shadow-[0_0_50px_rgba(255,255,255,0.2)] border-8 border-white/10 object-cover"
                  priority
                  data-ai-hint="multiracial children"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-indigo-600 rounded-full flex items-center justify-center animate-wiggle z-20 shadow-2xl border-4 border-white/20 text-center p-6">
                <p className="text-white font-bold text-xl leading-tight">100% Fun<br/>Learning! 🎉</p>
              </div>
            </div>
          </div>
        </section>

        {/* Super Powers (Features) */}
        <section className="py-32 px-6 bg-white/5 backdrop-blur-sm border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h3 className="text-5xl md:text-6xl font-bold font-patrick-hand mb-6">Your Super Powers! 🦸‍♂️</h3>
              <p className="text-xl text-blue-100/60 max-w-2xl mx-auto">Everything you need to be a top student or a master teacher, all powered by magic AI.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AdventureBox
                icon={Zap}
                title="Magic Lessons"
                description="Create amazing lesson plans in a flash! Perfect for any subject."
                color="bg-orange-500"
              />
              <AdventureBox
                icon={Palette}
                title="Super Worksheets"
                description="Fun worksheets and exercises that you'll actually love doing!"
                color="bg-pink-500"
              />
              <AdventureBox
                icon={Brain}
                title="Smart Bot Tutor"
                description="Ask your friendly AI tutor anything, anytime! It never sleeps."
                color="bg-blue-500"
              />
              <AdventureBox
                icon={Star}
                title="Instant Grades"
                description="Get your results and helpful tips right away. No more waiting!"
                color="bg-yellow-500"
              />
              <AdventureBox
                icon={Rocket}
                title="Skill Tracker"
                description="Watch your skills grow like a rocket ship! 🚀"
                color="bg-green-500"
              />
              <AdventureBox
                icon={Palette}
                title="Cool Posters"
                description="Make beautiful posters for your room or classroom."
                color="bg-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Robot Buddy Section */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[5rem] p-12 md:p-20 text-white overflow-hidden relative group">
            <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
              <div className="text-center md:text-left">
                <h3 className="text-5xl md:text-7xl font-bold font-patrick-hand mb-8">Need a Hand? 🤖</h3>
                <p className="text-2xl font-medium mb-12 text-blue-100/90">Our AI companion is ready to help you with homework, lesson plans, or just a friendly chat!</p>
                <Button asChild size="lg" className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-[2rem] px-12 py-8 text-2xl font-bold shadow-xl transform transition hover:scale-110 h-auto">
                  <Link href="/ai-tutor">Talk to the Robot</Link>
                </Button>
              </div>
              <div className="flex justify-center group-hover:scale-110 transition-transform duration-1000">
                <Image 
                  src={robotImage?.imageUrl || "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=800"} 
                  alt="Friendly Robot Buddy" 
                  width={500} 
                  height={500} 
                  className="animate-float drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  data-ai-hint="friendly robot"
                />
              </div>
            </div>
            {/* Decoration Circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
        </section>

        {/* CTA Adventure Section */}
        <section className="py-40 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-6xl md:text-8xl font-bold mb-10 font-patrick-hand">Ready to Start?</h3>
            <p className="text-2xl text-blue-100/70 mb-16 font-medium">
              Join thousands of happy learners and teachers today! 🌍
            </p>
            <Button size="lg" asChild className="px-16 py-10 bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-[3rem] font-bold text-4xl shadow-[0_20px_50px_rgba(250,204,21,0.3)] transform hover:scale-110 transition-all h-auto group ring-8 ring-yellow-400/10">
              <Link href="/signup" className="flex items-center gap-6">
                Let's Go! <Rocket className="w-12 h-12 group-hover:animate-bounce" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-indigo-950/50 py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4">
            <div className="bg-transparent p-1 rounded-lg">
              <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="Logo" width={24} height={36} />
            </div>
            <span className="font-patrick-hand font-bold text-2xl tracking-tight">EduAI <span className="text-yellow-400">Companion</span></span>
          </div>
          <p className="text-blue-100/40 font-medium text-lg">
            &copy; 2026 EduAI Companion. All rights reserved by Zwelakhe Msuthu.
          </p>
          <div className="flex gap-8">
            <Link href="/terms" className="text-blue-100/40 hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="text-blue-100/40 hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
