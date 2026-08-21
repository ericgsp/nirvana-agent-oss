export const metadata = {
  title: "Privacy Policy — Supamobily",
};

const G_DARK = "#1e3a5f";

export default function PrivacyPolicyPage() {
  return (
    <main style={{ background: "#fff", minHeight: "100dvh", overscrollBehavior: "auto" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 20px 60px", color: "#1f2937", lineHeight: 1.65, fontSize: "15px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: G_DARK, marginBottom: "4px" }}>Privacy Policy — Supamobily</h1>
        <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "24px" }}><strong>Last updated: 21 August 2026</strong></p>

        <p>
          Supamobily (&ldquo;the App&rdquo;) is an internal sales tool for DG Group Sdn Bhd
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) sales agents. This policy
          explains what information the App collects, how it&apos;s used, and how it&apos;s
          protected. The App is not available to the general public &mdash; access is
          restricted to authorized sales agents with a company-issued login.
        </p>

        <h2 style={sec}>Information We Collect</h2>
        <p><strong>Account information.</strong> Your login credentials (assigned by the company) and a device identifier used to bind your account to a single device, for account security.</p>
        <p><strong>Customer information you enter.</strong> When you create a quotation or lead, you may enter a customer&apos;s name and phone number. This is used solely to generate quotations, track leads, and enable you to contact the customer (e.g. via WhatsApp) &mdash; it is not shared with third parties.</p>
        <p><strong>Phone contacts.</strong> With your permission, the App can read your phone&apos;s contact list so you can link an existing contact to a lead, instead of retyping their details. The App does not modify, delete, or write to your contacts, and does not access contacts unless you grant this permission.</p>
        <p><strong>Quotation and sales data.</strong> Products quoted, prices, promotions applied, and sales you close are recorded and associated with your agent account, for commission tracking, sales reporting, and quota calculation.</p>
        <p><strong>Push notification token.</strong> If you enable notifications, a device token is generated (via Firebase Cloud Messaging) so the App can send you alerts about sales activity. This token is not used for advertising.</p>
        <p><strong>Usage and security logs.</strong> Login attempts, device changes, and key actions are logged for account security and audit purposes.</p>

        <h2 style={sec}>How We Use This Information</h2>
        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
          <li>To provide the App&apos;s core functionality: generating quotations, tracking leads, and recording sales.</li>
          <li>To secure your account (device binding, audit logging of suspicious login activity).</li>
          <li>To calculate sales performance, commissions, and quotas.</li>
          <li>To send you activity notifications, if enabled.</li>
        </ul>
        <p>We do not sell your information or the information of your customers to third parties. We do not use this data for advertising.</p>

        <h2 style={sec}>Data Storage and Security</h2>
        <p>App data is stored on secured cloud infrastructure (Supabase) and served via Vercel. Access is restricted to authorized company personnel and the agent&apos;s own account.</p>

        <h2 style={sec}>Data Retention</h2>
        <p>Quotation, lead, and sales records are retained for as long as your agent account is active, for business record-keeping and commission-reconciliation purposes.</p>

        <h2 style={sec}>Your Choices</h2>
        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
          <li>Contacts permission can be denied or revoked at any time in your device settings; the App remains usable without it (you&apos;ll just need to type customer details manually).</li>
          <li>Notification permission can be denied or revoked at any time in your device settings.</li>
        </ul>

        <h2 style={sec}>Children&apos;s Privacy</h2>
        <p>The App is an internal business tool for adult sales agents and is not directed at, or knowingly used by, children.</p>

        <h2 style={sec}>Changes to This Policy</h2>
        <p>We may update this policy from time to time. Material changes will be communicated to agents directly.</p>

        <h2 style={sec}>Contact Us</h2>
        <p>If you have questions about this privacy policy or how your data is handled, contact: <strong>ericgan.s.p@gmail.com</strong></p>
      </div>
    </main>
  );
}

const sec: React.CSSProperties = { fontSize: "17px", fontWeight: 700, color: G_DARK, marginTop: "28px", marginBottom: "6px" };
