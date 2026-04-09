"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { upload } from "@vercel/blob/client";
import { getPreferredMimeType, getFileExtension } from "@/lib/utils";

export type RecordingStatus =
  | "idle"
  | "recording"
  | "stopped"
  | "uploading"
  | "done"
  | "error";

export interface UseMediaRecorderReturn {
  status: RecordingStatus;
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

  // Enumerate audio devices on mount
  useEffect(() => {
    async function init() {
      try {
        // Request mic permission to get device labels
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
        // Mic permission denied — still allow recording without audio
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

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Request tab/system audio
      });
      screenStreamRef.current = screenStream;

      // Build combined stream
      const combinedStream = new MediaStream();

      // Add video track from screen
      screenStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));

      // Combine audio sources
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      // Add screen audio (tab audio) if available
      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource =
          audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
      }

      // Add mic audio if a device is selected
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

      // Add mixed audio track
      destination.stream
        .getAudioTracks()
        .forEach((t) => combinedStream.addTrack(t));

      setMediaStream(combinedStream);

      // Create recorder
      const mimeType = getPreferredMimeType();
      if (!mimeType) {
        throw new Error("No supported video recording format found");
      }

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setStatus("stopped");
        cleanup();
      };

      // Auto-stop when user clicks browser "Stop sharing"
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      });

      recorder.start(1000);
      setStatus("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      cleanup();
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setStatus("idle");
        return; // User cancelled the picker, don't show error
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

      const mimeType = recordedBlob.type;
      const ext = getFileExtension(mimeType);
      const filename = `recording-${Date.now()}.${ext}`;

      const blob = await upload(filename, recordedBlob, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setShareUrl(blob.url);
      // Use just the pathname (filename) for a short URL
      const blobPathname = new URL(blob.url).pathname.slice(1); // remove leading /
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
    setRecordedBlob(null);
    setShareUrl(null);
    setWatchPath(null);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  return {
    status,
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
