"use client";

import { useEffect, useRef, useState } from "react";

interface CoverData {
  title: string | null;
  coverUrl: string | null;
  error?: string;
}

const memCache = new Map<string, CoverData>();

function storageKey(q: string, issue: number) {
  return `cover:${q}#${issue}`;
}

export default function CoverHover({ q, issue }: { q: string; issue: number }) {
  const [data, setData] = useState<CoverData | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const key = storageKey(q, issue);

    const cached = memCache.get(key);
    if (cached) {
      setData(cached);
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as CoverData;
          memCache.set(key, parsed);
          setData(parsed);
          return;
        }
      } catch {
        // segue pro fetch
      }
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetch(`/api/cover?q=${encodeURIComponent(q)}&issue=${issue}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = (await res.json()) as CoverData;
        if (!res.ok) {
          setData({ title: null, coverUrl: null, error: json.error ?? "erro" });
          return;
        }
        memCache.set(key, json);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(json));
          } catch {
            // cache local indisponível
          }
        }
        setData(json);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setData({ title: null, coverUrl: null, error: "network" });
      });

    return () => ctrl.abort();
  }, [q, issue]);

  return (
    <div className="cover-card" role="tooltip">
      <div className="cover-frame">
        {!data && <div className="cover-loading">BUSCANDO NO CEREBRO…</div>}
        {data && !data.error && !data.coverUrl && (
          <div className="cover-loading">CAPA NÃO ENCONTRADA</div>
        )}
        {data?.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coverUrl}
            alt={data.title ?? "Capa"}
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
      </div>
      {data?.title && <div className="cover-title">{data.title}</div>}
      <div className="cover-attribution">Data provided by Marvel. © MARVEL</div>
    </div>
  );
}
