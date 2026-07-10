"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Guide, Issue, SubIssue, Tier } from "@/lib/guides";
import { expandIssues, tierLabel } from "@/lib/guides";
import { useProgress } from "@/lib/useProgress";
import CoverHover from "@/components/CoverHover";

type Filter = "essential" | "recommended" | "all";

const filterOrder: Record<Filter, Tier[]> = {
  essential: ["essential"],
  recommended: ["essential", "recommended"],
  all: ["essential", "recommended", "completionist"],
};

function visible(tier: Tier, filter: Filter) {
  return filterOrder[filter].includes(tier);
}

/** Uma linha renderizável: `children` não-nulo = série com acordeon. */
interface Row {
  item: Issue;
  children: SubIssue[] | null;
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

function SubIssueRow({
  sub,
  parentTier,
  checked,
  onToggle,
}: {
  sub: SubIssue;
  parentTier: Tier;
  checked: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className={`issue-row sub-row ${checked ? "is-read" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <label className="issue-main">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="issue-box" aria-hidden="true" />
        <span className="issue-label">{sub.label}</span>
        {sub.tier !== parentTier && (
          <span className={`tier tier-${sub.tier}`}>{tierLabel[sub.tier]}</span>
        )}
      </label>
      {sub.note && <p className="issue-note">{sub.note}</p>}
      {sub.cover && hovered && <CoverHover q={sub.cover.q} issue={sub.cover.issue} />}
    </li>
  );
}

function SeriesRow({
  item,
  issues,
  read,
  setMany,
}: {
  item: Issue;
  issues: SubIssue[];
  read: Record<string, boolean>;
  setMany: (ids: string[], value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  // A lista é recortada enquanto anima; solta depois, senão o card de capa
  // (que escapa da linha pela esquerda) fica cortado.
  const [clipped, setClipped] = useState(true);
  const boxRef = useRef<HTMLInputElement>(null);

  const done = issues.filter((c) => read[c.id]).length;
  const all = done === issues.length;
  const partial = done > 0 && !all;

  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = partial;
  }, [partial]);

  useEffect(() => {
    if (!open) {
      setClipped(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClipped(false);
      return;
    }
    const t = setTimeout(() => setClipped(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  const panelId = `edicoes-${item.id}`;

  return (
    <li className={`issue-row issue-group ${all ? "is-read" : ""}`}>
      <div
        className="issue-head"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="issue-main">
          <label className="issue-check">
            <input
              ref={boxRef}
              type="checkbox"
              checked={all}
              onChange={() => setMany(issues.map((c) => c.id), !all)}
              aria-label={`Marcar todas as edições de ${item.label}`}
            />
            <span className="issue-box" aria-hidden="true" />
          </label>
          <button
            type="button"
            className="issue-disclosure"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="disclosure-mark" aria-hidden="true">
              {open ? "[–]" : "[+]"}
            </span>
            <span className="issue-label">{item.label}</span>
            <span className="issue-count">
              {done}/{issues.length}
            </span>
          </button>
          <span className={`tier tier-${item.tier}`}>{tierLabel[item.tier]}</span>
        </div>
        {item.note && <p className="issue-note">{item.note}</p>}
      </div>
      {item.cover && hovered && <CoverHover q={item.cover.q} issue={item.cover.issue} />}

      <div className={`sub-wrap ${open ? "is-open" : ""} ${clipped ? "is-clipped" : ""}`}>
        <ul id={panelId} className="sub-list" inert={!open}>
          {issues.map((sub) => (
            <SubIssueRow
              key={sub.id}
              sub={sub}
              parentTier={item.tier}
              checked={!!read[sub.id]}
              onToggle={() => setMany([sub.id], !read[sub.id])}
            />
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function GuideView({ guide }: { guide: Guide }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { read, toggle, setMany, loaded } = useProgress(guide.slug);

  // Forma da lista: depende só do guia e do filtro, não do progresso.
  const view = useMemo(
    () =>
      guide.phases.map((phase) => ({
        phase,
        sections: phase.sections
          .map((section) => ({
            section,
            rows: section.items
              .map((item): Row | null => {
                const children = expandIssues(item);
                if (!children) return visible(item.tier, filter) ? { item, children: null } : null;
                const shown = children.filter((c) => visible(c.tier, filter));
                return shown.length > 0 ? { item, children: shown } : null;
              })
              .filter((r): r is Row => r !== null),
          }))
          .filter((s) => s.rows.length > 0),
      })),
    [guide, filter]
  );

  // Contagem: séries contam por edição, itens simples contam 1.
  const stats = useMemo(() => {
    const perPhase = view.map(({ phase, sections }) => {
      let total = 0;
      let done = 0;
      for (const { rows } of sections) {
        for (const { item, children } of rows) {
          if (children) {
            total += children.length;
            done += children.filter((c) => read[c.id]).length;
          } else {
            total += 1;
            if (read[item.id]) done += 1;
          }
        }
      }
      return { id: phase.id, done, total };
    });
    const total = perPhase.reduce((a, p) => a + p.total, 0);
    const done = perPhase.reduce((a, p) => a + p.done, 0);
    return { perPhase, total, done };
  }, [view, read]);

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

      {view.map(({ phase, sections }, pi) => {
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

            {sections.map(({ section, rows }) => (
              <div key={section.id} className="section">
                <h3>{section.title}</h3>
                {section.description && <p className="section-desc">{section.description}</p>}
                <ul>
                  {rows.map(({ item, children }) =>
                    children ? (
                      <SeriesRow
                        key={item.id}
                        item={item}
                        issues={children}
                        read={read}
                        setMany={setMany}
                      />
                    ) : (
                      <IssueRow
                        key={item.id}
                        item={item}
                        checked={!!read[item.id]}
                        onToggle={() => toggle(item.id)}
                      />
                    )
                  )}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
