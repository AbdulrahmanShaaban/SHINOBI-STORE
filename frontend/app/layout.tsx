import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import SmoothScroll from "@/components/shared/SmoothScroll";
import CustomCursor from "@/components/shared/CustomCursor";


export const metadata: Metadata = {
  title: "Shinobi Store - Premium Anime-Inspired Streetwear",
  description: "Premium anime-inspired streetwear for true fans. Hoodies, t-shirts, and accessories.",
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SmoothScroll />
        <CustomCursor />
        <LoadingScreen />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
