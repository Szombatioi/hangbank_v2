import { WaveFile } from 'wavefile';
import { WavDecodeResult } from "../audio_quality_checker";
import { AudioSegment } from "../noise_check";
import { NonRealTimeVAD } from "@ricky0123/vad-node";
import { extractSamples } from "./extract_sample";
import { calcRms, rmsToDb } from "./rms_calc";
import * as wavLib from "node-wav";

export async function runVad(wav: WavDecodeResult): Promise<AudioSegment[]> {
    const vad = await NonRealTimeVAD.new({
        positiveSpeechThreshold: 0.25,
        negativeSpeechThreshold: 0.15,
        minSpeechFrames: 3,
        preSpeechPadFrames: 1,
        redemptionFrames: 8,
    });

    const buffer = wavLib.encode(wav.channelData, {
        sampleRate: wav.sampleRate,
        float: true,        // Float32 legyen, ne PCM16
        bitDepth: 32,
    });
    const convertedWav = new WaveFile(buffer);
    convertedWav.toSampleRate(16000);

    // //Re-encoding for WaveFile constructor
    // const convertedWav = new WaveFile();
    // const samples = wav.channelData[0]; //Mono only
    // convertedWav.fromScratch(
    //     1,
    //     wav.sampleRate,
    //     "32f",
    //     samples
    // );

    // //Resample:
    // convertedWav.toSampleRate(16000);

    const rawSamples = convertedWav.getSamples(false, Float32Array);

    let audioData: Float32Array;
    if (Array.isArray(rawSamples)) {
        // Többcsatornás: csak az első csatornát vesszük
        audioData = new Float32Array(rawSamples[0] as unknown as Float64Array);
    } else if (rawSamples instanceof Float32Array) {
        audioData = rawSamples;
    } else {
        audioData = new Float32Array(rawSamples as unknown as Float64Array);
    }

    const max2 = audioData.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    console.log("Max amplitúdó resample után:", max2);
    console.log("audioData hossza:", audioData.length, "→", (audioData.length / 16000).toFixed(2), "s");

    const totalMs = Math.round((audioData.length / 16000) * 1000);
    console.log("Total length in ms:", totalMs);
    console.log("audioData.length:", audioData.length);


    const speechSegments: { startMs: number; endMs: number }[] = []; //Only contains the segments where speech is detected
    for await (const { start, end } of vad.run(audioData, 16000)) {
        speechSegments.push({
            // startMs: Math.round((start / 16000) * 1000),  // sample → ms
            // endMs: Math.round((end / 16000) * 1000),
            startMs: Math.round(start),  // sample → ms
            endMs: Math.round(end),
        });
    }

    //Creating the final segments with isSpeech, startMs, endMs
    const segments: AudioSegment[] = [];
    let cursor = 0;

    for (const { startMs, endMs } of speechSegments) {
        if (cursor < startMs) {
            segments.push({ isSpeech: false, startMs: cursor, endMs: startMs });
        }
        segments.push({ isSpeech: true, startMs, endMs });
        cursor = endMs;
    }

    //If there is remaining non-speech segment at the end
    if (cursor < totalMs) {
        segments.push({ isSpeech: false, startMs: cursor, endMs: totalMs });
    }

    //Calculating RMS for every segment
    console.log("Fájl hossza:", (audioData.length / 16000).toFixed(2), "s");
    for (const seg of segments) {
        const samples = extractSamples(audioData, seg.startMs, seg.endMs);
        const rms = calcRms(samples);
        seg.rms = rms;
        seg.rmsDb = rmsToDb(rms);

        console.log(
            `${seg.isSpeech ? "BESZÉD" : "Csend "} ` +
            `${(seg.startMs / 1000).toFixed(2)}s – ${(seg.endMs / 1000).toFixed(2)}s`
        );
    }

    console.log("VAD szegmensek:", segments);

    return segments;
}