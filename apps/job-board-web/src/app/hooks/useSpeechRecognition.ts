'use client';

import { useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = typeof window extends undefined
  ? never
  : new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: ((event: any) => void) | null;
      onerror: ((event: any) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };

type Props = {
  lang?: string;
  onTranscript?: (value: string) => void;
};

const useSpeechRecognition = ({ lang = 'en-US', onTranscript }: Props = {}) => {
  const recognitionRef = useRef<InstanceType<SpeechRecognitionLike> | null>(null);
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionLike;
        webkitSpeechRecognition?: SpeechRecognitionLike;
      }).SpeechRecognition ||
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionLike;
        webkitSpeechRecognition?: SpeechRecognitionLike;
      }).webkitSpeechRecognition;

    setSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const start = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionLike;
        webkitSpeechRecognition?: SpeechRecognitionLike;
      }).SpeechRecognition ||
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionLike;
        webkitSpeechRecognition?: SpeechRecognitionLike;
      }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser');
      return;
    }

    try {
      setError('');
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript || '')
          .join('');
        onTranscript?.(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        setError(event?.error || 'Voice input failed');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch (err) {
      setError('Voice input failed');
      setIsListening(false);
    }
  };

  const toggle = () => {
    if (isListening) stop();
    else start();
  };

  return {
    supported,
    isListening,
    error,
    start,
    stop,
    toggle,
  };
};

export default useSpeechRecognition;
