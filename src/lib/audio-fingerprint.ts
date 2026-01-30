/**
 * Audio Fingerprinting Library
 * 
 * Advanced audio fingerprinting using spectrogram analysis, frequency peak detection,
 * and chromagram features for duplicate detection and audio matching.
 * 
 * This implementation uses Web Audio API for browser-based processing
 * and can be adapted for Node.js with appropriate audio processing libraries.
 */

// Types for fingerprint data
export interface AudioFingerprint {
    spectrogramHash: string;
    frequencyPeaks: number[][];
    chromaFeatures: number[][];
    mfccData: number[][];
    tempoSignature: number | null;
    keySignature: string | null;
    duration: number;
    sampleRate: number;
}

export interface FingerprintChunk {
    chunkIndex: number;
    chunkDuration: number;
    spectrogramHash: string;
    frequencyPeaks: string;
    chromaFeatures: string | null;
    mfccData: string | null;
    tempoSignature: number | null;
    keySignature: string | null;
}

export interface SimilarityResult {
    similarity: number; // 0.0 to 1.0
    matchedChunks: number;
    totalChunks: number;
    isMatch: boolean;
}

// Constants
const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;
const HOP_SIZE = 512;
const MEL_BANDS = 128;
const MFCC_COEFFICIENTS = 13;
const CHUNK_DURATION = 5; // seconds
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Generate a comprehensive fingerprint from an audio buffer
 */
export async function generateFingerprint(
    audioData: ArrayBuffer | AudioBuffer
): Promise<AudioFingerprint> {
    let audioBuffer: AudioBuffer;

    if (audioData instanceof ArrayBuffer) {
        // Decode audio data using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioBuffer = await audioContext.decodeAudioData(audioData);
    } else {
        audioBuffer = audioData;
    }

    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    // Generate spectrogram
    const spectrogram = computeSpectrogram(channelData, sampleRate);

    // Extract frequency peaks
    const frequencyPeaks = extractFrequencyPeaks(spectrogram);

    // Generate spectrogram hash
    const spectrogramHash = hashSpectrogram(spectrogram);

    // Extract chroma features (pitch class)
    const chromaFeatures = extractChromaFeatures(spectrogram, sampleRate);

    // Extract MFCC (Mel-frequency cepstral coefficients)
    const mfccData = extractMFCC(spectrogram, sampleRate);

    // Detect tempo (BPM)
    const tempoSignature = detectTempo(channelData, sampleRate);

    // Detect key signature
    const keySignature = detectKey(chromaFeatures);

    return {
        spectrogramHash,
        frequencyPeaks,
        chromaFeatures,
        mfccData,
        tempoSignature,
        keySignature,
        duration,
        sampleRate,
    };
}

/**
 * Generate fingerprint chunks for partial matching
 */
export function generateFingerprintChunks(
    fingerprint: AudioFingerprint
): FingerprintChunk[] {
    const chunks: FingerprintChunk[] = [];
    const totalChunks = Math.ceil(fingerprint.duration / CHUNK_DURATION);

    const peaksPerChunk = Math.ceil(fingerprint.frequencyPeaks.length / totalChunks);
    const chromaPerChunk = fingerprint.chromaFeatures.length > 0
        ? Math.ceil(fingerprint.chromaFeatures.length / totalChunks)
        : 0;
    const mfccPerChunk = fingerprint.mfccData.length > 0
        ? Math.ceil(fingerprint.mfccData.length / totalChunks)
        : 0;

    for (let i = 0; i < totalChunks; i++) {
        const peakStart = i * peaksPerChunk;
        const peakEnd = Math.min((i + 1) * peaksPerChunk, fingerprint.frequencyPeaks.length);
        const chunkPeaks = fingerprint.frequencyPeaks.slice(peakStart, peakEnd);

        const chromaStart = i * chromaPerChunk;
        const chromaEnd = Math.min((i + 1) * chromaPerChunk, fingerprint.chromaFeatures.length);
        const chunkChroma = chromaPerChunk > 0
            ? fingerprint.chromaFeatures.slice(chromaStart, chromaEnd)
            : [];

        const mfccStart = i * mfccPerChunk;
        const mfccEnd = Math.min((i + 1) * mfccPerChunk, fingerprint.mfccData.length);
        const chunkMfcc = mfccPerChunk > 0
            ? fingerprint.mfccData.slice(mfccStart, mfccEnd)
            : [];

        // Generate a hash for this chunk
        const chunkHash = hashArray(chunkPeaks.flat());

        chunks.push({
            chunkIndex: i,
            chunkDuration: CHUNK_DURATION,
            spectrogramHash: chunkHash,
            frequencyPeaks: JSON.stringify(chunkPeaks),
            chromaFeatures: chunkChroma.length > 0 ? JSON.stringify(chunkChroma) : null,
            mfccData: chunkMfcc.length > 0 ? JSON.stringify(chunkMfcc) : null,
            tempoSignature: fingerprint.tempoSignature,
            keySignature: fingerprint.keySignature,
        });
    }

    return chunks;
}

/**
 * Compare two fingerprints and return similarity score
 */
export function compareFingerprints(
    fp1: AudioFingerprint,
    fp2: AudioFingerprint
): SimilarityResult {
    // Compare using multiple features
    const peakSimilarity = comparePeaks(fp1.frequencyPeaks, fp2.frequencyPeaks);
    const chromaSimilarity = compareArrays(fp1.chromaFeatures.flat(), fp2.chromaFeatures.flat());
    const mfccSimilarity = compareArrays(fp1.mfccData.flat(), fp2.mfccData.flat());

    // Tempo similarity (within 5% is considered similar)
    const tempoSimilarity = fp1.tempoSignature && fp2.tempoSignature
        ? 1 - Math.abs(fp1.tempoSignature - fp2.tempoSignature) / Math.max(fp1.tempoSignature, fp2.tempoSignature)
        : 0.5;

    // Key similarity
    const keySimilarity = fp1.keySignature === fp2.keySignature ? 1 : 0.3;

    // Weighted combination
    const similarity = (
        peakSimilarity * 0.35 +
        chromaSimilarity * 0.25 +
        mfccSimilarity * 0.25 +
        tempoSimilarity * 0.10 +
        keySimilarity * 0.05
    );

    return {
        similarity,
        matchedChunks: similarity >= SIMILARITY_THRESHOLD ? 1 : 0,
        totalChunks: 1,
        isMatch: similarity >= SIMILARITY_THRESHOLD,
    };
}

/**
 * Compare fingerprint chunks for near-duplicate detection
 */
export function compareFingerprintChunks(
    chunks1: FingerprintChunk[],
    chunks2: FingerprintChunk[]
): SimilarityResult {
    let matchedChunks = 0;
    const minChunks = Math.min(chunks1.length, chunks2.length);

    for (let i = 0; i < minChunks; i++) {
        const c1 = chunks1[i];
        const c2 = chunks2[i];

        // Compare spectrogram hashes
        if (c1.spectrogramHash === c2.spectrogramHash) {
            matchedChunks++;
            continue;
        }

        // Compare frequency peaks
        const peaks1 = JSON.parse(c1.frequencyPeaks) as number[][];
        const peaks2 = JSON.parse(c2.frequencyPeaks) as number[][];
        const peakSimilarity = comparePeaks(peaks1, peaks2);

        if (peakSimilarity >= SIMILARITY_THRESHOLD) {
            matchedChunks++;
        }
    }

    const similarity = matchedChunks / Math.max(chunks1.length, chunks2.length);

    return {
        similarity,
        matchedChunks,
        totalChunks: Math.max(chunks1.length, chunks2.length),
        isMatch: similarity >= SIMILARITY_THRESHOLD,
    };
}

// ============ Internal Helper Functions ============

/**
 * Compute spectrogram using Short-Time Fourier Transform
 */
function computeSpectrogram(samples: Float32Array, sampleRate: number): number[][] {
    const spectrogram: number[][] = [];
    const numFrames = Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1;

    for (let i = 0; i < numFrames; i++) {
        const start = i * HOP_SIZE;
        const frame = samples.slice(start, start + FFT_SIZE);

        // Apply Hanning window
        const windowed = applyHanningWindow(frame);

        // Compute FFT magnitude spectrum
        const spectrum = computeFFTMagnitude(windowed);

        spectrogram.push(Array.from(spectrum));
    }

    return spectrogram;
}

/**
 * Apply Hanning window to audio frame
 */
function applyHanningWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
        const multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
        windowed[i] = frame[i] * multiplier;
    }
    return windowed;
}

/**
 * Compute FFT magnitude spectrum (simplified implementation)
 */
function computeFFTMagnitude(samples: Float32Array): Float32Array {
    const n = samples.length;
    const magnitude = new Float32Array(n / 2);

    // Simplified DFT for demonstration - in production, use a proper FFT library
    for (let k = 0; k < n / 2; k++) {
        let real = 0;
        let imag = 0;
        for (let t = 0; t < n; t++) {
            const angle = 2 * Math.PI * k * t / n;
            real += samples[t] * Math.cos(angle);
            imag -= samples[t] * Math.sin(angle);
        }
        magnitude[k] = Math.sqrt(real * real + imag * imag) / n;
    }

    return magnitude;
}

/**
 * Extract frequency peaks from spectrogram (constellation map approach)
 */
function extractFrequencyPeaks(spectrogram: number[][]): number[][] {
    const peaks: number[][] = [];
    const neighborhoodSize = 10;

    for (let t = neighborhoodSize; t < spectrogram.length - neighborhoodSize; t++) {
        for (let f = neighborhoodSize; f < spectrogram[t].length - neighborhoodSize; f++) {
            const value = spectrogram[t][f];
            let isPeak = true;

            // Check if this is a local maximum
            for (let dt = -neighborhoodSize; dt <= neighborhoodSize && isPeak; dt++) {
                for (let df = -neighborhoodSize; df <= neighborhoodSize && isPeak; df++) {
                    if (dt === 0 && df === 0) continue;
                    if (spectrogram[t + dt][f + df] >= value) {
                        isPeak = false;
                    }
                }
            }

            if (isPeak && value > 0.01) { // Threshold to filter noise
                peaks.push([t, f, value]);
            }
        }
    }

    // Keep top N peaks
    return peaks.sort((a, b) => b[2] - a[2]).slice(0, 500);
}

/**
 * Generate a hash from spectrogram data
 */
function hashSpectrogram(spectrogram: number[][]): string {
    // Downsample spectrogram
    const downsampled: number[] = [];
    const step = Math.max(1, Math.floor(spectrogram.length / 100));

    for (let i = 0; i < spectrogram.length; i += step) {
        const frame = spectrogram[i];
        const binStep = Math.max(1, Math.floor(frame.length / 20));
        for (let j = 0; j < frame.length; j += binStep) {
            downsampled.push(frame[j]);
        }
    }

    return hashArray(downsampled);
}

/**
 * Extract chroma features (pitch class profile)
 */
function extractChromaFeatures(spectrogram: number[][], sampleRate: number): number[][] {
    const chromaFeatures: number[][] = [];
    const numChroma = 12; // 12 pitch classes (C, C#, D, ...)

    for (const frame of spectrogram) {
        const chroma = new Array(numChroma).fill(0);
        const binWidth = sampleRate / FFT_SIZE;

        for (let bin = 1; bin < frame.length; bin++) {
            const frequency = bin * binWidth;
            if (frequency < 20 || frequency > 5000) continue;

            // Convert frequency to pitch class
            const pitchClass = Math.round(12 * Math.log2(frequency / 440) + 69) % 12;
            chroma[pitchClass] += frame[bin];
        }

        // Normalize
        const sum = chroma.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            chromaFeatures.push(chroma.map(v => v / sum));
        }
    }

    return chromaFeatures;
}

/**
 * Extract MFCC features
 */
function extractMFCC(spectrogram: number[][], sampleRate: number): number[][] {
    const mfccData: number[][] = [];

    for (const frame of spectrogram) {
        // Convert to mel scale
        const melSpectrum = computeMelSpectrum(frame, sampleRate);

        // Apply log compression
        const logMel = melSpectrum.map(v => Math.log(Math.max(v, 1e-10)));

        // Apply DCT to get MFCCs
        const mfcc = computeDCT(logMel).slice(0, MFCC_COEFFICIENTS);
        mfccData.push(mfcc);
    }

    return mfccData;
}

/**
 * Convert spectrum to mel scale
 */
function computeMelSpectrum(spectrum: number[], sampleRate: number): number[] {
    const melSpectrum = new Array(MEL_BANDS).fill(0);
    const minFreq = 0;
    const maxFreq = sampleRate / 2;

    const minMel = 2595 * Math.log10(1 + minFreq / 700);
    const maxMel = 2595 * Math.log10(1 + maxFreq / 700);
    const melStep = (maxMel - minMel) / (MEL_BANDS + 1);

    for (let m = 0; m < MEL_BANDS; m++) {
        const melCenter = minMel + (m + 1) * melStep;
        const freqCenter = 700 * (Math.pow(10, melCenter / 2595) - 1);
        const binCenter = Math.round(freqCenter * FFT_SIZE / sampleRate);

        // Triangle filter
        const melPrev = minMel + m * melStep;
        const melNext = minMel + (m + 2) * melStep;
        const freqPrev = 700 * (Math.pow(10, melPrev / 2595) - 1);
        const freqNext = 700 * (Math.pow(10, melNext / 2595) - 1);

        const binPrev = Math.round(freqPrev * FFT_SIZE / sampleRate);
        const binNext = Math.min(Math.round(freqNext * FFT_SIZE / sampleRate), spectrum.length - 1);

        for (let bin = binPrev; bin <= binNext; bin++) {
            let weight = 0;
            if (bin < binCenter) {
                weight = (bin - binPrev) / (binCenter - binPrev);
            } else {
                weight = (binNext - bin) / (binNext - binCenter);
            }
            melSpectrum[m] += spectrum[bin] * weight;
        }
    }

    return melSpectrum;
}

/**
 * Compute DCT (Discrete Cosine Transform)
 */
function computeDCT(signal: number[]): number[] {
    const n = signal.length;
    const dct = new Array(n).fill(0);

    for (let k = 0; k < n; k++) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += signal[i] * Math.cos(Math.PI * k * (2 * i + 1) / (2 * n));
        }
        dct[k] = sum * Math.sqrt(2 / n);
        if (k === 0) dct[k] *= Math.sqrt(0.5);
    }

    return dct;
}

/**
 * Detect tempo (BPM) using onset detection
 */
function detectTempo(samples: Float32Array, sampleRate: number): number | null {
    // Compute onset strength envelope
    const hopSize = 512;
    const onsetEnvelope: number[] = [];

    for (let i = hopSize; i < samples.length; i += hopSize) {
        let energy = 0;
        let prevEnergy = 0;

        for (let j = 0; j < hopSize; j++) {
            energy += Math.abs(samples[i + j]);
            prevEnergy += Math.abs(samples[i - hopSize + j]);
        }

        const diff = Math.max(0, energy - prevEnergy);
        onsetEnvelope.push(diff);
    }

    // Autocorrelation to find periodicity
    const maxLag = Math.floor(2 * sampleRate / hopSize); // Up to 2 seconds
    const minLag = Math.floor(0.2 * sampleRate / hopSize); // At least 0.2 seconds

    let bestLag = 0;
    let bestCorr = 0;

    for (let lag = minLag; lag < maxLag && lag < onsetEnvelope.length / 2; lag++) {
        let corr = 0;
        for (let i = 0; i < onsetEnvelope.length - lag; i++) {
            corr += onsetEnvelope[i] * onsetEnvelope[i + lag];
        }
        if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
        }
    }

    if (bestLag === 0) return null;

    const periodSeconds = bestLag * hopSize / sampleRate;
    const bpm = 60 / periodSeconds;

    // Normalize to reasonable BPM range
    let normalizedBpm = bpm;
    while (normalizedBpm < 60) normalizedBpm *= 2;
    while (normalizedBpm > 180) normalizedBpm /= 2;

    return Math.round(normalizedBpm);
}

/**
 * Detect musical key from chroma features
 */
function detectKey(chromaFeatures: number[][]): string | null {
    if (chromaFeatures.length === 0) return null;

    const keyProfiles = {
        major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
        minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
    };

    const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Average chroma across all frames
    const avgChroma = new Array(12).fill(0);
    for (const frame of chromaFeatures) {
        for (let i = 0; i < 12; i++) {
            avgChroma[i] += frame[i];
        }
    }
    for (let i = 0; i < 12; i++) {
        avgChroma[i] /= chromaFeatures.length;
    }

    let bestKey = '';
    let bestCorr = -Infinity;

    for (let shift = 0; shift < 12; shift++) {
        const shiftedChroma = [...avgChroma.slice(shift), ...avgChroma.slice(0, shift)];

        // Compare with major profile
        let majorCorr = correlation(shiftedChroma, keyProfiles.major);
        if (majorCorr > bestCorr) {
            bestCorr = majorCorr;
            bestKey = `${pitchNames[shift]} major`;
        }

        // Compare with minor profile
        let minorCorr = correlation(shiftedChroma, keyProfiles.minor);
        if (minorCorr > bestCorr) {
            bestCorr = minorCorr;
            bestKey = `${pitchNames[shift]} minor`;
        }
    }

    return bestKey;
}

/**
 * Compute Pearson correlation coefficient
 */
function correlation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;

    let covariance = 0;
    let varA = 0;
    let varB = 0;

    for (let i = 0; i < n; i++) {
        const diffA = a[i] - meanA;
        const diffB = b[i] - meanB;
        covariance += diffA * diffB;
        varA += diffA * diffA;
        varB += diffB * diffB;
    }

    const denom = Math.sqrt(varA * varB);
    return denom > 0 ? covariance / denom : 0;
}

/**
 * Compare two arrays of frequency peaks
 */
function comparePeaks(peaks1: number[][], peaks2: number[][]): number {
    if (peaks1.length === 0 || peaks2.length === 0) return 0;

    let matches = 0;
    const tolerance = 3; // Allow small differences in time/frequency

    for (const [t1, f1] of peaks1) {
        for (const [t2, f2] of peaks2) {
            if (Math.abs(t1 - t2) <= tolerance && Math.abs(f1 - f2) <= tolerance) {
                matches++;
                break;
            }
        }
    }

    return matches / Math.max(peaks1.length, peaks2.length);
}

/**
 * Compare two arrays using cosine similarity
 */
function compareArrays(arr1: number[], arr2: number[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const n = Math.min(arr1.length, arr2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < n; i++) {
        dotProduct += arr1[i] * arr2[i];
        norm1 += arr1[i] * arr1[i];
        norm2 += arr2[i] * arr2[i];
    }

    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denom > 0 ? dotProduct / denom : 0;
}

/**
 * Generate a hash from a number array
 */
function hashArray(arr: number[]): string {
    // Simple hash using quantization and string encoding
    const quantized = arr.map(v => Math.round(v * 1000));
    let hash = 0;

    for (let i = 0; i < quantized.length; i++) {
        hash = ((hash << 5) - hash) + quantized[i];
        hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
}
