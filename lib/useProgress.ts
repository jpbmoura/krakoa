"use client";

import { useCallback, useEffect, useState } from "react";

export function useProgress(slug: string) {
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/progress?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, boolean>) => {
        setRead(data ?? {});
        setLoaded(true);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setLoaded(true);
      });
    return () => ctrl.abort();
  }, [slug]);

  const toggle = useCallback(
    (id: string) => {
      let willBeRead = false;
      setRead((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        willBeRead = next[id];
        if (!willBeRead) delete next[id];
        return next;
      });
      // Update otimista: UI já mudou. Se o POST falhar, reverte.
      fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, issueId: id, read: willBeRead }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("bad status");
        })
        .catch(() => {
          setRead((prev) => {
            const next = { ...prev };
            if (willBeRead) delete next[id];
            else next[id] = true;
            return next;
          });
        });
    },
    [slug]
  );

  return { read, toggle, loaded };
}
