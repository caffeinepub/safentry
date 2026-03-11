import { Shield } from "lucide-react";
import { LANGUAGES, type LangCode } from "../i18n/translations";

interface Props {
  onSelect: (lang: LangCode) => void;
}

export default function LanguageSelect({ onSelect }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "oklch(0.14 0.030 265)" }}
    >
      {/* Background decoration */}
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
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "oklch(0.62 0.18 205)" }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-1">
            <span style={{ color: "oklch(0.62 0.18 205)" }}>Safe</span>ntry
          </h1>
          <p className="text-base font-semibold text-white mt-4 mb-1">
            Select Language / Dil Seçin
          </p>
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 265)" }}>
            Choose your language to continue
          </p>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              data-ocid={`lang_select.${lang.code}.button`}
              onClick={() => onSelect(lang.code)}
              className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: "oklch(0.20 0.030 265)",
                border: "1px solid oklch(0.28 0.030 265)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "oklch(0.62 0.18 205 / 0.6)";
                e.currentTarget.style.background = "oklch(0.22 0.035 265)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "oklch(0.28 0.030 265)";
                e.currentTarget.style.background = "oklch(0.20 0.030 265)";
              }}
            >
              <span className="text-3xl" role="img" aria-label={lang.english}>
                {lang.flag}
              </span>
              <span className="text-white text-sm font-semibold leading-tight">
                {lang.native}
              </span>
              <span
                className="text-xs"
                style={{ color: "oklch(0.55 0.02 265)" }}
              >
                {lang.english}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
