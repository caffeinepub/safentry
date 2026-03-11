import { useEffect, useRef, useState } from "react";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import { LANGUAGES, type LangCode } from "./i18n/translations";
import CompanyAuth from "./pages/CompanyAuth";
import CompanyDashboard from "./pages/CompanyDashboard";
import DocumentVerify from "./pages/DocumentVerify";
import EmployeeAuth from "./pages/EmployeeAuth";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import InviteForm from "./pages/InviteForm";
import Landing from "./pages/Landing";
import LanguageSelect from "./pages/LanguageSelect";

export type Screen =
  | "landing"
  | "company-auth"
  | "employee-auth"
  | "document-verify"
  | "company-dashboard"
  | "employee-dashboard"
  | "invite-form";

export interface SessionCompany {
  companyId: string;
  loginCode: string;
  name: string;
  sector: string;
  address: string;
  contactPersonName: string;
}

export interface SessionEmployee {
  employeeId: string;
  name: string;
  surname: string;
}

export interface SessionEmployeeCompany {
  companyId: string;
  companyName: string;
  role: "owner" | "authorized" | "registrar";
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language);

  return (
    <div
      ref={ref}
      className="fixed top-3 right-3 z-50"
      data-ocid="lang_switcher.panel"
    >
      <button
        type="button"
        data-ocid="lang_switcher.toggle.button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-lg transition-all"
        style={{
          background: "oklch(0.22 0.030 265)",
          border: "1px solid oklch(0.32 0.030 265)",
          color: "white",
        }}
        title="Change language"
      >
        <span className="text-base">{current?.flag}</span>
        <span className="hidden sm:inline">{language.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-52 rounded-2xl shadow-xl overflow-hidden"
          style={{
            background: "oklch(0.18 0.030 265)",
            border: "1px solid oklch(0.28 0.030 265)",
          }}
          data-ocid="lang_switcher.dropdown_menu"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              data-ocid={`lang_switcher.${lang.code}.button`}
              onClick={() => {
                setLanguage(lang.code as LangCode);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
              style={{
                background:
                  lang.code === language
                    ? "oklch(0.62 0.18 205 / 0.15)"
                    : "transparent",
                color:
                  lang.code === language
                    ? "oklch(0.78 0.14 205)"
                    : "oklch(0.75 0.02 265)",
              }}
              onMouseEnter={(e) => {
                if (lang.code !== language)
                  e.currentTarget.style.background = "oklch(0.24 0.030 265)";
              }}
              onMouseLeave={(e) => {
                if (lang.code !== language)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.native}</span>
              {lang.code === language && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>("landing");
  const { hasSelectedLanguage, setLanguage } = useLanguage();
  const [langSelected, setLangSelected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("invite")) {
      setScreen("invite-form");
    }
  }, []);

  // Show language selection on first visit
  if (!hasSelectedLanguage && !langSelected) {
    return (
      <LanguageSelect
        onSelect={(lang) => {
          setLanguage(lang);
          setLangSelected(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LanguageSwitcher />
      {screen === "landing" && <Landing onNavigate={setScreen} />}
      {screen === "company-auth" && <CompanyAuth onNavigate={setScreen} />}
      {screen === "employee-auth" && <EmployeeAuth onNavigate={setScreen} />}
      {screen === "document-verify" && (
        <DocumentVerify onNavigate={setScreen} />
      )}
      {screen === "company-dashboard" && (
        <CompanyDashboard onNavigate={setScreen} />
      )}
      {screen === "employee-dashboard" && (
        <EmployeeDashboard onNavigate={setScreen} />
      )}
      {screen === "invite-form" && <InviteForm />}
      <Toaster richColors />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
