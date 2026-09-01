import { create } from 'zustand';
import { EventItem } from '@/types/event';
import { Order } from '@/types/order';

interface CheckoutState {
  event: EventItem | null;
  /** ticketTypeId -> selected quantity */
  quantities: Record<string, number>;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  draftOrder: Order | null;
  setEvent: (event: EventItem) => void;
  setQuantity: (ticketTypeId: string, quantity: number) => void;
  setBuyerDetails: (details: Partial<Pick<CheckoutState, 'buyerName' | 'buyerEmail' | 'buyerPhone'>>) => void;
  setDraftOrder: (order: Order) => void;
  reset: () => void;
}

const initialState = {
  event: null,
  quantities: {},
  buyerName: '',
  buyerEmail: '',
  buyerPhone: '',
  draftOrder: null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initialState,

  setEvent(event) {
    set((state) => {
      // Switching to a different event clears stale ticket selections.
      if (state.event?.id === event.id) return { event };
      return { event, quantities: {} };
    });
  },

  setQuantity(ticketTypeId, quantity) {
    set((state) => ({
      quantities: { ...state.quantities, [ticketTypeId]: Math.max(0, quantity) },
    }));
  },

  setBuyerDetails(details) {
    set(details);
  },

  setDraftOrder(order) {
    set({ draftOrder: order });
  },

  reset() {
    set(initialState);
  },
}));
