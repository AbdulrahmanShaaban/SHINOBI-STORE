'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { selectTotalItems, useCartStore } from '@/lib/cart-store';
import { useUser } from '@/lib/user-context';

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
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      overlayRef.current?.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
        className={`fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${
        showScrolledState
          ? 'bg-[#0A0A0F]/90 backdrop-blur-md border-b border-[#FF6B00]/20'
          : 'bg-transparent'
      }`}
    >
      <div className="w-full h-full pr-3 md:pr-6 lg:pr-10 pl-4 lg:pl-8">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center z-50 h-full">
            <div 
              className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] origin-top-left flex items-center ${
                showScrolledState 
                  ? 'w-[200px] md:w-[260px] lg:w-[320px] translate-y-[20px] lg:translate-y-[25px] translate-x-0' 
                  : 'w-[300px] md:w-[420px] lg:w-[550px] xl:w-[650px] translate-y-[20vh] md:translate-y-[25vh] lg:translate-y-[30vh] translate-x-[calc(50vw-166px)] md:translate-x-[6vw] lg:translate-x-[8vw]'
              }`}
            >
              <img 
                src="/logo.png" 
                alt="Shinobi Store Logo" 
                className="w-full h-auto object-contain drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
              />
            </div>
          </Link>

          <div className="flex items-center justify-end h-full">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 lg:gap-6 xl:gap-8">
              <Link href="/" className="px-2 lg:px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-lg md:text-xl lg:text-2xl xl:text-3xl hover:text-[#FF6B00] transition-colors">
                HOME
              </Link>
              <Link href="/products" className="px-2 lg:px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-lg md:text-xl lg:text-2xl xl:text-3xl hover:text-[#FF6B00] transition-colors">
                SHOP
              </Link>
              <Link href="/about" className="px-2 lg:px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-lg md:text-xl lg:text-2xl xl:text-3xl hover:text-[#FF6B00] transition-colors">
                ABOUT
              </Link>
              <Link href="/contact" className="px-2 lg:px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-lg md:text-xl lg:text-2xl xl:text-3xl hover:text-[#FF6B00] transition-colors">
                CONTACT
              </Link>
              <AccountLink />
              <button
                onClick={openCart}
                aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                className="relative p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg className="w-[clamp(24px,3vh,28px)] h-[clamp(24px,3vh,28px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 L3 6 L3 20 L21 20 L21 6 L18 2 Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 bg-[#CC0000] text-[#F0F0F0] text-xs min-w-[clamp(18px,2.5vh,22px)] h-[clamp(18px,2.5vh,22px)] px-1 rounded-full flex items-center justify-center font-bebas"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile/Tablet Controls */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={openCart}
                aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                className="relative p-2 text-[#F0F0F0] hover:text-[#FF6B00] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg className="w-[clamp(24px,4vh,32px)] h-[clamp(24px,4vh,32px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 L3 6 L3 20 L21 20 L21 6 L18 2 Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 right-0 bg-[#CC0000] text-[#F0F0F0] text-xs min-w-[clamp(18px,2.5vh,22px)] h-[clamp(18px,2.5vh,22px)] px-1 rounded-full flex items-center justify-center font-bebas"
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

      {/* Full-screen overlay */}
      <div
        ref={overlayRef}
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
        <nav className={`flex flex-col items-center gap-8 ${contentTransition} ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <Link href="/" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            HOME
          </Link>
          <Link href="/products" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            SHOP
          </Link>
          <Link href="/about" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            ABOUT
          </Link>
          <Link href="/contact" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            CONTACT
          </Link>
          {user ? (
            <Link href="/account" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
              MY ACCOUNT
            </Link>
          ) : (
            <Link href="/account/login" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
              SIGN IN
            </Link>
          )}
          <Link href="/cart" onClick={closeMenu} className="font-cinzel font-bold text-3xl tracking-[0.15em] text-[#F0F0F0] hover:text-[#FF6B00] transition-colors">
            CART
          </Link>
        </nav>
      </div>
    </>
  );
}

/** Desktop account entry — adapts to session state once the /auth/me probe lands. */
function AccountLink() {
  const { user, loading } = useUser();
  return (
    <Link
      href={user ? '/account' : '/account/login'}
      aria-label={user ? `Account: ${user.fullName}` : 'Sign in'}
      className="px-2 lg:px-4 py-2 text-[#F0F0F0] font-cinzel font-bold text-lg md:text-xl lg:text-2xl xl:text-3xl hover:text-[#FF6B00] transition-colors"
    >
      {loading ? '' : user ? 'ACCOUNT' : 'SIGN IN'}
    </Link>
  );
}
