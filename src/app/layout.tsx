import type { Metadata, Viewport } from "next";
import { profileConfig } from "@/config/profile.config";
import { ClientShell } from "@/components/layout/ClientShell";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: profileConfig.seo.themeColor,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tomatodevs.com"
  ),
  title: {
    default: profileConfig.seo.title,
    template: "%s",
  },
  description: profileConfig.seo.description,
  icons: {
    icon: [
      { url: "/assets/favicon/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon/favicon-48x48.png?v=2", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/assets/favicon/favicon.ico?v=2",
    apple: [
      { url: "/assets/favicon/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/assets/favicon/site.webmanifest?v=2",
  openGraph: {
    title: "TOMATODEVS — PROFILE",
    description: profileConfig.seo.description,
    url: "./",
    siteName: profileConfig.seo.siteName,
    images: [
      {
        url: profileConfig.seo.ogImage,
        width: 400,
        height: 400,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOMATODEVS — PROFILE",
    description: profileConfig.seo.description,
    images: [profileConfig.seo.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=Rubik:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Kablammo&family=Bungee&family=Rubik+Glitch&family=Bitcount+Single&family=Jersey+10+Charted&family=Griffy&family=Rubik+Maze&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="loaded">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
