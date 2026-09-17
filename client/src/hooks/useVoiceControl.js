import { useState, useEffect, useRef, useCallback } from 'react';

export const useVoiceControl = ({ onCommand, onDictate } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error !== 'no-speech') {
          setError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            const finalPhrase = item[0].transcript.trim();
            currentTranscript = finalPhrase;
            setTranscript(finalPhrase);

            // Check if dictation mode or command mode
            if (onDictate) {
              onDictate(finalPhrase);
            }
            if (onCommand) {
              handleVoiceCommand(finalPhrase, onCommand);
            }
          } else {
            currentTranscript += item[0].transcript;
            setTranscript(currentTranscript);
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [onCommand, onDictate]);

  const handleVoiceCommand = (rawPhrase, callback) => {
    const phrase = rawPhrase.toLowerCase().trim();

    // 1. Navigation Commands
    if (phrase.includes('go to inbox') || phrase.includes('open inbox') || phrase.includes('show inbox')) {
      callback({ type: 'NAVIGATE', destination: 'inbox' });
      return;
    }
    if (phrase.includes('go to follow-ups') || phrase.includes('open follow-ups') || phrase.includes('show follow-ups') || phrase.includes('follow-ups')) {
      callback({ type: 'NAVIGATE', destination: 'follow-ups' });
      return;
    }
    if (phrase.includes('go to analytics') || phrase.includes('open analytics') || phrase.includes('show analytics') || phrase.includes('dashboard')) {
      callback({ type: 'NAVIGATE', destination: 'analytics' });
      return;
    }
    if (phrase.includes('go to starred') || phrase.includes('open starred') || phrase.includes('starred emails')) {
      callback({ type: 'NAVIGATE', destination: 'starred' });
      return;
    }
    if (phrase.includes('go to sent') || phrase.includes('open sent') || phrase.includes('sent emails')) {
      callback({ type: 'NAVIGATE', destination: 'sent' });
      return;
    }
    if (phrase.includes('go to trash') || phrase.includes('open trash')) {
      callback({ type: 'NAVIGATE', destination: 'trash' });
      return;
    }

    // 2. Compose Command
    if (phrase.includes('compose email') || phrase.includes('new email') || phrase.includes('write an email') || phrase.includes('open compose')) {
      callback({ type: 'COMPOSE' });
      return;
    }

    // 3. Search Command
    if (phrase.startsWith('search for') || phrase.startsWith('search') || phrase.startsWith('find emails') || phrase.startsWith('find')) {
      const query = rawPhrase.replace(/^(?:search\s+for|search|find\s+emails|find)\s+/i, '').trim();
      if (query) {
        callback({ type: 'SEARCH', query });
        return;
      }
    }

    // General fallback command
    callback({ type: 'RAW', text: rawPhrase });
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      setTranscript('');
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Recognition start exception:', e.message);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn('Recognition stop exception:', e.message);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};

export default useVoiceControl;

