import { redirect } from "next/navigation";
import { getServerAuth } from "./auth";
import { loadCurrentContext, type CurrentContext } from "./context";

/**
 * Server-side guard for authenticated pages. Redirects to /login (preserving the
 * intended destination) when there's no valid session.
 */
export async function requireContext(
  redirectPath?: string,
): Promise<CurrentContext> {
  const auth = await getServerAuth();
  if (!auth) {
    const next = redirectPath
      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/login";
    redirect(next);
  }
  const ctx = await loadCurrentContext(auth);
  if (!ctx) redirect("/login");
  return ctx;
}
