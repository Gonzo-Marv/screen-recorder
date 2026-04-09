import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
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
      onUploadCompleted: async () => {
        // No database to update in MVP
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
