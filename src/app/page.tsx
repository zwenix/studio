import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const FeatureBox = ({ icon, title, description }: { icon: string; title: string; description: string; }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center hover:border-white/30 transition-all duration-300 transform hover:-translate-y-1">
    <div className="text-5xl mb-4">{icon}</div>
    <h4 className="text-xl font-bold mb-2">{title}</h4>
    <p className="text-gray-400">{description}</p>
  </div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
      {/* Navigation */}
      <header className="fixed top-0 w-full bg-black/30 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="EduAI Companion Logo" width={40} height={40} />
            <h1 className="text-2xl font-bold">EduAI Companion</h1>
          </Link>
          <div className="flex gap-4 items-center">
             <Button asChild className="bg-white text-blue-900 hover:bg-slate-200 transition px-6 py-2 rounded-lg">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
            <Button asChild className="px-6 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 transition font-semibold">
              <Link href="/signup">
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Personalized Learning Powered by <span className="text-indigo-400">AI</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              EduAI Companion transforms education with AI-powered lesson planning, homework generation, and intelligent grading for teachers, parents, and students.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-16">
               <Button size="lg" asChild className="px-8 py-4 bg-blue-900 hover:bg-blue-800 rounded-xl font-semibold text-lg transition transform hover:scale-105 h-auto">
                <Link href="/signup">
                  Start Free Trial
                </Link>
              </Button>
               <Button size="lg" asChild className="px-8 py-4 bg-white text-blue-900 hover:bg-slate-200 rounded-xl font-semibold text-lg transition h-auto">
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-4xl font-bold text-center mb-16">Powerful Features</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureBox
                icon="🎓"
                title="AI Lesson Planning"
                description="Generate CAPS-aligned lesson plans in seconds with learning outcomes, activities, and assessments."
              />
              <FeatureBox
                icon="✏️"
                title="Smart Homework"
                description="Auto-generate homework with difficulty levels, rubrics, and answer guides for any topic."
              />
              <FeatureBox
                icon="📊"
                title="Intelligent Grading"
                description="Auto-grade assignments with detailed feedback and progress tracking for each student."
              />
              <FeatureBox
                icon="📈"
                title="Progress Reports"
                description="Get comprehensive student analytics with strengths, areas for improvement, and recommendations."
              />
              <FeatureBox
                icon="💬"
                title="AI Tutor Chat"
                description="24/7 AI-powered tutoring for students with instant explanations and personalized help."
              />
              <FeatureBox
                icon="🔍"
                title="OCR & Analysis"
                description="Upload homework photos for instant text extraction, grading, and detailed feedback."
              />
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-4xl font-bold mb-16">Built for Everyone</h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { role: '👨‍🏫', title: 'Teachers', desc: 'Plan lessons & grade work in minutes' },
                { role: '👨‍🎓', title: 'Students', desc: 'Get personalized AI tutoring 24/7' },
                { role: '👨‍👩‍👧', title: 'Parents', desc: 'Track progress & weekly AI reports' },
                { role: '⚙️', title: 'Admins', desc: 'Manage system & user accounts' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/30 transition">
                  <div className="text-5xl mb-4">{item.role}</div>
                  <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 text-center border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-4xl font-bold mb-6">Ready to Transform Education?</h3>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of educators revolutionizing the way they teach.
            </p>
            <Button size="lg" asChild className="px-8 py-4 bg-blue-900 hover:bg-blue-800 rounded-xl font-semibold text-lg transition transform hover:scale-105 h-auto">
              <Link href="/signup">
                Get Started Free
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-gray-400">
        <p>&copy; 2026 EduAI Companion. All rights reserved. | Product Owner & Developer: Zwelakhe Msuthu | Terms of Service</p>
      </footer>
    </div>
  );
}
