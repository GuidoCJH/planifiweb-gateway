"use client";

import Link from "next/link";

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
}

export const LegalLinks = ({
  className = "",
  linkClassName = "",
}: LegalLinksProps) => {
  return (
    <div className={className}>
      <Link href="/terminos" className={linkClassName}>
        Términos y Condiciones
      </Link>
      <Link href="/privacidad" className={linkClassName}>
        Política de Privacidad
      </Link>
    </div>
  );
};

