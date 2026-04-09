"use client";

interface AudioSourcePickerProps {
  devices: MediaDeviceInfo[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function AudioSourcePicker({
  devices,
  selectedId,
  onSelect,
}: AudioSourcePickerProps) {
  if (devices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No microphone detected. Screen audio only.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="audio-source" className="text-sm font-medium text-zinc-300">
        Microphone
      </label>
      <select
        id="audio-source"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
      >
        <option value="">No microphone</option>
        {devices.map((device, i) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}
