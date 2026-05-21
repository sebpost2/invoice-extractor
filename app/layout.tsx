import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Invoice Extractor — IA para boletas peruanas",
    template: "%s | Invoice Extractor",
  },
  description:
    "Extrae datos estructurados de boletas y facturas peruanas con un LLM con visión. Streaming en tiempo real con Llama 4 Scout sobre Groq.",
  openGraph: {
    title: "Invoice Extractor",
    description:
      "Sube una boleta, mira a la IA extraer proveedor, RUC, IGV e ítems en vivo.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
