import type { Metadata } from "next";
import { Anton, Bebas_Neue, Cinzel, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import SmoothScroll from "@/components/shared/SmoothScroll";
import CustomCursor from "@/components/shared/CustomCursor";
import ScrollRefresh from "@/components/shared/ScrollRefresh";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shinobi Store - Premium Anime-Inspired Streetwear",
  description:
    "Premium anime-inspired streetwear for true fans. Hoodies, t-shirts, and accessories.",
  icons: {
    icon: "/favicon.svg",
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
      className={`${anton.variable} ${bebasNeue.variable} ${cinzel.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        <ScrollRefresh />
        <CustomCursor />
        <LoadingScreen />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
