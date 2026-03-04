/**
 * Web Speech API wrapper for voice recognition.
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function isVoiceSupported() {
  return !!SpeechRecognition;
}

/**
 * Creates and starts a speech recognition session.
 * @param {Object} opts
 * @param {function} opts.onInterim - Called with interim transcript text
 * @param {function} opts.onResult - Called with final transcript text
 * @param {function} opts.onError - Called with error string
 * @param {function} opts.onEnd - Called when recognition ends
 * @returns {{ stop: function }} Control object
 */
export function createRecognition({ onInterim, onResult, onError, onEnd }) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        if (onResult) onResult(finalTranscript.trim());
      } else {
        interim += transcript;
      }
    }
    if (interim && onInterim) {
      onInterim(finalTranscript + interim);
    }
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd(finalTranscript.trim());
  };

  recognition.start();

  return {
    stop() {
      recognition.stop();
    },
    getTranscript() {
      return finalTranscript.trim();
    },
  };
}
