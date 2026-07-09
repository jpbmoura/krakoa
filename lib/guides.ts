export type Tier = "essential" | "recommended" | "completionist";

export interface Issue {
  id: string;
  label: string;
  tier: Tier;
  note?: string;
  /** Query enviada à Marvel API para buscar a capa no hover */
  cover?: { q: string; issue: number };
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
}

import { krakoa } from "@/data/krakoa";

export const guides: Guide[] = [krakoa];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export const tierLabel: Record<Tier, string> = {
  essential: "ESSENCIAL",
  recommended: "RECOMENDADO",
  completionist: "COMPLETISTA",
};
