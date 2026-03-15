import type { Metadata } from "next";
import { Geist_Mono, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { FloatingSupportButton } from "@/components/FloatingSupportButton";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/discovery";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PLANIFIWEB | Planificación curricular con IA para docentes del Perú",
    template: "%s | PLANIFIWEB",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PLANIFIWEB | Planificación curricular con IA para docentes del Perú",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "PLANIFIWEB",
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLANIFIWEB | Planificación curricular con IA para docentes del Perú",
    description: SITE_DESCRIPTION,
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

