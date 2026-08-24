'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { PiHandbagSimpleBold, PiMagnifyingGlassBold, PiUserCircle, PiUserCircleBold } from 'react-icons/pi';
import { selectTotalItems, useCartStore } from '@/lib/cart-store';
import { useUser } from '@/lib/user-context';
import { acquireScrollLock, releaseLock } from '@/lib/scroll-lock';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const openCart = useCartStore((s) => s.openCart);
  const cartCount = useCartStore(selectTotalItems);
  const { user } = useUser();
  const isHomePage = pathname === '/';
  const showScrolledState = isScrolled || !isHomePage;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, closeMenu]);

  // Lock body scroll when menu is open and reset overlay scroll position
  useEffect(() => {
    if (!isMenuOpen) return;
    acquireScrollLock();
    overlayRef.current?.scrollTo(0, 0);
    return () => {
      releaseLock();
    };
  }, [isMenuOpen]);

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlayTransition = prefersReducedMotion
    ? ''
    : 'transition-opacity duration-300 ease-in-out';
  const contentTransition = prefersReducedMotion
    ? ''
    : 'transition-all duration-300 ease-out';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-40 h-20 transition-all duration-300 ${
        showScrolledState
          ? 'bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#FF6B00]/20'
          : 'bg-transparent'
      }`}
    >
      <div className="w-full h-full pr-3 md:pr-6 lg:pr-10 pl-4 lg:pl-8">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          {/* Logo — min-w-0 + max-w-full let it shrink on narrow viewports so
              the action controls always stay inside the viewport. */}
          <Link href="/" className="flex items-center z-50 h-full min-w-0">
            <div
              className={`pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] origin-top-left flex items-center max-w-full ${
                showScrolledState 
                  ? 'w-[200px] md:w-[260px] lg:w-[320px] translate-y-[20px] lg:translate-y-[25px] translate-x-0' 
                  : 'w-[300px] md:w-[420px] lg:w-[550px] xl:w-[650px] translate-y-[20vh] md:translate-y-[25vh] lg:translate-y-[30vh] translate-x-[calc(50vw-166px)] md:translate-x-[6vw] lg:translate-x-[8vw]'
              }`}
            >
              <Image
                src="/logo.png"
                alt="Shinobi Store Logo"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 767px) 300px, (max-width: 1023px) 420px, (max-width: 1279px) 550px, 650px"
                className="w-full h-auto object-contain drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)] pointer-events-auto"
              />
            </div>
          </Link>

          <div className="flex items-center justify-end h-full">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-3 lg:gap-5 shrink-0">
              <Link href="/" className="px-2 py-2 text-[#F0F0F0] font-semibold text-xl xl:text-2xl hover:text-[#FF6B00] transition-colors">
                Home
              </Link>
              <Link href="/products" className="px-2 py-2 text-[#F0F0F0] font-semibold text-xl xl:text-2xl hover:text-[#FF6B00] transition-colors">
                Shop
              </Link>
              <Link href="/products?sort=newest" className="px-2 py-2 text-[#F0F0F0] font-semibold text-xl xl:text-2xl hover:text-[#FF6B00] transition-colors">
                New Arrivals
              </Link>
              <Link
                href="/products"
                aria-label="Search products"
                title="Search"
                className="p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <PiMagnifyingGlassBold className="w-6 h-6" />
              </Link>
              <AccountLink />
              <button
                onClick={openCart}
                aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                title="Cart"
                className="relative p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <PiHandbagSimpleBold className="w-6 h-6" />
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 bg-[#CC0000] text-[#F0F0F0] text-xs min-w-[clamp(18px,2.5vh,22px)] h-[clamp(18px,2.5vh,22px)] px-1 rounded-full flex items-center justify-center font-semibold"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile/Tablet Controls */}
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <Link
                href="/products"
                aria-label="Search products"
                title="Search"
                className="p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <PiMagnifyingGlassBold className="w-6 h-6" />
              </Link>
              <AccountLink iconOnly />
              <button
                onClick={openCart}
                aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                title="Cart"
                className="relative p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <PiHandbagSimpleBold className="w-6 h-6" />
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 bg-[#CC0000] text-[#F0F0F0] text-xs min-w-[clamp(18px,2.5vh,22px)] h-[clamp(18px,2.5vh,22px)] px-1 rounded-full flex items-center justify-center font-semibold"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <svg className="w-[clamp(28px,4.5vh,36px)] h-[clamp(28px,4.5vh,36px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMenuOpen ? (
                    <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M3 12 L21 12 M3 6 L21 6 M3 18 L21 18" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

      {/* Full-screen overlay. inert when closed so its links never enter the
          tab order while visually hidden (opacity-0 alone keeps them focusable). */}
      <div
        ref={overlayRef}
        inert={!isMenuOpen}
        className={`lg:hidden fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0A0A0F] overflow-y-auto ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${overlayTransition}`}
      >
        {/* Close button */}
        <button
          onClick={closeMenu}
          className="absolute top-5 right-5 p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18 L18 6 M6 6 L18 18" />
          </svg>
        </button>

        {/* Nav links */}
        <nav className={`flex flex-col items-center gap-7 ${contentTransition} ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <Link href="/" onClick={closeMenu} className="font-semibold text-2xl text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            Home
          </Link>
          <Link href="/products" onClick={closeMenu} className="font-semibold text-2xl text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            Shop
          </Link>
          <Link href="/products?sort=newest" onClick={closeMenu} className="font-semibold text-2xl text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            New Arrivals
          </Link>
          {user ? (
            <Link href="/account" onClick={closeMenu} className="font-semibold text-2xl text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
              My Account
            </Link>
          ) : (
            <Link href="/account/login" onClick={closeMenu} className="font-semibold text-2xl text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}

/** Account entry — expressive user icon that adapts to session state. */
function AccountLink({ iconOnly = false }: { iconOnly?: boolean }) {
  const { user, loading } = useUser();
  const href = user ? '/account' : '/account/login';
  const label = user ? `Account: ${user.fullName}` : 'Sign in';

  if (iconOnly) {
    return (
      <Link
        href={href}
        aria-label={label}
        title={user ? 'My Account' : 'Sign in'}
        className="p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        {user ? (
          <PiUserCircleBold className="w-7 h-7" />
        ) : (
          <PiUserCircle className="w-7 h-7" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      title={user ? 'My Account' : 'Sign in'}
      className="p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
    >
      <PiUserCircleBold className="w-6 h-6" />
    </Link>
  );
}
