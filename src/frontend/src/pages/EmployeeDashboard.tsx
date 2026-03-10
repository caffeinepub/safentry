import {
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  KeyRound,
  List,
  Loader2,
  LogOut,
  Medal,
  Repeat2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import EmployeeManager from "../components/EmployeeManager";
import VisitorList from "../components/VisitorList";
import VisitorRegisterForm from "../components/VisitorRegisterForm";
import WeeklyVisitorChart from "../components/WeeklyVisitorChart";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

type Tab = "register" | "list" | "employees" | "stats";

interface Visitor {
  entryTime: bigint;
  exitTime?: bigint;
  createdBy?: string;
  tcId: string;
  name: string;
  surname: string;
  visitingPerson: string;
  [key: string]: unknown;
}

export default function EmployeeDashboard({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("register");
  const [employee, setEmployee] = useState<{
    employeeId: string;
    name: string;
    surname: string;
  } | null>(null);
  const [company, setCompany] = useState<{
    companyId: string;
    companyName: string;
  } | null>(null);
  const [role, setRole] = useState<string>("registrar");
  const [stats, setStats] = useState<{
    totalVisitors: bigint;
    activeVisitorsToday: bigint;
    totalVisitorsToday: bigint;
  } | null>(null);
  const [topPersons, setTopPersons] = useState<[string, bigint][]>([]);
  const [chartVisitors, setChartVisitors] = useState<Visitor[]>([]);
  const [todayMyVisitors, setTodayMyVisitors] = useState(0);

  // PIN change modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");

  // Visitor notification banner
  const [myActiveVisitors, setMyActiveVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    const emp = sessionStorage.getItem("safentry_employee");
    const comp = sessionStorage.getItem("safentry_employee_company");
    const r = sessionStorage.getItem("safentry_employee_role");
    if (!emp || !comp) {
      onNavigate("landing");
      return;
    }
    setEmployee(JSON.parse(emp));
    setCompany(JSON.parse(comp));
    setRole(r || "registrar");
  }, [onNavigate]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("safentry_employee");
    sessionStorage.removeItem("safentry_employee_company");
    sessionStorage.removeItem("safentry_employee_role");
    onNavigate("landing");
  }, [onNavigate]);

  // Auto-logout after 30 minutes of inactivity
  useSessionTimeout(logout, !!employee);

  // Load today's visitor count + active visitor notification
  useEffect(() => {
    if (!company || !employee) return;
    const fullName = `${employee.name} ${employee.surname}`;
    Promise.all([
      backend.getVisitors(company.companyId).catch(() => [] as Visitor[]),
      backend
        .getVisitorsByPerson(company.companyId, fullName)
        .catch(() => [] as Visitor[]),
    ]).then(([allVisitors, myVisitors]) => {
      const today = new Date().toDateString();
      const count = (allVisitors as unknown as Visitor[]).filter((v) => {
        const isToday =
          new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
          today;
        return v.createdBy === employee.employeeId && isToday;
      }).length;
      setTodayMyVisitors(count);

      // Active visitors (visiting this person, no exit today)
      const todayActive = (myVisitors as unknown as Visitor[]).filter((v) => {
        const isToday =
          new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
          today;
        return isToday && !v.exitTime;
      });
      setMyActiveVisitors(todayActive);
    });
  }, [company, employee]);

  const loadStats = useCallback((c: { companyId: string }) => {
    Promise.all([
      backend
        .getCompanyStats(c.companyId)
        .then((s) => setStats(s as typeof stats))
        .catch(() => toast.error("İstatistikler yüklenemedi")),
      backend
        .getTopVisitedPersons(c.companyId, BigInt(5))
        .then((r) => setTopPersons(r as [string, bigint][]))
        .catch(() => {}),
      backend
        .getVisitors(c.companyId)
        .then((r) => setChartVisitors(r as unknown as Visitor[]))
        .catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (company && tab === "stats") {
      loadStats(company);
    }
  }, [company, tab, loadStats]);

  const handlePinSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    if (!newPin || newPin.length < 4) {
      setPinError("PIN en az 4 rakam olmalıdır");
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setPinError("PIN yalnızca rakamlardan oluşmalıdır");
      return;
    }
    if (newPin !== newPinConfirm) {
      setPinError("PIN'ler eşleşmiyor");
      return;
    }
    if (!employee) return;
    setPinSaving(true);
    try {
      await backend.setEmployeePin(employee.employeeId, newPin);
      localStorage.setItem(`pin_set_${employee.employeeId}`, "1");
      toast.success("PIN başarıyla kaydedildi");
      setShowPinModal(false);
      setNewPin("");
      setNewPinConfirm("");
    } catch {
      toast.error("PIN kaydedilemedi");
    } finally {
      setPinSaving(false);
    }
  };

  if (!employee || !company) return null;

  const canManageEmployees = role === "owner";
  const canViewStats = role === "owner" || role === "authorized";

  // Compute frequent visitors (top 5 with count > 1)
  const frequentVisitors = (() => {
    const map = new Map<
      string,
      { name: string; surname: string; count: number }
    >();
    for (const v of chartVisitors) {
      if (!v.tcId) continue;
      const existing = map.get(v.tcId);
      if (existing) {
        existing.count++;
      } else {
        map.set(v.tcId, { name: v.name, surname: v.surname, count: 1 });
      }
    }
    return Array.from(map.values())
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <span className="text-sm font-display font-bold text-emerald-700">
              {employee.name.charAt(0)}
              {employee.surname.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-display font-semibold text-foreground text-sm">
              {employee.name} {employee.surname}
            </div>
            <div className="text-xs text-muted-foreground">
              {company.companyName} · {roleLabel(role)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="employee_dash.change_pin.button"
            onClick={() => setShowPinModal(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
            title="Şifre / PIN Değiştir"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PIN</span>
          </button>
          <button
            type="button"
            data-ocid="employee_dash.logout.button"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
          </button>
        </div>
      </header>

      {/* Visitor notification banner */}
      {myActiveVisitors.length > 0 && (
        <div
          data-ocid="employee_dash.visitor_notification.card"
          className="flex items-start gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100 text-blue-800"
        >
          <Bell className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold">Ziyaretçiniz var:</span>{" "}
            {myActiveVisitors
              .slice(0, 3)
              .map((v) => `${v.name} ${v.surname}`)
              .join(", ")}
            {myActiveVisitors.length > 3 &&
              ` +${myActiveVisitors.length - 3} diğer`}
            {" — henüz çıkış yapmadı"}
          </div>
        </div>
      )}

      {todayMyVisitors > 0 && (
        <div
          data-ocid="employee_dash.today_summary.card"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium">
            Bugün {todayMyVisitors} ziyaretçi kaydettiniz
          </span>
        </div>
      )}

      <nav className="border-b border-border bg-white">
        <div className="flex px-4 overflow-x-auto">
          <TabBtn
            active={tab === "register"}
            onClick={() => setTab("register")}
            ocid="employee_dash.register.tab"
            icon={<UserPlus className="w-4 h-4" />}
            label="Ziyaretçi Kayıt"
          />
          <TabBtn
            active={tab === "list"}
            onClick={() => setTab("list")}
            ocid="employee_dash.list.tab"
            icon={<List className="w-4 h-4" />}
            label="Ziyaretçiler"
          />
          {canViewStats && (
            <TabBtn
              active={tab === "stats"}
              onClick={() => setTab("stats")}
              ocid="employee_dash.stats.tab"
              icon={<BarChart3 className="w-4 h-4" />}
              label="İstatistikler"
            />
          )}
          {canManageEmployees && (
            <TabBtn
              active={tab === "employees"}
              onClick={() => setTab("employees")}
              ocid="employee_dash.employees.tab"
              icon={<Users className="w-4 h-4" />}
              label="Personel"
            />
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {tab === "register" && (
          <VisitorRegisterForm
            companyId={company.companyId}
            employeeId={employee.employeeId}
          />
        )}
        {tab === "list" && (
          <VisitorList companyId={company.companyId} canCheckout={true} />
        )}
        {tab === "employees" && canManageEmployees && (
          <EmployeeManager
            companyId={company.companyId}
            currentEmployeeId={employee.employeeId}
          />
        )}
        {tab === "stats" && canViewStats && (
          <div className="p-6 max-w-2xl space-y-6">
            {!stats ? (
              <div
                data-ocid="employee_dash.stats.loading_state"
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
              </div>
            ) : (
              <div
                data-ocid="employee_dash.stats.section"
                className="space-y-6"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Toplam Ziyaretçi"
                    value={String(stats.totalVisitors)}
                    icon={<Users className="w-5 h-5" />}
                    color="primary"
                  />
                  <StatCard
                    label="Bugün Aktif"
                    value={String(stats.activeVisitorsToday)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="emerald"
                  />
                  <StatCard
                    label="Bugün Toplam"
                    value={String(stats.totalVisitorsToday)}
                    icon={<Calendar className="w-5 h-5" />}
                    color="blue"
                  />
                </div>

                <div data-ocid="employee_dash.weekly_chart.section">
                  <WeeklyVisitorChart visitors={chartVisitors} />
                </div>

                {topPersons.length > 0 && (
                  <div className="bg-white border border-border rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Medal className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        En Çok Ziyaret Edilen Kişiler
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {topPersons.map(([name, count], i) => (
                        <div
                          key={name}
                          data-ocid={`employee_dash.top_person.item.${i + 1}`}
                          className="flex items-center gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-foreground truncate">
                            {name}
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {String(count)} ziyaret
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {frequentVisitors.length > 0 && (
                  <div
                    data-ocid="employee_dash.frequent_visitors.section"
                    className="bg-white border border-border rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Repeat2 className="w-4 h-4 text-violet-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Sık Gelen Ziyaretçiler
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {frequentVisitors.map((item, i) => (
                        <div
                          key={`${item.name}-${item.surname}`}
                          data-ocid={`employee_dash.frequent_visitor.item.${i + 1}`}
                          className="flex items-center gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center text-xs font-bold text-violet-600">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-foreground truncate">
                            {item.name} {item.surname}
                          </span>
                          <span className="text-sm font-semibold text-violet-600">
                            {item.count} ziyaret
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* PIN Change Modal */}
      {showPinModal && (
        <div
          data-ocid="employee_dash.pin_modal.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  PIN Değiştir
                </h3>
              </div>
              <button
                type="button"
                data-ocid="employee_dash.pin_modal.close_button"
                onClick={() => {
                  setShowPinModal(false);
                  setNewPin("");
                  setNewPinConfirm("");
                  setPinError("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              PIN belirledikten sonra giriş yapan her personelin PIN doğrulaması
              istenir.
            </p>
            <form onSubmit={handlePinSave} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="pin-new"
                  className="block text-sm font-medium text-foreground"
                >
                  Yeni PIN (4-6 rakam)
                </label>
                <input
                  id="pin-new"
                  data-ocid="employee_dash.pin_modal.input"
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setPinError("");
                  }}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono text-center tracking-widest bg-white text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="pin-confirm"
                  className="block text-sm font-medium text-foreground"
                >
                  PIN Tekrar
                </label>
                <input
                  id="pin-confirm"
                  data-ocid="employee_dash.pin_modal.textarea"
                  type="password"
                  inputMode="numeric"
                  value={newPinConfirm}
                  onChange={(e) => {
                    setNewPinConfirm(e.target.value);
                    setPinError("");
                  }}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono text-center tracking-widest bg-white text-foreground"
                />
              </div>
              {pinError && (
                <p
                  data-ocid="employee_dash.pin_modal.error_state"
                  className="text-xs text-red-600"
                >
                  {pinError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  data-ocid="employee_dash.pin_modal.cancel_button"
                  onClick={() => {
                    setShowPinModal(false);
                    setNewPin("");
                    setNewPinConfirm("");
                    setPinError("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  data-ocid="employee_dash.pin_modal.save_button"
                  disabled={pinSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {pinSaving && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {pinSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  ocid,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  ocid: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "emerald" | "blue";
}) {
  const colorMap = {
    primary: {
      card: "bg-primary/5 border-primary/20",
      icon: "bg-primary/10 text-primary",
      value: "text-primary",
    },
    emerald: {
      card: "bg-emerald-50 border-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-800",
    },
    blue: {
      card: "bg-blue-50 border-blue-200",
      icon: "bg-blue-100 text-blue-700",
      value: "text-blue-800",
    },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl border p-5 ${c.card}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}
      >
        {icon}
      </div>
      <div className={`text-3xl font-display font-bold ${c.value}`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "owner") return "Şirket Sahibi";
  if (role === "authorized") return "Şirket Yetkilisi";
  return "Kayıt Personeli";
}
