"use client";

import { useState } from "react";

interface ShareableLinkProps {
  watchPath: string;
}

export function ShareableLink({ watchPath }: ShareableLinkProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${watchPath}`
      : watchPath;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">
        Share this link
      </label>
      <div className="flex gap-2">
        <input
          readOnly
          value={fullUrl}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
