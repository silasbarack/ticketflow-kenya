'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CartItem } from '@/types';
import { serviceFeeFor, totalWithServiceFee } from '@/lib/fees';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (ticketTypeId: string) => void;
  updateQuantity: (ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  /** Ticket subtotal before the service fee */
  totalAmount: number;
  serviceFee: number;
  /** Final amount the buyer pays (subtotal + service fee) */
  finalTotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'tfk_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addToCart = (newItem: CartItem) => {
    setItems((prev) => {
      // If adding from a different event, replace cart
      if (prev.length > 0 && prev[0].eventId !== newItem.eventId) {
        return [newItem];
      }
      const existing = prev.find((i) => i.ticketTypeId === newItem.ticketTypeId);
      if (existing) {
        return prev.map((i) =>
          i.ticketTypeId === newItem.ticketTypeId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (ticketTypeId: string) => {
    setItems((prev) => prev.filter((i) => i.ticketTypeId !== ticketTypeId));
  };

  const updateQuantity = (ticketTypeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(ticketTypeId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.ticketTypeId === ticketTypeId ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const serviceFee = serviceFeeFor(totalAmount);
  const finalTotal = totalWithServiceFee(totalAmount);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalAmount, serviceFee, finalTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
