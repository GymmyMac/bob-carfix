import { useState, useEffect, useRef } from 'react';

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
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety timeout: max 15 seconds listening to prevent stuck state
  const MAX_LISTENING_DURATION = 15000;

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onTranscript, onSpeechEnd]);

  useEffect(() => {
    // HTTPS validation - Speech Recognition requires secure context
    if (typeof window !== 'undefined' && 
        window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      console.warn('[BobWidget] Speech recognition requires HTTPS. PTT will not work on HTTP.');
      setError('Voice input requires a secure connection (HTTPS)');
      setIsSupported(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognitionAPI();
      
      recognition.continuous = mode === 'ptt';
      recognition.interimResults = true;
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
        // Clear safety timeout on natural end
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
        
        setIsListening(false);
        setInterimTranscript('');
        
        if (lastFinalTranscriptRef.current && onSpeechEndRef.current) {
          onSpeechEndRef.current(lastFinalTranscriptRef.current);
        }
        lastFinalTranscriptRef.current = '';
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
      
      // Safety timeout - force stop after 15 seconds to prevent stuck state
      safetyTimeoutRef.current = setTimeout(() => {
        console.warn('[SpeechRecognition] Safety timeout - forcing stop after 15s');
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        setIsListening(false);
        setInterimTranscript('');
      }, MAX_LISTENING_DURATION);
      
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Catch InvalidStateError when recognition is already started
        console.warn('[SpeechRecognition] start() failed (already running):', e);
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
      }
    }
  };

  const stopListening = () => {
    // Clear safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    
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
