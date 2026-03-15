import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Panel operativo de cuenta, suscripción y acceso a PLANIFIWEB.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
