import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Platform-level administrators are regular Users whose role is set to
// "platform_admin". They can access the /admin area to manage every
// tenant organization on the platform, regardless of subdomain.
export async function requirePlatformAdmin() {
    const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "platform_admin") {
        redirect("/login");
  }

  return session;
}
