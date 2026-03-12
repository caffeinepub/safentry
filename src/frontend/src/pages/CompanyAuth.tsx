import { ArrowLeft, Building2, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

function getLockInfo(key: string): { count: number; lockedUntil: number } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function setLockInfo(key: string, count: number, lockedUntil: number) {
  localStorage.setItem(key, JSON.stringify({ count, lockedUntil }));
}

function clearLockInfo(key: string) {
  localStorage.removeItem(key);
}

function getLockMessage(lockedUntil: number): string | null {
  const remaining = lockedUntil - Date.now();
  if (remaining <= 0) return null;
  const mins = Math.ceil(remaining / 60000);
  return `Hesabınız kilitlendi. ${mins} dakika sonra tekrar deneyin.`;
}

const BG = "oklch(0.13 0.035 262)";
const CARD_BG = "oklch(0.19 0.042 258)";
const CARD_BORDER = "oklch(0.28 0.048 255)";
const MUTED_BG = "oklch(0.17 0.03 260)";
const INPUT_BG = "oklch(0.15 0.028 260)";
const INPUT_BORDER = "oklch(0.28 0.048 255)";
const TEXT_MAIN = "oklch(0.95 0.008 250)";
const TEXT_MUTED = "oklch(0.62 0.03 250)";
const TEAL = "oklch(0.72 0.18 195)";
const TEAL_DIM = "oklch(0.72 0.18 195 / 0.15)";
const TEAL_BORDER = "oklch(0.72 0.18 195 / 0.35)";
const AMBER = "oklch(0.82 0.16 80)";
const AMBER_DIM = "oklch(0.82 0.16 80 / 0.12)";
const AMBER_BORDER = "oklch(0.82 0.16 80 / 0.35)";

export default function CompanyAuth({ onNavigate }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [regName, setRegName] = useState("");
  const [regSector, setRegSector] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regResult, setRegResult] = useState<{
    companyId: string;
    loginCode: string;
  } | null>(null);
  const [loginCode, setLoginCode] = useState("");
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regSector || !regAddress || !regContact) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    setLoading(true);
    try {
      const result = await backend.registerCompany(
        regName,
        regSector,
        regAddress,
        regContact,
      );
      setRegResult(result);
    } catch (err) {
      console.error("registerCompany error:", err);
      toast.error("Kayıt sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim()) {
      toast.error("Lütfen giriş kodunu girin");
      return;
    }
    const lockKey = `login_attempts_company_${loginCode.trim()}`;
    const info = getLockInfo(lockKey);
    const lockMsg = getLockMessage(info.lockedUntil);
    if (lockMsg) {
      setLockMessage(lockMsg);
      return;
    }
    setLoading(true);
    try {
      const company = await backend.loginCompany(loginCode.trim());
      if (!company) {
        const newCount = info.count + 1;
        const lockedUntil = newCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
        setLockInfo(lockKey, newCount, lockedUntil);
        if (newCount >= 5) {
          setLockMessage("Hesabınız 15 dakika boyunca kilitlendi.");
        } else {
          toast.error(
            `Geçersiz giriş kodu (${5 - newCount} deneme hakkınız kaldı)`,
          );
        }
        return;
      }
      clearLockInfo(lockKey);
      sessionStorage.setItem("safentry_company", JSON.stringify(company));
      onNavigate("company-dashboard");
    } catch {
      toast.error("Giriş sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: "0.75rem",
    padding: "0.625rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    background: INPUT_BG,
    color: TEXT_MAIN,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "oklch(0.16 0.038 260 / 0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${CARD_BORDER}`,
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          type="button"
          data-ocid="company_auth.back.button"
          onClick={() => onNavigate("landing")}
          style={{
            padding: "0.375rem",
            borderRadius: "0.5rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: TEXT_MUTED,
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "0.5rem",
              background: TEAL_DIM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 style={{ width: 14, height: 14, color: TEAL }} />
          </div>
          <span
            style={{ fontWeight: 600, color: TEXT_MAIN, fontSize: "0.875rem" }}
          >
            İşyeri Kayıt / Giriş
          </span>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "3rem 1.5rem 1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 448 }}>
          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              background: MUTED_BG,
              borderRadius: "0.875rem",
              padding: "0.25rem",
              marginBottom: "1.5rem",
              gap: "0.25rem",
            }}
          >
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                data-ocid={`company_auth.${t}.tab`}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: tab === t ? 600 : 400,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: tab === t ? TEAL_DIM : "transparent",
                  color: tab === t ? TEAL : TEXT_MUTED,
                  outline: tab === t ? `1px solid ${TEAL_BORDER}` : "none",
                }}
              >
                {t === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </button>
            ))}
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form
              onSubmit={handleLogin}
              style={{
                background: CARD_BG,
                borderRadius: "1rem",
                border: `1px solid ${CARD_BORDER}`,
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: TEXT_MAIN,
                  }}
                >
                  Şirket Giriş Kodu
                </div>
                <input
                  data-ocid="company_auth.login_code.input"
                  type="text"
                  value={loginCode}
                  onChange={(e) => {
                    setLoginCode(e.target.value);
                    setLockMessage(null);
                  }}
                  placeholder="12 haneli giriş kodunuz"
                  maxLength={12}
                  style={{
                    ...inputStyle,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                />
              </div>
              {lockMessage && (
                <div
                  data-ocid="company_auth.lock.error_state"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    background: "oklch(0.4 0.18 15 / 0.12)",
                    border: "1px solid oklch(0.62 0.22 15 / 0.35)",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                  }}
                >
                  <Clock
                    style={{
                      width: 14,
                      height: 14,
                      color: "oklch(0.62 0.22 15)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "oklch(0.82 0.12 15)",
                      margin: 0,
                    }}
                  >
                    {lockMessage}
                  </p>
                </div>
              )}
              <button
                data-ocid="company_auth.login.submit_button"
                type="submit"
                disabled={loading || !!lockMessage}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background:
                    loading || lockMessage
                      ? "oklch(0.72 0.18 195 / 0.4)"
                      : TEAL,
                  color: "oklch(0.12 0.04 250)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: loading || lockMessage ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>
          )}

          {/* Register form */}
          {tab === "register" && !regResult && (
            <form
              onSubmit={handleRegister}
              style={{
                background: CARD_BG,
                borderRadius: "1rem",
                border: `1px solid ${CARD_BORDER}`,
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {[
                {
                  id: "ca-reg-name",
                  label: "Şirket Adı",
                  value: regName,
                  setter: setRegName,
                  placeholder: "Şirket adını girin",
                  ocid: "company_auth.reg_name.input",
                },
                {
                  id: "ca-reg-sector",
                  label: "Sektör",
                  value: regSector,
                  setter: setRegSector,
                  placeholder: "Teknoloji, İnşaat, Sağlık...",
                  ocid: "company_auth.reg_sector.input",
                },
                {
                  id: "ca-reg-address",
                  label: "Adres",
                  value: regAddress,
                  setter: setRegAddress,
                  placeholder: "Şirket adresi",
                  ocid: "company_auth.reg_address.input",
                },
                {
                  id: "ca-reg-contact",
                  label: "Yetkili Kişi Adı",
                  value: regContact,
                  setter: setRegContact,
                  placeholder: "Yetkili kişinin adı soyadı",
                  ocid: "company_auth.reg_contact.input",
                },
              ].map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: TEXT_MAIN,
                    }}
                  >
                    {f.label}
                  </div>
                  <input
                    id={f.id}
                    data-ocid={f.ocid}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <button
                data-ocid="company_auth.register.submit_button"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: loading ? "oklch(0.72 0.18 195 / 0.4)" : TEAL,
                  color: "oklch(0.12 0.04 250)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: "0.25rem",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Kaydediliyor..." : "Şirketi Kaydet"}
              </button>
            </form>
          )}

          {/* Register success */}
          {tab === "register" && regResult && (
            <div
              style={{
                background: CARD_BG,
                borderRadius: "1rem",
                border: `1px solid ${CARD_BORDER}`,
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "oklch(0.68 0.19 150 / 0.15)",
                    borderRadius: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.75rem",
                  }}
                >
                  <CheckCircle2
                    style={{
                      width: 24,
                      height: 24,
                      color: "oklch(0.68 0.19 150)",
                    }}
                  />
                </div>
                <h2
                  style={{
                    fontWeight: 700,
                    color: TEXT_MAIN,
                    fontSize: "1rem",
                    margin: 0,
                  }}
                >
                  Şirket Kaydedildi!
                </h2>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: TEXT_MUTED,
                    marginTop: "0.25rem",
                  }}
                >
                  Aşağıdaki kodları güvenli bir yere kaydedin.
                </p>
              </div>
              <div
                style={{
                  background: TEAL_DIM,
                  border: `1px solid ${TEAL_BORDER}`,
                  borderRadius: "0.875rem",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: TEAL,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Şirket Kodu (11 hane)
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: TEXT_MAIN,
                      letterSpacing: "0.15em",
                    }}
                  >
                    {regResult.companyId}
                  </div>
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${TEAL_BORDER}`,
                    paddingTop: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: TEAL,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Giriş Kodu (12 hane)
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: TEXT_MAIN,
                      letterSpacing: "0.15em",
                    }}
                  >
                    {regResult.loginCode}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: AMBER_DIM,
                  border: `1px solid ${AMBER_BORDER}`,
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: AMBER, margin: 0 }}>
                  ⚠️ Bu kodları kaydediniz! Şirket girişi için Giriş Kodu'nu
                  kullanın.
                </p>
              </div>
              <button
                type="button"
                data-ocid="company_auth.goto_login.button"
                onClick={() => {
                  setTab("login");
                  setRegResult(null);
                }}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: TEAL,
                  color: "oklch(0.12 0.04 250)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Giriş Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
