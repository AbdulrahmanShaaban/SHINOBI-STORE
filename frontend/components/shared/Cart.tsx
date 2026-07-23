'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  isOpen: false,
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  addItem: (item: CartItem) => set((state) => {
    const existingItem = state.items.find((i) => i.id === item.id);
    if (existingItem) {
      return {
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      };
    }
    return { items: [...state.items, item] };
  }),
  removeItem: (id: string) => set((state) => ({
    items: state.items.filter((i) => i.id !== id),
  })),
  updateQuantity: (id: string, quantity: number) => set((state) => ({
    items: state.items.map((i) =>
      i.id === id ? { ...i, quantity } : i
    ),
  })),
}));

export default function Cart() {
  const { isOpen, closeCart, items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useGSAP(() => {
    if (isOpen) {
      gsap.from('.cart-drawer', {
        x: '100%',
        duration: 0.5,
        ease: 'power3.out',
      });
      gsap.from('.cart-overlay', {
        opacity: 0,
        duration: 0.3,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="cart-overlay fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
      />

      {/* Cart Drawer */}
      <div className="cart-drawer fixed right-0 top-0 h-full w-full max-w-md bg-[#12121A] z-50 border-l border-[#CC0000]/30">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A3A]">
            <h2 className="text-2xl font-cinzel font-bold text-[#F0F0F0]">
              YOUR CART
            </h2>
            <button
              onClick={closeCart}
              className="p-2 hover:text-[#FF6B00] transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-[#6B6B80] font-inter mb-4">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-[#16161F] p-4 rounded-lg">
                    <div className="w-20 h-20 bg-[#0A0A0F] rounded flex items-center justify-center">
                      <span className="text-3xl">👕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[#F0F0F0] font-cinzel font-bold mb-1">
                        {item.name}
                      </h3>
                      <p className="text-[#FFB800] font-bebas text-xl mb-2">
                        ${item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 bg-[#2A2A3A] text-[#F0F0F0] rounded hover:bg-[#FF6B00] transition-colors"
                        >
                          -
                        </button>
                        <span className="text-[#F0F0F0] font-inter w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-[#2A2A3A] text-[#F0F0F0] rounded hover:bg-[#FF6B00] transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-[#CC0000] hover:text-[#FF6B00] transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#2A2A3A]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#6B6B80] font-inter">Subtotal</span>
                <span className="text-[#FFB800] font-bebas text-2xl">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <button className="w-full py-4 bg-[#CC0000] text-[#F0F0F0] font-cinzel font-bold hover:bg-[#FF6B00] transition-colors">
                CHECKOUT
              </button>
              <p className="text-center text-[#6B6B80] text-sm font-inter mt-4">
                Free shipping on orders over $50
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
