import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processDueNotificationJobs } from "@/lib/notifications";

function authorized(request: Request) {
  const expected = process.env.NOTIFICATION_WORKER_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processDueNotificationJobs(25);
  return NextResponse.json(result);
}
