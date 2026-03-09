import {
  BarChart3,
  Calendar,
  List,
  LogOut,
  Medal,
  TrendingUp,
  UserPlus,
  Users,
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

  if (!employee || !company) return null;

  const canManageEmployees = role === "owner";
  const canViewStats = role === "owner" || role === "authorized";

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
        <button
          type="button"
          data-ocid="employee_dash.logout.button"
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Çıkış
        </button>
      </header>

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
          <EmployeeManager companyId={company.companyId} />
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
              </div>
            )}
          </div>
        )}
      </main>
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
