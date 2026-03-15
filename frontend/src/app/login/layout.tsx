import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Acceso operativo para continuar el flujo de cuenta en PLANIFIWEB.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
