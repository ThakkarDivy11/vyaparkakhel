'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md', // sm | md | lg
  className,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  }[size] || 'max-w-md';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-alabaster-900/40 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Card centering wrapper — pointer-events-none so clicks fall to backdrop */}
          <motion.div
            key="modal-card"
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={clsx(
                'pointer-events-auto relative w-full rounded-2xl border border-murrey-400 bg-surface',
                'shadow-2xl shadow-alabaster-900/30',
                sizeClass,
                className,
              )}
            >
              {title && (
                <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 border-b border-murrey-300">
                  <h2 className="text-lg font-bold text-alabaster-700">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-alabaster-700/70 hover:text-alabaster-700 transition w-8 h-8 rounded-lg hover:bg-murrey-200 flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
