import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel admin",
  description: "Superficie administrativa para revisión operativa de PLANIFIWEB.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
