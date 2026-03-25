import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compulocks Sync Platform",
  description: "Source-agnostic design system sync dashboard",
};

const navLinks = [
  { href: "/", label: "Sync Matrix" },
  { href: "/sources", label: "Sources" },
  { href: "/log", label: "Activity Log" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <nav style={{
            width: 220,
            background: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
            padding: "24px 0",
            flexShrink: 0,
          }}>
            <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                Compulocks
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Sync Platform</div>
            </div>
            <ul style={{ listStyle: "none", padding: "16px 0" }}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    style={{
                      display: "block",
                      padding: "8px 20px",
                      color: "var(--color-text-muted)",
                      fontSize: 13,
                      transition: "color 0.1s",
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <main style={{ flex: 1, padding: "32px 40px", overflow: "auto" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
