import { AudioQualityCheckerStrategy, QualityMeasure, WavDecodeResult } from './audio_quality_checker';

export class VolumeCheck implements AudioQualityCheckerStrategy {
    // private readonly tooQuietThreshold: number
    private readonly windowMs: number;
    private readonly overlapMs: number;
    private readonly stepMs: number;
    
    private readonly tooQuietThreshold: number; //in dBFS, e.g. -40 dBFS
    private readonly tooLoudThreshold: number; //in dBFS, e.g. -5 dBFS
    
    private readonly silenceTrimThreshold: number; //in dBFS, e.g. -75 dBFS

    constructor() {
        // this.tooQuietThreshold = process.env.QUIETNESS_THRESHOLD ? parseFloat(process.env.QUIETNESS_THRESHOLD) : 0.01;
        this.windowMs = process.env.VOLUME_CHECK_WINDOW_MS ? parseInt(process.env.VOLUME_CHECK_WINDOW_MS) : 200; // Default to 200ms windows
        this.overlapMs = process.env.VOLUME_CHECK_OVERLAP_MS ? parseInt(process.env.VOLUME_CHECK_OVERLAP_MS) : 100; // Default to 100ms overlap
        this.stepMs = this.windowMs - this.overlapMs;

        this.tooQuietThreshold = process.env.VOLUME_CHECK_TOO_QUIET_THRESHOLD ? parseFloat(process.env.VOLUME_CHECK_TOO_QUIET_THRESHOLD) : -40;
        this.tooLoudThreshold = process.env.VOLUME_CHECK_TOO_LOUD_THRESHOLD ? parseFloat(process.env.VOLUME_CHECK_TOO_LOUD_THRESHOLD) : -5;
        this.silenceTrimThreshold = process.env.VOLUME_CHECK_SILENCE_TRIM_THRESHOLD ? parseFloat(process.env.VOLUME_CHECK_SILENCE_TRIM_THRESHOLD) : -75;
    }

    async checkQuality(wav: WavDecodeResult): Promise<QualityMeasure> {


        //Window size (in Samples)
        const windowSize = Math.floor(wav.sampleRate * (this.windowMs / 1000));
        const stepSize = Math.floor(wav.sampleRate * (this.stepMs / 1000));

        const samples = wav.channelData[0]; //Mono only

        // Apply audio trimming to remove leading and trailing silence before the volume check
        const threshold = Math.pow(10, this.silenceTrimThreshold / 20); // Convert dBFS to linear
        let startOffset = 0;
        let endOffset = samples.length - 1;

        // Find the first sample above the silence threshold from the start
        for (let i = 0; i < samples.length; i++) {
            if (Math.abs(samples[i]) > threshold) {
                startOffset = i;
                break;
            }
        }

        // Find the first sample above the silence threshold from the end
        for (let i = samples.length - 1; i >= 0; i--) {
            if (Math.abs(samples[i]) > threshold) {
                endOffset = i;
                break;
            }
        }

        // If the entire audio is silence, we can return early
        if (startOffset >= endOffset) {
            //TODO!!
        }

        if (startOffset > 0 || endOffset < samples.length - 1) {
            console.log("A hangfelvétel elején és/vagy végén lévő csendes részeket levágta a rendszer.");
        }
        // const trimmedSamples = samples.slice(start, end + 1);

        //Sliding window with overlap
        for (let i = 0; i + windowSize <= samples.length; i += stepSize) {
            const end = i + windowSize; //End of window

            // Timestamp for the current window's start and end (in seconds)
            const currentTime = i / wav.sampleRate;
            const endTime = currentTime + (windowSize / wav.sampleRate); //or (i + windowSize) / wav.sampleRate

            if(i < startOffset || end > endOffset) {
                console.log(`Kihagyott ablak: ${currentTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
                continue;
            }

            const windowSlice = samples.slice(i, end); //Current window of samples

            // Root Mean Square: Mean + Square Root of the average of the squares of the values
            const rms = Math.sqrt(windowSlice.reduce((acc, val) => acc + val * val, 0) / windowSlice.length);

            // Converting RMS to dBFS
            const dbfs = 20 * Math.log10(Math.max(rms, 1e-10)); // Avoid log of zero
            const volumeResult = dbfs < this.tooQuietThreshold ? "Túl halk" : dbfs > this.tooLoudThreshold ? "Túl hangos" : "Rendben"
            console.log(
                `Időtartam: ${currentTime.toFixed(2)}s - ${endTime.toFixed(2)}s | ` +
                `Hangerő: ${dbfs.toFixed(2)} dBFS | ` + 
                `Eredmény: ${volumeResult}`
            );

            //TODO: add start, end and dbfs to a structure
            //TODO: make this a volume variance check instead: if the volume is too quiet or too loud for a significant portion of the audio, then we can flag it as a quality issue
        }

        return { //TODO
            name: "volume_check",
            result: false, //TODO
            message: "Hangerő ellenőrzés (TODO)"
        };
    }

    
}
