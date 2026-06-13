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
      <div className="container mx-auto px-6 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="text-2xl font-cinzel font-bold text-[#FF6B00]">
            SHINOBI STORE
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex absolute right-2 gap-8 text-4xl">
            <Link href="/" className="px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-3xl hover:text-[#FF6B00] transition-colors">
              HOME
            </Link>
            <Link href="/products" className="px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-3xl hover:text-[#FF6B00] transition-colors">
              SHOP
            </Link>
            <Link href="/about" className="px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-3xl hover:text-[#FF6B00] transition-colors">
              ABOUT
            </Link>
            <Link href="/contact" className="px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-3xl hover:text-[#FF6B00] transition-colors">
              CONTACT
            </Link>
            <button className="px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-3xl hover:text-[#FF6B00] transition-colors">
              CART
            </button>
            <button className="relative p-2 hover:text-[#FF6B00] transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 L3 6 L3 20 L21 20 L21 6 L18 2 Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-[#CC0000] text-[#F0F0F0] text-xs w-5 h-5 rounded-full flex items-center justify-center font-bebas">
                0
              </span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#2A2A3A]">
            <div className="flex flex-col gap-4">
              <Link href="/" className="text-[#F0F0F0] font-cinzel hover:text-[#FF6B00] transition-colors">
                Home
              </Link>
              <Link href="/products" className="text-[#F0F0F0] font-cinzel hover:text-[#FF6B00] transition-colors">
                Shop
              </Link>
              <Link href="/about" className="text-[#F0F0F0] font-cinzel hover:text-[#FF6B00] transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-[#F0F0F0] font-cinzel hover:text-[#FF6B00] transition-colors">
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
