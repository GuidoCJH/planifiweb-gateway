import { Navbar } from "@/components/Navbar";
import { LandingExperience } from "@/components/LandingExperience";
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
      <LandingExperience />
      <PublicGuidesSection />
      <SiteFooter />
    </main>
  );
}



