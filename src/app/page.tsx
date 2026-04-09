"use client";

import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { AudioSourcePicker } from "@/components/AudioSourcePicker";
import { RecordingPreview } from "@/components/RecordingPreview";
import { RecordingControls } from "@/components/RecordingControls";

export default function Home() {
  const {
    status,
    audioDevices,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    mediaStream,
    recordedBlob,
    watchPath,
    duration,
    error,
    startRecording,
    stopRecording,
    uploadRecording,
    reset,
  } = useMediaRecorder();

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">Screen Recorder</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Record your screen, share a link
          </p>
        </header>

        {status === "idle" && (
          <AudioSourcePicker
            devices={audioDevices}
            selectedId={selectedAudioDeviceId}
            onSelect={setSelectedAudioDeviceId}
          />
        )}

        <RecordingPreview
          mediaStream={mediaStream}
          recordedBlob={recordedBlob}
          status={status}
        />

        <RecordingControls
          status={status}
          duration={duration}
          watchPath={watchPath}
          error={error}
          onStart={startRecording}
          onStop={stopRecording}
          onUpload={uploadRecording}
          onReset={reset}
        />
      </div>
    </div>
  );
}
