import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, SITE_URL, publicGuideSummaries } from "@/lib/discovery";
import { getPublicGuide } from "@/lib/public-guide-content";

export const dynamicParams = false;

export function generateStaticParams() {
  return publicGuideSummaries.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublicGuide(slug);

  if (!guide) {
    return {};
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/${guide.slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${SITE_URL}/${guide.slug}`,
      siteName: SITE_NAME,
      locale: "es_PE",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getPublicGuide(slug);

  if (!guide) {
    notFound();
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: guide.title,
        item: `${SITE_URL}/${guide.slug}`,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: "es-PE",
    mainEntityOfPage: `${SITE_URL}/${guide.slug}`,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  const relatedGuides = guide.related
    .map((relatedSlug) =>
      publicGuideSummaries.find((candidate) => candidate.slug === relatedSlug),
    )
    .filter((candidate) => candidate != null);

  return (
    <main className="enterprise-page text-[#10203a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd, articleJsonLd]),
        }}
      />
      <Navbar />

      <section className="px-6 pb-20 pt-36">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a6880] transition hover:text-[#10203a]"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-[#7a889d]">
            <Link href="/" className="transition hover:text-[#10203a]">
              Inicio
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#10203a]">{guide.title}</span>
          </div>

          <div className="enterprise-card mt-6 px-8 py-10 lg:px-12 lg:py-12">
            <div className="enterprise-badge">{guide.eyebrow}</div>
            <h1 className="enterprise-title mt-6 max-w-4xl">
              {guide.heroTitle}
            </h1>
            <div className="mt-6 space-y-5 text-base leading-8 text-[#5a6880]">
              {guide.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="enterprise-soft-panel px-6 py-6">
                <div className="enterprise-kicker">Lo esencial</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5a6880]">
                  {guide.checklist.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-[#b9905a]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="enterprise-card-dark px-6 py-6">
                <div className="enterprise-kicker text-[#d2b27c]">
                  Cómo entra PLANIFIWEB
                </div>
                <p className="mt-4 text-sm leading-7 text-[#d7e1ef]">
                  Esta guía explica el problema con lenguaje directo y deja
                  claro cómo lo aterriza la plataforma: acceso, suscripción y
                  producción curricular conectados en un solo flujo para
                  docentes del Perú que trabajan con el CNEB.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/register?intent=subscribe"
                    className="enterprise-button-primary bg-[#d2b27c] text-[#10203a] hover:bg-[#dec08d]"
                  >
                    Crear cuenta <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/dashboard?checkout=1" className="enterprise-button-secondary">
                    Ver suscripción
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <article className="mt-8 space-y-6">
            {guide.sections.map((section, index) => (
              <section key={section.title} className="enterprise-card px-8 py-8 lg:px-10">
                <div className="enterprise-kicker">Bloque {index + 1}</div>
                <h2 className="mt-4 text-3xl text-[#10203a]">{section.title}</h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[#5a6880]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-6 grid gap-3 md:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="enterprise-soft-panel flex items-start gap-3 px-5 py-5 text-sm leading-7 text-[#5a6880]"
                      >
                        <span className="mt-2 h-2 w-2 rounded-full bg-[#b9905a]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>

          <section className="enterprise-card mt-8 px-8 py-8 lg:px-10">
            <div className="enterprise-kicker">Lecturas relacionadas</div>
            <h2 className="mt-4 text-3xl text-[#10203a]">
              Sigue profundizando sin salir del mismo sitio
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {relatedGuides.map((relatedGuide) => (
                <Link
                  key={relatedGuide.slug}
                  href={`/${relatedGuide.slug}`}
                  className="enterprise-soft-panel block px-5 py-5 transition hover:-translate-y-0.5"
                >
                  <div className="enterprise-kicker">{relatedGuide.eyebrow}</div>
                  <div className="mt-3 font-sans text-xl font-bold text-[#10203a]">
                    {relatedGuide.title}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#5a6880]">
                    {relatedGuide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
