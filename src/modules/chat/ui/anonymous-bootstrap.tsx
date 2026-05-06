"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

/**
 * Renders when a Server Component detects no session. Calls
 * `authClient.signIn.anonymous()` once, then `router.refresh()` so the
 * upstream Server Component re-runs with the new session cookie.
 *
 * Replace with a real sign-in surface when phase 4 ships email/OAuth.
 */
export function AnonymousBootstrap() {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      await authClient.signIn.anonymous();
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
