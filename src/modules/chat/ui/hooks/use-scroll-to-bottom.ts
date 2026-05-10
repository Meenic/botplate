"use client";

import { useEffect, useRef } from "react";

export function useScrollToBottom(behavior: ScrollBehavior = "instant") {
  const ref = useRef<HTMLDivElement>(null);

  // Disable browser scroll-restoration once on mount.
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior, block: "end" });
  }, [behavior]);

  return ref;
}
