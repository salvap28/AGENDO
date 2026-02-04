'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const messages = [
  'Viendo tus mejores horarios...',
  'Analizando tu energía del día...',
  'Organizando tus tareas importantes...',
  'Calculando descansos estratégicos...',
  'Optimizando tu plan...',
  'Preparando tu día ideal...',
];

export default function PlanGenerating() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="plan-generating-simple">
      <motion.div
        className="plan-generating-panel glass-panel"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <motion.h1
          className="plan-generating-simple-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.2,
            ease: 'easeOut',
          }}
        >
          Agendo está organizando tu día
        </motion.h1>
        
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessageIndex}
            className="plan-generating-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.4,
              ease: 'easeInOut',
            }}
          >
            {messages[currentMessageIndex]}
          </motion.p>
        </AnimatePresence>

        <motion.div
          className="plan-generating-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.4,
          }}
        >
          <motion.span
            className="plan-generating-dot"
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0,
            }}
          />
          <motion.span
            className="plan-generating-dot"
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.2,
            }}
          />
          <motion.span
            className="plan-generating-dot"
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.4,
            }}
          />
        </motion.div>
      </motion.div>
    </main>
  );
}

