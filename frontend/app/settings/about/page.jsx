'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageBackground } from '@/components/ui';

export default function AboutPage() {
  const router = useRouter();
  return (
    <PageBackground>
      <main className="min-h-screen max-w-xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface text-text hover:bg-surface-2 transition-colors duration-150 ease-out"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">About</h1>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-(--shadow-sm) p-8 text-center space-y-3">
          <h2 className="text-4xl font-extrabold hero-text text-alabaster-700">व्यापार खेल</h2>
          <p className="text-text">
            A multiplayer business board game inspired by Monopoly India Edition.
            Built for playing with friends and family.
          </p>
          <p className="text-text-muted text-sm tabular-nums">
            Version 0.1 · Phase 1 (early access)
          </p>
        </div>
      </main>
    </PageBackground>
  );
}
