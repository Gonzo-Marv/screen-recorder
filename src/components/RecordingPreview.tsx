"use client";

import { useRef, useEffect } from "react";

interface RecordingPreviewProps {
  mediaStream: MediaStream | null;
  recordedBlob: Blob | null;
  status: string;
  countdown: number | null;
}

export function RecordingPreview({
  mediaStream,
  recordedBlob,
  status,
  countdown,
}: RecordingPreviewProps) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (liveRef.current && mediaStream) {
      liveRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  useEffect(() => {
    if (playbackRef.current && recordedBlob) {
      playbackRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [recordedBlob]);

  if (status === "idle") {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        <p className="text-zinc-500">Select a source and start recording</p>
      </div>
    );
  }

  if (status === "countdown" || status === "recording") {
    return (
      <div className="relative">
        <video
          ref={liveRef}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full rounded-xl border border-zinc-800 bg-black object-contain"
        />
        {status === "countdown" && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <span className="text-9xl font-bold text-white drop-shadow-lg">
              {countdown}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (status === "stopped" || status === "uploading" || status === "done") {
    return (
      <video
        ref={playbackRef}
        controls
        playsInline
        className="aspect-video w-full rounded-xl border border-zinc-800 bg-black object-contain"
      />
    );
  }

  return null;
}
