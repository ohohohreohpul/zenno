import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/components/marketing/JsonLd";
import { organizationSchema } from "@/lib/marketing/jsonld";
import { SITE_URL } from "@/lib/marketing/config";
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
  metadataBase: new URL(SITE_URL),
  title: "Zenno — Your chats, answered. Your calendar, filled.",
  description:
    "An AI receptionist that answers every message and books appointments 24/7 — on the business's own WhatsApp, Telegram, LINE, Messenger, or website.",
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
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema()} />
        {children}
      </body>
    </html>
  );
}
