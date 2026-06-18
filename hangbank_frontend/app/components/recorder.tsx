"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, Paper } from "@mui/material";
import { Pause, PlayArrow, Replay, Stop } from "@mui/icons-material";
import WaveSurfer from "wavesurfer.js";
import { Severity, useSnackbar } from "@/app/providers/SnackbarProvider";

interface RecorderProps {
  deviceId: string;
  onAudioBlob: (blob: Blob, durationSeconds: number) => void;
  sampleRate?: number;
  bitDepth?: number;
}

function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const mm = Math.floor(safe / 60);
  const ss = Math.floor(safe % 60);
  const cs = Math.floor((safe * 100) % 100);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export default function Recorder({
  deviceId,
  onAudioBlob,
  sampleRate = 48000,
  bitDepth = 16,
}: RecorderProps) {
  const { showMessage } = useSnackbar();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const actualSampleRateRef = useRef<number>(sampleRate);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const onAudioBlobRef = useRef(onAudioBlob);
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    onAudioBlobRef.current = onAudioBlob;
  }, [onAudioBlob]);

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
    return () => {
      waveSurferRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => visualizePCM(pcmChunksRef.current), 500);
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Tick a sample-derived duration; immune to startup latency, pause, and tab throttling
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => {
      const total = pcmChunksRef.current.reduce((s, c) => s + c.length, 0);
      setDurationSeconds(total / sampleRate);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, isPaused, sampleRate]);

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
      if ((e.code === "Escape") && isRecordingRef.current) {
        e.preventDefault();
        cleanupRecording();
        setIsRecording(false);
        setIsPaused(false);
        // Cancel: do NOT send audio data back
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    waveSurferRef.current.loadBlob(encodeWav(merged, actualSampleRateRef.current, bitDepth));

  }

  function buildBlob(): { blob: Blob; durationSeconds: number } {
    const totalLength = pcmChunksRef.current.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return {
      blob: encodeWav(merged, sampleRate, bitDepth),
      durationSeconds: totalLength / sampleRate,
    };
  }

  function cleanupRecording() {
    workletNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
  }

  async function startRecordingInternal() {
    // Drop any previously recorded playback when (re-)recording
    waveSurferRef.current?.stop();
    setIsPlaying(false);
    setRecordedBlob(null);
    pcmChunksRef.current = [];
    setDurationSeconds(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: { ideal: sampleRate } //"exact" could throw OverconstrainedError
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


    //Checking if sample rate is supported by the AudioContext.
    if (audioContext.sampleRate !== sampleRate) {
      showMessage( //TODO add permanent warning
        `Requested ${sampleRate} Hz but AudioContext runs at ${audioContext.sampleRate} Hz — audio will be resampled`,
        Severity.error,
      );
    }
    await audioContext.audioWorklet.addModule("/recorder-worklet.js");

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "recorder-processor");
    workletNodeRef.current = workletNode;

    workletNode.port.onmessage = (e) => {
      pcmChunksRef.current.push(e.data as Float32Array);
    };

    source.connect(workletNode);
    setIsRecording(true);
    setIsPaused(false);
  }

  async function handleStart() {
    await startRecordingInternal();
  }

  function handlePause() {
    audioContextRef.current?.suspend();
    setIsPaused(true);
  }

  function handleResume() {
    audioContextRef.current?.resume();
    setIsPaused(false);
  }

  // Stop recording, keep the blob locally so it can be played back, and emit it
  function stopAndEmit() {
    const { blob, durationSeconds: dur } = buildBlob();
    cleanupRecording();
    setIsRecording(false);
    setIsPaused(false);
    setRecordedBlob(blob);
    waveSurferRef.current?.loadBlob(blob);
    onAudioBlobRef.current(blob, dur);
  }

  function handleStop() {
    if (!isRecordingRef.current) return;
    stopAndEmit();
  }

  function handlePlayPause() {
    waveSurferRef.current?.playPause();
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        p: 2,
        gap: 1,
      }}
    >
      <div ref={waveformRef} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifySelf: "start" }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 900,
              fontSize: "1.25rem",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.025em",
              color: "#191c1d",
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
          ) : recordedBlob ? (
            <>
              <IconButton
                onClick={handlePlayPause}
                size="medium"
                sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton
                onClick={handleStart}
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
    </Paper>
  );
}

function encodeWav(samples: Float32Array, sampleRate: number, bitDepth: number): Blob {
  const bytesPerSample = bitDepth / 8;
  const audioFormat = bitDepth === 32 ? 3 : 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
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
