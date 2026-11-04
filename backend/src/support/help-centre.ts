/**
 * Verified help-centre content the support assistant is grounded on.
 *
 * Every entry is a restatement of a published TicketFlow policy page (see
 * `source`) or of how the product actually behaves in this codebase. When a
 * policy page changes, change the matching entry here — the assistant must
 * never know more than the published policy says.
 */
export interface HelpArticle {
  id: string;
  title: string;
  keywords: string[];
  body: string;
  source: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'buying-tickets',
    title: 'How to buy tickets',
    keywords: ['buy', 'purchase', 'book', 'order', 'checkout', 'how', 'nunua', 'tiketi'],
    body:
      'Find the event under Discover, choose a ticket tier and quantity, and continue to checkout. ' +
      'You must be signed in. An order is created showing the ticket subtotal plus the platform service fee. ' +
      'Enter or confirm the M-Pesa number that should receive the payment prompt and press Pay.',
    source: '/legal/ticket-purchase-policy',
  },
  {
    id: 'mpesa-payment',
    title: 'Paying with M-Pesa',
    keywords: ['mpesa', 'm-pesa', 'pay', 'payment', 'stk', 'prompt', 'pin', 'lipa', 'malipo'],
    body:
      'TicketFlow uses M-Pesa STK Push. After you press Pay, a prompt appears on the phone number you entered. ' +
      'Enter your M-Pesa PIN on the phone to approve it. Keep the checkout page open: it shows when the payment is confirmed. ' +
      'If the prompt times out, is cancelled or fails (for example a wrong PIN or insufficient balance), no tickets are issued, ' +
      'the reserved tickets are released, and you can request a fresh prompt with Try Again. ' +
      'Only a confirmation from M-Pesa marks a payment as paid; TicketFlow support cannot mark a payment as paid.',
    source: '/legal/payment-policy',
  },
  {
    id: 'charged-but-pending',
    title: 'Money left my M-Pesa but my order is not paid',
    keywords: ['deducted', 'charged', 'money', 'pending', 'not received', 'debited', 'pesa', 'imekatwa'],
    body:
      'Payments are usually confirmed within a minute; the system keeps checking with M-Pesa for up to 15 minutes even if you close the page. ' +
      'If M-Pesa took the money but your order still shows Pending or Failed after a reasonable time, do not pay again. ' +
      'Contact payments@ticketflow.co.ke with your order number and the M-Pesa transaction code from your SMS so the team can check it.',
    source: '/legal/payment-policy',
  },
  {
    id: 'accessing-tickets',
    title: 'Finding my tickets',
    keywords: ['ticket', 'tickets', 'find', 'download', 'pdf', 'email', 'where', 'my tickets', 'received'],
    body:
      'Once a payment is confirmed, tickets are issued immediately. They appear under My Tickets in your dashboard, where you can open each one and download a PDF. ' +
      'A copy is also emailed to the address on your account; if it has not arrived, check spam — the system retries failed ticket emails automatically.',
    source: '/legal/ticket-purchase-policy',
  },
  {
    id: 'qr-entry',
    title: 'Using your QR ticket at the gate',
    keywords: ['qr', 'code', 'scan', 'gate', 'entry', 'entrance', 'screenshot', 'share'],
    body:
      'Each ticket has a unique, signed QR code and admits one person once. Present it on your phone or printed at the entrance. ' +
      'Once scanned it is marked as used, so do not share or post your QR code — anyone who scans it first uses your entry. ' +
      'If you suspect your ticket was used by someone else, contact support@ticketflow.co.ke with your ticket code and order number.',
    source: '/legal/ticket-purchase-policy',
  },
  {
    id: 'refunds',
    title: 'Refunds',
    keywords: ['refund', 'money back', 'return', 'rejesha', 'reimburse'],
    body:
      'Tickets are generally non-refundable and non-exchangeable once payment is confirmed, except where the law requires otherwise. ' +
      'If the organiser cancels the event and does not reschedule it, you are entitled to a refund of the amount you paid for that order. ' +
      'If an event is postponed to a new confirmed date your tickets remain valid; you may request a refund within the window communicated for that event. ' +
      'Approved refunds go back to the original payment method within fourteen (14) business days of approval. ' +
      'Refund eligibility for a specific order is decided by the TicketFlow team, not by this assistant.',
    source: '/legal/ticket-purchase-policy',
  },
  {
    id: 'transfers',
    title: 'Transferring or reselling tickets',
    keywords: ['transfer', 'resell', 'resale', 'give', 'friend', 'name change', 'sell'],
    body:
      'TicketFlow does not currently support transferring a ticket to another account. When buying, you can enter attendee names for each ticket.',
    source: '/legal/ticket-purchase-policy',
  },
  {
    id: 'service-fee',
    title: 'Service fee',
    keywords: ['fee', 'charge', 'service', 'commission', 'extra', 'total'],
    body:
      'A platform service fee is added to each order on top of the ticket price and shown before you pay. It is not charged on failed or cancelled orders.',
    source: '/legal/payment-policy',
  },
  {
    id: 'organisers',
    title: 'Selling tickets as an organiser',
    keywords: ['organiser', 'organizer', 'sell', 'host', 'create event', 'list event', 'verification', 'kyc', 'payout'],
    body:
      'Register an organiser account, then complete organisation verification (company details, documents, representative identity check through Persona, and payout details). ' +
      'Create an event as a draft, add ticket tiers, and submit it for admin approval. Ticket sales open once the organisation is verified and the event is approved.',
    source: '/legal/event-organizer-policy',
  },
  {
    id: 'contact',
    title: 'Contacting support',
    keywords: ['contact', 'human', 'agent', 'person', 'help', 'support', 'call', 'email'],
    body:
      'For order or ticket help email support@ticketflow.co.ke; for payment questions email payments@ticketflow.co.ke. ' +
      'You can also ask this assistant to create a support ticket for the team.',
    source: '/legal/ticket-purchase-policy',
  },
];

/** Cheap keyword ranking — good enough for ten articles and no extra infra. */
export function findHelpArticles(message: string, limit = 4): HelpArticle[] {
  const text = message.toLowerCase();
  return HELP_ARTICLES.map((a) => ({
    article: a,
    score: a.keywords.reduce((n, k) => (text.includes(k) ? n + (k.length > 4 ? 2 : 1) : n), 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.article);
}
