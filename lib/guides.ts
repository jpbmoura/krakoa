export type Tier = "essential" | "recommended" | "completionist";

/** Query enviada à Marvel API para buscar a capa no hover */
export interface Cover {
  q: string;
  issue: number;
}

/** Uma edição dentro de uma série expansível, como escrita no arquivo de dados. */
export interface SubIssueInput {
  id: string;
  label: string;
  /** Ausente → herda o tier da série. */
  tier?: Tier;
  note?: string;
  /** Ausente → derivada do `cover.q` da série + o número no `label`. */
  cover?: Cover;
}

/** Uma edição depois de resolvida: tier sempre presente. */
export interface SubIssue extends SubIssueInput {
  tier: Tier;
}

export interface Issue {
  id: string;
  label: string;
  tier: Tier;
  note?: string;
  cover?: Cover;
  /** Série contígua: gera as edições #start..#end. `notes` anota edições avulsas. */
  range?: { start: number; end: number; notes?: Record<number, string> };
  /** Série com numeração irregular ou rótulo não-numérico. Tem precedência sobre `range`. */
  issues?: SubIssueInput[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  items: Issue[];
}

export interface Phase {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  sections: Section[];
}

export interface Guide {
  slug: string;
  title: string;
  era: string;
  description: string;
  phases: Phase[];
  /**
   * Ids que sumiram do guia → ids que herdam o progresso deles. Cada alvo pode
   * ser um id literal ou o id de uma série (aí herdam todas as edições dela).
   */
  retired?: Record<string, string[]>;
}

import { krakoa } from "@/data/krakoa";
import { subIssueId } from "@/lib/ids";

export const guides: Guide[] = [krakoa];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export const tierLabel: Record<Tier, string> = {
  essential: "ESSENCIAL",
  recommended: "RECOMENDADO",
  completionist: "COMPLETISTA",
};

export { subIssueId } from "@/lib/ids";

function issueNumber(label: string): number | null {
  const m = /#\s*(\d+)/.exec(label);
  return m ? Number(m[1]) : null;
}

const expanded = new WeakMap<Issue, SubIssue[] | null>();

/** Edições de uma série, ou `null` se o item é simples (sem acordeon). */
export function expandIssues(item: Issue): SubIssue[] | null {
  const cached = expanded.get(item);
  if (cached !== undefined) return cached;

  let out: SubIssue[] | null = null;

  if (item.issues?.length) {
    out = item.issues.map((sub) => {
      const n = issueNumber(sub.label);
      return {
        ...sub,
        tier: sub.tier ?? item.tier,
        cover: sub.cover ?? (item.cover && n !== null ? { q: item.cover.q, issue: n } : undefined),
      };
    });
  } else if (item.range) {
    const { start, end, notes } = item.range;
    out = [];
    for (let n = start; n <= end; n++) {
      out.push({
        id: subIssueId(item.id, n),
        label: `#${n}`,
        tier: item.tier,
        note: notes?.[n],
        cover: item.cover ? { q: item.cover.q, issue: n } : undefined,
      });
    }
  }

  expanded.set(item, out);
  return out;
}

export function allItems(guide: Guide): Issue[] {
  return guide.phases.flatMap((p) => p.sections.flatMap((s) => s.items));
}

/** Séries expansíveis do guia — usado pela migração do progresso pai → filhos. */
export function expandableItems(guide: Guide): { parentId: string; childIds: string[] }[] {
  const out: { parentId: string; childIds: string[] }[] = [];
  for (const item of allItems(guide)) {
    const children = expandIssues(item);
    if (children) out.push({ parentId: item.id, childIds: children.map((c) => c.id) });
  }
  return out;
}

/**
 * Ids aposentados resolvidos para os ids que herdam seu progresso. Um alvo que
 * nomeia uma série vira todas as edições dela; qualquer outro passa direto.
 */
export function retiredItems(guide: Guide): { parentId: string; childIds: string[] }[] {
  if (!guide.retired) return [];
  const byId = new Map(allItems(guide).map((i) => [i.id, i]));

  return Object.entries(guide.retired).map(([parentId, targets]) => {
    const childIds = targets.flatMap((t) => {
      const item = byId.get(t);
      const children = item ? expandIssues(item) : null;
      return children ? children.map((c) => c.id) : [t];
    });
    return { parentId, childIds };
  });
}
