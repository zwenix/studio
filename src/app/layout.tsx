import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Patrick_Hand, Comic_Neue, Schoolbell } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-patrick-hand',
});

const comicNeue = Comic_Neue({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-comic-neue',
});

const schoolbell = Schoolbell({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-schoolbell',
});

export const metadata: Metadata = {
  title: 'EduAI Companion',
  description: 'An AI-powered educational platform for teachers and students.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${patrickHand.variable} ${comicNeue.variable} ${schoolbell.variable} font-body antialiased`} suppressHydrationWarning={true}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getInitialColorMode() {
                  const persistedColorPreference = window.localStorage.getItem('theme');
                  const hasPersistedPreference = typeof persistedColorPreference === 'string';
                  if (hasPersistedPreference) {
                    return persistedColorPreference;
                  }
                  const mql = window.matchMedia('(prefers-color-scheme: dark)');
                  const hasMediaQueryPreference = typeof mql.matches === 'boolean';
                  if (hasMediaQueryPreference) {
                    return mql.matches ? 'dark' : 'light';
                  }
                  return 'light';
                }
                const colorMode = getInitialColorMode();
                if (colorMode === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
