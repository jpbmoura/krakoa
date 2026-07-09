import { notFound } from "next/navigation";
import Link from "next/link";
import GuideView from "@/components/GuideView";
import { getGuide, guides } from "@/lib/guides";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main>
      <nav className="backnav">
        <Link href="/">← Índice</Link>
      </nav>
      <GuideView guide={guide} />
    </main>
  );
}
