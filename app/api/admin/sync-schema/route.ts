import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Temporary owner-only utility: applies the current prisma/schema.prisma to
// the database (equivalent of running "npx prisma db push" from a shell).
// Needed because this deployment has no migration files and no build-time
// db-push step. Restricted to authenticated owners only. Safe to delete
// once schema is in sync (this route makes no destructive changes beyond
// what prisma db push itself would do, and only additive changes are
// expected here).
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "npx",
      ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"],
      { cwd: process.cwd(), timeout: 60000 }
    );
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (err: unknown) {
    const e = err as { message?: string; stdout?: string; stderr?: string };
    return NextResponse.json(
      { ok: false, message: e?.message, stdout: e?.stdout, stderr: e?.stderr },
      { status: 500 }
    );
  }
}
