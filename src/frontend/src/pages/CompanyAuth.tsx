import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

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
    } catch {
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
    setLoading(true);
    try {
      const company = await backend.loginCompany(loginCode.trim());
      if (!company) {
        toast.error("Geçersiz giriş kodu");
        return;
      }
      sessionStorage.setItem("safentry_company", JSON.stringify(company));
      onNavigate("company-dashboard");
    } catch {
      toast.error("Giriş sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="company_auth.back.button"
          onClick={() => onNavigate("landing")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h1 className="font-display font-semibold text-foreground text-sm">
            İşyeri Kayıt / Giriş
          </h1>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="flex bg-muted rounded-xl p-1 mb-6 gap-1">
            <button
              type="button"
              data-ocid="company_auth.login.tab"
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
              data-ocid="company_auth.register.tab"
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
                  htmlFor="ca-login-code"
                  className="block text-sm font-medium text-foreground"
                >
                  Şirket Giriş Kodu
                </label>
                <input
                  id="ca-login-code"
                  data-ocid="company_auth.login_code.input"
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="12 haneli giriş kodunuz"
                  maxLength={12}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                data-ocid="company_auth.login.submit_button"
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
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
                <div key={f.id} className="space-y-1.5">
                  <label
                    htmlFor={f.id}
                    className="block text-sm font-medium text-foreground"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    data-ocid={f.ocid}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              ))}
              <button
                data-ocid="company_auth.register.submit_button"
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm mt-1"
              >
                {loading ? "Kaydediliyor..." : "Şirketi Kaydet"}
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
                  Şirket Kaydedildi!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aşağıdaki kodları güvenli bir yere kaydedin.
                </p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Şirket Kodu (11 hane)
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground tracking-widest">
                    {regResult.companyId}
                  </div>
                </div>
                <div className="border-t border-primary/10 pt-3">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Giriş Kodu (12 hane)
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground tracking-widest">
                    {regResult.loginCode}
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800">
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
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
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
