import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireUser } from "@/server/auth";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Serves files under public/uploads at runtime (Next does not serve files added
 * to public/ after build). Authenticated: these assets are for the owner's UI;
 * PDFs embed frozen bytes instead of fetching this route.
 */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  try {
    await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const rel = (params.path ?? []).join("/");
  if (!rel || rel.includes("..")) {
    return new NextResponse("not found", { status: 404 });
  }
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const abs = path.join(uploadsRoot, rel);
  if (!abs.startsWith(uploadsRoot + path.sep)) {
    return new NextResponse("not found", { status: 404 });
  }
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
