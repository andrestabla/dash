import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Project control · Algoritmo T",
  description: "Gestión Metodológica · GOBERNANZA",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/logo.svg',
    },
  },
  openGraph: {
    title: "Project control · Algoritmo T",
    description: "Gestión Metodológica · GOBERNANZA",
    siteName: "Project Control",
    images: [{
      url: '/logo.svg', // Ideally an image, but logo serves for now or user can update
      width: 512,
      height: 512,
    }],
    locale: 'es_ES',
    type: 'website',
  },
};

import SupportWidget from "@/components/SupportWidget"; // Added

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <SupportWidget />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
