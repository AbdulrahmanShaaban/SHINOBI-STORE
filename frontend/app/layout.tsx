import type { Metadata } from "next";
import {
  Anton,
  Bebas_Neue,
  Belanosima,
  Cinzel,
  Inter,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";
import Cart from "@/components/shared/Cart";
import CartHydration from "@/components/shared/CartHydration";
import ToastHost from "@/components/shared/Toast";
import LoadingScreen from "@/components/LoadingScreen";
import SmoothScroll from "@/components/shared/SmoothScroll";
import CustomCursor from "@/components/shared/CustomCursor";
import ScrollRefresh from "@/components/shared/ScrollRefresh";
import { UserProvider } from "@/lib/user-context";

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

const belanosima = Belanosima({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-belanosima",
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
      // suppressHydrationWarning: the cursor boot script legitimately adds
      // custom-cursor-boot to documentElement before React hydrates.
      suppressHydrationWarning
      className={`${anton.variable} ${bebasNeue.variable} ${belanosima.variable} ${cinzel.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.matchMedia&&window.matchMedia('(pointer: fine)').matches)document.documentElement.classList.add('custom-cursor-boot')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0F] text-[#F0F0F0] [font-family:var(--font-belanosima),sans-serif]">
        <UserProvider>
          <SmoothScroll />
          <ScrollRefresh />
          <CustomCursor />
          <LoadingScreen />
          <Navbar />
          <PublicShell>{children}</PublicShell>
          <Cart />
          <CartHydration />
          <ToastHost />
        </UserProvider>
      </body>
    </html>
  );
}

/**
 * Clears the fixed navbar (h-16) on every public route. The home hero is
 * intentionally full-bleed UNDER the transparent navbar, so it opts out.
 */
function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="public-shell pt-24">{children}</div>;
}
