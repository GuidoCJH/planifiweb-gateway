import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publicGuideSummaries } from "@/lib/discovery";

export function PublicGuidesSection() {
  return (
    <section
      id="guias-publicas"
      className="border-t border-[rgba(16,32,58,0.08)] bg-[rgba(252,250,245,0.82)] px-6 py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="enterprise-badge">Guías públicas indexables</div>
          <h2 className="mt-6 text-4xl leading-tight text-[#10203a] md:text-5xl">
            Contenido útil para docentes que buscan planificación curricular,
            sesiones, unidades y evaluación por competencias.
          </h2>
          <p className="mt-6 text-base leading-8 text-[#5a6880]">
            Estas páginas están pensadas para que Google y motores de respuesta
            encuentren contenido claro, público y orientado al trabajo real del
            aula peruana. Cada guía explica el problema y conecta con la forma
            en que PLANIFIWEB ayuda a resolverlo.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {publicGuideSummaries.map((guide) => (
            <article
              key={guide.slug}
              className="enterprise-card flex h-full flex-col px-6 py-6"
            >
              <div className="enterprise-kicker">{guide.eyebrow}</div>
              <h3 className="mt-4 text-2xl leading-tight text-[#10203a]">
                {guide.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-7 text-[#5a6880]">
                {guide.description}
              </p>
              <Link
                href={`/${guide.slug}`}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#10203a] transition hover:text-[#8a6840]"
              >
                Leer guía <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
