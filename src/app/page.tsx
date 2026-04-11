'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { SplashScreen } from '@/components/splash-screen';
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
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only show the splash once per browser session
    const hasSeenSplash = sessionStorage.getItem('splashShown');
    if (hasSeenSplash) return;

    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(true);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white selection:bg-yellow-400 selection:text-indigo-900 overflow-x-hidden relative">
      {/* Magical Floating Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-40" />
        <Star className="absolute top-40 right-20 w-12 h-12 text-yellow-200 animate-float opacity-30" />
        <Star className="absolute bottom-40 left-1/4 w-10 h-10 text-purple-300 opacity-20" />
        <div className="absolute top-1/4 left-1/2 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full bg-transparent backdrop-blur-xl z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-transparent p-1 rounded-lg transform group-hover:rotate-12 transition-transform">
              <Image 
                src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" 
                alt="EduAI" 
                width={32} 
                height={48} 
                style={{ width: 'auto', height: '48px' }}
              />
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
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full text-white font-bold mb-8 animate-bounce">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>The Smartest Way to Learn!</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-bold mb-8 leading-[1.05] font-patrick-hand">
                Learning is an <span className="text-yellow-400 underline decoration-wavy underline-offset-8">Adventure!</span>
              </h2>
              <p className="text-2xl text-white/90 mb-12 font-medium max-w-xl mx-auto lg:mx-0">
                Magic lesson plans, super homework help, and your very own AI robot tutor! 🚀
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button size="lg" asChild className="px-10 py-8 bg-yellow-400 text-slate-950 hover:bg-yellow-300 rounded-3xl font-bold text-2xl shadow-2xl transform hover:scale-105 h-auto ring-8 ring-white/10">
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
                  src="https://i.ibb.co/hGDJmD3/grok-image-1772581868247.jpg" 
                  alt="Multiracial children learning together in classroom" 
                  width={800} 
                  height={600} 
                  className="rounded-[4rem] shadow-2xl border-8 border-white/10 object-cover"
                  priority
                  style={{ width: '100%', height: 'auto' }}
                  data-ai-hint="multiracial children"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-primary rounded-full flex items-center justify-center animate-wiggle z-20 shadow-2xl border-4 border-white/20 text-center p-6">
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
              <p className="text-xl text-white/80 max-w-2xl mx-auto">Everything you need to be a top student or a master teacher, all powered by magic AI.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AdventureBox icon={Zap} title="Magic Lessons" description="Create amazing lesson plans in a flash! Perfect for any subject." color="bg-orange-500" />
              <AdventureBox icon={Palette} title="Super Worksheets" description="Fun worksheets and exercises that you'll actually love doing!" color="bg-pink-500" />
              <AdventureBox icon={Brain} title="Smart Bot Tutor" description="Ask your friendly AI tutor anything, anytime! It never sleeps." color="bg-blue-500" />
              <AdventureBox icon={Star} title="Instant Grades" description="Get your results and helpful tips right away. No more waiting!" color="bg-yellow-500" />
              <AdventureBox icon={Rocket} title="Skill Tracker" description="Watch your skills grow like a rocket ship! 🚀" color="bg-green-500" />
              <AdventureBox icon={Palette} title="Cool Posters" description="Make beautiful posters for your room or classroom." color="bg-purple-500" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-indigo-950/50 py-20 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="bg-transparent p-1 rounded-lg">
                <Image 
                  src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" 
                  alt="Logo" 
                  width={24} 
                  height={36} 
                  style={{ width: 'auto', height: '36px' }}
                />
              </div>
              <span className="font-patrick-hand font-bold text-2xl tracking-tight">EduAI <span className="text-yellow-400">Companion</span></span>
            </div>
            <div className="text-white/60 text-sm">
              <p>© 2026 EduAI Companion. All rights reserved by Zwelakhe Msuthu - Owner & Developer</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
