'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Camera, Cog, Loader2, Save, User, Building } from 'lucide-react';
import { supabase } from '@/lib/content-storage';

type ProfileRecord = {
  id: string;
  full_name?: string;
  school_name?: string;
  bio?: string;
  role?: string;
  avatar_url?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('teacher');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (authError || !authData.user) {
        setError('Please sign in to manage settings.');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      } else if (profileData) {
        const profile = profileData as ProfileRecord;
        setFullName(profile.full_name ?? authData.user.user_metadata?.full_name ?? '');
        setSchoolName(profile.school_name ?? '');
        setBio(profile.bio ?? '');
        setRole(profile.role ?? 'teacher');
        setAvatarUrl(profile.avatar_url ?? '');
      } else {
        setFullName(authData.user.user_metadata?.full_name ?? '');
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError('You must be signed in to save settings.');
      setSaving(false);
      return;
    }

    let nextAvatarUrl = avatarUrl;

    try {
      if (avatarFile) {
        const filePath = 'avatars/' + authData.user.id + '/' + Date.now() + '-' + avatarFile.name;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        nextAvatarUrl = data.publicUrl;
      }

      const { error: profileError } = await supabase.from('profiles').upsert([
        {
          id: authData.user.id,
          full_name: fullName,
          school_name: schoolName,
          bio,
          role,
          avatar_url: nextAvatarUrl,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (profileError) {
        throw new Error(profileError.message);
      }

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          school_name: schoolName,
          bio,
          role,
          avatar_url: nextAvatarUrl,
        },
      });

      if (updateUserError) {
        throw new Error(updateUserError.message);
      }

      setAvatarUrl(nextAvatarUrl);
      setMessage('Settings saved successfully.');
      setAvatarFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Cog className="h-4 w-4" />
            <span>Settings</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Profile and workspace settings</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            This page replaces the broken Firebase profile update path with direct Supabase auth and storage updates.
          </p>
        </header>

        {error ? <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-sm text-emerald-200">{message}</div> : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Avatar</p>
                    <p className="text-sm text-white">Upload a new profile image</p>
                  </div>
                </div>

                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-40 w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-500">
                    No avatar uploaded yet
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-indigo-500 hover:bg-slate-900">
                  <Camera className="h-4 w-4" />
                  <span>{avatarFile ? avatarFile.name : 'Choose avatar file'}</span>
                  <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} className="hidden" />
                </label>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Bot className="h-4 w-4" />
                  Supabase Storage bucket: avatars
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Full name</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

            <label className="grid gap-2 text-sm">
              <span className="flex items-center gap-2 text-slate-300"><Building className="h-4 w-4" />School name</span>
                  <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Role</span>
                  <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500">
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="text-slate-300">Bio</span>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={5} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500" />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save settings'}
              </button>

              <Link href="/" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
