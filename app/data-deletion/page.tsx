export const metadata = {
  title: "Data Deletion Request — Supamobily",
};

const G_DARK = "#1e3a5f";

export default function DataDeletionPage() {
  return (
    <main style={{ background: "#fff", minHeight: "100dvh", overscrollBehavior: "auto" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 20px 60px", color: "#1f2937", lineHeight: 1.65, fontSize: "15px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: G_DARK, marginBottom: "4px" }}>Data Deletion Request — Supamobily</h1>
        <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "24px" }}><strong>Last updated: 22 August 2026</strong></p>

        <p>
          Supamobily is DG Life Planning Sdn Bhd&apos;s internal sales app for its sales agents.
          This page explains how to request deletion of your data.
        </p>

        <h2 style={sec}>How to Request Deletion</h2>
        <p>
          Email <strong>ericgan.s.p@gmail.com</strong> from the email address associated with your
          Supamobily account, with the subject line &ldquo;Data Deletion Request.&rdquo; Include your
          full name and the phone number or email used to log in. We will confirm your identity and
          process the request.
        </p>

        <h2 style={sec}>What Gets Deleted</h2>
        <p>Upon a verified request, the following will be deleted from our systems:</p>
        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
          <li>Your account login credentials and device binding</li>
          <li>Your personal profile information</li>
          <li>Push notification tokens associated with your account</li>
        </ul>

        <h2 style={sec}>What May Be Retained, and Why</h2>
        <p>
          Some records cannot be deleted immediately upon request, because they form part of the
          company&apos;s business and financial records:
        </p>
        <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
          <li>
            <strong>Quotation and sales records</strong> (products quoted, prices, promotions,
            closed sales, and associated customer name/phone number) are retained for commission
            reconciliation, sales reporting, and standard business record-keeping purposes, in line
            with the retention period described in our{" "}
            <a href="/privacy" style={{ color: G_DARK }}>Privacy Policy</a>.
          </li>
          <li>
            <strong>Security and audit logs</strong> (login attempts, device changes) are retained
            for account security purposes and are not deleted on request while your account remains
            part of an active security investigation, if applicable.
          </li>
        </ul>
        <p>
          These records are deleted or anonymized once they are no longer required for the business
          or legal purposes above. If you have questions about the retention of a specific record,
          include this in your deletion request email.
        </p>

        <h2 style={sec}>Contact Us</h2>
        <p>
          For any questions about this process, contact <strong>ericgan.s.p@gmail.com</strong>.
        </p>
      </div>
    </main>
  );
}

const sec: React.CSSProperties = { fontSize: "17px", fontWeight: 700, color: G_DARK, marginTop: "28px", marginBottom: "6px" };
