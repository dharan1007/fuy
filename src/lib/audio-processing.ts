/**
 * Audio Processing Utilities
 * 
 * Utilities for audio extraction, normalization, waveform generation,
 * and audio manipulation.
 */

export interface WaveformData {
    peaks: number[];
    duration: number;
    sampleRate: number;
}

export interface AudioMetadata {
    duration: number;
    sampleRate: number;
    channels: number;
    bitDepth?: number;
    format?: string;
}

/**
 * Extract audio from a video file
 * Returns audio as ArrayBuffer
 */
export async function extractAudioFromVideo(videoFile: File | Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = async () => {
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioContext.createMediaElementSource(video);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                const mediaRecorder = new MediaRecorder(destination.stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });

                const chunks: Blob[] = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    resolve(arrayBuffer);
                };

                mediaRecorder.start();
                video.play();

                video.onended = () => {
                    mediaRecorder.stop();
                    audioContext.close();
                };

                // Timeout for safety
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        audioContext.close();
                    }
                }, (video.duration + 5) * 1000);

            } catch (err) {
                reject(err);
            }
        };

        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = URL.createObjectURL(videoFile);
    });
}

/**
 * Get audio metadata from a file
 */
export async function getAudioMetadata(audioFile: File | Blob): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
            resolve({
                duration: audio.duration,
                sampleRate: 44100, // Default, actual rate determined during decoding
                channels: 2, // Default stereo
            });
            URL.revokeObjectURL(audio.src);
        };

        audio.onerror = () => {
            URL.revokeObjectURL(audio.src);
            reject(new Error('Failed to load audio metadata'));
        };

        audio.src = URL.createObjectURL(audioFile);
    });
}

/**
 * Decode audio file to AudioBuffer
 */
export async function decodeAudioFile(audioFile: File | Blob): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    return audioBuffer;
}

/**
 * Generate waveform data for visualization
 * @param audioBuffer - Decoded audio buffer
 * @param samples - Number of samples to return for visualization
 */
export function generateWaveform(
    audioBuffer: AudioBuffer,
    samples: number = 200
): WaveformData {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = start + blockSize;

        let max = 0;
        for (let j = start; j < end && j < channelData.length; j++) {
            const absValue = Math.abs(channelData[j]);
            if (absValue > max) {
                max = absValue;
            }
        }

        peaks.push(max);
    }

    // Normalize peaks to 0-1 range
    const maxPeak = Math.max(...peaks);
    const normalizedPeaks = maxPeak > 0
        ? peaks.map(p => p / maxPeak)
        : peaks;

    return {
        peaks: normalizedPeaks,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
    };
}

/**
 * Generate waveform data from a file
 */
export async function generateWaveformFromFile(
    audioFile: File | Blob,
    samples: number = 200
): Promise<WaveformData> {
    const audioBuffer = await decodeAudioFile(audioFile);
    return generateWaveform(audioBuffer, samples);
}

/**
 * Normalize audio (adjust sample rate and channels)
 * Returns normalized audio as Blob
 */
export async function normalizeAudio(
    audioFile: File | Blob,
    targetSampleRate: number = 44100,
    targetChannels: number = 1
): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: targetSampleRate
    });

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
        targetChannels,
        audioBuffer.duration * targetSampleRate,
        targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();

    // Convert to WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);

    audioContext.close();

    return wavBlob;
}

/**
 * Trim audio to specified start and end times
 */
export async function trimAudio(
    audioFile: File | Blob,
    startTime: number,
    endTime: number
): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.min(Math.floor(endTime * sampleRate), audioBuffer.length);
    const trimmedLength = endSample - startSample;

    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
    );

    const trimmedBuffer = offlineContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);

        for (let i = 0; i < trimmedLength; i++) {
            trimmedData[i] = originalData[startSample + i];
        }
    }

    const source = offlineContext.createBufferSource();
    source.buffer = trimmedBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);

    audioContext.close();

    return wavBlob;
}

/**
 * Adjust audio volume
 */
export async function adjustVolume(
    audioFile: File | Blob,
    volume: number // 0.0 to 1.0+
): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = offlineContext.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);

    audioContext.close();

    return wavBlob;
}

/**
 * Mix multiple audio tracks together
 */
export async function mixAudioTracks(
    tracks: Array<{
        file: File | Blob;
        volume: number;
        startOffset?: number;
    }>,
    totalDuration?: number
): Promise<Blob> {
    if (tracks.length === 0) {
        throw new Error('No tracks to mix');
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decodedBuffers: Array<{
        buffer: AudioBuffer;
        volume: number;
        startOffset: number;
    }> = [];

    // Decode all tracks
    for (const track of tracks) {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        decodedBuffers.push({
            buffer: audioBuffer,
            volume: track.volume,
            startOffset: track.startOffset || 0,
        });
    }

    // Calculate total duration
    const maxDuration = totalDuration || Math.max(
        ...decodedBuffers.map(t => t.buffer.duration + t.startOffset)
    );

    const sampleRate = decodedBuffers[0].buffer.sampleRate;
    const totalSamples = Math.ceil(maxDuration * sampleRate);

    const offlineContext = new OfflineAudioContext(2, totalSamples, sampleRate);

    // Create and connect all sources
    for (const track of decodedBuffers) {
        const source = offlineContext.createBufferSource();
        source.buffer = track.buffer;

        const gainNode = offlineContext.createGain();
        gainNode.gain.value = track.volume;

        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        source.start(track.startOffset);
    }

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);

    audioContext.close();

    return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channel data
    let offset = 44;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    for (let i = 0; i < audioBuffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, channels[ch][i]));
            const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, int16, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Format duration in MM:SS format
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in HH:MM:SS format for longer audio
 */
export function formatLongDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
