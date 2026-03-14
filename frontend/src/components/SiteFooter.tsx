"use client";

import Link from "next/link";
import { LegalLinks } from "@/components/LegalLinks";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-[rgba(16,32,58,0.08)] bg-[#f5f0e6] px-6 py-12 text-sm text-[#647389]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="font-semibold text-[#10203a]">
            PLANIFIWEB | Plataforma curricular para educación peruana
          </p>
          <p className="mt-3 leading-7">
            El servicio utiliza solo cookies esenciales de autenticación,
            continuidad de sesión y seguridad. No se emplean cookies de
            publicidad ni de analítica de terceros.
          </p>
          <p className="mt-3 leading-7">
            Por esa razón no se despliega un banner de consentimiento: la
            plataforma no depende de cookies opcionales para operar.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <LegalLinks
            className="flex flex-col gap-2"
            linkClassName="font-semibold text-[#10203a] transition hover:text-[#8a6840]"
          />
          <Link
            href="https://t.me/guidojh"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#10203a] transition hover:text-[#8a6840]"
          >
            Soporte por Telegram
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-[rgba(16,32,58,0.08)] pt-6 text-xs leading-6 text-[#78879d]">
        © 2026 PLANIFIWEB. Todos los derechos reservados.
      </div>
    </footer>
  );
};
