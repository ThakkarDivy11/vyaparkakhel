'use client';
import { motion } from 'framer-motion';

// template.jsx re-renders on every route change (unlike layout.jsx which
// persists). This gives us a fade+slide entrance on all page navigations.
export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
