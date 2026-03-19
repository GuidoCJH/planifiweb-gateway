"use client";

import Link from "next/link";
import { MoveRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { APP_ENTRY_URL } from "@/lib/subscription";

export const Navbar = () => {
  const { user, session } = useAuth();
  const appHref = session?.can_access_app
    ? APP_ENTRY_URL
    : user
      ? "/dashboard"
      : "/#acceso";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[rgba(16,32,58,0.10)] bg-[rgba(252,250,245,0.92)] px-5 py-3 shadow-[0_18px_45px_rgba(15,27,48,0.08)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10203a] text-lg font-black text-[#f4ede2] shadow-[0_10px_24px_rgba(16,32,58,0.24)]">
            P
          </div>
          <div>
            <div className="font-sans text-lg font-extrabold tracking-[0.04em] text-[#10203a]">
              PLANIFIWEB
            </div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#6d7a8f]">
              Plataforma curricular CNEB
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-8 text-sm font-semibold text-[#55637a] md:flex">
          <Link href="/#solucion" className="transition-colors hover:text-[#10203a]">
            Solución
          </Link>
          <Link href="/#acceso" className="transition-colors hover:text-[#10203a]">
            Acceso
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-[#10203a]">
            Planes
          </Link>
          <Link href="/terminos" className="transition-colors hover:text-[#10203a]">
            Términos
          </Link>
          <Link href="/privacidad" className="transition-colors hover:text-[#10203a]">
            Privacidad
          </Link>
          <a href={appHref} className="transition-colors hover:text-[#10203a]">
            App
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-full border border-[rgba(16,32,58,0.14)] px-5 text-sm font-semibold text-[#10203a] transition hover:bg-white"
          >
            Mi cuenta
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#10203a] px-5 text-sm font-semibold text-[#f7f2e8] shadow-[0_14px_30px_rgba(16,32,58,0.22)] transition hover:bg-[#152947]"
          >
            Ver planes <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

