import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    let count = 0;
    let cursor: string | undefined;

    // Count all existing blobs
    do {
      const result = await list({ cursor, limit: 1000 });
      count += result.blobs.length;
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    return NextResponse.json({ id: count + 1 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
