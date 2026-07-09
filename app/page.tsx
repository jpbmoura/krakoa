import Link from "next/link";
import { guides } from "@/lib/guides";

export default function Home() {
  return (
    <main className="home">
      <p className="eyebrow">[CEREBRO] // ÍNDICE_DE_GUIAS</p>
      <h1>
        Registro de <span className="red">Leitura</span>
      </h1>
      <p className="home-sub">
        Guias de leitura de quadrinhos com progresso salvo localmente. Passe o mouse sobre uma
        edição para ver a capa.
      </p>
      <ul className="guide-index">
        {guides.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`}>
              <span className="guide-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="guide-name">{g.title}</span>
              <span className="guide-range">{g.era}</span>
              <span className="guide-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
        <li className="guide-slot" aria-hidden="true">
          <span className="guide-num">{String(guides.length + 1).padStart(2, "0")}</span>
          <span className="guide-name dim">Próximo guia — adicione em data/ e registre em lib/guides.ts</span>
        </li>
      </ul>
    </main>
  );
}
