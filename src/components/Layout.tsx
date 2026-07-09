import { BookOpenCheck, Download, LayoutDashboard, Moon, Settings, Sun, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LoginPanel } from "./LoginPanel";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Overview", to: "/" },
      { label: "Analyse", to: "/analyse" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Exports", to: "/exports" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Features", to: "/features" },
      { label: "Use cases", to: "/use-cases" },
      { label: "Docs", to: "/docs" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Security", to: "/security" },
      { label: "History", to: "/history" },
      { label: "Settings", to: "/settings" },
      { label: "Account", to: "/account" },
    ],
  },
];

export function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem("chemvault_lab_theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("chemvault_lab_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-container nav-shell">
          <NavLink to="/" className="brand" aria-label="ChemVault Lab home">
            <span className="brand-mark">
              <img src="/assets/chemvault-logo-mark.png" alt="" />
            </span>
            <span>
              <strong>ChemVault Lab</strong>
              <small>LabVault notebook extraction</small>
            </span>
          </NavLink>

          <nav className="site-nav" aria-label="Primary navigation">
            <NavLink to="/" end>
              <BookOpenCheck size={16} />
              Overview
            </NavLink>
            <NavLink to="/dashboard">
              <LayoutDashboard size={16} />
              Dashboard
            </NavLink>
            <NavLink to="/analyse">
              <UploadCloud size={16} />
              Analyse
            </NavLink>
            <NavLink to="/documents">
              <BookOpenCheck size={16} />
              Documents
            </NavLink>
            <NavLink to="/exports">
              <Download size={16} />
              Exports
            </NavLink>
            <NavLink to="/settings">
              <Settings size={16} />
              Settings
            </NavLink>
          </nav>

          <button className="icon-button" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle color mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <LoginPanel />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-container footer-shell">
          <div className="footer-main">
            <div className="footer-brand-block">
              <NavLink to="/" className="footer-brand" aria-label="ChemVault Lab home">
                <span className="footer-brand-mark">
                  <img src="/assets/chemvault-logo-mark.png" alt="" />
                </span>
                <span>
                  <strong>ChemVault Lab</strong>
                  <small>Notebook extraction workspace</small>
                </span>
              </NavLink>
              <p>
                Convert lab notebooks, handouts, and instrument tables into structured Excel, JSON, Markdown, and LaTeX
                outputs for review.
              </p>
              <div className="footer-badges" aria-label="Product safeguards">
                <span>No public file sharing</span>
                <span>Missing data flagged</span>
                <span>Environment secrets only</span>
              </div>
            </div>

            <nav className="footer-link-groups" aria-label="Footer navigation">
              {footerGroups.map((group) => (
                <div className="footer-column" key={group.title}>
                  <span className="footer-heading">{group.title}</span>
                  {group.links.map((link) => (
                    <NavLink to={link.to} key={link.to}>
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ChemVault Lab. All rights reserved.</p>
            <div className="footer-bottom-meta">
              <span>AI outputs require user verification</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
