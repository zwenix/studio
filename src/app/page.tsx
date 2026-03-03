
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { SplashScreen } from '@/components/splash-screen';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sparkles, Star, Rocket, Palette, Brain, Zap } from 'lucide-react';

const AdventureBox = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => (
  <div className={`bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 text-center hover:scale-105 transition-all duration-500 shadow-xl group`}>
    <div className={`inline-flex p-4 rounded-2xl ${color} mb-6 group-hover:animate-bounce shadow-inner`}>
      <Icon className="w-10 h-10 text-white" />
    </div>
    <h4 className="text-2xl font-bold mb-3 font-patrick-hand text-white">{title}</h4>
    <p className="text-blue-100/80 font-medium">{description}</p>
  </div>
);

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);
  const kidsImage = PlaceHolderImages.find(img => img.id === 'hero-kids');
  const robotImage = PlaceHolderImages.find(img => img.id === 'ai-robot-toy');

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
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-600 to-blue-700 text-white selection:bg-yellow-400 selection:text-indigo-900 overflow-x-hidden">
      {/* Playful Floating Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <Star className="absolute top-20 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-20" />
        <Star className="absolute top-40 right-20 w-12 h-12 text-yellow-200 animate-float opacity-30" />
        <Star className="absolute bottom-40 left-1/4 w-10 h-10 text-purple-300 animate-wiggle opacity-20" />
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full bg-white/10 backdrop-blur-xl z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-white p-1 rounded-xl transform group-hover:rotate-12 transition-transform">
              <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="EduAI" width={32} height={48} />
            </div>
            <h1 className="text-2xl font-bold font-schoolbell tracking-wide">EduAI <span className="text-yellow-300">Companion</span></h1>
          </Link>
          <div className="flex gap-4 items-center">
            <Button asChild variant="ghost" className="text-white hover:bg-white/20 hidden sm:flex font-bold">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-yellow-400 text-indigo-900 hover:bg-yellow-300 font-bold px-6 py-2 rounded-full shadow-lg transform hover:scale-110 transition-all">
              <Link href="/signup">Let's Play!</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-2 rounded-full text-yellow-300 font-bold mb-6 animate-bounce">
                <Sparkles className="w-5 h-5" />
                <span>The Smartest Way to Learn!</span>
              </div>
              <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-[1.1] font-patrick-hand">
                Make Learning an <span className="text-yellow-300 underline decoration-wavy underline-offset-8">Adventure!</span>
              </h2>
              <p className="text-2xl text-blue-100 mb-10 font-medium max-w-xl mx-auto lg:mx-0">
                Magic lesson plans, super homework, and your very own AI robot tutor! 🚀
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button size="lg" asChild className="px-10 py-8 bg-yellow-400 text-indigo-900 hover:bg-yellow-300 rounded-2xl font-bold text-2xl shadow-2xl transform hover:scale-105 h-auto ring-4 ring-yellow-400/30">
                  <Link href="/signup">Start My Adventure!</Link>
                </Button>
                <Button size="lg" asChild className="px-10 py-8 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 rounded-2xl font-bold text-xl h-auto border border-white/30">
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 animate-float">
                <Image 
                  src={kidsImage?.imageUrl || "https://picsum.photos/seed/kids/800/600"} 
                  alt="Happy learning" 
                  width={800} 
                  height={600} 
                  className="rounded-[3rem] shadow-2xl border-8 border-white/20"
                  data-ai-hint="happy kids"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-yellow-400 rounded-full flex items-center justify-center animate-wiggle z-20 shadow-2xl border-4 border-white">
                <p className="text-indigo-900 font-bold text-center leading-tight">100% Fun<br/>Guaranteed! 🎉</p>
              </div>
            </div>
          </div>
        </section>

        {/* Magic Features */}
        <section className="py-24 px-6 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h3 className="text-5xl font-bold font-patrick-hand mb-4">Your Super Powers! 🦸‍♂️</h3>
              <p className="text-xl text-blue-100">Everything you need to be a top student or a master teacher.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AdventureBox
                icon={Zap}
                title="Magic Lessons"
                description="Create amazing lessons in a flash! Perfect for any subject."
                color="bg-orange-500"
              />
              <AdventureBox
                icon={Palette}
                title="Super Homework"
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
                title="Progress Tracker"
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

        {/* Robot Section */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-r from-yellow-400 to-orange-400 rounded-[4rem] p-12 text-indigo-900 overflow-hidden relative group">
            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
              <div className="text-center md:text-left">
                <h3 className="text-5xl font-bold font-patrick-hand mb-6">Need a Hand? 🤖</h3>
                <p className="text-2xl font-medium mb-8">Our AI companion is ready to help you with homework, lesson plans, or just a friendly chat!</p>
                <Button asChild size="lg" className="bg-indigo-900 text-white hover:bg-indigo-800 rounded-2xl px-10 py-6 text-xl font-bold">
                  <Link href="/ai-tutor">Talk to the Robot</Link>
                </Button>
              </div>
              <div className="flex justify-center group-hover:scale-110 transition-transform duration-700">
                <Image 
                  src={robotImage?.imageUrl || "https://picsum.photos/seed/robot/600/400"} 
                  alt="Friendly Robot" 
                  width={400} 
                  height={400} 
                  className="animate-float"
                  data-ai-hint="friendly robot"
                />
              </div>
            </div>
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-6xl font-bold mb-8 font-patrick-hand">Ready to Start?</h3>
            <p className="text-2xl text-blue-100 mb-12 font-medium">
              Join thousands of happy explorers today! 🌍
            </p>
            <Button size="lg" asChild className="px-12 py-10 bg-yellow-400 text-indigo-900 hover:bg-yellow-300 rounded-[2.5rem] font-bold text-3xl shadow-2xl transform hover:scale-110 transition-all h-auto group">
              <Link href="/signup" className="flex items-center gap-4">
                Let's Go! <Rocket className="w-10 h-10 group-hover:animate-bounce" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-md py-12 px-6 border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="Logo" width={24} height={36} />
            <span className="font-schoolbell font-bold text-xl">EduAI Companion</span>
          </div>
          <p className="text-blue-100/60 font-medium">
            &copy; 2026 EduAI Companion. All rights reserved by Zwelakhe Msuthu.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-blue-100/60 hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="text-blue-100/60 hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
