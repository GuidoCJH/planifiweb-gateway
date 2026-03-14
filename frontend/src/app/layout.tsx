import type { Metadata } from "next";
import { Geist_Mono, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { FloatingSupportButton } from "@/components/FloatingSupportButton";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tu-dominio.com";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PLANIFIWEB | Acceso y suscripción para planificación curricular",
    template: "%s | PLANIFIWEB",
  },
  description:
    "Landing, pago, autenticación y acceso protegido a PLANIFIWEB para docentes del sistema educativo peruano.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PLANIFIWEB | Acceso y suscripción para planificación curricular",
    description:
      "Landing, pago, autenticación y acceso protegido a PLANIFIWEB para docentes del sistema educativo peruano.",
    url: siteUrl,
    siteName: "PLANIFIWEB",
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLANIFIWEB | Acceso y suscripción para planificación curricular",
    description:
      "Landing, pago, autenticación y acceso protegido a PLANIFIWEB para docentes del sistema educativo peruano.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${manrope.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <FloatingSupportButton />
        </AuthProvider>
      </body>
    </html>
  );
}

