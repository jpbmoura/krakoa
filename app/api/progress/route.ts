import { ready } from "@/lib/db";
import { migrateParents } from "@/lib/progress";

// Deploy pessoal, sem auth: quem tem a URL lê e escreve.
// Ausência de linha = não lido.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "missing_slug" }, { status: 400 });

  try {
    const sql = await ready();
    const rows = await sql<{ issue_id: string }[]>`
      SELECT issue_id FROM progress WHERE slug = ${slug}
    `;
    const map: Record<string, true> = {};
    for (const r of rows) map[r.issue_id] = true;
    await migrateParents(sql, slug, map);
    return Response.json(map);
  } catch {
    return Response.json({ error: "db_error" }, { status: 500 });
  }
}

interface PostBody {
  slug?: unknown;
  issueId?: unknown;
  issueIds?: unknown;
  read?: unknown;
}

function idList(body: PostBody): string[] {
  if (Array.isArray(body.issueIds)) {
    return body.issueIds.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  return typeof body.issueId === "string" && body.issueId ? [body.issueId] : [];
}

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : null;
  const read = typeof body.read === "boolean" ? body.read : null;
  const ids = idList(body);

  if (!slug || ids.length === 0 || read === null) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const sql = await ready();
    if (read) {
      const rows = ids.map((id) => ({ slug, issue_id: id }));
      await sql`
        INSERT INTO progress ${sql(rows)}
        ON CONFLICT (slug, issue_id) DO NOTHING
      `;
    } else {
      await sql`
        DELETE FROM progress WHERE slug = ${slug} AND issue_id IN ${sql(ids)}
      `;
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "db_error" }, { status: 500 });
  }
}
