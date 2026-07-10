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

  /** Marca/desmarca um lote de ids de uma vez (uma edição, ou a série inteira). */
  const setMany = useCallback(
    (ids: string[], value: boolean) => {
      if (ids.length === 0) return;

      const before = new Map<string, boolean>();
      setRead((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          before.set(id, !!prev[id]);
          if (value) next[id] = true;
          else delete next[id];
        }
        return next;
      });

      // Update otimista: UI já mudou. Se o POST falhar, reverte só os ids afetados.
      fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, issueIds: ids, read: value }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("bad status");
        })
        .catch(() => {
          setRead((prev) => {
            const next = { ...prev };
            for (const [id, was] of before) {
              if (was) next[id] = true;
              else delete next[id];
            }
            return next;
          });
        });
    },
    [slug]
  );

  const toggle = useCallback((id: string) => setMany([id], !read[id]), [read, setMany]);

  return { read, toggle, setMany, loaded };
}
