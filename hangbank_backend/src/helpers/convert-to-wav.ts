import ffmpeg from 'fluent-ffmpeg';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

export interface ConvertedAudio {
  buffer: Buffer;
  durationSeconds: number;
  originalSamplingRate: number | null;
  originalFormat: string;
}

function probe(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) =>
    ffmpeg.ffprobe(filePath, (err: Error | null, data) =>
      err ? reject(err) : resolve(data),
    ),
  );
}

function transcode(
  input: string,
  output: string,
  codec: string,
  targetSamplingRate?: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(input).noVideo().audioCodec(codec).format('wav');
    if (targetSamplingRate) command.audioFrequency(targetSamplingRate);
    command
      .on('end', () => resolve())
      .on('error', reject)
      .save(output);
  });
}

export async function convertToWav(
  input: Buffer,
  originalName: string,
  targetSamplingRate?: number | null,
): Promise<ConvertedAudio> {
  const dir = await mkdtemp(path.join(tmpdir(), 'hangbank-audio-'));
  try {
    const inputPath = path.join(dir, `input${path.extname(originalName)}`);
    await writeFile(inputPath, input);

    const info = await probe(inputPath);
    const stream = info.streams.find((s) => s.codec_type === 'audio');
    if (!stream) throw new Error(`${originalName} has no audio stream`);

    const originalSamplingRate = stream.sample_rate
      ? Number(stream.sample_rate)
      : null;
    const isWav = (info.format.format_name ?? '').split(',').includes('wav');
    const needsResample =
      !!targetSamplingRate && originalSamplingRate !== targetSamplingRate;

    let buffer = input;
    let durationSeconds = Number(info.format.duration ?? stream.duration ?? 0);
    if (!isWav || needsResample) {
      const codec =
        isWav && stream.codec_name ? stream.codec_name : 'pcm_s16le';
      const outputPath = path.join(dir, 'output.wav');
      await transcode(
        inputPath,
        outputPath,
        codec,
        needsResample ? (targetSamplingRate ?? undefined) : undefined,
      );
      buffer = await readFile(outputPath);
      durationSeconds = Number(
        (await probe(outputPath)).format.duration ?? durationSeconds,
      );
    }

    return {
      buffer,
      durationSeconds,
      originalSamplingRate,
      originalFormat: path.extname(originalName).slice(1).toLowerCase(),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
