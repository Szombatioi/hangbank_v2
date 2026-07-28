"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/** Imperative API — driven by the Recorder's controls (start/pause/resume/stop). */
export interface TranscriberHandle {
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
}

interface TranscriberProps {
    /** BCP-47 language tag, e.g. "en-US", "hu-HU", "de-DE". */
    lang?: string;
    /** Continuous output: fires with the full transcript so far on every update. */
    onTranscript: (text: string) => void;
    /** Fired on unrecoverable errors (e.g. "unsupported", "not-allowed"). */
    onError?: (error: string) => void;
}

// The Web Speech API isn't in the standard TS DOM lib, so we keep it loosely typed.
type SpeechRecognitionInstance = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Errors we cannot recover from by restarting — e.g. the cloud speech service is
// unreachable ("network"), permission denied, or the language isn't supported.
const FATAL_ERRORS = new Set([
    "network",
    "not-allowed",
    "service-not-allowed",
    "language-not-supported",
    "audio-capture",
]);

/**
 * Speech-to-text using the Web Speech API (SpeechRecognition). Recognition is
 * continuous and emits interim results, so the parent receives a live transcript.
 * Punctuation and casing are added automatically by the browser engine (Chrome)
 * for the languages that support it — there is no explicit API flag for it.
 *
 * Renders nothing; it's a logic component controlled through its ref.
 */
const Transcriber = forwardRef<TranscriberHandle, TranscriberProps>(function Transcriber(
    { lang = "en-US", onTranscript, onError },
    ref,
) {
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const finalizedRef = useRef("");      // text the engine has committed as final
    const listeningRef = useRef(false);   // should we currently be listening?
    const pausedRef = useRef(false);

    const onTranscriptRef = useRef(onTranscript);
    const onErrorRef = useRef(onError);
    const langRef = useRef(lang);

    useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);
    useEffect(() => {
        langRef.current = lang;
        if (recognitionRef.current) recognitionRef.current.lang = lang;
    }, [lang]);

    function getRecognition(): SpeechRecognitionInstance | null {
        if (recognitionRef.current) return recognitionRef.current;

        const SR =
            typeof window !== "undefined" &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        if (!SR) {
            onErrorRef.current?.("unsupported");
            return null;
        }

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langRef.current;

        recognition.onstart = () => console.debug("[Transcriber] started", recognition.lang);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                if (result.isFinal) finalizedRef.current += transcript;
                else interim += transcript;
            }
            onTranscriptRef.current((finalizedRef.current + interim).replace(/\s+/g, " ").trim());
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            // "no-speech"/"aborted" happen routinely; only surface real failures
            if (!event.error || event.error === "no-speech" || event.error === "aborted") return;
            console.warn("[Transcriber] recognition error:", event.error);
            // Stop the onend restart loop on unrecoverable errors so we don't spam
            if (FATAL_ERRORS.has(event.error)) {
                listeningRef.current = false;
                pausedRef.current = false;
            }
            onErrorRef.current?.(event.error);
        };

        recognition.onend = () => {
            // The engine stops itself after silence; keep it alive while listening
            if (listeningRef.current && !pausedRef.current) {
                try { recognition.start(); } catch { /* already starting */ }
            }
        };

        recognitionRef.current = recognition;
        return recognition;
    }

    function startRecognition() {
        const recognition = getRecognition();
        if (!recognition) return;
        recognition.lang = langRef.current;
        try {
            recognition.start();
        } catch (e) {
            // start() throws InvalidStateError if it's already running — that's fine.
            // Anything else is a real failure worth surfacing.
            if ((e as DOMException)?.name !== "InvalidStateError") {
                console.warn("[Transcriber] failed to start:", e);
                onErrorRef.current?.((e as Error)?.message ?? "start-failed");
            }
        }
    }

    // Fully discard the current recognition so the next session can't inherit its
    // accumulated results (otherwise a new block's transcript includes the old one).
    function teardownRecognition() {
        const recognition = recognitionRef.current;
        if (!recognition) return;
        recognitionRef.current = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        try { recognition.abort(); } catch { /* ignore */ }
    }

    useImperativeHandle(ref, () => ({
        start() {
            // Start a brand-new session so results never carry across blocks
            teardownRecognition();
            finalizedRef.current = "";
            onTranscriptRef.current("");
            listeningRef.current = true;
            pausedRef.current = false;
            startRecognition();
        },
        pause() {
            pausedRef.current = true;
            listeningRef.current = false;
            recognitionRef.current?.stop();
        },
        resume() {
            pausedRef.current = false;
            listeningRef.current = true;
            startRecognition();
        },
        stop() {
            listeningRef.current = false;
            pausedRef.current = false;
            recognitionRef.current?.stop();
        },
    }), []);

    useEffect(() => {
        return () => {
            listeningRef.current = false;
            recognitionRef.current?.abort?.();
        };
    }, []);

    return null;
});

export default Transcriber;
