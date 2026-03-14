"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalDocumentShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LegalDocumentShell = ({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  sections,
}: LegalDocumentShellProps) => {
  return (
    <main className="enterprise-page text-[#10203a]">
      <div className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a6880] transition hover:text-[#10203a]"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <section className="enterprise-card mt-8 px-8 py-8 lg:px-12 lg:py-12">
            <div className="enterprise-badge">{eyebrow}</div>
            <h1 className="enterprise-title mt-6">{title}</h1>
            <p className="enterprise-copy mt-5 max-w-3xl text-base">{subtitle}</p>
            <div className="mt-6 rounded-[1.4rem] border border-[rgba(16,32,58,0.08)] bg-[rgba(247,243,235,0.86)] px-5 py-4 text-sm text-[#5a6880]">
              Última actualización: <strong className="text-[#10203a]">{lastUpdated}</strong>
            </div>
          </section>

          <section className="enterprise-card mt-8 px-8 py-8 lg:px-12 lg:py-12">
            <div className="space-y-10">
              {sections.map((section, index) => (
                <article key={section.title}>
                  <div className="enterprise-kicker">
                    Sección {String(index + 1).padStart(2, "0")}
                  </div>
                  <h2 className="mt-3 text-3xl text-[#10203a]">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-8 text-[#4f5e75]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
};
