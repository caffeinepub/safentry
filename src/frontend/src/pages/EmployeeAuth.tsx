import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

type Step = "tabs" | "pin-verify" | "select-company";

interface EmployeeData {
  employeeId: string;
  name: string;
  surname: string;
}

interface CompanyOption {
  companyId: string;
  companyName: string;
  role: string;
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
  return `Hesabınız ${mins} dakika boyunca kilitlendi. Lütfen ${mins} dakika sonra tekrar deneyin.`;
}

const BG = "oklch(0.13 0.035 262)";
const CARD_BG = "oklch(0.19 0.042 258)";
const CARD_BORDER = "oklch(0.28 0.048 255)";
const MUTED_BG = "oklch(0.17 0.03 260)";
const INPUT_BG = "oklch(0.15 0.028 260)";
const INPUT_BORDER = "oklch(0.28 0.048 255)";
const TEXT_MAIN = "oklch(0.95 0.008 250)";
const TEXT_MUTED = "oklch(0.62 0.03 250)";
const EMERALD = "oklch(0.68 0.19 150)";
const EMERALD_DIM = "oklch(0.68 0.19 150 / 0.15)";
const EMERALD_BORDER = "oklch(0.68 0.19 150 / 0.35)";
const AMBER = "oklch(0.82 0.16 80)";
const AMBER_DIM = "oklch(0.82 0.16 80 / 0.12)";
const AMBER_BORDER = "oklch(0.82 0.16 80 / 0.35)";
const TEAL_DIM = "oklch(0.72 0.18 195 / 0.12)";
const TEAL_BORDER = "oklch(0.72 0.18 195 / 0.3)";

export default function EmployeeAuth({ onNavigate }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<Step>("tabs");
  const [loading, setLoading] = useState(false);
  const [regName, setRegName] = useState("");
  const [regSurname, setRegSurname] = useState("");
  const [regResult, setRegResult] = useState<string | null>(null);
  const [empCode, setEmpCode] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!empCode.trim()) {
      setLockMessage(null);
      return;
    }
    const info = getLockInfo(`login_attempts_employee_${empCode.trim()}`);
    setLockMessage(getLockMessage(info.lockedUntil));
  }, [empCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regSurname) {
      toast.error("Lütfen ad ve soyadı girin");
      return;
    }
    setLoading(true);
    try {
      const result = await backend.registerEmployee(regName, regSurname);
      setRegResult(result);
    } catch (err) {
      console.error("registerEmployee error:", err);
      toast.error("Kayıt sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode.trim()) {
      toast.error("Lütfen personel kodunu girin");
      return;
    }
    const lockKey = `login_attempts_employee_${empCode.trim()}`;
    const info = getLockInfo(lockKey);
    const lockMsg = getLockMessage(info.lockedUntil);
    if (lockMsg) {
      setLockMessage(lockMsg);
      return;
    }
    setLoading(true);
    try {
      const emp = await backend.loginEmployee(empCode.trim());
      if (!emp) {
        const newCount = info.count + 1;
        const lockedUntil = newCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
        setLockInfo(lockKey, newCount, lockedUntil);
        if (newCount >= 5) {
          setLockMessage(
            "Hesabınız 15 dakika boyunca kilitlendi. 15 dakika sonra tekrar deneyin.",
          );
        } else {
          toast.error(
            `Geçersiz personel kodu (${5 - newCount} deneme hakkınız kaldı)`,
          );
        }
        return;
      }
      clearLockInfo(lockKey);
      const histKey = `login_history_${emp.employeeId}`;
      const prevHistory = JSON.parse(
        localStorage.getItem(histKey) || "[]",
      ) as string[];
      prevHistory.push(new Date().toISOString());
      if (prevHistory.length > 20)
        prevHistory.splice(0, prevHistory.length - 20);
      localStorage.setItem(histKey, JSON.stringify(prevHistory));
      setEmployeeData({
        employeeId: emp.employeeId,
        name: emp.name,
        surname: emp.surname,
      });
      const myCompanies = await backend.getMyCompanies(emp.employeeId);
      const options: CompanyOption[] = myCompanies.map(([company, role]) => ({
        companyId: company.companyId,
        companyName: company.name,
        role: role,
      }));
      setCompanies(options);
      const pinSet = localStorage.getItem(`pin_set_${emp.employeeId}`);
      if (pinSet === "1") {
        setStep("pin-verify");
      } else {
        setStep("select-company");
      }
    } catch {
      toast.error("Giriş sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !employeeData) return;
    setLoading(true);
    try {
      const valid = await backend.verifyEmployeePin(
        employeeData.employeeId,
        pin.trim(),
      );
      if (!valid) {
        setPinError("PIN yanlış, tekrar deneyin.");
        setPin("");
        return;
      }
      setPinError("");
      setStep("select-company");
    } catch {
      toast.error("PIN doğrulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (
    companyId: string,
    companyName: string,
    role: string,
  ) => {
    if (!employeeData) return;
    sessionStorage.setItem("safentry_employee", JSON.stringify(employeeData));
    sessionStorage.setItem(
      "safentry_employee_company",
      JSON.stringify({ companyId, companyName }),
    );
    sessionStorage.setItem("safentry_employee_role", role);
    onNavigate("employee-dashboard");
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

  const headerStyle: React.CSSProperties = {
    background: "oklch(0.16 0.038 260 / 0.9)",
    backdropFilter: "blur(16px)",
    borderBottom: `1px solid ${CARD_BORDER}`,
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  };

  const backBtnStyle: React.CSSProperties = {
    padding: "0.375rem",
    borderRadius: "0.5rem",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: TEXT_MUTED,
  };

  // PIN verify step
  if (step === "pin-verify" && employeeData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={headerStyle}>
          <button
            type="button"
            data-ocid="employee_auth.back.button"
            onClick={() => {
              setStep("tabs");
              setPin("");
              setPinError("");
            }}
            style={backBtnStyle}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <span
            style={{ fontWeight: 600, color: TEXT_MAIN, fontSize: "0.875rem" }}
          >
            PIN Doğrulama
          </span>
        </header>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "3rem 1.5rem",
          }}
        >
          <div style={{ width: "100%", maxWidth: 384 }}>
            <div
              style={{
                background: CARD_BG,
                borderRadius: "1rem",
                border: `1px solid ${CARD_BORDER}`,
                padding: "1.5rem",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: EMERALD_DIM,
                    borderRadius: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.75rem",
                  }}
                >
                  <KeyRound style={{ width: 24, height: 24, color: EMERALD }} />
                </div>
                <h2
                  style={{
                    fontWeight: 700,
                    color: TEXT_MAIN,
                    fontSize: "1rem",
                    margin: 0,
                  }}
                >
                  PIN Girin
                </h2>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: TEXT_MUTED,
                    marginTop: "0.25rem",
                  }}
                >
                  {employeeData.name} {employeeData.surname} · PIN doğrulaması
                  gerekiyor
                </p>
              </div>
              <form
                onSubmit={handlePinVerify}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
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
                    PIN (4-6 rakam)
                  </div>
                  <input
                    data-ocid="employee_auth.pin.input"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setPinError("");
                    }}
                    placeholder="PIN kodunuzu girin"
                    maxLength={6}
                    style={{
                      ...inputStyle,
                      textAlign: "center",
                      letterSpacing: "0.2em",
                      fontSize: "1.125rem",
                      fontFamily: "monospace",
                    }}
                  />
                  {pinError && (
                    <p
                      data-ocid="employee_auth.pin.error_state"
                      style={{
                        fontSize: "0.75rem",
                        color: "oklch(0.62 0.22 15)",
                        margin: 0,
                      }}
                    >
                      {pinError}
                    </p>
                  )}
                </div>
                <button
                  data-ocid="employee_auth.pin.submit_button"
                  type="submit"
                  disabled={loading || !pin.trim()}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: EMERALD,
                    color: "oklch(0.12 0.04 160)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Doğrulanıyor..." : "Devam Et"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "select-company" && employeeData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={headerStyle}>
          <button
            type="button"
            data-ocid="employee_auth.back.button"
            onClick={() => setStep("tabs")}
            style={backBtnStyle}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <span
            style={{ fontWeight: 600, color: TEXT_MAIN, fontSize: "0.875rem" }}
          >
            Şirket Seçin
          </span>
        </header>
        <div
          style={{
            flex: 1,
            padding: "1.5rem",
            maxWidth: 448,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div
            style={{
              background: TEAL_DIM,
              border: `1px solid ${TEAL_BORDER}`,
              borderRadius: "0.875rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: TEXT_MAIN, margin: 0 }}>
              Hoş geldiniz,{" "}
              <strong>
                {employeeData.name} {employeeData.surname}
              </strong>
              . Hangi şirkete giriş yapmak istiyorsunuz?
            </p>
          </div>
          {companies.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
                marginBottom: "1.25rem",
              }}
            >
              {companies.map((c, i) => (
                <button
                  type="button"
                  key={c.companyId}
                  data-ocid={`employee_auth.company.button.${i + 1}`}
                  onClick={() =>
                    selectCompany(c.companyId, c.companyName, c.role)
                  }
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    borderRadius: "1rem",
                    padding: "1rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = EMERALD_BORDER;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = CARD_BORDER;
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: TEXT_MAIN,
                      fontSize: "0.9375rem",
                    }}
                  >
                    {c.companyName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: TEXT_MUTED,
                      marginTop: "0.2rem",
                    }}
                  >
                    {roleLabel(c.role)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: AMBER_DIM,
                border: `1px solid ${AMBER_BORDER}`,
                borderRadius: "0.875rem",
                padding: "1rem",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: AMBER, margin: 0 }}>
                Henüz hiçbir şirkete bağlı değilsiniz. Şirket yöneticisinden
                sizi sisteme eklemesini isteyin.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={headerStyle}>
        <button
          type="button"
          data-ocid="employee_auth.back.button"
          onClick={() => onNavigate("landing")}
          style={backBtnStyle}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "0.5rem",
              background: EMERALD_DIM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserCog style={{ width: 14, height: 14, color: EMERALD }} />
          </div>
          <span
            style={{ fontWeight: 600, color: TEXT_MAIN, fontSize: "0.875rem" }}
          >
            Personel Kayıt / Giriş
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
                data-ocid={`employee_auth.${t}.tab`}
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
                  background: tab === t ? EMERALD_DIM : "transparent",
                  color: tab === t ? EMERALD : TEXT_MUTED,
                  outline: tab === t ? `1px solid ${EMERALD_BORDER}` : "none",
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
                  Personel Kodu (8 hane)
                </div>
                <input
                  data-ocid="employee_auth.emp_code.input"
                  value={empCode}
                  onChange={(e) => {
                    setEmpCode(e.target.value);
                    setLockMessage(null);
                  }}
                  placeholder="Personel kodunuzu girin"
                  maxLength={8}
                  style={{
                    ...inputStyle,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                />
              </div>
              {lockMessage && (
                <div
                  data-ocid="employee_auth.lock.error_state"
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
                data-ocid="employee_auth.login.submit_button"
                type="submit"
                disabled={loading || !!lockMessage}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: EMERALD,
                  color: "oklch(0.12 0.04 160)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
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
                  label: "Ad",
                  value: regName,
                  setter: setRegName,
                  placeholder: "Adınız",
                  ocid: "employee_auth.reg_name.input",
                },
                {
                  label: "Soyad",
                  value: regSurname,
                  setter: setRegSurname,
                  placeholder: "Soyadınız",
                  ocid: "employee_auth.reg_surname.input",
                },
              ].map((f) => (
                <div
                  key={f.label}
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
                    data-ocid={f.ocid}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <button
                data-ocid="employee_auth.register.submit_button"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: EMERALD,
                  color: "oklch(0.12 0.04 160)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  marginTop: "0.25rem",
                }}
              >
                {loading ? "Kaydediliyor..." : "Personel Kaydı Oluştur"}
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
                    background: EMERALD_DIM,
                    borderRadius: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.75rem",
                  }}
                >
                  <CheckCircle2
                    style={{ width: 24, height: 24, color: EMERALD }}
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
                  Kayıt Başarılı!
                </h2>
              </div>
              <div
                style={{
                  background: EMERALD_DIM,
                  border: `1px solid ${EMERALD_BORDER}`,
                  borderRadius: "0.875rem",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: EMERALD,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "0.375rem",
                  }}
                >
                  Personel Kodunuz (8 hane)
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: TEXT_MAIN,
                    letterSpacing: "0.2em",
                  }}
                >
                  {regResult}
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
                  ⚠️ Bu kodu kaydediniz! Giriş yapmak için kullanacaksınız.
                </p>
              </div>
              <button
                type="button"
                data-ocid="employee_auth.goto_login.button"
                onClick={() => {
                  setTab("login");
                  setRegResult(null);
                }}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: EMERALD,
                  color: "oklch(0.12 0.04 160)",
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

function roleLabel(role: string) {
  if (role === "owner") return "Şirket Sahibi";
  if (role === "authorized") return "Şirket Yetkilisi";
  return "Kayıt Personeli";
}
