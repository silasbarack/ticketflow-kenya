'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '@/lib/api';
import RequireRole from '@/components/RequireRole';
import { Order, Payment } from '@/types';
import { formatCurrency } from '@/lib/format';

function CheckoutContent() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const { data: order } = useQuery({
    queryKey: ['order', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${params.orderId}`);
      return data as Order;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['order-payments', params.orderId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/order/${params.orderId}`);
      return data as Payment[];
    },
    enabled: !!activePaymentId,
    refetchInterval: (query) => {
      const latest = query.state.data?.[0];
      return latest && latest.status !== 'PENDING' ? false : 3000;
    },
  });

  const latestPayment = payments?.[0];

  if (latestPayment?.status === 'SUCCESS') {
    queryClient.invalidateQueries({ queryKey: ['order', params.orderId] });
  }

  const stkPush = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/mpesa/stk-push', { orderId: params.orderId, phone });
      return data as Payment;
    },
    onSuccess: (payment) => {
      setActivePaymentId(payment.id);
      toast.success('Check your phone for the M-Pesa PIN prompt.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const mockSuccess = useMutation({
    mutationFn: async () => {
      if (!activePaymentId) throw new Error('No active payment yet');
      const { data } = await api.post(`/payments/mock/${activePaymentId}/success`);
      return data;
    },
    onSuccess: () => {
      toast.success('Payment confirmed (mock). Redirecting to your tickets...');
      setTimeout(() => router.push('/dashboard/tickets'), 1200);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!order) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-gray-500">Loading order...</main>;
  }

  if (order.status === 'PAID') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">Payment confirmed!</h1>
        <p className="mt-2 text-gray-500">Your tickets are ready.</p>
        <button
          onClick={() => router.push('/dashboard/tickets')}
          className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          View my tickets
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Complete your payment</h1>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">{order.event.title}</h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity} x {item.ticketType.name}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">M-Pesa phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={() => stkPush.mutate()}
          disabled={stkPush.isPending || !phone || !!activePaymentId}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {stkPush.isPending ? 'Sending STK push...' : 'Pay with M-Pesa'}
        </button>

        {activePaymentId && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <p>
              Status: <strong>{latestPayment?.status || 'PENDING'}</strong> — waiting for confirmation from
              Safaricom.
            </p>
            <button
              onClick={() => mockSuccess.mutate()}
              disabled={mockSuccess.isPending}
              className="mt-2 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Dev only: simulate successful callback
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <RequireRole roles={['CUSTOMER']}>
      <CheckoutContent />
    </RequireRole>
  );
}
