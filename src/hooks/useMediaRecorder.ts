"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import fixWebmDuration from "fix-webm-duration";
import { getPreferredMimeType } from "@/lib/utils";

export type RecordingStatus =
  | "idle"
  | "countdown"
  | "recording"
  | "stopped"
  | "uploading"
  | "done"
  | "error";

export interface UseMediaRecorderReturn {
  status: RecordingStatus;
  countdown: number | null;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDeviceId: string | null;
  setSelectedAudioDeviceId: (id: string | null) => void;
  mediaStream: MediaStream | null;
  recordedBlob: Blob | null;
  shareUrl: string | null;
  watchPath: string | null;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  uploadRecording: () => Promise<void>;
  reset: () => void;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<
    string | null
  >(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [watchPath, setWatchPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mimeTypeRef = useRef<string>("");
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Enumerate audio devices on mount
  useEffect(() => {
    async function init() {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        tempStream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedAudioDeviceId(audioInputs[0].deviceId);
        }
      } catch {
        setAudioDevices([]);
      }
    }
    init();
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    screenStreamRef.current = null;
    micStreamRef.current = null;
    audioContextRef.current = null;
    combinedStreamRef.current = null;
    mimeTypeRef.current = "";
    setMediaStream(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      recorderRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown effect — ticks 3→2→1→0, then starts recording
  useEffect(() => {
    if (status !== "countdown" || countdown === null) return;

    if (countdown === 0) {
      const mimeType = mimeTypeRef.current;
      const combinedStream = combinedStreamRef.current;
      if (!combinedStream || !mimeType) return;

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const rawBlob = new Blob(chunksRef.current, { type: mimeType });

        // Fix WebM duration metadata so progress bar works
        let finalBlob = rawBlob;
        if (mimeType.startsWith("video/webm")) {
          try {
            finalBlob = await fixWebmDuration(rawBlob, durationMs);
          } catch {
            finalBlob = rawBlob;
          }
        }

        setRecordedBlob(finalBlob);
        setStatus("stopped");
        cleanup();
      };

      recorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setStatus("recording");
      setDuration(0);
      setCountdown(null);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown, cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Get screen stream — browser shows native picker
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenStream;

      // Build combined stream
      const combinedStream = new MediaStream();
      screenStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource =
          audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
      }

      if (selectedAudioDeviceId) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: selectedAudioDeviceId } },
          });
          micStreamRef.current = micStream;
          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(destination);
        } catch {
          // Mic failed, continue with screen audio only
        }
      }

      destination.stream
        .getAudioTracks()
        .forEach((t) => combinedStream.addTrack(t));

      const mimeType = getPreferredMimeType();
      if (!mimeType) {
        throw new Error("No supported video recording format found");
      }

      // Store in refs for the countdown effect to use
      mimeTypeRef.current = mimeType;
      combinedStreamRef.current = combinedStream;

      // Handle "Stop sharing" during countdown or recording
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        } else {
          // Stopped during countdown — go back to idle
          cleanup();
          setCountdown(null);
          setStatus("idle");
        }
      });

      setMediaStream(combinedStream);
      setStatus("countdown");
      setCountdown(3);
    } catch (err) {
      cleanup();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("idle");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to start recording"
      );
      setStatus("error");
    }
  }, [selectedAudioDeviceId, cleanup]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const uploadRecording = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      setStatus("uploading");
      setError(null);

      const res = await fetch("/api/next-id");
      const { id } = await res.json();
      const filename = `${id}.webm`;

      const blob = await upload(filename, recordedBlob, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setShareUrl(blob.url);
      const blobPathname = new URL(blob.url).pathname.slice(1);
      setWatchPath(`/watch/${blobPathname}`);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }, [recordedBlob]);

  const reset = useCallback(() => {
    cleanup();
    recorderRef.current = null;
    chunksRef.current = [];
    setStatus("idle");
    setCountdown(null);
    setRecordedBlob(null);
    setShareUrl(null);
    setWatchPath(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return {
    status,
    countdown,
    audioDevices,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    mediaStream,
    recordedBlob,
    shareUrl,
    watchPath,
    duration,
    error,
    startRecording,
    stopRecording,
    uploadRecording,
    reset,
  };
}
