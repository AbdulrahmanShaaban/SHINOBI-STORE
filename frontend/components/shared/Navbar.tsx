'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#FF6B00]/20'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-10 h-full">
        <div className="flex items-center justify-end h-full">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 lg:gap-6 xl:gap-8">
            <Link href="/" className="px-2 lg:px-3 py-2 text-[#F0F0F0] font-cinzel font-bold text-sm lg:text-base xl:text-lg hover:text-[#FF6B00] transition-colors">
              HOME
            </Link>
            <Link href="/products" className="px-2 lg:px-3 py-2 text-[#F0F0F0] font-cinzel font-bold text-sm lg:text-base xl:text-lg hover:text-[#FF6B00] transition-colors">
              SHOP
            </Link>
            <Link href="/about" className="px-2 lg:px-3 py-2 text-[#F0F0F0] font-cinzel font-bold text-sm lg:text-base xl:text-lg hover:text-[#FF6B00] transition-colors">
              ABOUT
            </Link>
            <Link href="/contact" className="px-2 lg:px-3 py-2 text-[#F0F0F0] font-cinzel font-bold text-sm lg:text-base xl:text-lg hover:text-[#FF6B00] transition-colors">
              CONTACT
            </Link>
            <button className="relative p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
              <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 L3 6 L3 20 L21 20 L21 6 L18 2 Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-[#CC0000] text-[#F0F0F0] text-xs w-5 h-5 rounded-full flex items-center justify-center font-bebas">
                0
              </span>
            </button>
          </div>

          {/* Mobile/Tablet Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMenuOpen ? (
                <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M3 12 L21 12 M3 6 L21 6 M3 18 L21 18" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile/Tablet Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-6 px-2 border-t border-[#2A2A3A] bg-[#0A0A0F]/95 backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-[#F0F0F0] font-cinzel font-bold text-base tracking-wide hover:text-[#FF6B00] transition-colors py-2">
                HOME
              </Link>
              <Link href="/products" onClick={() => setIsMenuOpen(false)} className="text-[#F0F0F0] font-cinzel font-bold text-base tracking-wide hover:text-[#FF6B00] transition-colors py-2">
                SHOP
              </Link>
              <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-[#F0F0F0] font-cinzel font-bold text-base tracking-wide hover:text-[#FF6B00] transition-colors py-2">
                ABOUT
              </Link>
              <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="text-[#F0F0F0] font-cinzel font-bold text-base tracking-wide hover:text-[#FF6B00] transition-colors py-2">
                CONTACT
              </Link>
              <Link href="/cart" onClick={() => setIsMenuOpen(false)} className="text-[#F0F0F0] font-cinzel font-bold text-base tracking-wide hover:text-[#FF6B00] transition-colors py-2">
                CART
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

