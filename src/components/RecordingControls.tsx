"use client";

import { Timer } from "./Timer";
import { ShareableLink } from "./ShareableLink";
import type { RecordingStatus } from "@/hooks/useMediaRecorder";

interface RecordingControlsProps {
  status: RecordingStatus;
  countdown: number | null;
  duration: number;
  watchPath: string | null;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onUpload: () => void;
  onReset: () => void;
}

export function RecordingControls({
  status,
  countdown,
  duration,
  watchPath,
  error,
  onStart,
  onStop,
  onUpload,
  onReset,
}: RecordingControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {status === "idle" && (
        <button
          onClick={onStart}
          className="rounded-full bg-red-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-700"
        >
          Start Recording
        </button>
      )}

      {status === "countdown" && countdown !== null && (
        <p className="text-lg font-semibold text-zinc-300">
          Recording starts in {countdown}...
        </p>
      )}

      {status === "recording" && (
        <div className="flex items-center gap-6">
          <Timer seconds={duration} />
          <button
            onClick={onStop}
            className="rounded-full bg-red-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-700"
          >
            Stop
          </button>
        </div>
      )}

      {status === "stopped" && (
        <div className="flex gap-3">
          <button
            onClick={onUpload}
            className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Upload & Share
          </button>
          <button
            onClick={onReset}
            className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Discard
          </button>
        </div>
      )}

      {status === "uploading" && (
        <div className="flex items-center gap-3 text-zinc-300">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Uploading...
        </div>
      )}

      {status === "done" && watchPath && (
        <div className="flex w-full flex-col gap-4">
          <ShareableLink watchPath={watchPath} />
          <button
            onClick={onReset}
            className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Record Again
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={onReset}
            className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
