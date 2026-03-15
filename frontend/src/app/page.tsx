import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { PublicGuidesSection } from "@/components/PublicGuidesSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/discovery";

export default function Home() {
  const siteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PLANIFIWEB",
      url: SITE_URL,
      sameAs: ["https://t.me/guidojh"],
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PLANIFIWEB",
      url: SITE_URL,
      inLanguage: "es-PE",
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "PLANIFIWEB",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "es-PE",
      url: SITE_URL,
      description:
        "Aplicación web para docentes del Perú que organiza planificación curricular CNEB, sesiones de aprendizaje, unidades y evaluación por competencias.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "9",
        highPrice: "39",
        priceCurrency: "PEN",
      },
    },
  ];

  return (
    <main className="min-h-screen bg-transparent text-[#10203a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <Navbar />
      <Hero />

      <section
        id="features"
        className="border-y border-[rgba(16,32,58,0.08)] bg-[rgba(252,250,245,0.78)] px-6 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-[rgba(16,32,58,0.10)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6840]">
                Beneficios clave
              </div>
              <h2 className="mt-6 text-4xl leading-tight text-[#10203a] md:text-5xl">
                Menos tiempo ordenando formatos. Más tiempo planificando con
                criterio.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#5a6880]">
                PLANIFIWEB integra acceso, activación y producción curricular
                en un solo flujo. La plataforma está pensada para docentes que
                necesitan avanzar con claridad, consistencia y respaldo
                operativo.
              </p>
              <div className="mt-8 rounded-[1.75rem] border border-[rgba(16,32,58,0.10)] bg-[#10203a] px-6 py-6 text-[#eef3fa] shadow-[0_20px_50px_rgba(15,27,48,0.14)]">
                <div className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#d2b27c]">
                  Resultado operativo
                </div>
                <p className="mt-3 text-sm leading-7 text-[#d5deeb]">
                  Una sola cuenta, una licencia controlada y un entorno de
                  trabajo listo para convertir competencias, evidencias y
                  sesiones en documentos utilizables dentro del ritmo real del
                  aula.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  number: "01",
                  eyebrow: "Cuenta unificada",
                  title: "Accede, activa y continúa sin perder el hilo",
                  description:
                    "Registro, licencia, revisión del pago y entrada a la app quedan conectados para evitar pasos repetidos y cortes innecesarios.",
                },
                {
                  number: "02",
                  eyebrow: "Producción guiada",
                  title: "Planifica sobre una base curricular más útil",
                  description:
                    "Convierte competencias, desempeños, evidencias y criterios en materiales trabajables sin rehacer el proceso desde cero.",
                },
                {
                  number: "03",
                  eyebrow: "Control continuo",
                  title: "Mantiene tu trabajo visible, ordenado y recuperable",
                  description:
                    "Tu avance, el estado de la cuenta y la continuidad del trabajo se sostienen con una experiencia más previsible y profesional.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="group rounded-[2rem] border border-[rgba(16,32,58,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(246,241,232,0.96)_100%)] p-8 shadow-[0_22px_50px_rgba(15,27,48,0.08)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="mb-8 flex flex-col items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10203a] text-sm font-black tracking-[0.16em] text-[#f5efe4]">
                      {item.number}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6840]">
                      {item.eyebrow}
                    </div>
                  </div>
                  <h3 className="text-2xl leading-tight text-[#10203a]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#5a6880]">
                    {item.description}
                  </p>
                  <div className="mt-8 h-px w-full bg-[linear-gradient(90deg,#10203a_0%,rgba(16,32,58,0)_100%)] opacity-20 transition-opacity group-hover:opacity-45" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicGuidesSection />

      <Pricing />

      <SiteFooter />
    </main>
  );
}



