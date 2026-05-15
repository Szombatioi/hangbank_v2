"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, Paper } from "@mui/material";
import { Pause, PlayArrow, Stop } from "@mui/icons-material";
import WaveSurfer from "wavesurfer.js";
import { Severity, useSnackbar } from "@/app/contexts/SnackbarProvider";

interface RecorderProps {
  deviceId: string;
  onAudioBlob: (blob: Blob) => void;
  sampleRate?: number;
  bitDepth?: number;
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

  const audioContextRef = useRef<AudioContext | null>(null);
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
    return () => {
      waveSurferRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isRecording || isPaused) return;
    const interval = setInterval(() => visualizePCM(pcmChunksRef.current), 500);
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
        const blob = buildBlob();
        cleanupRecording();
        setIsRecording(false);
        setIsPaused(false);
        onAudioBlobRef.current(blob);
        await startRecordingInternal();
      }
      if ((e.code === "Escape" || e.code === "Enter") && isRecordingRef.current) {
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
    waveSurferRef.current.loadBlob(encodeWav(merged, sampleRate, bitDepth));
  }

  function buildBlob(): Blob {
    const totalLength = pcmChunksRef.current.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return encodeWav(merged, sampleRate, bitDepth);
  }

  function cleanupRecording() {
    workletNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
  }

  async function startRecordingInternal() {
    pcmChunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined },
      });
    } catch {
      showMessage("Failed to access microphone device", Severity.error);
      return;
    }

    mediaStreamRef.current = stream;
    const audioContext = new AudioContext({ sampleRate });
    audioContextRef.current = audioContext;

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

  function handleStop() {
    if (!isRecordingRef.current) return;
    const blob = buildBlob();
    cleanupRecording();
    setIsRecording(false);
    setIsPaused(false);
    onAudioBlob(blob);
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
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {!isRecording ? (
          <IconButton
            onClick={handleStart}
            size="medium"
            sx={{ boxShadow: "0px 0px 10px rgba(0,0,0,0.2)" }}
          >
            <PlayArrow />
          </IconButton>
        ) : (
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
        )}
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
