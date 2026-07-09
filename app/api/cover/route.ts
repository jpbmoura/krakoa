interface CoverPayload {
  title: string | null;
  coverUrl: string | null;
}

const cache = new Map<string, CoverPayload>();

const BASE = "https://marvel.emreparker.com/v1";

interface SearchItem {
  id: number;
  title: string;
  issueNumber?: string | null;
  seriesName?: string | null;
}

interface IssueDetail {
  title: string;
  cover?: { path: string; extension: string | null } | null;
}

// A busca da API é full-text tokenizada — parênteses causam 500,
// então trocamos por espaço. O ano dentro dos parênteses vira só
// mais um token, o que ajuda a desambiguar séries homônimas.
function sanitize(q: string): string {
  return q.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { next: { revalidate: 2592000 } });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const issue = searchParams.get("issue");

  if (!q) {
    return Response.json({ error: "missing_query" }, { status: 400 });
  }

  const cacheKey = `${q}::${issue ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return Response.json(cached, { headers: { "Cache-Control": "public, max-age=2592000" } });
  }

  try {
    const cleanQuery = sanitize(q);
    const searchUrl = `${BASE}/search/issues?q=${encodeURIComponent(cleanQuery)}&limit=50`;
    const search = await fetchJson<{ items: SearchItem[] }>(searchUrl);
    const results = search?.items ?? [];

    const queryTokens = tokens(cleanQuery);
    const targetIssue = issue ?? null;

    // A busca é fuzzy: "House of X" também bate em "House of M". Exigimos
    // que cada token da query apareça no seriesName pra descartar falsos positivos.
    const matches = results.filter((r) => {
      if (targetIssue && r.issueNumber !== targetIssue) return false;
      const hay = tokens(r.seriesName ?? r.title);
      return queryTokens.every((t) => hay.includes(t));
    });

    const candidate = matches[0];

    if (!candidate) {
      const empty: CoverPayload = { title: null, coverUrl: null };
      cache.set(cacheKey, empty);
      return Response.json(empty, { headers: { "Cache-Control": "public, max-age=2592000" } });
    }

    const detail = await fetchJson<IssueDetail>(`${BASE}/issues/${candidate.id}`);
    const cover = detail?.cover;

    const payload: CoverPayload =
      cover?.path && !cover.path.includes("image_not_available")
        ? {
            title: detail?.title ?? candidate.title,
            coverUrl: `${cover.path.replace("http://", "https://")}/portrait_uncanny.${cover.extension ?? "jpg"}`,
          }
        : { title: detail?.title ?? candidate.title, coverUrl: null };

    cache.set(cacheKey, payload);
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=2592000" } });
  } catch {
    return Response.json({ error: "marvel_api_error" }, { status: 502 });
  }
}
