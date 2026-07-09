import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// Cache no globalThis pra sobreviver ao HMR do Next dev sem vazar conexões.
const g = globalThis as unknown as {
  __sql?: Sql;
  __initPromise?: Promise<Sql>;
};

function client(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return postgres(url, { max: 5 });
}

// Init lazy: só toca no Postgres quando a primeira request chega.
// Isso evita crashar `next build` na Railway (env vars não estão presentes
// em build time) e mantém `pnpm dev` funcional mesmo sem .env.local.
export async function ready(): Promise<Sql> {
  if (!g.__initPromise) {
    g.__initPromise = (async () => {
      const sql = g.__sql ?? client();
      if (process.env.NODE_ENV !== "production") g.__sql = sql;
      await sql`
        CREATE TABLE IF NOT EXISTS progress (
          slug     TEXT        NOT NULL,
          issue_id TEXT        NOT NULL,
          read_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (slug, issue_id)
        )
      `;
      return sql;
    })();
  }
  return g.__initPromise;
}
