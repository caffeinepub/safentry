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

  // Check lock on emp code change
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
    } catch {
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
      // Check if PIN is set
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

  // PIN verify step
  if (step === "pin-verify" && employeeData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            data-ocid="employee_auth.back.button"
            onClick={() => {
              setStep("tabs");
              setPin("");
              setPinError("");
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display font-semibold text-foreground text-sm">
            PIN Doğrulama
          </h1>
        </header>
        <div className="flex-1 flex items-start justify-center p-6 pt-12">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="font-display font-semibold text-foreground">
                  PIN Girin
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {employeeData.name} {employeeData.surname} · PIN doğrulaması
                  gerekiyor
                </p>
              </div>
              <form onSubmit={handlePinVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="pin-input"
                    className="block text-sm font-medium text-foreground"
                  >
                    PIN (4-6 rakam)
                  </label>
                  <input
                    id="pin-input"
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
                    className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground text-center tracking-widest text-lg"
                  />
                  {pinError && (
                    <p
                      data-ocid="employee_auth.pin.error_state"
                      className="text-xs text-red-600"
                    >
                      {pinError}
                    </p>
                  )}
                </div>
                <button
                  data-ocid="employee_auth.pin.submit_button"
                  type="submit"
                  disabled={loading || !pin.trim()}
                  className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 text-sm"
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
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            data-ocid="employee_auth.back.button"
            onClick={() => setStep("tabs")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display font-semibold text-foreground text-sm">
            Şirket Seçin
          </h1>
        </header>
        <div className="flex-1 p-6 max-w-md mx-auto w-full">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5">
            <p className="text-sm text-foreground">
              Hoş geldiniz,{" "}
              <strong>
                {employeeData.name} {employeeData.surname}
              </strong>
              . Hangi şirkete giriş yapmak istiyorsunuz?
            </p>
          </div>
          {companies.length > 0 ? (
            <div className="space-y-2.5 mb-5">
              {companies.map((c, i) => (
                <button
                  type="button"
                  key={c.companyId}
                  data-ocid={`employee_auth.company.button.${i + 1}`}
                  onClick={() =>
                    selectCompany(c.companyId, c.companyName, c.role)
                  }
                  className="w-full bg-white border border-border rounded-2xl p-4 text-left hover:border-primary/40 hover:shadow-card transition-all group"
                >
                  <div className="font-display font-medium text-foreground">
                    {c.companyName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {roleLabel(c.role)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-amber-800">
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="employee_auth.back.button"
          onClick={() => onNavigate("landing")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-emerald-600" />
          <h1 className="font-display font-semibold text-foreground text-sm">
            Personel Kayıt / Giriş
          </h1>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-md">
          <div className="flex bg-muted rounded-xl p-1 mb-6 gap-1">
            <button
              type="button"
              data-ocid="employee_auth.login.tab"
              onClick={() => setTab("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "login"
                  ? "bg-white shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              data-ocid="employee_auth.register.tab"
              onClick={() => setTab("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "register"
                  ? "bg-white shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {tab === "login" && (
            <form
              onSubmit={handleLogin}
              className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="ea-emp-code"
                  className="block text-sm font-medium text-foreground"
                >
                  Personel Kodu (8 hane)
                </label>
                <input
                  id="ea-emp-code"
                  data-ocid="employee_auth.emp_code.input"
                  value={empCode}
                  onChange={(e) => {
                    setEmpCode(e.target.value);
                    setLockMessage(null);
                  }}
                  placeholder="Personel kodunuzu girin"
                  maxLength={8}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {lockMessage && (
                <div
                  data-ocid="employee_auth.lock.error_state"
                  className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  <Clock className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{lockMessage}</p>
                </div>
              )}
              <button
                data-ocid="employee_auth.login.submit_button"
                type="submit"
                disabled={loading || !!lockMessage}
                className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>
          )}

          {tab === "register" && !regResult && (
            <form
              onSubmit={handleRegister}
              className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="ea-reg-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Ad
                </label>
                <input
                  id="ea-reg-name"
                  data-ocid="employee_auth.reg_name.input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Adınız"
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ea-reg-surname"
                  className="block text-sm font-medium text-foreground"
                >
                  Soyad
                </label>
                <input
                  id="ea-reg-surname"
                  data-ocid="employee_auth.reg_surname.input"
                  value={regSurname}
                  onChange={(e) => setRegSurname(e.target.value)}
                  placeholder="Soyadınız"
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                data-ocid="employee_auth.register.submit_button"
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Kaydediliyor..." : "Personel Kaydı Oluştur"}
              </button>
            </form>
          )}

          {tab === "register" && regResult && (
            <div className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="font-display font-semibold text-foreground">
                  Kayıt Başarılı!
                </h2>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                  Personel Kodunuz (8 hane)
                </div>
                <div className="font-mono text-2xl font-bold text-emerald-900 tracking-widest mt-1">
                  {regResult}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">
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
                className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-800 transition-colors text-sm"
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
