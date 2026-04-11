# ✅ EduAI Companion — Post-Migration Checklist
Generated: Sat Apr 11 08:46:49 SAST 2026

## Supabase Console Tasks
- [ ] Authentication → Providers → Enable **Email** provider
- [ ] Authentication → Providers → Enable **Google** provider
      (Client ID + Secret from Google Cloud Console → OAuth 2.0)
- [ ] Authentication → URL Configuration:
      - Site URL: `https://your-vercel-app.vercel.app`
      - Redirect URLs: `https://your-vercel-app.vercel.app/auth/callback`
- [ ] Storage → Confirm buckets exist: `profile-pictures`, `content-files`, `signatures`
- [ ] Storage → Set bucket policies to allow authenticated uploads
- [ ] Database → SQL Editor → Run `supabase/migrations/001_initial_schema.sql`
  (if you skipped the automated apply step)

## Vercel Dashboard Tasks
- [ ] Settings → Environment Variables → Add all vars from `.env.local`
- [ ] Settings → Domains → Add your custom domain (if you have one)
- [ ] Check build logs for any TypeScript errors

## Code Tasks (gradual — your app still works with Firebase during transition)
- [ ] Update `src/firebase/auth/use-user.tsx` imports to use
      `src/hooks/use-supabase-user.ts` instead
- [ ] Replace `useCollection` calls with the new hook in `src/hooks/use-collection.ts`
- [ ] Replace `useDoc` calls with the new hook in `src/hooks/use-doc.ts`
- [ ] Update `src/ai/flows/generate-caps-content.ts` to use
      `src/lib/ai.ts` generateJSON instead of Genkit
- [ ] Remove Firebase packages once all hooks are migrated:
      `npm uninstall firebase`
- [ ] Remove Genkit packages:
      `npm uninstall genkit @genkit-ai/google-genai @genkit-ai/next`

## Testing Checklist
- [ ] Sign up with email/password works
- [ ] Google OAuth login works
- [ ] Role selection page saves to Supabase
- [ ] Dashboard loads teacher/student data
- [ ] Content Creator generates and saves content
- [ ] Content Archive shows saved content
- [ ] AI Tutor responds
- [ ] File uploads go to Supabase Storage
- [ ] Real-time: open two browser tabs — changes appear instantly

## DNS Cutover (when ready)
- [ ] Go to your domain registrar
- [ ] Update CNAME to point to: `cname.vercel-dns.com`
- [ ] Wait for propagation (5-30 minutes)
- [ ] Update Supabase Site URL to your real domain

## After 48 Hours of Stable Running
- [ ] Disable Firebase App Hosting
- [ ] Archive Firebase Firestore (export final backup first)
- [ ] Remove `serviceAccountKey.json` from project (security!)
- [ ] Add `serviceAccountKey.json` to `.gitignore`

---
**Total estimated migration time: 2-4 hours**
**Monthly cost at launch: $0 (both Supabase and Vercel free tiers)**
