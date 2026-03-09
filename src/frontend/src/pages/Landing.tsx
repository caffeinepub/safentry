import { Building2, ExternalLink, Search, Shield, UserCog } from "lucide-react";
import type { Screen } from "../App";

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function Landing({ onNavigate }: Props) {
  const year = new Date().getFullYear();
  const utmLink = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.14 0.030 265)" }}
    >
      {/* Geometric background decoration */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "oklch(0.62 0.18 205)" }}
        />
        <div
          className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: "oklch(0.62 0.18 205)" }}
        />
        {/* Decorative grid */}
        <svg
          aria-hidden="true"
          role="presentation"
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Decorative grid</title>
          <defs>
            <pattern
              id="grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Brand mark */}
        <div className="mb-3 flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.62 0.18 205)" }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
        <h1
          className="font-display text-5xl font-bold tracking-tight mb-2"
          style={{ color: "white" }}
        >
          <span style={{ color: "oklch(0.62 0.18 205)" }}>Safe</span>ntry
        </h1>
        <p className="text-sm mb-12" style={{ color: "oklch(0.65 0.03 265)" }}>
          Kurumsal Ziyaretçi Giriş Takip Sistemi
        </p>

        {/* Action cards */}
        <div className="grid gap-3 w-full max-w-sm">
          <button
            type="button"
            data-ocid="landing.company_auth.button"
            onClick={() => onNavigate("company-auth")}
            className="group flex items-center gap-4 rounded-2xl p-5 text-left transition-all"
            style={{
              background: "oklch(0.20 0.030 265)",
              border: "1px solid oklch(0.28 0.030 265)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.62 0.18 205 / 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.28 0.030 265)";
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.62 0.18 205 / 0.15)" }}
            >
              <Building2
                className="w-5 h-5"
                style={{ color: "oklch(0.62 0.18 205)" }}
              />
            </div>
            <div>
              <div className="font-display font-semibold text-white text-sm">
                İşyeri Kayıt / Giriş
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.02 265)" }}
              >
                Şirket hesabı oluşturun veya giriş yapın
              </div>
            </div>
          </button>

          <button
            type="button"
            data-ocid="landing.employee_auth.button"
            onClick={() => onNavigate("employee-auth")}
            className="group flex items-center gap-4 rounded-2xl p-5 text-left transition-all"
            style={{
              background: "oklch(0.20 0.030 265)",
              border: "1px solid oklch(0.28 0.030 265)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.55 0.16 150 / 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.28 0.030 265)";
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.55 0.16 150 / 0.15)" }}
            >
              <UserCog
                className="w-5 h-5"
                style={{ color: "oklch(0.55 0.16 150)" }}
              />
            </div>
            <div>
              <div className="font-display font-semibold text-white text-sm">
                Personel Kayıt / Giriş
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.02 265)" }}
              >
                Personel hesabı oluşturun veya giriş yapın
              </div>
            </div>
          </button>

          <button
            type="button"
            data-ocid="landing.document_verify.button"
            onClick={() => onNavigate("document-verify")}
            className="group flex items-center gap-4 rounded-2xl p-5 text-left transition-all"
            style={{
              background: "oklch(0.20 0.030 265)",
              border: "1px solid oklch(0.28 0.030 265)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.72 0.16 62 / 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.28 0.030 265)";
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.72 0.16 62 / 0.12)" }}
            >
              <Search
                className="w-5 h-5"
                style={{ color: "oklch(0.72 0.16 62)" }}
              />
            </div>
            <div>
              <div className="font-display font-semibold text-white text-sm">
                Belge Sorgulama
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.55 0.02 265)" }}
              >
                Ziyaret belgesi doğrulayın
              </div>
            </div>
          </button>
        </div>
      </main>

      <footer className="relative py-6 text-center">
        <a
          href={utmLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: "oklch(0.42 0.02 265)" }}
        >
          © {year}. Built with ♥ using caffeine.ai
          <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </div>
  );
}
