import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Privacy Policy | TicketFlow Kenya' };

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="27 June 2026">
      <p>
        TicketFlow Kenya (&quot;TicketFlow Kenya&quot;, &quot;we&quot;, &quot;us&quot;, or
        &quot;our&quot;) operates a platform that allows Event Organizers to create and publish
        events, and allows Customers to discover events and purchase tickets, including via
        M-Pesa. This Privacy Policy explains what personal data we collect, why we collect it,
        how we use and protect it, and the rights you have over it. It applies to everyone who
        uses our website, mobile-responsive web app, and related services (together, the
        &quot;Platform&quot;).
      </p>
      <p>
        We process personal data in accordance with the Kenya Data Protection Act, 2019, and its
        accompanying regulations. By using the Platform, you acknowledge that you have read and
        understood this Policy.
      </p>

      <h2>1. Who this Policy applies to</h2>
      <p>This Policy applies to three categories of users:</p>
      <ul>
        <li><strong>Customers</strong> — people who browse events and purchase tickets.</li>
        <li>
          <strong>Event Organizers</strong> — people or organizations who create events, sell
          tickets, and scan attendees at the gate.
        </li>
        <li>
          <strong>Administrators</strong> — TicketFlow Kenya staff who moderate the Platform.
        </li>
      </ul>

      <h2>2. Information we collect</h2>
      <h3>2.1 Information you give us directly</h3>
      <ul>
        <li>Account details: full name, email address, phone number, and password (stored as a salted hash, never in plain text).</li>
        <li>Organizer details: company/brand name, business description, and verification information.</li>
        <li>Event details: event titles, descriptions, venues, dates, ticket types, prices, and poster images submitted by Organizers.</li>
        <li>Transaction details: ticket selections, order references, and the M-Pesa phone number you provide at checkout.</li>
        <li>Support communications: anything you tell us when you contact us for help.</li>
      </ul>
      <h3>2.2 Information collected automatically</h3>
      <ul>
        <li>Technical data: IP address, browser type, device type, and approximate location inferred from your IP.</li>
        <li>Usage data: pages visited, events viewed, and actions taken on the Platform.</li>
        <li>Cookies and similar technologies, as described in our <a href="/legal/cookie-policy">Cookie Policy</a>.</li>
      </ul>
      <h3>2.3 Information from payment processing</h3>
      <p>
        When you pay via M-Pesa, Safaricom's Daraja platform sends us a payment confirmation
        containing the M-Pesa receipt number, the phone number used, the amount, and a
        success/failure result code. We do not receive or store your M-Pesa PIN, and we never
        have access to your mobile money account credentials.
      </p>

      <h2>3. How we use your information</h2>
      <ul>
        <li>To create and manage your account and authenticate you when you log in.</li>
        <li>To process ticket orders, initiate M-Pesa STK Push requests, and confirm payment status.</li>
        <li>To generate your QR-code e-tickets and validate them at event check-in.</li>
        <li>To allow Event Organizers to view their own attendee lists and sales for events they created.</li>
        <li>To calculate and record the platform commission owed on each successful sale.</li>
        <li>To detect and prevent fraud, duplicate ticket use, and abuse of the Platform.</li>
        <li>To send transactional communications (order confirmations, payment status, password resets).</li>
        <li>To moderate events submitted for approval and enforce our Terms and Conditions.</li>
        <li>To comply with legal, tax, and regulatory obligations in Kenya.</li>
      </ul>
      <p>We do not sell your personal data to third parties.</p>

      <h2>4. Who we share information with</h2>
      <ul>
        <li>
          <strong>Event Organizers</strong>, limited to attendee data (name, email, phone, ticket
          type, check-in status) for events that Customer has purchased a ticket to — Organizers
          may not see data for events they did not create.
        </li>
        <li>
          <strong>Payment partners</strong>, currently Safaricom (M-Pesa Daraja), and in future
          potentially Flutterwave, Paystack, or card processors, solely to process and confirm
          payments.
        </li>
        <li>
          <strong>Service providers</strong> who host our infrastructure (e.g. cloud hosting and
          database providers), under confidentiality obligations.
        </li>
        <li>
          <strong>Regulators and law enforcement</strong>, where required by Kenyan law, a court
          order, or to protect the rights, property, or safety of TicketFlow Kenya, our users, or
          the public.
        </li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        We retain account and transaction data for as long as your account is active and for a
        reasonable period afterwards to meet our legal, accounting, audit, and fraud-prevention
        obligations (including audit logs of payment and check-in events). Event and ticket
        records relating to completed transactions are retained for at least seven (7) years to
        comply with Kenyan tax record-keeping requirements.
      </p>

      <h2>6. Your rights</h2>
      <p>Under the Data Protection Act, 2019, you have the right to:</p>
      <ul>
        <li>Be informed of how your data is used (this Policy).</li>
        <li>Access the personal data we hold about you.</li>
        <li>Request correction of inaccurate or outdated data.</li>
        <li>Request deletion of your data, subject to our legal retention obligations.</li>
        <li>Object to or restrict certain processing of your data.</li>
        <li>Data portability, where technically feasible.</li>
        <li>Lodge a complaint with the Office of the Data Protection Commissioner (ODPC), Kenya.</li>
      </ul>
      <p>
        To exercise any of these rights, contact us using the details in Section 10. We will
        respond within the timelines required by law.
      </p>

      <h2>7. Data security</h2>
      <ul>
        <li>Passwords are hashed with bcrypt and are never stored or transmitted in plain text.</li>
        <li>Access to administrative and organizer functions is restricted by role-based access control.</li>
        <li>Sensitive account, payment, and check-in actions are written to an internal audit log.</li>
        <li>Payment status can only be confirmed by our backend in response to a verified payment provider callback — it is never set directly by a user's browser.</li>
      </ul>
      <p>
        No system is 100% secure, but we take reasonable technical and organizational measures to
        protect your data against unauthorized access, alteration, or loss.
      </p>

      <h2>8. Children's privacy</h2>
      <p>
        The Platform is not directed at children under the age of 18. We do not knowingly collect
        personal data from children. If you believe a child has provided us with personal data,
        please contact us so we can delete it.
      </p>

      <h2>9. Changes to this Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices
        or the law. We will post the updated version with a new effective date, and where changes
        are material, we will provide additional notice (e.g. by email or an in-app banner).
      </p>

      <h2>10. Contact us</h2>
      <p>
        Questions, requests, or complaints about this Policy or how we handle your data can be
        sent to <strong>privacy@ticketflow.co.ke</strong>. You may also lodge a complaint
        directly with the Office of the Data Protection Commissioner, Kenya.
      </p>
    </LegalLayout>
  );
}
