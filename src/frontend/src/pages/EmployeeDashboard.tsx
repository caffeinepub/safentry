import {
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Link2,
  List,
  Loader2,
  LogOut,
  Medal,
  Plus,
  Repeat2,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

type Tab =
  | "register"
  | "list"
  | "security"
  | "employees"
  | "stats"
  | "davetler";

interface Visitor {
  entryTime: bigint;
  exitTime?: bigint;
  createdBy?: string;
  tcId: string;
  name: string;
  surname: string;
  visitingPerson: string;
  visitorId: string;
  visitPurpose: string;
  [key: string]: unknown;
}

interface PreRegistration {
  inviteCode: string;
  companyId: string;
  createdBy: string;
  visitingPerson: string;
  visitPurpose: string;
  visitorName?: string;
  visitorSurname?: string;
  tcId?: string;
  phone?: string;
  status: "pending" | "submitted" | "finalized" | "cancelled";
  createdAt: bigint;
  visitorId?: string;
}

const VISIT_PURPOSES = [
  "Toplantı",
  "Mülakat",
  "Teslimat",
  "Servis / Bakım",
  "Ziyaret",
  "Resmi Kurum",
  "Diğer",
];

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
  const [allMyVisitorsCount, setAllMyVisitorsCount] = useState(0);

  // Security screen state
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const securityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // PIN change modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");

  // Visitor notification banner
  const [myActiveVisitors, setMyActiveVisitors] = useState<Visitor[]>([]);

  // Polling for new visitor arrival notifications
  const prevVisitorIdsRef = useRef<Set<string> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Davetler (Invites) state
  const [invites, setInvites] = useState<PreRegistration[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [createVisitingPerson, setCreateVisitingPerson] = useState("");
  const [createVisitPurpose, setCreateVisitPurpose] = useState(
    VISIT_PURPOSES[0],
  );
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Finalize invite modal
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeInviteCode, setFinalizeInviteCode] = useState("");
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const finalizeCanvasRef = useRef<HTMLCanvasElement>(null);
  const finalizeDrawing = useRef(false);
  const [finalizeHasSig, setFinalizeHasSig] = useState(false);

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

  // Load today's visitor count + active visitor notification + all-time my count
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
      const todayCount = (allVisitors as unknown as Visitor[]).filter((v) => {
        const isToday =
          new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
          today;
        return v.createdBy === employee.employeeId && isToday;
      }).length;
      setTodayMyVisitors(todayCount);

      const allCount = (allVisitors as unknown as Visitor[]).filter(
        (v) => v.createdBy === employee.employeeId,
      ).length;
      setAllMyVisitorsCount(allCount);

      const todayActive = (myVisitors as unknown as Visitor[]).filter((v) => {
        const isToday =
          new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
          today;
        return isToday && !v.exitTime;
      });
      setMyActiveVisitors(todayActive);
    });
  }, [company, employee]);

  // Polling: detect new visitor arrivals every 60 seconds
  useEffect(() => {
    if (!company || !employee) return;

    const fullName = `${employee.name} ${employee.surname}`;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const visitors = (await backend.getVisitorsByPerson(
          company.companyId,
          fullName,
        )) as unknown as Visitor[];

        const today = new Date().toDateString();
        const todayActive = visitors.filter((v) => {
          const isToday =
            new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
            today;
          return isToday && !v.exitTime;
        });

        const currentIds = new Set(todayActive.map((v) => v.visitorId));

        if (prevVisitorIdsRef.current !== null) {
          for (const v of todayActive) {
            if (!prevVisitorIdsRef.current.has(v.visitorId)) {
              toast.info(`Yeni ziyaretçi: ${v.name} ${v.surname}`);
            }
          }
        }

        prevVisitorIdsRef.current = currentIds;
        setMyActiveVisitors(todayActive);
      } catch {
        // silent fail
      }
    };

    const initPoll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const visitors = (await backend.getVisitorsByPerson(
          company.companyId,
          fullName,
        )) as unknown as Visitor[];
        const today = new Date().toDateString();
        const todayActive = visitors.filter((v) => {
          const isToday =
            new Date(Number(v.entryTime / BigInt(1_000_000))).toDateString() ===
            today;
          return isToday && !v.exitTime;
        });
        prevVisitorIdsRef.current = new Set(
          todayActive.map((v) => v.visitorId),
        );
      } catch {
        prevVisitorIdsRef.current = new Set();
      }
    };

    initPoll();
    pollTimerRef.current = setInterval(poll, 60_000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      prevVisitorIdsRef.current = null;
    };
  }, [company, employee]);

  // Security screen: load active visitors + auto-refresh every 30s
  const loadActiveVisitors = useCallback(async (companyId: string) => {
    setSecurityLoading(true);
    try {
      const all = (await backend.getVisitors(
        companyId,
      )) as unknown as Visitor[];
      setActiveVisitors(all.filter((v) => !v.exitTime));
    } catch {
      toast.error("Aktif ziyaretçiler yüklenemedi");
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!company || tab !== "security") return;
    loadActiveVisitors(company.companyId);
    securityTimerRef.current = setInterval(
      () => loadActiveVisitors(company.companyId),
      30_000,
    );
    return () => {
      if (securityTimerRef.current) clearInterval(securityTimerRef.current);
    };
  }, [company, tab, loadActiveVisitors]);

  const handleSecurityCheckout = async (visitorId: string) => {
    if (!company) return;
    setCheckingOutId(visitorId);
    try {
      await backend.checkoutVisitor(visitorId, company.companyId);
      toast.success("Çıkış işlemi tamamlandı");
      await loadActiveVisitors(company.companyId);
    } catch {
      toast.error("Çıkış işlemi başarısız");
    } finally {
      setCheckingOutId(null);
    }
  };

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

  // Load invites when on davetler tab
  const loadInvites = useCallback(async (companyId: string) => {
    setInvitesLoading(true);
    try {
      const list = await backend.getCompanyInvites(companyId);
      setInvites(
        (list as PreRegistration[]).sort((a, b) =>
          Number(b.createdAt - a.createdAt),
        ),
      );
    } catch {
      toast.error("Davetler yüklenemedi");
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (company && tab === "davetler") {
      loadInvites(company.companyId);
    }
  }, [company, tab, loadInvites]);

  // Finalize canvas init
  useEffect(() => {
    if (!showFinalizeModal) return;
    const canvas = finalizeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    setFinalizeHasSig(false);
  }, [showFinalizeModal]);

  const getFinalizePos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startFinalizeDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = finalizeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    finalizeDrawing.current = true;
    const pos = getFinalizePos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const finalizeDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!finalizeDrawing.current) return;
    const canvas = finalizeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getFinalizePos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setFinalizeHasSig(true);
  };

  const stopFinalizeDraw = () => {
    finalizeDrawing.current = false;
  };

  const clearFinalizeCanvas = () => {
    const canvas = finalizeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setFinalizeHasSig(false);
  };

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

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !createVisitingPerson.trim()) {
      toast.error("Kimi ziyaret edeceğini belirtiniz");
      return;
    }
    setCreating(true);
    try {
      const code = await backend.createInvite(
        company.companyId,
        createVisitingPerson.trim(),
        createVisitPurpose,
      );
      setCreatedCode(code as string);
      await loadInvites(company.companyId);
    } catch {
      toast.error("Davet oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  const handleCancelInvite = async (inviteCode: string) => {
    if (!company) return;
    try {
      await backend.cancelInvite(inviteCode, company.companyId);
      toast.success("Davet iptal edildi");
      await loadInvites(company.companyId);
    } catch {
      toast.error("İptal işlemi başarısız");
    }
  };

  const openFinalizeModal = (inviteCode: string) => {
    setFinalizeInviteCode(inviteCode);
    setShowFinalizeModal(true);
  };

  const handleFinalizeInvite = async () => {
    if (!company || !finalizeInviteCode) return;
    if (!finalizeHasSig) {
      toast.error("Lütfen imza atınız");
      return;
    }
    const canvas = finalizeCanvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL("image/png");
    setFinalizeLoading(true);
    try {
      await backend.finalizeInvite(
        finalizeInviteCode,
        company.companyId,
        signatureData,
        null,
        null,
        false,
      );
      toast.success("Ziyaretçi kaydı tamamlandı");
      setShowFinalizeModal(false);
      setFinalizeInviteCode("");
      await loadInvites(company.companyId);
    } catch {
      toast.error("Tamamlama işlemi başarısız");
    } finally {
      setFinalizeLoading(false);
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

  const inviteLink = (code: string) =>
    `${window.location.origin}${window.location.pathname}?invite=${code}`;

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

      {/* Summary banner */}
      <div
        data-ocid="employee_dash.today_summary.card"
        className="flex items-center gap-4 px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800"
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium">
            Bugün: <span className="font-bold">{todayMyVisitors}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium">
            Aktif: <span className="font-bold">{myActiveVisitors.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium">
            Toplam: <span className="font-bold">{allMyVisitorsCount}</span>
          </span>
        </div>
      </div>

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
          <TabBtn
            active={tab === "security"}
            onClick={() => setTab("security")}
            ocid="security.tab"
            icon={<Shield className="w-4 h-4" />}
            label="Güvenlik"
            badge={
              activeVisitors.length > 0 ? activeVisitors.length : undefined
            }
          />
          <TabBtn
            active={tab === "davetler"}
            onClick={() => setTab("davetler")}
            ocid="employee_dash.davetler.tab"
            icon={<Link2 className="w-4 h-4" />}
            label="Davetler"
            badge={
              invites.filter((i) => i.status === "submitted").length ||
              undefined
            }
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
        {tab === "security" && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Güvenlik Ekranı
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Binada aktif olan ziyaretçiler · Her 30 saniyede güncellenir
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadActiveVisitors(company.companyId)}
                className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
              >
                Yenile
              </button>
            </div>

            {securityLoading && (
              <div data-ocid="security.loading_state" className="space-y-2">
                <div className="h-16 bg-muted rounded-xl animate-pulse" />
                <div className="h-16 bg-muted rounded-xl animate-pulse" />
                <div className="h-16 bg-muted rounded-xl animate-pulse" />
              </div>
            )}

            {!securityLoading && activeVisitors.length === 0 && (
              <div
                data-ocid="security.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">Aktif ziyaretçi yok</p>
                <p className="text-xs mt-1 opacity-70">
                  Şu anda binada ziyaretçi bulunmuyor
                </p>
              </div>
            )}

            {!securityLoading && activeVisitors.length > 0 && (
              <div
                data-ocid="security.table"
                className="bg-white border border-border rounded-2xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Ad Soyad
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                          TC No
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Kime Geldi
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                          Giriş / Süre
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {activeVisitors.map((v, i) => (
                        <tr
                          key={v.visitorId}
                          data-ocid={`security.item.${i + 1}`}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground text-sm">
                              {v.name} {v.surname}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {parseVisitorTypeBadge(v.visitPurpose)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono hidden sm:table-cell">
                            {v.tcId || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {v.visitingPerson}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                Number(v.entryTime / BigInt(1_000_000)),
                              ).toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-emerald-600 font-medium mt-0.5">
                              {elapsedTime(v.entryTime)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              data-ocid={`security.checkout_button.${i + 1}`}
                              onClick={() =>
                                handleSecurityCheckout(v.visitorId)
                              }
                              disabled={checkingOutId === v.visitorId}
                              className="flex items-center gap-1 text-xs font-medium text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {checkingOutId === v.visitorId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <LogOut className="w-3.5 h-3.5" />
                              )}
                              Çıkış
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DAVETLER TAB */}
        {tab === "davetler" && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Davet Linkleri
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ziyaretçilere önceden davet linki gönderin
                </p>
              </div>
              <button
                type="button"
                data-ocid="davetler.create.open_modal_button"
                onClick={() => {
                  setShowCreateInvite(true);
                  setCreatedCode(null);
                  setCreateVisitingPerson("");
                  setCreateVisitPurpose(VISIT_PURPOSES[0]);
                }}
                className="flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-emerald-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Davet
              </button>
            </div>

            {invitesLoading && (
              <div data-ocid="davetler.loading_state" className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="h-16 bg-muted rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {!invitesLoading && invites.length === 0 && (
              <div
                data-ocid="davetler.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">Henüz davet yok</p>
                <p className="text-xs mt-1 opacity-70">
                  Yeni davet oluşturarak ziyaretçileri davet edebilirsiniz
                </p>
              </div>
            )}

            {!invitesLoading && invites.length > 0 && (
              <div
                data-ocid="davetler.table"
                className="bg-white border border-border rounded-2xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Ziyaret Edilen
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                          Amaç
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Durum
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((inv, i) => (
                        <tr
                          key={inv.inviteCode}
                          data-ocid={`davetler.item.${i + 1}`}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground text-sm">
                              {inv.visitingPerson}
                            </div>
                            {inv.visitorName && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {inv.visitorName} {inv.visitorSurname}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                            {inv.visitPurpose.replace(/^\[.*?\]\s*/, "")}
                          </td>
                          <td className="px-4 py-3">
                            <InviteStatusBadge status={inv.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              {(inv.status === "pending" ||
                                inv.status === "submitted") && (
                                <button
                                  type="button"
                                  data-ocid={`davetler.copy_link.button.${i + 1}`}
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      inviteLink(inv.inviteCode),
                                    );
                                    toast.success("Link kopyalandı");
                                  }}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2 py-1.5 rounded-lg transition-colors"
                                  title="Linki Kopyala"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span className="hidden sm:inline">Link</span>
                                </button>
                              )}
                              {inv.status === "submitted" && (
                                <button
                                  type="button"
                                  data-ocid={`davetler.finalize.button.${i + 1}`}
                                  onClick={() =>
                                    openFinalizeModal(inv.inviteCode)
                                  }
                                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Tamamla
                                </button>
                              )}
                              {(inv.status === "pending" ||
                                inv.status === "submitted") && (
                                <button
                                  type="button"
                                  data-ocid={`davetler.cancel.button.${i + 1}`}
                                  onClick={() =>
                                    handleCancelInvite(inv.inviteCode)
                                  }
                                  className="flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg transition-colors"
                                  title="İptal Et"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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

      {/* Create Invite Modal */}
      {showCreateInvite && (
        <div
          data-ocid="davetler.create.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  Yeni Davet Oluştur
                </h3>
              </div>
              <button
                type="button"
                data-ocid="davetler.create.close_button"
                onClick={() => {
                  setShowCreateInvite(false);
                  setCreatedCode(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!createdCode ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-visiting-person"
                    className="block text-sm font-medium text-foreground"
                  >
                    Kimi Ziyaret Edecek *
                  </label>
                  <input
                    id="create-visiting-person"
                    data-ocid="davetler.visiting_person.input"
                    value={createVisitingPerson}
                    onChange={(e) => setCreateVisitingPerson(e.target.value)}
                    placeholder="Personel adı"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-visit-purpose"
                    className="block text-sm font-medium text-foreground"
                  >
                    Ziyaret Amacı
                  </label>
                  <select
                    id="create-visit-purpose"
                    data-ocid="davetler.visit_purpose.select"
                    value={createVisitPurpose}
                    onChange={(e) => setCreateVisitPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                  >
                    {VISIT_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    data-ocid="davetler.create.cancel_button"
                    onClick={() => setShowCreateInvite(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    data-ocid="davetler.create.submit_button"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {creating && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {creating ? "Oluşturuluyor..." : "Davet Oluştur"}
                  </button>
                </div>
              </form>
            ) : (
              <div
                data-ocid="davetler.create.success_state"
                className="space-y-4"
              >
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">
                    Davet linki hazır! Kopyalayıp ziyaretçiye gönderin:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink(createdCode)}
                      className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded-lg px-2 py-2 text-foreground min-w-0"
                    />
                    <button
                      type="button"
                      data-ocid="davetler.copy_new_link.button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink(createdCode));
                        toast.success("Link kopyalandı");
                      }}
                      className="flex-shrink-0 bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Kopyala
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid="davetler.create.close_button"
                  onClick={() => {
                    setShowCreateInvite(false);
                    setCreatedCode(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finalize Invite Modal */}
      {showFinalizeModal && (
        <div
          data-ocid="davetler.finalize.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  Ziyareti Tamamla
                </h3>
              </div>
              <button
                type="button"
                data-ocid="davetler.finalize.close_button"
                onClick={() => {
                  setShowFinalizeModal(false);
                  setFinalizeInviteCode("");
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ziyaretçiden dijital imza alın ve kaydı tamamlayın.
            </p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">
                  Dijital İmza *
                </span>
                <button
                  type="button"
                  onClick={clearFinalizeCanvas}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Temizle
                </button>
              </div>
              <canvas
                ref={finalizeCanvasRef}
                width={320}
                height={120}
                className="w-full rounded-xl border border-border touch-none cursor-crosshair"
                style={{ background: "#f8fafc" }}
                onMouseDown={startFinalizeDraw}
                onMouseMove={finalizeDraw}
                onMouseUp={stopFinalizeDraw}
                onMouseLeave={stopFinalizeDraw}
                onTouchStart={startFinalizeDraw}
                onTouchMove={finalizeDraw}
                onTouchEnd={stopFinalizeDraw}
              />
              {!finalizeHasSig && (
                <p className="text-xs text-muted-foreground mt-1">
                  Yukarıdaki alana imzayı çizin
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="davetler.finalize.cancel_button"
                onClick={() => {
                  setShowFinalizeModal(false);
                  setFinalizeInviteCode("");
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="davetler.finalize.confirm_button"
                onClick={handleFinalizeInvite}
                disabled={finalizeLoading || !finalizeHasSig}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {finalizeLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {finalizeLoading ? "İşleniyor..." : "Tamamla"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  maxLength={6}
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
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
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPinConfirm}
                  onChange={(e) =>
                    setNewPinConfirm(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="••••"
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
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

function InviteStatusBadge({ status }: { status: PreRegistration["status"] }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        Bekliyor
      </span>
    );
  if (status === "submitted")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        Bilgiler Girildi
      </span>
    );
  if (status === "finalized")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Tamamlandı
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
      İptal
    </span>
  );
}

function TabBtn({
  active,
  onClick,
  ocid,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  ocid: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 bg-emerald-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
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

function elapsedTime(entryTime: bigint): string {
  const ms = Date.now() - Number(entryTime / BigInt(1_000_000));
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}s ${minutes}d`;
  return `${minutes}d`;
}

function parseVisitorTypeBadge(visitPurpose: string): string {
  if (visitPurpose.startsWith("[")) {
    const end = visitPurpose.indexOf("]");
    if (end > 0) return visitPurpose.slice(1, end);
  }
  return "";
}
