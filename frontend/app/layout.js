import { ClerkProvider } from '@clerk/nextjs';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import ZoomLock from '@/components/game/ZoomLock';
import './globals.css';

// Single font for product UI (Rulebook §1.1).
// Multiple weights cover headings (700/800) and body (400/500/600).
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

// Tabular numbers (room codes, dice, money)
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'व्यापार खेल',
  description: 'Multiplayer business board game — play with friends and family.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <ClerkProvider>
          <ZoomLock />
          {children}
          <Toaster
            position="top-center"
            theme="light"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-strong)',
                fontFamily: 'var(--font-display)',
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}
