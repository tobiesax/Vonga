import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function POST(request: Request) {
  const input = await request.json() as Record<string, string>;
  if (!input.name?.trim() || !input.phone?.trim() || !input.email?.trim() || !input.date || !input.service) return NextResponse.json({ error: "Please complete all required appointment details." }, { status: 400 });
  const appointment = { id: `VA-${Date.now().toString().slice(-7)}`, ...input, status: "requested", createdAt: new Date().toISOString() };
  try { const file = path.join(process.cwd(), "data", "vonga-appointments.json"); let rows: unknown[] = []; try { rows = JSON.parse(await fs.readFile(file, "utf8")); } catch {} await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify([appointment, ...rows], null, 2)); } catch {}
  return NextResponse.json({ appointment }, { status: 201 });
}
