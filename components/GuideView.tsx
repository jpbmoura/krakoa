"use client";

import { useMemo, useState } from "react";
import type { Guide, Issue, Tier } from "@/lib/guides";
import { tierLabel } from "@/lib/guides";
import { useProgress } from "@/lib/useProgress";
import CoverHover from "@/components/CoverHover";

type Filter = "essential" | "recommended" | "all";

const filterOrder: Record<Filter, Tier[]> = {
  essential: ["essential"],
  recommended: ["essential", "recommended"],
  all: ["essential", "recommended", "completionist"],
};

function visible(item: Issue, filter: Filter) {
  return filterOrder[filter].includes(item.tier);
}

function IssueRow({
  item,
  checked,
  onToggle,
}: {
  item: Issue;
  checked: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className={`issue-row ${checked ? "is-read" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <label className="issue-main">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="issue-box" aria-hidden="true" />
        <span className="issue-label">{item.label}</span>
        <span className={`tier tier-${item.tier}`}>{tierLabel[item.tier]}</span>
      </label>
      {item.note && <p className="issue-note">{item.note}</p>}
      {item.cover && hovered && <CoverHover q={item.cover.q} issue={item.cover.issue} />}
    </li>
  );
}

export default function GuideView({ guide }: { guide: Guide }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { read, toggle, loaded } = useProgress(guide.slug);

  const stats = useMemo(() => {
    const perPhase = guide.phases.map((phase) => {
      const items = phase.sections.flatMap((s) => s.items).filter((i) => visible(i, filter));
      const done = items.filter((i) => read[i.id]).length;
      return { id: phase.id, done, total: items.length };
    });
    const total = perPhase.reduce((a, p) => a + p.total, 0);
    const done = perPhase.reduce((a, p) => a + p.done, 0);
    return { perPhase, total, done };
  }, [guide, read, filter]);

  const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  return (
    <div className="guide">
      <header className="guide-header">
        <p className="eyebrow">[CEREBRO] // REGISTRO_DE_LEITURA</p>
        <h1>{guide.title}</h1>
        <p className="guide-era">{guide.era}</p>
        <p className="guide-desc">{guide.description}</p>

        <div className="controls">
          <div className="filter" role="radiogroup" aria-label="Nível de leitura">
            {(["essential", "recommended", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                role="radio"
                aria-checked={filter === f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f === "essential" ? "Só a espinha" : f === "recommended" ? "+ Recomendados" : "Tudo"}
              </button>
            ))}
          </div>
          <div className="total-progress" aria-label={`Progresso total: ${pct}%`}>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-num">
              {loaded ? `${stats.done}/${stats.total} — ${pct}%` : "…"}
            </span>
          </div>
        </div>
      </header>

      {guide.phases.map((phase, pi) => {
        const pstats = stats.perPhase[pi];
        if (pstats.total === 0) return null;
        const ppct = Math.round((pstats.done / pstats.total) * 100);
        return (
          <section key={phase.id} className="phase">
            <div className="phase-head">
              <p className="eyebrow">[{phase.code}]</p>
              <h2>{phase.title}</h2>
              {phase.subtitle && <p className="phase-sub">{phase.subtitle}</p>}
              <div className="bar phase-bar" aria-label={`Progresso da fase: ${ppct}%`}>
                <div className="bar-fill" style={{ width: `${ppct}%` }} />
              </div>
            </div>

            {phase.sections.map((section) => {
              const items = section.items.filter((i) => visible(i, filter));
              if (items.length === 0) return null;
              return (
                <div key={section.id} className="section">
                  <h3>{section.title}</h3>
                  {section.description && <p className="section-desc">{section.description}</p>}
                  <ul>
                    {items.map((item) => (
                      <IssueRow
                        key={item.id}
                        item={item}
                        checked={!!read[item.id]}
                        onToggle={() => toggle(item.id)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
