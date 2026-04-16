'use client';

import { useState, type FormEvent } from 'react';
import Link        from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button }  from '@/components/ui/button';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase            = getSupabaseClient();
  const [email,   setEmail] = useState('');
  const [sent,    setSent]  = useState(false);
  const [error,   setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    );

    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-white font-headline">Reset Password</h1>
          <p className="text-blue-300 mt-1 text-sm">
            Enter your email and we'll send a reset link
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-green-300 text-lg font-semibold">📬 Check your inbox!</p>
              <p className="text-white/70 text-sm">
                We sent a password reset link to <strong className="text-white">{email}</strong>.
              </p>
              <Link href="/login">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fpEmail" className="text-white/80">Email address</Label>
                <Input
                  id="fpEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              {error && (
                <div role="alert" className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading || !email}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl h-11">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-blue-300 hover:underline text-sm">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
