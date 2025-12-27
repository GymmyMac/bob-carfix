import { useState, useEffect, useRef } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface Window {
  SpeechRecognition: {
    new(): SpeechRecognition;
  };
  webkitSpeechRecognition: {
    new(): SpeechRecognition;
  };
}

type SpeechMode = 'toggle' | 'ptt';

interface UseSpeechRecognitionProps {
  onTranscript?: (transcript: string) => void;
  onSpeechEnd?: (transcript: string) => void;
  language?: string;
  mode?: SpeechMode;
}

export const useSpeechRecognition = ({
  onTranscript,
  onSpeechEnd,
  language = 'en-NZ',
  mode = 'toggle'
}: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFinalTranscriptRef = useRef<string>('');
  const onTranscriptRef = useRef(onTranscript);
  const onSpeechEndRef = useRef(onSpeechEnd);

  // Keep refs up to date
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onTranscript, onSpeechEnd]);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognitionAPI();
      
      // PTT mode: continuous listening while held; Toggle: single utterance
      recognition.continuous = mode === 'ptt';
      recognition.interimResults = true; // Show real-time results
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText) {
          lastFinalTranscriptRef.current = finalText;
          setTranscript(finalText);
          if (onTranscriptRef.current) {
            onTranscriptRef.current(finalText);
          }
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        
        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setError('No microphone found. Please check your device.');
            break;
          case 'not-allowed':
            setError('Microphone permission denied. Please allow access.');
            break;
          default:
            setError('Speech recognition error. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        
        // Trigger onSpeechEnd if we have a final transcript
        if (lastFinalTranscriptRef.current && onSpeechEndRef.current) {
          onSpeechEndRef.current(lastFinalTranscriptRef.current);
        }
        lastFinalTranscriptRef.current = ''; // Reset for next session
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, mode]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};
