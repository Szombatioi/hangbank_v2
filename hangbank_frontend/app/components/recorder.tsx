"use client";

//TODO:
//1. Per-block transcription (return segments with time,iscompleted and block)
//2. merge transcription parameters into one object in the interface, do not send one-by-one, send all or nothing
import { useEffect, useRef, useState } from "react";
import { CircularProgress, IconButton, Paper } from "@mui/material";
import { Pause, PlayArrow, Replay, Stop } from "@mui/icons-material";
import WaveSurfer from "wavesurfer.js";
import { useTranslation } from "react-i18next";
import api from "@/app/axios";
import { translateHttpError } from "@/app/components/helpers/http-error";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";
import ConfirmDialog from "@/app/components/confirm-dialog";
import Transcriber, { TranscriberHandle } from "@/app/components/transcriber";
import { formatDuration } from "./helpers/formatDuration";

// Same shape as BlockDto's audioFile
export interface RecorderAudioFile {
  id: string;
  s3Link: string;
  transcription: string;
}

export interface TranscriptionSegment{
  start: string;
  end: string;
  text: string;
  completed: boolean;
}

interface RecorderProps {
  deviceId: string;
  onAudioBlob: (blob: Blob, durationSeconds: number) => void;
  sampleRate?: number;
  bitDepth?: number;
  //When present, the recorder loads this existing audio and shows its waveform
  recordedAudio?: RecorderAudioFile | null;
  //Changes when the active block changes, so the recorder resets/reloads per block */
  sessionKey?: string;
  //When provided, live speech-to-text runs alongside recording */
  onTranscript?: (text: string) => void;
  transcriptionLang?: string;
}

export default function Recorder({
  deviceId,
  onAudioBlob,
  sampleRate = 48000,
  bitDepth = 16,
  recordedAudio = null,
  sessionKey,
  onTranscript,
  transcriptionLang,
}: RecorderProps) {
  const { showMessage } = useSnackbar();
  const { t } = useTranslation("common");
  const transcriptionSampleRate = 16000;
  const wantsTranscription =
    onTranscript !== undefined && transcriptionLang !== undefined;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reRecordConfirmOpen, setReRecordConfirmOpen] = useState(false);
  // UI state for the live-transcription connection (the send gate uses the ref below)
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "connecting" | "ready" | "full" | "disconnected"
  >("connecting");

  // const transcriberRef = useRef<TranscriberHandle>(null); //TODO: may be useless
  const transcriptionContextRef = useRef<AudioContext | null>(null);
  const transcriptionWorkletRef = useRef<AudioWorkletNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const actualSampleRateRef = useRef<number>(sampleRate);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null); //Stream: a microphone's source stream
  const isRecordingRef = useRef(false);
  const onAudioBlobRef = useRef(onAudioBlob);
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const liveTranscriptionWsRef = useRef<WebSocket | null>(null); //WebSocket
  const transcriptionReadyRef = useRef(false); //<-> allowLiveTranscription

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    onAudioBlobRef.current = onAudioBlob;
  }, [onAudioBlob]);

  //Loading WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;
    waveSurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#4F4A85",
      progressColor: "#383351",
      cursorColor: "#A6A3FF",
      barWidth: 2,
      height: 100,
      fillParent: true,
      minPxPerSec: 100,
      autoScroll: true,
      autoCenter: true,
    });
    // Keep the playback toggle in sync with the recorded-audio playback
    waveSurferRef.current.on("play", () => setIsPlaying(true));
    waveSurferRef.current.on("pause", () => setIsPlaying(false));
    waveSurferRef.current.on("finish", () => setIsPlaying(false));
    // Reflect the duration of a loaded audio file (not while recording)
    waveSurferRef.current.on("ready", () => {
      if (!isRecordingRef.current && waveSurferRef.current) {
        setDurationSeconds(waveSurferRef.current.getDuration());
      }
    });
    return () => {
      waveSurferRef.current?.destroy();
    };
  }, []);

  // When the active block changes (or its saved audio changes), reset playback
  // state and, if the block already has a recording, load it: ask the backend
  // for a presigned URL (which also checks access permission) and render its
  // waveform. NOTE: this must NOT remount the recorder — that would interrupt
  // the Space "save & continue recording" flow — so we reset imperatively here.
  useEffect(() => {
    let cancelled = false;

    waveSurferRef.current?.stop();
    setIsPlaying(false);
    setRecordedBlob(null);
    setAudioLoaded(false);
    setDurationSeconds(0);

    if (!recordedAudio) {
      waveSurferRef.current?.empty();
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{ url: string }>(
          `/project/audio-file/${recordedAudio.id}/url`
        );
        if (cancelled) return;
        await waveSurferRef.current?.load(data.url);
        if (cancelled) return;
        setAudioLoaded(true);
      } catch (err) {
        if (!cancelled)
          showMessage(
            translateHttpError(err, t, "Failed to load the recording"),
            Severity.error
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordedAudio?.id, sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  //Drawing the waveform every 0.5s
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => visualizePCM(pcmChunksRef.current), 500);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Tick a sample-derived duration
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => {
      const total = pcmChunksRef.current.reduce((s, c) => s + c.length, 0);
      setDurationSeconds(total / actualSampleRateRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === "Space" && isRecordingRef.current) {
        e.preventDefault();
        const { blob, durationSeconds: dur } = buildBlob();
        cleanupRecording();
        setIsRecording(false);
        setIsPaused(false);
        onAudioBlobRef.current(blob, dur);
        await startRecordingInternal();
      }
      if (e.code === "Enter" && isRecordingRef.current) {
        e.preventDefault();
        stopAndEmit();
        //Stop recording, but sending back the blob
      }
      if (e.code === "Escape" && isRecordingRef.current) {
        e.preventDefault();
        cleanupRecording();
        setIsRecording(false);
        setIsPaused(false);
        // transcriberRef.current?.stop();
        // Cancel: do NOT send audio data back
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //Attempt connecting to the Live-Transcription service on page load
  useEffect(() => {
    if (!wantsTranscription) return;
    const WS_URL = "ws://localhost:8080/"; //TODO: env variable!!
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    liveTranscriptionWsRef.current = ws;
    const uid = crypto.randomUUID();

    const lang = transcriptionLang?.split("-")[0]; //transcription lang

    ws.onopen = () => {
      console.log("WS opening...");
      ws.send(
        JSON.stringify({
          uid: uid,
          language: lang,
          task: "transcribe",
          model: "tiny", // TODO: must match WHISPERLIVE_MODEL on the server, ENV variable!!
          use_vad: true,
          //audio_format: 'int16', // (signed 16-bit PCM)
        })
      );
      console.log("WS opening message sent...");
    };

    ws.onmessage = async (evt) => {
      if (typeof evt.data !== "string") return;
      let msg: any;

      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.uid && msg.uid !== uid) return;

      console.log("WS message: ", msg);

      if (msg.message === "SERVER_READY") {
        setTranscriptionStatus("ready");
        transcriptionReadyRef.current = true;
        showMessage("Ready for recording!", Severity.success);
        return;
      }

      if (msg.status === "WAIT" || msg.message === "WAIT") {
        // Server is at capacity (all slots taken)
        setTranscriptionStatus("full");
        return;
      }
      // list of segments arrived
      if (Array.isArray(msg.segments)) {
        console.log(msg.segments);
        onTranscript(msg.segments.map((s: TranscriptionSegment) => s.text).join(" "));
        // setSegments(msg.segments);
      }
    };

    ws.onerror = () => {
      // Ignore errors from a superseded socket (e.g. React StrictMode remount)
      if (liveTranscriptionWsRef.current === ws) {
        setTranscriptionStatus("disconnected");
      }
    };
    ws.onclose = () => {
      // Only react to the socket we currently hold; a superseded socket
      // (React StrictMode remount) must not flip the UI or null the new ref.
      if (liveTranscriptionWsRef.current === ws) {
        liveTranscriptionWsRef.current = null;
        transcriptionReadyRef.current = false;
        setTranscriptionStatus("disconnected");
      }
    };

    return () => {
      ws.close();
      if (liveTranscriptionWsRef.current === ws) {
        liveTranscriptionWsRef.current = null;
        transcriptionReadyRef.current = false;
        setTranscriptionStatus("connecting");
      }
    };
  }, [onTranscript, transcriptionLang]);

  //Visualizes the current blob waveform
  function visualizePCM(chunks: Float32Array[]) {
    if (!audioContextRef.current || !waveSurferRef.current) return;
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLength === 0) return;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    // waveSurferRef.current.loadBlob(encodeWav(merged, sampleRate, bitDepth));
    waveSurferRef.current.loadBlob(
      encodeWav(merged, actualSampleRateRef.current, bitDepth)
    );
  }

  function buildBlob(): { blob: Blob; durationSeconds: number } {
    const totalLength = pcmChunksRef.current.reduce(
      (sum, c) => sum + c.length,
      0
    );
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      blob: encodeWav(merged, actualSampleRateRef.current, bitDepth),
      durationSeconds: totalLength / actualSampleRateRef.current,
    };
  }

  function cleanupRecording() {
    workletNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();

    //Close transcription
    if (wantsTranscription) {
      transcriptionWorkletRef.current?.disconnect();
      transcriptionContextRef.current?.close();
    }
  }

  //Main method to start the recording
  async function startRecordingInternal() {
    // Drop any previously recorded playback when (re-)recording
    waveSurferRef.current?.stop();
    setIsPlaying(false);
    setRecordedBlob(null);
    setAudioLoaded(false);
    pcmChunksRef.current = [];
    setDurationSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: { ideal: sampleRate }, //"exact" could throw OverconstrainedError
        },
      });
    } catch {
      showMessage("Failed to access microphone device", Severity.error);
      return;
    }

    mediaStreamRef.current = stream;
    const audioContext = new AudioContext({ sampleRate });
    audioContextRef.current = audioContext;
    actualSampleRateRef.current = audioContext.sampleRate;

    //Create for transcription
    if (wantsTranscription) {
      const transcriptionAudioContext = new AudioContext({
        sampleRate: transcriptionSampleRate,
      });
      transcriptionContextRef.current = transcriptionAudioContext;
      //TODO: actual sample rate here as well?

      await transcriptionAudioContext.audioWorklet.addModule(
        "/recorder-worklet.js"
      );
      const transcriptionSource =
        transcriptionAudioContext.createMediaStreamSource(stream);
      const transcriptionWorkletNode = new AudioWorkletNode(
        transcriptionAudioContext,
        "recorder-processor"
      );
      transcriptionSource.connect(transcriptionWorkletNode);
      transcriptionWorkletRef.current = transcriptionWorkletNode;

      //16kHz chunks
      transcriptionWorkletNode.port.onmessage = (e) => {
        // console.log(
        //   "[TR] chunk",
        //   (e.data as Float32Array).length,
        //   "ready:",
        //   transcriptionReadyRef.current,
        //   "ws:",
        //   liveTranscriptionWsRef.current?.readyState
        // );
        if (
          transcriptionReadyRef.current &&
          liveTranscriptionWsRef.current?.readyState == WebSocket.OPEN
        ) {
          const chunk = e.data as Float32Array;
          liveTranscriptionWsRef.current?.send(chunk.buffer);
          // console.log("Buffer sent for transcription");
        }
      };
    }

    //Checking if sample rate is supported by the AudioContext.
    if (audioContext.sampleRate !== sampleRate) {
      showMessage(
        //TODO add permanent warning
        `Requested ${sampleRate} Hz but AudioContext runs at ${audioContext.sampleRate} Hz, audio will be resampled`,
        Severity.error
      );
    }
    await audioContext.audioWorklet.addModule("/recorder-worklet.js");

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(
      audioContext,
      "recorder-processor"
    );
    workletNodeRef.current = workletNode;

    //Sending the blob chunks
    workletNode.port.onmessage = (e) => {
      const chunk = e.data as Float32Array;
      pcmChunksRef.current.push(chunk);
    };

    source.connect(workletNode);
    setIsRecording(true);
    setIsPaused(false);

    // Drive live transcription from the same start action (no-op when disabled)
    // transcriberRef.current?.start();
  }

  async function handleStart() {
    await startRecordingInternal();
  }

  function handlePause() {
    audioContextRef.current?.suspend();
    transcriptionContextRef.current?.suspend();
    setIsPaused(true);
    // transcriberRef.current?.pause();
  }

  function handleResume() {
    audioContextRef.current?.resume();
    transcriptionContextRef.current?.resume();
    setIsPaused(false);
    // transcriberRef.current?.resume();
  }

  // Stop recording, keep the blob locally so it can be played back, and emit it
  function stopAndEmit() {
    const { blob, durationSeconds: dur } = buildBlob();
    cleanupRecording();
    setIsRecording(false);
    setIsPaused(false);
    setRecordedBlob(blob);
    waveSurferRef.current?.loadBlob(blob);
    // transcriberRef.current?.stop();
    onAudioBlobRef.current(blob, dur);
  }

  function handleStop() {
    if (!isRecordingRef.current) return;
    stopAndEmit();
  }

  function handlePlayPause() {
    waveSurferRef.current?.playPause();
  }

  // Re-record: confirm first when an existing audio file is loaded, so we don't
  // discard a saved recording by accident
  function handleReRecord() {
    if (audioLoaded) {
      setReRecordConfirmOpen(true);
      return;
    }
    handleStart();
  }

  return (
    <>
      {wantsTranscription && transcriptionStatus !== "ready" ? (
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            border: "1px solid var(--app-border)",
            borderRadius: 2,
            p: 4,
            minHeight: 160,
            textAlign: "center",
            color: "var(--app-text-primary)",
          }}
        >
          {transcriptionStatus === "full" ? (
            <span>{t("record.transcription_full")}</span>
          ) : transcriptionStatus === "disconnected" ? (
            <span>{t("record.transcription_lost")}</span>
          ) : (
            <CircularProgress />
          )}
        </Paper>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--app-border)",
              borderRadius: 2,
              p: 2,
              gap: 1,
            }}
          >
            {/* {onTranscript && (
      <Transcriber
        ref={transcriberRef}
        lang={transcriptionLang}
        onTranscript={onTranscript}
        onError={(err) => {
          const message =
            err === "unsupported" ? "Live transcription isn't supported in this browser"
              : err === "not-allowed" || err === "service-not-allowed" ? "Live transcription was blocked (check microphone permission)"
                : err === "language-not-supported" ? `Live transcription doesn't support this language (${transcriptionLang ?? "default"})`
                  : err === "network" ? "Live transcription failed (network)"
                    : `Transcription error: ${err}`;
          showMessage(message, Severity.error);
        }}
      />
    )} */}
            <div ref={waveformRef} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifySelf: "start",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 900,
                    fontSize: "1.25rem",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.025em",
                    color: "var(--app-text-primary)",
                  }}
                >
                  {formatDuration(durationSeconds)}
                </span>
                <span
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(68,71,76,0.6)",
                  }}
                >
                  Duration
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {isRecording ? (
                  <>
                    <IconButton
                      onClick={isPaused ? handleResume : handlePause}
                      size="medium"
                      sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
                    >
                      {isPaused ? <PlayArrow /> : <Pause />}
                    </IconButton>
                    <IconButton
                      onClick={handleStop}
                      size="medium"
                      sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
                    >
                      <Stop />
                    </IconButton>
                  </>
                ) : recordedBlob || audioLoaded ? (
                  <>
                    <IconButton
                      onClick={handlePlayPause}
                      size="medium"
                      sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton
                      onClick={handleReRecord}
                      size="medium"
                      sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
                    >
                      <Replay />
                    </IconButton>
                  </>
                ) : (
                  <IconButton
                    onClick={handleStart}
                    size="medium"
                    sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
                  >
                    <PlayArrow />
                  </IconButton>
                )}
              </div>
              <div />
            </div>

            <ConfirmDialog
              open={reRecordConfirmOpen}
              title={t("record.rerecord_confirm_title")}
              description={t("record.rerecord_confirm_message")}
              proceedLabel={t("record.rerecord_confirm_proceed")}
              dangerous
              onProceed={() => {
                setReRecordConfirmOpen(false);
                handleStart();
              }}
              onCancel={() => setReRecordConfirmOpen(false)}
            />
          </Paper>
        </>
      )}
    </>
  );
}

function encodeWav(
  samples: Float32Array,
  sampleRate: number,
  bitDepth: number
): Blob {
  const bytesPerSample = bitDepth / 8;
  const audioFormat = bitDepth === 32 ? 3 : 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (bitDepth === 32) {
    for (let i = 0; i < samples.length; i++, offset += 4) {
      view.setFloat32(offset, samples[i], true);
    }
  } else {
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s * 0x7fff, true);
    }
  }

  return new Blob([new Uint8Array(buffer)], { type: "audio/wav" });
}
