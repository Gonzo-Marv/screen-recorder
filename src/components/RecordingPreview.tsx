"use client";

import { useRef, useEffect } from "react";

interface RecordingPreviewProps {
  mediaStream: MediaStream | null;
  recordedBlob: Blob | null;
  status: string;
}

export function RecordingPreview({
  mediaStream,
  recordedBlob,
  status,
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

  if (status === "recording") {
    return (
      <video
        ref={liveRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-xl border border-zinc-800 bg-black object-contain"
      />
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
