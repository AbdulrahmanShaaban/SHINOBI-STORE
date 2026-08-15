"use client";

import Link from "next/link";
import { useCartStore } from "./Cart";

const PRODUCTS = [
  {
    id: "madara-six-paths",
    name: "MADARA — SIX PATHS",
    price: 49.99,
    image: "/madara-six-paths.png",
  },
  {
    id: "itachi-mangekyou",
    name: "ITACHI — MANGEKYO",
    price: 44.99,
    image: "/itachi-mangekyou.png",
  },
  {
    id: "sasuke-chidori",
    name: "SASUKE — CHIDORI",
    price: 44.99,
    image: "/sasuke-chidori.png",
  },
  {
    id: "naruto-rasengan",
    name: "NARUTO — RASENGAN",
    price: 39.99,
    image: "/naruto-rasengan.png",
  },
  {
    id: "kurama",
    name: "KURAMA — NINE TAILS",
    price: 54.99,
    image: "/kurama.png",
  },
  {
    id: "madara-classic",
    name: "MADARA — CLASSIC",
    price: 49.99,
    image: "/madara-default.png",
  },
];

export default function ProductGrid() {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <section className="w-full bg-[#101014] py-24 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12 md:mb-16">
          <div>
            <div
              className="font-anton uppercase text-4xl md:text-6xl tracking-[0.06em]"
              style={{ color: "#F5E6C8" }}
            >
              FEATURED
            </div>
            <p
              className="font-inter text-sm md:text-base mt-3 tracking-[0.25em] uppercase"
              style={{ color: "rgba(245,230,200,0.60)" }}
            >
              Handpicked from the archive
            </p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 font-cinzel font-bold text-sm md:text-base tracking-[0.2em] transition-colors duration-300 hover:text-[#FF5A2A]"
            style={{ color: "#F5E6C8" }}
          >
            <span>SHOP ALL</span>
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: "#12121A",
                border: "1px solid rgba(245,230,200,0.10)",
              }}
            >
              <div className="relative aspect-square overflow-hidden bg-[#0A0A0F] flex items-center justify-center">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      quantity: 1,
                      image: product.image,
                    })
                  }
                  className="absolute inset-x-3 bottom-3 h-11 rounded-md font-cinzel font-bold text-xs md:text-sm tracking-wide transition-all duration-300 opacity-0 group-hover:opacity-100 hover:brightness-110 active:scale-[0.97]"
                  style={{ backgroundColor: "#FF5A2A", color: "#101014" }}
                >
                  ADD TO CART
                </button>
              </div>
              <div className="p-4 md:p-5 flex items-center justify-between gap-2">
                <span
                  className="font-cinzel font-semibold text-[11px] md:text-sm leading-tight"
                  style={{ color: "#F5E6C8" }}
                >
                  {product.name}
                </span>
                <span
                  className="font-inter font-semibold text-[12px] md:text-sm whitespace-nowrap"
                  style={{ color: "rgba(245,230,200,0.60)" }}
                >
                  ${product.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}