import type { Sql } from "@/lib/db";
import { expandableItems, getGuide, retiredItems } from "@/lib/guides";

/**
 * Converte progresso do formato antigo, na primeira leitura. Duas fontes:
 *
 * - séries expansíveis, que não guardam linha própria (o estado do pai é
 *   derivado dos filhos), mas guardavam antes do acordeon;
 * - ids aposentados, dos itens guarda-chuva que viraram várias séries.
 *
 * Nos dois casos a linha antiga vira as linhas novas. Idempotente: depois da
 * primeira passagem não sobra linha antiga, então as leituras seguintes não
 * escrevem nada. Muta `map` com o resultado.
 */
export async function migrateParents(sql: Sql, slug: string, map: Record<string, true>) {
  const guide = getGuide(slug);
  if (!guide) return;

  const stale = [...expandableItems(guide), ...retiredItems(guide)].filter((p) => map[p.parentId]);
  if (stale.length === 0) return;

  // Aplica em memória antes de escrever: se o banco falhar, a UI ainda recebe o
  // progresso certo e a próxima leitura tenta de novo.
  for (const { parentId, childIds } of stale) {
    delete map[parentId];
    for (const id of childIds) map[id] = true;
  }

  const rows = stale.flatMap((p) => p.childIds.map((id) => ({ slug, issue_id: id })));
  const parentIds = stale.map((p) => p.parentId);

  try {
    await sql.begin(async (tx) => {
      await tx`INSERT INTO progress ${tx(rows)} ON CONFLICT (slug, issue_id) DO NOTHING`;
      await tx`DELETE FROM progress WHERE slug = ${slug} AND issue_id IN ${tx(parentIds)}`;
    });
  } catch {
    // Escrita falhou; `map` já está correto para esta resposta.
  }
}
