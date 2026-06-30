import { useState, useEffect } from "react";
import { useRef } from "react";
import { Mic, Square, Play, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FlashcardProps {
  question: string;
  answer: string;
  index: number;
  total: number;
  direction: "left" | "right";
  language?: "ar" | "en";
}

export const Flashcard = ({ question, answer, index, total, direction, language = "en" }: FlashcardProps) => {
  const [flipped, setFlipped] = useState(false);
  const labels = language === "ar"
    ? { question: "السؤال", answer: "الإجابة", reveal: "اضغط لإظهار الإجابة", back: "اضغط لرؤية السؤال", record: "سجل صوتك", stop: "إيقاف التسجيل", play: "تشغيل تسجيلك", listen: "استمع للإجابة", stopAudio: "إيقاف الصوت", micError: "تعذّر الوصول إلى المايكروفون" }
    : { question: "Question", answer: "Answer", reveal: "Tap to reveal answer", back: "Tap to see question", record: "Record your voice", stop: "Stop recording", play: "Play your recording", listen: "Hear the answer", stopAudio: "Stop audio", micError: "Microphone unavailable" };

  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setFlipped(false);
    // reset audio between cards
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    stopRecording();
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    stopRecording();
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert(labels.micError);
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const playRecording = () => {
    if (!recordedUrl) return;
    if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current = null; }
    const a = new Audio(recordedUrl);
    playbackRef.current = a;
    a.play().catch(() => {});
  };

  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakAnswer = async () => {
    // Create + unlock the <audio> element synchronously inside the user gesture
    // so mobile/Safari autoplay policies allow playback after the async fetch.
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch { /* noop */ }
      ttsAudioRef.current = null;
    }
    const audio = new Audio();
    audio.preload = "auto";
    ttsAudioRef.current = audio;
    setSpeaking(true);
    setFlipped(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => {
      setSpeaking(false);
      // Browser TTS fallback
      try {
        if ("speechSynthesis" in window) {
          const u = new SpeechSynthesisUtterance(answer);
          u.lang = language === "ar" ? "ar-SA" : "en-US";
          u.onend = () => setSpeaking(false);
          u.onerror = () => setSpeaking(false);
          setSpeaking(true);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        }
      } catch { /* noop */ }
    };

    try {
      const { data, error } = await supabase.functions.invoke("tts-speak", {
        body: { text: answer, language, voice: language === "ar" ? "shimmer" : "alloy" },
      });
      if (error || !data?.audio) throw error || new Error("No audio");
      audio.src = `data:${data.mime || "audio/mpeg"};base64,${data.audio}`;
      await audio.play();
    } catch {
      // Trigger fallback via onerror path
      audio.onerror?.(new Event("error"));
    }
  };

  const stopSpeaking = () => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch { /* noop */ }
      ttsAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const animClass = direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div key={index} className={`perspective w-full max-w-2xl ${animClass} flex flex-col gap-3`}>
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
        className="relative w-full h-[420px] md:h-[480px] preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.4,0.0,0.2,1)] focus:outline-none group"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 backface-hidden rounded-[var(--radius)] p-8 md:p-12 flex flex-col justify-between border border-border"
          style={{ background: "var(--gradient-card-front)", boxShadow: "var(--shadow-card)", color: "hsl(var(--card-front-fg))" }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] opacity-60">
            <span>{labels.question}</span>
            <span className="font-mono">{String(index + 1).padStart(2, "0")} / {total}</span>
          </div>
          <div className="flex-1 flex items-center justify-center px-2">
            <p className="text-2xl md:text-3xl font-semibold text-center leading-snug">
              {question}
            </p>
          </div>
          <div className="text-center text-xs opacity-50 tracking-widest uppercase group-hover:opacity-80 transition-opacity">
            {labels.reveal}
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-[var(--radius)] p-8 md:p-12 flex flex-col justify-between border border-border"
          style={{ background: "var(--gradient-card-back)", boxShadow: "var(--shadow-card)", color: "hsl(var(--card-back-fg))" }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] opacity-70">
            <span>{labels.answer}</span>
            <span className="font-mono">{String(index + 1).padStart(2, "0")} / {total}</span>
          </div>
          <div className="flex-1 flex items-center justify-center px-2">
            <p className="text-2xl md:text-3xl font-semibold text-center leading-snug">
              {answer}
            </p>
          </div>
          <div className="text-center text-xs opacity-60 tracking-widest uppercase group-hover:opacity-90 transition-opacity">
            {labels.back}
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2" dir={language === "ar" ? "rtl" : "ltr"}>
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Mic className="size-4" /> {labels.record}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium animate-pulse"
          >
            <Square className="size-4" /> {labels.stop}
          </button>
        )}

        {recordedUrl && !recording && (
          <button
            type="button"
            onClick={playRecording}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Play className="size-4" /> {labels.play}
          </button>
        )}

        {!speaking ? (
          <button
            type="button"
            onClick={speakAnswer}
            className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Volume2 className="size-4" /> {labels.listen}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSpeaking}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <VolumeX className="size-4" /> {labels.stopAudio}
          </button>
        )}
      </div>
    </div>
  );
};
