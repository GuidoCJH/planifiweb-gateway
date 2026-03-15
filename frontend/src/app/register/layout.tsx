import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Registro operativo para abrir cuenta y continuar el flujo de PLANIFIWEB.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
