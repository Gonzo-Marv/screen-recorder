import type { Metadata } from "next";

function decodeWatchId(id: string): string {
  const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function isValidBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const blobUrl = decodeWatchId(decodeURIComponent(id));

  if (!isValidBlobUrl(blobUrl)) {
    return { title: "Not Found" };
  }

  return {
    title: "Screen Recording",
    description: "Watch this screen recording",
    openGraph: {
      title: "Screen Recording",
      description: "Watch this screen recording",
      type: "video.other",
      videos: [{ url: blobUrl }],
    },
  };
}

export default async function WatchPage({ params }: { params: Params }) {
  const { id } = await params;
  const blobUrl = decodeWatchId(decodeURIComponent(id));

  if (!isValidBlobUrl(blobUrl)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100">
            Recording not found
          </h1>
          <a href="/" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Record your own
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-4xl space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100">
            Screen Recording
          </h1>
        </header>

        <video
          controls
          autoPlay
          playsInline
          src={blobUrl}
          className="aspect-video w-full rounded-xl border border-zinc-800 bg-black object-contain"
        />

        <div className="flex justify-center gap-4">
          <a
            href={blobUrl}
            download
            className="rounded-full border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Download
          </a>
          <a
            href="/"
            className="rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Record your own
          </a>
        </div>
      </div>
    </div>
  );
}
