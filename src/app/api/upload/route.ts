import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_STORAGE_BYTES = 400 * 1024 * 1024; // 400MB — cleanup threshold

async function cleanupOldRecordings() {
  // List all blobs sorted by upload date
  const allBlobs: { url: string; size: number; uploadedAt: Date }[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ cursor, limit: 1000 });
    allBlobs.push(
      ...result.blobs.map((b) => ({
        url: b.url,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }))
    );
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const totalSize = allBlobs.reduce((sum, b) => sum + b.size, 0);
  if (totalSize <= MAX_STORAGE_BYTES) return;

  // Sort oldest first, delete until under threshold
  allBlobs.sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );

  let currentSize = totalSize;
  const toDelete: string[] = [];

  for (const blob of allBlobs) {
    if (currentSize <= MAX_STORAGE_BYTES) break;
    toDelete.push(blob.url);
    currentSize -= blob.size;
  }

  if (toDelete.length > 0) {
    await del(toDelete);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Clean up oldest recordings if approaching storage limit
        await cleanupOldRecordings();
        return {
          allowedContentTypes: [
            "video/webm",
            "video/mp4",
            "video/x-matroska",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
