import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Terms and Conditions | TicketFlow Kenya' };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms and Conditions" effectiveDate="27 June 2026">
      <p>
        These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the
        TicketFlow Kenya website and services (the &quot;Platform&quot;), operated by TicketFlow
        Kenya (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an account, browsing
        events, purchasing a ticket, or publishing an event on the Platform, you agree to be bound
        by these Terms, our <a href="/legal/privacy-policy">Privacy Policy</a>, our{' '}
        <a href="/legal/payment-policy">Payment Policy</a>, our{' '}
        <a href="/legal/ticket-purchase-policy">Ticket Purchase Policy</a>, and, if you are an
        Organizer, our <a href="/legal/event-organizer-policy">Event Organizer Policy</a>. If you
        do not agree, please do not use the Platform.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old, or the age of majority in your jurisdiction, to create
        an account. By registering, you confirm that the information you provide is accurate and
        that you have the legal capacity to enter into these Terms.
      </p>

      <h2>2. Accounts and roles</h2>
      <p>The Platform supports three account roles:</p>
      <ul>
        <li><strong>Customer</strong> — can browse events and purchase tickets.</li>
        <li>
          <strong>Event Organizer</strong> — can create, manage, and publish events, sell
          tickets, and check in attendees at the gate, subject to our{' '}
          <a href="/legal/event-organizer-policy">Event Organizer Policy</a>.
        </li>
        <li><strong>Administrator</strong> — moderates events, users, and payments on the Platform.</li>
      </ul>
      <p>
        You are responsible for maintaining the confidentiality of your password and for all
        activity that occurs under your account. Notify us immediately of any unauthorized use.
      </p>

      <h2>3. TicketFlow Kenya's role</h2>
      <p>
        TicketFlow Kenya provides the technology platform that connects Event Organizers with
        Customers. Unless explicitly stated otherwise, <strong>Event Organizers — not TicketFlow
        Kenya — are the seller of record</strong> for tickets to their events, and are solely
        responsible for the event actually taking place, its content, safety, and compliance with
        applicable law. TicketFlow Kenya is not a party to the contract of sale between an
        Organizer and a Customer beyond facilitating ticketing and payment processing.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Platform for any unlawful purpose or in violation of these Terms.</li>
        <li>Create events that are fraudulent, misleading, or for goods/services prohibited by Kenyan law.</li>
        <li>Attempt to forge, duplicate, resell outside the Platform, or tamper with QR-code tickets.</li>
        <li>Circumvent, disable, or interfere with security-related features of the Platform.</li>
        <li>Scrape, reverse-engineer, or use automated means to access the Platform without our written consent.</li>
        <li>Upload content that is defamatory, obscene, infringing, or that you do not have the rights to use.</li>
      </ul>

      <h2>5. Event listings and approval</h2>
      <p>
        Events created by Organizers start as <strong>Draft</strong>, move to{' '}
        <strong>Pending Approval</strong> once submitted, and are only visible to Customers once
        an Administrator marks them <strong>Published</strong>. We may reject or suspend any
        event, at our reasonable discretion, including (without limitation) for suspected fraud,
        prohibited content, safety concerns, or violation of these Terms. Approval of an event
        does not constitute an endorsement of the event or its Organizer by TicketFlow Kenya.
      </p>

      <h2>6. Tickets and payments</h2>
      <p>
        Ticket purchases and payments are governed by our{' '}
        <a href="/legal/ticket-purchase-policy">Ticket Purchase Policy</a> and{' '}
        <a href="/legal/payment-policy">Payment Policy</a>, which form part of these Terms.
      </p>

      <h2>7. Platform commission</h2>
      <p>
        TicketFlow Kenya charges Organizers a platform commission on each successfully paid
        ticket, currently <strong>7% of the ticket price</strong> by default, deducted before the
        Organizer's earnings are calculated. The applicable commission rate is shown to Organizers
        before they publish ticket pricing and may be varied for future events with reasonable
        notice.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Platform, including its design, code, and branding, is owned by TicketFlow Kenya and
        protected by intellectual property laws. Organizers retain ownership of the event content
        (descriptions, posters, branding) they upload, but grant TicketFlow Kenya a non-exclusive,
        royalty-free licence to display that content on the Platform for the purpose of marketing
        and selling tickets to the event.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Platform is provided &quot;as is&quot; and &quot;as available&quot;. We do not
        guarantee that the Platform will be uninterrupted, error-free, or completely secure. We
        are not responsible for the conduct of any Organizer or Customer, the quality or safety of
        any event, or whether an event actually takes place as advertised.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by Kenyan law, TicketFlow Kenya's total liability arising
        out of or relating to these Terms or the Platform shall not exceed the total platform
        commission we earned from the transaction(s) giving rise to the claim. We are not liable
        for indirect, incidental, or consequential damages, including loss of profits or data.
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        We may suspend or terminate your account if you breach these Terms, engage in fraudulent
        activity, or where required by law. You may close your account at any time by contacting
        us; outstanding obligations (such as pending payouts or unresolved disputes) will still be
        honoured or resolved.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Platform after an update
        constitutes acceptance of the revised Terms. Material changes will be communicated via the
        Platform or by email.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the Republic of Kenya. Any dispute arising out of
        or in connection with these Terms shall first be addressed through good-faith negotiation,
        and failing resolution, shall be subject to the exclusive jurisdiction of the courts of
        Kenya.
      </p>

      <h2>14. Contact us</h2>
      <p>
        For questions about these Terms, contact <strong>support@ticketflow.co.ke</strong>.
      </p>
    </LegalLayout>
  );
}
