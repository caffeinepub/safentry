import { ArrowLeft, CheckCircle2, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

type Step = "tabs" | "select-company";

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
  const [manualCompanyId, setManualCompanyId] = useState("");

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
    setLoading(true);
    try {
      const emp = await backend.loginEmployee(empCode.trim());
      if (!emp) {
        toast.error("Geçersiz personel kodu");
        return;
      }
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
      setStep("select-company");
    } catch {
      toast.error("Giriş sırasında hata oluştu");
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

  const handleManualCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompanyId.trim() || !employeeData) return;
    setLoading(true);
    try {
      const myCompanies = await backend.getMyCompanies(employeeData.employeeId);
      const found = myCompanies.find(
        ([c]) => c.companyId === manualCompanyId.trim(),
      );
      if (!found) {
        toast.error("Bu şirkette kaydınız bulunamadı.");
        return;
      }
      selectCompany(found[0].companyId, found[0].name, found[1]);
    } catch {
      toast.error("Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

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
                Henüz hiçbir şirkete bağlı değilsiniz. Şirket kodunuzu girerek
                bağlanabilirsiniz.
              </p>
            </div>
          )}
          <form
            onSubmit={handleManualCompany}
            className="bg-white border border-border rounded-2xl p-4 space-y-3"
          >
            <label
              htmlFor="ea-company-code"
              className="text-sm font-medium text-foreground"
            >
              Şirket Kodu ile Giriş
            </label>
            <input
              id="ea-company-code"
              data-ocid="employee_auth.company_code.input"
              value={manualCompanyId}
              onChange={(e) => setManualCompanyId(e.target.value)}
              placeholder="11 haneli şirket kodu"
              maxLength={11}
              className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground"
            />
            <button
              data-ocid="employee_auth.company_code.submit_button"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Kontrol ediliyor..." : "Giriş Yap"}
            </button>
          </form>
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
                  onChange={(e) => setEmpCode(e.target.value)}
                  placeholder="Personel kodunuzu girin"
                  maxLength={8}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                data-ocid="employee_auth.login.submit_button"
                type="submit"
                disabled={loading}
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
