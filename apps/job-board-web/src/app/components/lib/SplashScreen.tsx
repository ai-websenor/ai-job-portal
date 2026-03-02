'use client';

import { Image, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-white to-white opacity-60" />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative mb-12"
        >
          <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150 animate-pulse" />
          <Image
            src="/assets/images/logo.svg"
            alt="Logo"
            width={100}
            className="relative z-10 object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <Spinner
            color="primary"
            size="lg"
            label="Initializing Platform..."
            labelColor="primary"
            classNames={{
              label: 'text-default-500 font-semibold tracking-widest uppercase text-[10px]',
            }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-12 flex flex-col items-center gap-2"
      >
        <p className="text-default-400 text-[10px] uppercase tracking-[0.3em] font-bold">
          Future of Hiring
        </p>
        <div className="h-[2px] w-12 bg-primary/20 rounded-full" />
      </motion.div>
    </div>
  );
};

export default SplashScreen;
