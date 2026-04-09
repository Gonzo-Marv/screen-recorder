"use client";

import { formatDuration } from "@/lib/utils";

interface TimerProps {
  seconds: number;
}

export function Timer({ seconds }: TimerProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-lg text-zinc-100">
      <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
      {formatDuration(seconds)}
    </div>
  );
}
