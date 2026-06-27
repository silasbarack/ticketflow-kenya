import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Cookie Policy | TicketFlow Kenya' };

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" effectiveDate="27 June 2026">
      <p>
        This Cookie Policy explains what cookies and similar technologies are, which ones
        TicketFlow Kenya uses, and how you can control them. It forms part of our{' '}
        <a href="/legal/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. We also use
        similar browser storage technologies, such as <code>localStorage</code>, for the same
        purposes described below. These technologies let a website recognize your device and
        remember information about your visit, such as whether you are logged in.
      </p>

      <h2>2. Categories of cookies we use</h2>
      <h3>2.1 Strictly necessary</h3>
      <p>
        Required for the Platform to function and cannot be switched off. These include your
        session/login token (stored in your browser so you stay logged in), and a record of your
        cookie consent choice itself.
      </p>
      <h3>2.2 Functional</h3>
      <p>
        Remember your preferences, such as filters you've applied while browsing events, to make
        your next visit more convenient.
      </p>
      <h3>2.3 Analytics</h3>
      <p>
        Help us understand how the Platform is used — for example, which events are viewed most,
        and which pages have errors — so we can improve it. Where used, analytics data is
        aggregated and not used to personally identify you for marketing purposes.
      </p>
      <h3>2.4 Payment-related</h3>
      <p>
        Used during checkout to track the status of an in-progress M-Pesa payment so we can show
        you up-to-date confirmation without you needing to refresh the page.
      </p>

      <h2>3. Cookies we do not use</h2>
      <p>
        We do not use third-party advertising cookies, and we do not sell information collected
        through cookies to advertisers.
      </p>

      <h2>4. Managing your cookie preferences</h2>
      <p>
        When you first visit the Platform, you'll see a cookie banner where you can accept all
        cookies or continue with only strictly necessary ones. You can change your mind at any
        time by clearing your browser's site data for TicketFlow Kenya, which will show the banner
        again on your next visit. Most browsers also let you block or delete cookies directly in
        their settings — note that blocking strictly necessary cookies/storage will prevent you
        from staying logged in or completing a purchase.
      </p>

      <h2>5. Third-party cookies</h2>
      <p>
        Some functionality is provided by third parties who may set their own cookies when their
        component is active on the page, for example:
      </p>
      <ul>
        <li>Our payment provider (Safaricom M-Pesa Daraja), during checkout.</li>
        <li>Camera/QR scanning libraries used on the Organizer's gate-scanning page, which run entirely in your browser and do not transmit images anywhere other than to our check-in API as decoded ticket codes.</li>
      </ul>

      <h2>6. Changes to this Policy</h2>
      <p>
        We may update this Cookie Policy as the technologies we use evolve. Continued use of the
        Platform after an update constitutes acceptance of the revised Policy.
      </p>

      <h2>7. Contact us</h2>
      <p>
        Questions about this Cookie Policy can be sent to <strong>privacy@ticketflow.co.ke</strong>.
      </p>
    </LegalLayout>
  );
}
