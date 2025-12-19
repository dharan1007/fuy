

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Camera, X, Trash2, Check, RefreshCw, Play, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bubble {
    id: string;
    mediaUrl: string; // Video or Image URL
    mediaType: "VIDEO" | "IMAGE";
    user: {
        id: string;
        profile?: {
            avatarUrl: string | null;
            displayName: string | null;
        };
    };
}

interface ReactionBubbleListProps {
    postId: string;
    bubbles: Bubble[];
    totalBubbles: number;
    onAddBubble: (url: string) => void;
}

export default function ReactionBubbleList({ postId, bubbles, totalBubbles, onAddBubble }: ReactionBubbleListProps) {
    const { data: session } = useSession();
    const [isBurstOpen, setIsBurstOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Captured media state
    // blobUrl: for local preview (Playable video blob or Image blob)
    // uploadDataUrl: Base64 string to send to server (Real image or Video Thumbnail)
    const [capturedMedia, setCapturedMedia] = useState<{ blobUrl: string; uploadDataUrl: string; type: "IMAGE" | "VIDEO" } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Filter for latest 3 unique users
    const uniqueBubbles = bubbles.reduce((acc, curr) => {
        if (!acc.find((b) => b.user.id === curr.user.id)) {
            acc.push(curr);
        }
        return acc;
    }, [] as Bubble[]).slice(0, 3);

    const remainder = Math.max(0, totalBubbles - uniqueBubbles.length);

    const startCamera = async () => {
        setCapturedMedia(null);
        setIsCameraOpen(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
                audio: true
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.warn("Camera with optimal settings failed, retrying with defaults", err);
            try {
                // Fallback: relax constraints
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (fatalErr) {
                console.error("Camera denied or unavailable", fatalErr);
                setIsCameraOpen(false);
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const closeCameraModal = () => {
        stopCamera();
        if (capturedMedia?.blobUrl && capturedMedia.type === "VIDEO") {
            URL.revokeObjectURL(capturedMedia.blobUrl);
        }
        setCapturedMedia(null);
        setIsCameraOpen(false);
        setIsRecording(false);
    }

    // Helper to capture a frame as base64
    const captureFrameAsBase64 = (): string | null => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            // Resize for bubble optimization (320x320 is enough for bubble)
            const size = 320;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Center crop logic
                const vidW = videoRef.current.videoWidth;
                const vidH = videoRef.current.videoHeight;
                const aspect = vidW / vidH;
                let drawW = size;
                let drawH = size;
                let offsetX = 0;
                let offsetY = 0;

                if (aspect > 1) { // Video is wider than tall
                    drawH = size;
                    drawW = size * aspect;
                    offsetX = -(drawW - size) / 2;
                } else { // Video is taller than wide or square
                    drawW = size;
                    drawH = size / aspect;
                    offsetY = -(drawH - size) / 2;
                }

                ctx.translate(size, 0);
                ctx.scale(-1, 1); // Mirror
                ctx.drawImage(videoRef.current, offsetX, offsetY, drawW, drawH); // Draw image
                return canvas.toDataURL("image/jpeg", 0.8); // JPEG 80% quality
            }
        }
        return null;
    };

    const capturePhoto = () => {
        const dataUrl = captureFrameAsBase64();
        if (dataUrl) {
            setCapturedMedia({
                blobUrl: dataUrl, // Image can use dataUrl as source
                uploadDataUrl: dataUrl,
                type: "IMAGE"
            });
            stopCamera();
        }
    };

    const startRecording = () => {
        if (!stream) return;
        setIsRecording(true);
        setTimeLeft(3);
        chunksRef.current = [];

        // Lower bitrate to keep size small for DB storage
        const options: MediaRecorderOptions = { bitsPerSecond: 250000 };
        if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9")) {
            options.mimeType = "video/webm; codecs=vp9";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
            options.mimeType = "video/mp4";
        }

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: options.mimeType || "video/webm" });
            const videoUrl = URL.createObjectURL(blob);

            // Convert Blob to Base64 for upload
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                setCapturedMedia({
                    blobUrl: videoUrl,
                    uploadDataUrl: base64data,
                    type: "VIDEO"
                });
            };
        };

        recorder.start();
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        // Stop the camera stream after recording to allow the video element to play the blob
        stopCamera();
    };

    // Timer Logic
    useEffect(() => {
        if (!isRecording) return;

        if (timeLeft <= 0) {
            stopRecording();
            return;
        }

        const timer = setTimeout(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [isRecording, timeLeft]);

    const handlePost = () => {
        if (capturedMedia) {
            // Upload the base64 string (Real Image or Video Thumbnail)
            uploadBubble(capturedMedia.uploadDataUrl, capturedMedia.type);
            closeCameraModal();
        }
    };

    const handleRedo = () => {
        if (capturedMedia?.blobUrl && capturedMedia.type === "VIDEO") {
            URL.revokeObjectURL(capturedMedia.blobUrl);
        }
        setCapturedMedia(null);
        startCamera();
    };

    const uploadBubble = async (url: string, type: "IMAGE" | "VIDEO") => {
        try {
            const res = await fetch("/api/posts/bubble", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, mediaUrl: url, mediaType: type }),
            });
            if (res.ok) {
                const data = await res.json();
                onAddBubble(data.bubbles);
            }
        } catch (e) {
            console.error("Upload failed", e);
        }
    };

    const deleteBubble = async (bubbleId: string) => {
        if (!confirm("Are you sure you want to delete this reaction?")) return;
        try {
            const res = await fetch(`/api/posts/bubble?id=${bubbleId}`, {
                method: "DELETE",
            });
            if (res.ok) onAddBubble("");
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    // Cleanup blob URLs
    useEffect(() => {
        return () => {
            stopCamera();
            if (capturedMedia?.blobUrl && capturedMedia.type === "VIDEO") {
                URL.revokeObjectURL(capturedMedia.blobUrl);
            }
        };
    }, []);

    const renderMedia = (b: Bubble) => {
        if (b.mediaType === "VIDEO") {
            return <video src={b.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />;
        }
        return <img src={b.mediaUrl} className="w-full h-full object-cover" />;
    };

    return (
        <div className="flex items-center gap-1">
            {/* Bubble Preview Stream (Latest 3 Unique) */}
            {!isBurstOpen && (
                <div onClick={() => setIsBurstOpen(true)} className="flex -space-x-2 mr-2 cursor-pointer hover:scale-105 transition-transform group">
                    {uniqueBubbles.map((b) => (
                        <div key={b.id} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-zinc-800 relative z-0 hover:z-10 transition-all">
                            {renderMedia(b)}
                        </div>
                    ))}
                    {remainder > 0 && (
                        <div onClick={() => setIsBurstOpen(true)} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-[10px] text-white/50 font-bold relative z-0 group-hover:bg-zinc-700 transition-colors">
                            +{remainder}
                        </div>
                    )}
                </div>
            )}

            {/* Add Button */}
            <button
                onClick={startCamera}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors relative"
                title="Add Reaction Bubble"
            >
                <Camera size={16} />
                <Plus size={10} className="absolute -top-0.5 -right-0.5 bg-white text-black rounded-full p-0.5" />
            </button>

            {/* Camera / Review Overlay */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                    {capturedMedia ? (
                        /* Review UI */
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            {capturedMedia.type === "IMAGE" ? (
                                <img src={capturedMedia.blobUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                            ) : (
                                <video
                                    src={capturedMedia.blobUrl}
                                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                                    autoPlay
                                    loop
                                    playsInline
                                    muted={false}
                                />
                            )}

                            <div className="relative z-10 flex flex-col items-center gap-6 p-4">
                                <h3 className="text-2xl font-bold text-white">Lookin' Good?</h3>
                                {capturedMedia.type === 'VIDEO' && <span className="px-3 py-1 bg-red-500 rounded-full text-xs font-bold text-white">caught in 4k</span>}
                                <div className="flex gap-4">
                                    <button onClick={handleRedo} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-md transition-colors">
                                        <RefreshCw size={20} /> Redo
                                    </button>
                                    <button onClick={handlePost} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-neutral-200 transition-colors shadow-lg">
                                        <Check size={20} /> Post It
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Camera UI */
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-50 transform -scale-x-100" />

                            {isRecording ? (
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-pulse">
                                        <span className="text-4xl font-bold text-red-500">{timeLeft}</span>
                                    </div>
                                    <button onClick={stopRecording} className="mt-4 px-6 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full font-bold transition-colors">
                                        Stop Recording
                                    </button>
                                </div>
                            ) : (
                                <div className="relative z-10 flex flex-col items-center gap-8">
                                    <div className="text-white text-xl font-bold">Post a Reaction</div>
                                    <div className="flex gap-8">
                                        <button onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-colors">
                                            <span className="sr-only">Photo</span>
                                            <div className="w-12 h-12 bg-white rounded-full"></div>
                                        </button>
                                        <button onClick={startRecording} className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 transition-colors">
                                            <span className="sr-only">Video (3s)</span>
                                            <div className="w-12 h-12 bg-red-500 rounded-full animate-pulse"></div>
                                        </button>
                                    </div>
                                    <button onClick={closeCameraModal} className="mt-8 text-white/50 hover:text-white">Cancel</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Expanded List Modal */}
            {isBurstOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsBurstOpen(false)}>
                    <div className="w-full max-w-2xl bg-black border border-white/20 rounded-2xl p-6 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsBurstOpen(false)}
                            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            All Reactions
                            <span className="text-sm font-normal text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{totalBubbles}</span>
                        </h3>

                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {bubbles.map((b) => (
                                <div key={b.id} className="flex-shrink-0 w-32 flex flex-col items-center gap-2">
                                    <div className="w-32 h-44 rounded-xl bg-zinc-800 overflow-hidden border border-white/10 relative group">
                                        {renderMedia(b)}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 content-center flex-col">
                                            <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">{b.mediaType}</div>
                                            {session?.user?.id === b.user.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteBubble(b.id);
                                                    }}
                                                    className="mt-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                                                    title="Delete your reaction"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <img src={b.user.profile?.avatarUrl || ""} className="w-5 h-5 rounded-full bg-zinc-700" />
                                        <span className="text-xs text-white/70 truncate w-20">
                                            {session?.user?.id === b.user.id ? "You" : (b.user.profile?.displayName || "User")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
