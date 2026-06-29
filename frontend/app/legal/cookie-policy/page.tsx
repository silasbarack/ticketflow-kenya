import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Cookie Policy | TicketFlow Kenya' };

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" effectiveDate="29 June 2026">
      <p>
        This Cookie Policy (the &quot;<strong>Policy</strong>&quot;) is the formal, institutional
        statement explaining what cookies and similar technologies are, which ones TicketFlow
        Kenya uses, the lawful basis for using them, and how you can control them. It forms an
        integral part of our <a href="/legal/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>1. Definitions</h2>
      <ul>
        <li>
          <strong>&quot;Cookie&quot;</strong> means a small text file placed on your device by a
          website to store information about your visit.
        </li>
        <li>
          <strong>&quot;Similar Technologies&quot;</strong> means browser storage mechanisms such
          as <code>localStorage</code> and <code>sessionStorage</code> that serve a comparable
          purpose to Cookies.
        </li>
        <li>
          <strong>&quot;Strictly Necessary Cookies&quot;</strong> means Cookies required for the
          Platform to function, which cannot be switched off.
        </li>
        <li>
          <strong>&quot;Session&quot;</strong> means the period during which you are logged in and
          actively using the Platform.
        </li>
      </ul>

      <h2>2. What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. We also use
        Similar Technologies, such as <code>localStorage</code>, for the same purposes described
        below. These technologies let a website recognise your device and remember information
        about your visit, such as whether you are logged in.
      </p>

      <h2>3. Lawful basis for using cookies</h2>
      <p>
        We rely on <strong>your consent</strong> for non-essential Cookies, obtained through the
        cookie banner described in Section 5, and on our <strong>legitimate interest</strong> in
        operating a secure and functional Platform for Strictly Necessary Cookies, which do not
        require consent under the Data Protection Laws.
      </p>

      <h2>4. Categories of cookies we use</h2>
      <h3>4.1 Strictly necessary</h3>
      <p>
        Required for the Platform to function and cannot be switched off. These include your
        session or login token, stored in your browser so you stay logged in, and a record of
        your cookie consent choice itself.
      </p>
      <h3>4.2 Functional</h3>
      <p>
        Remember your preferences, such as filters you have applied while browsing Events, to
        make your next visit more convenient.
      </p>
      <h3>4.3 Analytics</h3>
      <p>
        Help us understand how the Platform is used, for example which Events are viewed most and
        which pages have errors, so we can improve it. Where used, analytics data is aggregated
        and is <strong>not</strong> used to personally identify you for marketing purposes.
      </p>
      <h3>4.4 Payment-related</h3>
      <p>
        Used during checkout to track the status of an in-progress M-Pesa payment so we can show
        you up-to-date confirmation without requiring you to refresh the page.
      </p>

      <h2>5. Cookies we do not use</h2>
      <p>
        We do <strong>not</strong> use third-party advertising Cookies, and we do{' '}
        <strong>not</strong> sell information collected through Cookies to advertisers.
      </p>

      <h2>6. Managing your cookie preferences</h2>
      <p>
        When you first visit the Platform, you will see a cookie banner where you can accept all
        Cookies or continue with only Strictly Necessary Cookies. You can change your mind at any
        time by clearing your browser&apos;s site data for TicketFlow Kenya, which will show the
        banner again on your next visit. Most browsers also let you block or delete Cookies
        directly in their settings; note that blocking Strictly Necessary Cookies or storage will
        prevent you from staying logged in or completing a purchase.
      </p>

      <h2>7. Third-party cookies</h2>
      <p>
        Some functionality is provided by third parties who may set their own Cookies when their
        component is active on the page, for example:
      </p>
      <ul>
        <li>Our payment provider, Safaricom M-Pesa Daraja, during checkout.</li>
        <li>
          Camera and QR-scanning libraries used on the Organizer&apos;s gate-scanning page, which
          run entirely in your browser and do not transmit images anywhere other than to our
          check-in API as decoded Ticket codes.
        </li>
      </ul>

      <h2>8. Retention of cookie data</h2>
      <p>
        Strictly Necessary Cookies generally expire at the end of your Session or when you log
        out. Functional and analytics Cookies, where enabled, persist for a limited period defined
        by their purpose, after which they expire automatically.
      </p>

      <h2>9. Changes to this Policy</h2>
      <p>
        We may update this Cookie Policy as the technologies we use evolve. Continued use of the
        Platform after an update constitutes acceptance of the revised Policy.
      </p>

      <h2>10. Contact us</h2>
      <p>
        Questions about this Cookie Policy can be sent to <strong>privacy@ticketflow.co.ke</strong>.
      </p>
    </LegalLayout>
  );
}
