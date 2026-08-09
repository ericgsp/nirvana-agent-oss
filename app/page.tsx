import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getUserRole } from "@/lib/supabase/get-role";

const cards = [
  {
    title: "Agent App",
    href: "/agent",
    description: "Generate quotation matrices for customers — search by site, product, and section, then view pricing, promos, and instalment schedules.",
    highlight: true,
  },
  {
    title: "Product Sync",
    href: "/product-sync",
    description: "Download product availability from the Nirvana portal and sync to the database.",
  },
  {
    title: "Sync Co-Pilot",
    href: "/product-sync-copilot",
    description: "Co-pilot sync — you navigate the portal, co-pilot auto-downloads and saves the availability data.",
  },
  {
    title: "Product Availability",
    href: "/product-availability",
    description: "View all lot codes synced from the Nirvana portal — filter by site, product type, zone, and available/sold status.",
  },
  {
    title: "Price List",
    href: "/price-list",
    description: "View and refine the product price list — all sites, categories, lot ranges, and pricing columns.",
  },
  {
    title: "Promo Match Rules",
    href: "/promo-match-rules",
    description: "Define and manage the rules that match promotions to available inventory lots — the single source of truth for promo matching.",
  },
  {
    title: "System Rules",
    href: "/system-rules",
    description: "Permanent processing rules — section sequences, lot code prefixes, range expansion logic. Used when transferring promo data into promo match rules.",
  },
  {
    title: "Available Inventory",
    href: "/inventory",
    description: "All available lots across all sites matched with their price list — ready for quotation.",
    highlight: "amber",
  },
  {
    title: "User Management",
    href: "/users",
    description: "Manage who can access this admin app and the agent app — assign Admin or Agent roles to each user.",
  },
  {
    title: "Audit Log",
    href: "/audit-log",
    description: "View all login attempts and auth events — who signed in, when, from which IP, and whether it succeeded.",
  },
];

export default async function HomePage() {
  const role = await getUserRole();
  if (role !== "admin") redirect("/agent");
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        padding: "40px 28px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: "32px",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Local administration application
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 4vw, 44px)",
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
              }}
            >
              Nirvana Quotation Administration
            </h1>
            <form action={logoutAction} style={{ flexShrink: 0, marginTop: "6px" }}>
              <button
                type="submit"
                style={{
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: "#64748b",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Sign out
              </button>
            </form>
          </div>

          <p
            style={{
              maxWidth: "760px",
              margin: "16px 0 0",
              color: "#475569",
              fontSize: "15px",
              lineHeight: 1.7,
            }}
          >
            Use this page as the admin navigation center. Start with Promo Auto Creation for monthly memo extraction, then maintain parser rules in Promo Parser Rules when extraction behavior needs adjustment.
          </p>
        </div>

        <section
          style={{
            marginTop: "28px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "18px",
          }}
        >
          {cards.map((card) => {
            const h = (card as any).highlight;
            const cardStyle = {
              display: "block",
              minHeight: "154px",
              borderRadius: "20px",
              border: h === true ? "2px solid #25D366" : h === "amber" ? "2px solid #f59e0b" : "1px solid #e2e8f0",
              background: h === true ? "#f0fdf4" : h === "amber" ? "#fffbeb" : "#ffffff",
              padding: "22px",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              touchAction: "manipulation",
              boxShadow: h === true ? "0 12px 30px rgba(37, 211, 102, 0.15)" : h === "amber" ? "0 12px 30px rgba(245, 158, 11, 0.15)" : "0 12px 30px rgba(15, 23, 42, 0.05)",
            } as React.CSSProperties;
            const cardInner = (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <h2 style={{ margin: 0, fontSize: "18px", letterSpacing: "-0.02em" }}>{card.title}</h2>
                  <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "999px", background: "#f1f5f9", color: "#334155", fontSize: "18px", fontWeight: 700 }}>→</span>
                </div>
                <p style={{ margin: "14px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.6 }}>{card.description}</p>
              </>
            );
            // Agent App must use a plain <a> (hard navigation) so agent-app.js
            // re-executes. Next.js <Link> does soft nav which skips script tags.
            return card.href === "/agent"
              ? <a key={card.href} href={card.href} style={cardStyle}>{cardInner}</a>
              : <Link key={card.href} href={card.href} style={cardStyle}>{cardInner}</Link>;
          })}
        </section>

        <section
          style={{
            marginTop: "24px",
            borderRadius: "20px",
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            padding: "20px 22px",
            color: "#1e3a8a",
          }}
        >
          <strong style={{ display: "block", marginBottom: "6px" }}>
            Monthly promo workflow
          </strong>
          <span style={{ fontSize: "14px", lineHeight: 1.6 }}>
            Receive PDF memo from Nirvana → extract promotion data → insert rules into Promo Match Rules → verify in the agent app.
          </span>
        </section>
      </section>
    </main>
  );
}
