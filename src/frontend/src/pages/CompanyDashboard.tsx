import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Ban,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Check,
  Clipboard,
  Clock,
  Database,
  FileDown,
  History,
  ImagePlus,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Medal,
  Megaphone,
  Pencil,
  Repeat2,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import EmployeeManager from "../components/EmployeeManager";
import HourlyDensityChart from "../components/HourlyDensityChart";
import PurposeDistributionChart from "../components/PurposeDistributionChart";
import RolePermissions from "../components/RolePermissions";
import VisitorList from "../components/VisitorList";
import WeeklyVisitorChart from "../components/WeeklyVisitorChart";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

type Tab = "visitors" | "employees" | "stats" | "info";

interface Company {
  companyId: string;
  name: string;
  sector: string;
  address: string;
  contactPersonName: string;
  loginCode: string;
}

interface Stats {
  totalVisitors: bigint;
  activeVisitorsToday: bigint;
  totalVisitorsToday: bigint;
}

interface Visitor {
  entryTime: bigint;
  exitTime?: bigint;
  tcId: string;
  name: string;
  surname: string;
  [key: string]: unknown;
}

interface BlacklistEntry {
  tcId: string;
  reason: string;
  addedAt: bigint;
}

export default function CompanyDashboard({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>("visitors");
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topPersons, setTopPersons] = useState<[string, bigint][]>([]);
  const [chartVisitors, setChartVisitors] = useState<Visitor[]>([]);
  const [purposeDist, setPurposeDist] = useState<[string, bigint][]>([]);
  const [copied, setCopied] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSaving, setLogoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContact, setEditContact] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Blacklist
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blTcId, setBlTcId] = useState("");
  const [blReason, setBlReason] = useState("");
  const [blAdding, setBlAdding] = useState(false);
  const [confirmBlacklistAddPending, setConfirmBlacklistAddPending] =
    useState(false);
  const [confirmBlacklistRemoveId, setConfirmBlacklistRemoveId] = useState<
    string | null
  >(null);

  // Date range PDF report
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  // Working Hours
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");

  // KVKK/GDPR Retention
  const [retentionPeriod, setRetentionPeriod] = useState("Sınırsız");
  const [retentionSaving, setRetentionSaving] = useState(false);

  // Visitor Limit
  const [visitorLimit, setVisitorLimit] = useState(50);
  const [visitorLimitSaving, setVisitorLimitSaving] = useState(false);

  // Access Zones
  const [accessZones, setAccessZones] = useState<string[]>([]);
  const [newZoneInput, setNewZoneInput] = useState("");

  // Announcement Board
  const [announcementText, setAnnouncementText] = useState("");
  const [announcements, setAnnouncements] = useState<
    { id: string; text: string; createdAt: string; authorName: string }[]
  >([]);
  const [announcementPosting, setAnnouncementPosting] = useState(false);

  // PIN Reset modal
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [resetPinTarget, setResetPinTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinResetSaving, setPinResetSaving] = useState(false);

  // Login History modal
  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [loginHistoryTarget, setLoginHistoryTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loginHistory, setLoginHistory] = useState<string[]>([]);

  useEffect(() => {
    const data = sessionStorage.getItem("safentry_company");
    if (!data) {
      onNavigate("landing");
      return;
    }
    const parsed = JSON.parse(data) as Company;
    setCompany(parsed);
    // Load working hours
    const wh = localStorage.getItem(`workinghours_${parsed.companyId}`);
    if (wh) {
      const { start, end } = JSON.parse(wh) as { start: string; end: string };
      setWorkingHoursStart(start);
      setWorkingHoursEnd(end);
    }
    // Load retention policy
    const ret = localStorage.getItem(`retention_${parsed.companyId}`);
    if (ret) setRetentionPeriod(ret);
    // Load visitor limit
    const vl = localStorage.getItem(`visitor_limit_${parsed.companyId}`);
    if (vl) setVisitorLimit(Number(vl));
    // Load access zones
    const az = localStorage.getItem(`accessZones_${parsed.companyId}`);
    if (az) {
      try {
        setAccessZones(JSON.parse(az));
      } catch {
        setAccessZones([]);
      }
    }
    // Load announcements
    const ann = localStorage.getItem(`announcements_${parsed.companyId}`);
    if (ann) setAnnouncements(JSON.parse(ann));
    // Run KVKK cleanup
    const retVal = ret || "Sınırsız";
    if (retVal !== "Sınırsız") {
      const now = Date.now();
      const periodMs =
        retVal === "6 Ay"
          ? 6 * 30 * 24 * 3600 * 1000
          : retVal === "1 Yıl"
            ? 365 * 24 * 3600 * 1000
            : 2 * 365 * 24 * 3600 * 1000;
      const cutoff = now - periodMs;
      // Cleanup is done passively - records older than retention will be filtered in display
      // Store cutoff for VisitorList to use
      localStorage.setItem(
        `retention_cutoff_${parsed.companyId}`,
        String(cutoff),
      );
    } else {
      localStorage.removeItem(`retention_cutoff_${parsed.companyId}`);
    }

    backend
      .getCompanyLogo(parsed.loginCode)
      .then((logo) => {
        if (logo) {
          setCompanyLogo(logo);
          setLogoPreview(logo);
        }
      })
      .catch(() => {});
  }, [onNavigate]);

  const loadBlacklist = useCallback((c: Company) => {
    setBlacklistLoading(true);
    backend
      .getCompanyBlacklist(c.loginCode)
      .then((list) => setBlacklist(list as BlacklistEntry[]))
      .catch(() => toast.error("Kara liste yüklenemedi"))
      .finally(() => setBlacklistLoading(false));
  }, []);

  useEffect(() => {
    if (company && tab === "info") {
      loadBlacklist(company);
    }
  }, [company, tab, loadBlacklist]);

  const loadStats = useCallback((c: Company) => {
    Promise.all([
      backend
        .getCompanyStatsAsCompany(c.loginCode)
        .then((s) => {
          if (s) setStats(s as Stats);
        })
        .catch(() => toast.error("İstatistikler yüklenemedi")),
      backend
        .getTopVisitedPersonsAsCompany(c.loginCode, BigInt(10))
        .then((r) => setTopPersons(r as [string, bigint][]))
        .catch(() => {}),
      backend
        .getVisitorsAsCompany(c.loginCode)
        .then((r) => setChartVisitors(r as unknown as Visitor[]))
        .catch(() => {}),
      backend
        .getPurposeDistributionAsCompany(c.loginCode)
        .then((r) => setPurposeDist(r as [string, bigint][]))
        .catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (company && tab === "stats") {
      loadStats(company);
    }
  }, [company, tab, loadStats]);

  const logout = () => {
    sessionStorage.removeItem("safentry_company");
    onNavigate("landing");
  };

  const copyLoginCode = async () => {
    if (!company) return;
    try {
      await navigator.clipboard.writeText(company.loginCode);
      setCopied(true);
      toast.success("Giriş kodu kopyalandı");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir görsel dosyası seçin");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoSave = async () => {
    if (!company || !logoPreview) return;
    setLogoSaving(true);
    try {
      await backend.setCompanyLogo(company.loginCode, logoPreview);
      setCompanyLogo(logoPreview);
      toast.success("Logo kaydedildi");
    } catch {
      toast.error("Logo kaydedilemedi");
    } finally {
      setLogoSaving(false);
    }
  };

  const openProfileEdit = () => {
    if (!company) return;
    setEditName(company.name);
    setEditSector(company.sector);
    setEditAddress(company.address);
    setEditContact(company.contactPersonName);
    setShowProfileModal(true);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!editName || !editSector || !editAddress || !editContact) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    setProfileSaving(true);
    try {
      await backend.updateCompanyProfile(
        company.loginCode,
        editName,
        editSector,
        editAddress,
        editContact,
      );
      const updated: Company = {
        ...company,
        name: editName,
        sector: editSector,
        address: editAddress,
        contactPersonName: editContact,
      };
      setCompany(updated);
      sessionStorage.setItem("safentry_company", JSON.stringify(updated));
      toast.success("Şirket profili güncellendi");
      setShowProfileModal(false);
    } catch {
      toast.error("Profil güncellenemedi");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleBlacklistFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (blTcId.length !== 11) {
      toast.error("TC kimlik numarası 11 haneli olmalıdır");
      return;
    }
    if (!blReason.trim()) {
      toast.error("Engelleme sebebi zorunludur");
      return;
    }
    setConfirmBlacklistAddPending(true);
  };

  const handleBlacklistAdd = async () => {
    if (!company) return;
    setBlAdding(true);
    try {
      await backend.addVisitorBlacklist(
        company.companyId,
        blTcId,
        blReason.trim(),
      );
      toast.success("Kara listeye eklendi");
      setBlTcId("");
      setBlReason("");
      loadBlacklist(company);
    } catch {
      toast.error("Eklenemedi");
    } finally {
      setBlAdding(false);
    }
  };

  const handleBlacklistRemove = async (tcId: string) => {
    if (!company) return;
    try {
      await backend.removeVisitorBlacklist(company.companyId, tcId);
      toast.success("Kara listeden çıkarıldı");
      loadBlacklist(company);
    } catch {
      toast.error("Çıkarılamadı");
    }
  };

  if (!company) return null;

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

  // Compute avg satisfaction from visitor feedback
  const companyAvgSatisfaction = (() => {
    if (!chartVisitors.length) return null;
    let total = 0;
    let count = 0;
    for (const v of chartVisitors) {
      const visitorId = (v as { visitorId?: string }).visitorId;
      if (!visitorId) continue;
      const fb = localStorage.getItem(`feedback_${visitorId}`);
      if (fb) {
        const parsed = JSON.parse(fb) as { rating: number };
        if (parsed.rating > 0) {
          total += parsed.rating;
          count++;
        }
      }
    }
    if (!count) return null;
    return (total / count).toFixed(1);
  })();

  // Compute average visit duration
  const avgDurationLabel = (() => {
    const completed = chartVisitors.filter(
      (v) => v.exitTime != null && v.exitTime !== undefined,
    );
    if (completed.length === 0) return "—";
    const totalMs = completed.reduce((acc, v) => {
      const exit = v.exitTime as bigint;
      return acc + Number((exit - v.entryTime) / 1000000n);
    }, 0);
    const avgMin = Math.round(totalMs / completed.length / 60000);
    if (avgMin < 60) return `${avgMin} dk`;
    const h = Math.floor(avgMin / 60);
    const m = avgMin % 60;
    return m > 0 ? `${h}s ${m}dk` : `${h} saat`;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-header px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={company.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <div className="font-display font-semibold text-foreground text-sm">
              {company.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {company.sector} · Şirket Paneli
            </div>
          </div>
        </div>
        <button
          type="button"
          data-ocid="company_dash.logout.button"
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Çıkış
        </button>
      </header>

      <nav className="glass-header">
        <div className="flex px-4">
          <TabBtn
            active={tab === "visitors"}
            onClick={() => setTab("visitors")}
            ocid="company_dash.visitors.tab"
            icon={<Users className="w-4 h-4" />}
            label="Ziyaretçiler"
          />
          <TabBtn
            active={tab === "employees"}
            onClick={() => setTab("employees")}
            ocid="company_dash.employees.tab"
            icon={<Users className="w-4 h-4" />}
            label="Personel"
          />
          <TabBtn
            active={tab === "stats"}
            onClick={() => setTab("stats")}
            ocid="company_dash.stats.tab"
            icon={<BarChart3 className="w-4 h-4" />}
            label="İstatistikler"
          />
          <TabBtn
            active={tab === "info"}
            onClick={() => setTab("info")}
            ocid="company_dash.info.tab"
            icon={<Building2 className="w-4 h-4" />}
            label="Bilgiler"
          />
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {tab === "visitors" && (
          <VisitorList
            companyId={company.companyId}
            canCheckout={false}
            loginCode={company.loginCode}
          />
        )}
        {tab === "employees" && (
          <EmployeeManager
            companyId={company.companyId}
            loginCode={company.loginCode}
            isCompanyOwner={true}
            onResetPin={(empId, name) => {
              setResetPinTarget({ id: empId, name });
              setNewPin("");
              setConfirmPin("");
              setShowResetPinModal(true);
            }}
            onViewHistory={(empId, name) => {
              setLoginHistoryTarget({ id: empId, name });
              const raw = localStorage.getItem(`login_history_${empId}`);
              const hist = raw ? (JSON.parse(raw) as string[]) : [];
              setLoginHistory(hist.slice(-10).reverse());
              setShowLoginHistoryModal(true);
            }}
          />
        )}
        {tab === "stats" && (
          <div className="p-6 max-w-2xl space-y-6">
            {!stats ? (
              <div
                data-ocid="company_dash.stats.loading_state"
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
                <div className="h-28 bg-muted rounded-2xl animate-pulse" />
              </div>
            ) : (
              <div data-ocid="company_dash.stats.section" className="space-y-6">
                {/* Enhanced Dashboard Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    data-ocid="company_dash.today_visitors.card"
                    label="Bugün Ziyaretçi"
                    value={String(Number(stats.totalVisitorsToday))}
                    icon={<Users className="w-5 h-5" />}
                    color="blue"
                  />
                  <StatCard
                    data-ocid="company_dash.active_visitors.card"
                    label="Şu An Binada"
                    value={String(Number(stats.activeVisitorsToday))}
                    icon={<UserCheck className="w-5 h-5" />}
                    color="emerald"
                  />
                  <StatCard
                    data-ocid="company_dash.total_personnel.card"
                    label="Toplam Personel"
                    value={String(topPersons.length || 0)}
                    icon={<Users className="w-5 h-5" />}
                    color="primary"
                  />
                  <StatCard
                    data-ocid="company_dash.weekly_visitors.card"
                    label="Son 7 Gün"
                    value={String(
                      chartVisitors.filter((v) => {
                        const d = new Date(Number(v.entryTime / 1_000_000n));
                        const now = new Date();
                        const diff = (now.getTime() - d.getTime()) / 86400000;
                        return diff <= 7;
                      }).length,
                    )}
                    icon={<BarChart3 className="w-5 h-5" />}
                    color="amber"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <StatCard
                    data-ocid="company_dash.avg_duration.card"
                    label="Ort. Ziyaret Süresi"
                    value={avgDurationLabel}
                    icon={<Clock className="w-5 h-5" />}
                    color="amber"
                  />
                  {companyAvgSatisfaction !== null && (
                    <div
                      data-ocid="company_dash.avg_satisfaction.card"
                      className="rounded-2xl border p-5 bg-amber-500/15 border-amber-500/40"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-amber-500/20 text-amber-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="text-3xl font-display font-bold text-amber-400">
                        {companyAvgSatisfaction} ★
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Ort. Memnuniyet
                      </div>
                    </div>
                  )}
                </div>

                <div data-ocid="company_dash.weekly_chart.section">
                  <WeeklyVisitorChart visitors={chartVisitors} />
                </div>

                <div data-ocid="company_dash.hourly_chart.section">
                  <HourlyDensityChart visitors={chartVisitors} />
                </div>

                {purposeDist.length > 0 && (
                  <PurposeDistributionChart data={purposeDist} />
                )}

                {topPersons.length > 0 && (
                  <div
                    data-ocid="top_visited.panel"
                    className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Medal className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        En Çok Ziyaret Edilen Personel
                      </h3>
                    </div>
                    <div className="space-y-2.5">
                      {topPersons.map(([name, count], i) => {
                        const medalColor =
                          i === 0
                            ? "bg-amber-500/20 text-amber-400"
                            : i === 1
                              ? "bg-muted/60 text-muted-foreground"
                              : i === 2
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-muted text-muted-foreground";
                        return (
                          <div
                            key={name}
                            data-ocid={`top_visited.item.${i + 1}`}
                            className="flex items-center gap-3"
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${medalColor}`}
                            >
                              {i + 1}
                            </span>
                            <span className="flex-1 text-sm text-foreground truncate">
                              {name}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                              {String(count)} ziyaret
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {frequentVisitors.length > 0 && (
                  <div
                    data-ocid="company_dash.frequent_visitors.section"
                    className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
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
                          data-ocid={`company_dash.frequent_visitor.item.${i + 1}`}
                          className="flex items-center gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
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
                {/* Date Range PDF Report */}
                <div
                  data-ocid="date_report.panel"
                  className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Tarih Aralığı Raporu
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Seçilen tarih aralığındaki ziyaretleri PDF olarak indirin.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="crpt_start"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Başlangıç Tarihi
                      </label>
                      <input
                        id="crpt_start"
                        type="date"
                        data-ocid="date_report.start_input"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="crpt_end"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Bitiş Tarihi
                      </label>
                      <input
                        id="crpt_end"
                        type="date"
                        data-ocid="date_report.end_input"
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid="date_report.submit_button"
                    disabled={!reportStart || !reportEnd}
                    onClick={() => {
                      if (!company || !reportStart || !reportEnd) return;
                      const start = new Date(reportStart);
                      const end = new Date(reportEnd);
                      end.setHours(23, 59, 59, 999);
                      const filtered = chartVisitors.filter((v) => {
                        const d = new Date(
                          Number(v.entryTime / BigInt(1_000_000)),
                        );
                        return d >= start && d <= end;
                      });
                      const rows = filtered
                        .map((v, idx) => {
                          const entry = new Date(
                            Number(v.entryTime / BigInt(1_000_000)),
                          ).toLocaleString("tr-TR");
                          const exit = v.exitTime
                            ? new Date(
                                Number(v.exitTime / BigInt(1_000_000)),
                              ).toLocaleString("tr-TR")
                            : "—";
                          const purpose =
                            typeof v.visitPurpose === "string"
                              ? v.visitPurpose.replace(/^\[.*?\]\s*/, "")
                              : "";
                          const visiting =
                            typeof v.visitingPerson === "string"
                              ? v.visitingPerson
                              : "";
                          return `<tr><td>${idx + 1}</td><td>${v.name} ${v.surname}</td><td>${v.tcId}</td><td>${entry}</td><td>${exit}</td><td>${purpose}</td><td>${visiting}</td></tr>`;
                        })
                        .join("");
                      const printWin = window.open(
                        "",
                        "_blank",
                        "width=900,height=700",
                      );
                      if (!printWin) return;
                      printWin.document.write(
                        `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ziyaret Raporu</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:13px;font-weight:normal;color:#555;margin:4px 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}@media print{button{display:none}}</style></head><body><h1>${company.name} — Ziyaret Raporu</h1><h2>${reportStart} – ${reportEnd} · ${filtered.length} ziyaret</h2><table><thead><tr><th>#</th><th>Ad Soyad</th><th>TC Kimlik No</th><th>Giriş</th><th>Çıkış</th><th>Ziyaret Amacı</th><th>Ziyaret Edilen</th></tr></thead><tbody>${rows}</tbody></table><br/><button onclick="window.print()">Yazdır / PDF Kaydet</button></body></html>`,
                      );
                      printWin.document.close();
                      printWin.focus();
                    }}
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    PDF İndir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "info" && (
          <div
            data-ocid="company_dash.info.section"
            className="p-6 max-w-lg space-y-4"
          >
            {/* Logo Upload Section */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <ImagePlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Şirket Logosu
                </h3>
              </div>

              <div className="flex items-start gap-5">
                <div
                  data-ocid="company_dash.logo.card"
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/40 flex-shrink-0"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Şirket logosu"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Logo, ziyaretçi belgesinde ve panel başlığında görünür. PNG,
                    JPG veya SVG önerilir.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFileChange}
                    data-ocid="company_dash.logo.upload_button"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="company_dash.logo.secondary_button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs px-3 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
                    >
                      Dosya Seç
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        data-ocid="company_dash.logo.save_button"
                        onClick={handleLogoSave}
                        disabled={logoSaving || logoPreview === companyLogo}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {logoSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : logoPreview === companyLogo ? (
                          <Check className="w-3 h-3" />
                        ) : null}
                        {logoSaving
                          ? "Kaydediliyor..."
                          : logoPreview === companyLogo
                            ? "Kaydedildi"
                            : "Logo Kaydet"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Şirket Bilgileri
                  </h3>
                </div>
                <button
                  type="button"
                  data-ocid="company_dash.profile.edit_button"
                  onClick={openProfileEdit}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                >
                  <Pencil className="w-3 h-3" />
                  Profili Düzenle
                </button>
              </div>
              <InfoRow label="Şirket Adı" value={company.name} />
              <InfoRow label="Sektör" value={company.sector} />
              <InfoRow label="Adres" value={company.address} />
              <InfoRow label="Yetkili Kişi" value={company.contactPersonName} />
            </div>

            {/* Login Code */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Giriş Kodu
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Bu kodu personellerinizle paylaşarak sisteme giriş yapmalarını
                sağlayabilirsiniz.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm tracking-widest text-foreground select-all">
                  {company.loginCode}
                </div>
                <button
                  type="button"
                  data-ocid="company_dash.copy_login_code.button"
                  onClick={copyLoginCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
              </div>
            </div>

            {/* Working Hours Section */}
            <div
              data-ocid="company_dash.working_hours.panel"
              className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Çalışma Saatleri
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Mesai saatlerini tanımlayın. Bu saatler dışında kayıt yapılırken
                personele uyarı gösterilir.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="wh-start"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Mesai Başlangıcı
                  </label>
                  <input
                    id="wh-start"
                    type="time"
                    data-ocid="company_dash.working_hours.start.input"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor="wh-end"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Mesai Bitişi
                  </label>
                  <input
                    id="wh-end"
                    type="time"
                    data-ocid="company_dash.working_hours.end.input"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button
                type="button"
                data-ocid="company_dash.working_hours.save_button"
                onClick={() => {
                  if (!company) return;
                  localStorage.setItem(
                    `workinghours_${company.companyId}`,
                    JSON.stringify({
                      start: workingHoursStart,
                      end: workingHoursEnd,
                    }),
                  );
                  toast.success("Çalışma saatleri kaydedildi");
                }}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Kaydet
              </button>
            </div>

            {/* Visitor Limit */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Eşzamanlı Ziyaretçi Kapasitesi
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Aynı anda binada bulunabilecek maksimum ziyaretçi sayısını
                belirleyin. Limit aşıldığında personele uyarı gösterilir.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  data-ocid="company_dash.visitor_limit.input"
                  min={1}
                  max={500}
                  value={visitorLimit}
                  onChange={(e) => setVisitorLimit(Number(e.target.value))}
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  data-ocid="company_dash.visitor_limit.save_button"
                  disabled={visitorLimitSaving}
                  onClick={() => {
                    if (!company) return;
                    setVisitorLimitSaving(true);
                    localStorage.setItem(
                      `visitor_limit_${company.companyId}`,
                      String(visitorLimit),
                    );
                    toast.success("Kapasite limiti kaydedildi");
                    setTimeout(() => setVisitorLimitSaving(false), 500);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {visitorLimitSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Kaydet
                </button>
              </div>
            </div>

            {/* Announcement Board */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Duyuru Panosu
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm personele görünecek duyurular oluşturun. Son 10 duyuru
                saklanır.
              </p>
              <div className="space-y-2">
                <textarea
                  data-ocid="company_dash.announcement.textarea"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Duyuru metnini yazın..."
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <button
                  type="button"
                  data-ocid="company_dash.announcement.submit_button"
                  disabled={announcementPosting || !announcementText.trim()}
                  onClick={() => {
                    if (!company || !announcementText.trim()) return;
                    setAnnouncementPosting(true);
                    const updated = [
                      {
                        id: Date.now().toString(),
                        text: announcementText.trim(),
                        createdAt: new Date().toISOString(),
                        authorName: company.name,
                      },
                      ...announcements,
                    ].slice(0, 10);
                    localStorage.setItem(
                      `announcements_${company.companyId}`,
                      JSON.stringify(updated),
                    );
                    setAnnouncements(updated);
                    setAnnouncementText("");
                    toast.success("Duyuru yayınlandı");
                    setTimeout(() => setAnnouncementPosting(false), 300);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {announcementPosting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bell className="w-3 h-3" />
                  )}
                  Duyuru Yayınla
                </button>
              </div>
              {announcements.length === 0 ? (
                <div
                  data-ocid="company_dash.announcement.empty_state"
                  className="text-center py-6 text-xs text-muted-foreground"
                >
                  Henüz duyuru oluşturulmadı
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {announcements.map((ann, i) => (
                    <div
                      key={ann.id}
                      data-ocid={`company_dash.announcement.item.${i + 1}`}
                      className="flex items-start justify-between gap-2 bg-muted/30 border border-border rounded-xl p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {ann.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ann.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {ann.authorName}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-ocid={`company_dash.announcement.delete_button.${i + 1}`}
                        onClick={() => {
                          if (!company) return;
                          const updated = announcements.filter(
                            (a) => a.id !== ann.id,
                          );
                          localStorage.setItem(
                            `announcements_${company.companyId}`,
                            JSON.stringify(updated),
                          );
                          setAnnouncements(updated);
                          toast.success("Duyuru silindi");
                        }}
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KVKK/GDPR Retention Policy */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Veri Saklama Politikası (KVKK)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Ziyaretçi kayıtlarının saklanacağı maksimum süreyi belirleyin.
                Süresi dolan kayıtlar gösterimden kaldırılır.
              </p>
              <div className="flex items-center gap-3">
                <select
                  data-ocid="company_dash.retention.select"
                  value={retentionPeriod}
                  onChange={(e) => setRetentionPeriod(e.target.value)}
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="6 Ay">6 Ay</option>
                  <option value="1 Yıl">1 Yıl</option>
                  <option value="2 Yıl">2 Yıl</option>
                  <option value="Sınırsız">Sınırsız</option>
                </select>
                <button
                  type="button"
                  data-ocid="company_dash.retention.save_button"
                  disabled={retentionSaving}
                  onClick={() => {
                    if (!company) return;
                    setRetentionSaving(true);
                    localStorage.setItem(
                      `retention_${company.companyId}`,
                      retentionPeriod,
                    );
                    if (retentionPeriod !== "Sınırsız") {
                      const periodMs =
                        retentionPeriod === "6 Ay"
                          ? 6 * 30 * 24 * 3600 * 1000
                          : retentionPeriod === "1 Yıl"
                            ? 365 * 24 * 3600 * 1000
                            : 2 * 365 * 24 * 3600 * 1000;
                      localStorage.setItem(
                        `retention_cutoff_${company.companyId}`,
                        String(Date.now() - periodMs),
                      );
                    } else {
                      localStorage.removeItem(
                        `retention_cutoff_${company.companyId}`,
                      );
                    }
                    toast.success("Veri saklama politikası kaydedildi");
                    setTimeout(() => setRetentionSaving(false), 500);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {retentionSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Kaydet
                </button>
              </div>
            </div>

            {/* Role Permissions */}
            {company && <RolePermissions companyId={company.companyId} />}

            {/* Access Zones Section */}
            <div
              data-ocid="company_dash.access_zones.section"
              className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Erişim Bölgeleri
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Binalardaki kat veya bölge isimlerini tanımlayın. Ziyaretçi
                kaydında bu bölgeler seçilebilir.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  data-ocid="company_dash.access_zones.input"
                  value={newZoneInput}
                  onChange={(e) => setNewZoneInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const z = newZoneInput.trim();
                      if (z && !accessZones.includes(z)) {
                        const updated = [...accessZones, z];
                        setAccessZones(updated);
                        if (company)
                          localStorage.setItem(
                            `accessZones_${company.companyId}`,
                            JSON.stringify(updated),
                          );
                        setNewZoneInput("");
                      }
                    }
                  }}
                  placeholder="Örn: Kat 1, Toplantı Odası..."
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  data-ocid="company_dash.access_zones.add_button"
                  onClick={() => {
                    const z = newZoneInput.trim();
                    if (!z || accessZones.includes(z)) return;
                    const updated = [...accessZones, z];
                    setAccessZones(updated);
                    if (company)
                      localStorage.setItem(
                        `accessZones_${company.companyId}`,
                        JSON.stringify(updated),
                      );
                    setNewZoneInput("");
                    toast.success("Bölge eklendi");
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Ekle
                </button>
              </div>
              {accessZones.length === 0 ? (
                <p
                  data-ocid="company_dash.access_zones.empty_state"
                  className="text-xs text-muted-foreground text-center py-4"
                >
                  Henüz bölge tanımlanmamış
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accessZones.map((zone, idx) => (
                    <span
                      key={zone}
                      data-ocid={`company_dash.access_zones.item.${idx + 1}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      <MapPin className="w-3 h-3" />
                      {zone}
                      <button
                        type="button"
                        data-ocid={`company_dash.access_zones.delete_button.${idx + 1}`}
                        onClick={() => {
                          const updated = accessZones.filter((z) => z !== zone);
                          setAccessZones(updated);
                          if (company)
                            localStorage.setItem(
                              `accessZones_${company.companyId}`,
                              JSON.stringify(updated),
                            );
                          toast.success("Bölge silindi");
                        }}
                        className="ml-1 text-primary/60 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Blacklist Section */}
            <div
              data-ocid="company_dash.blacklist.section"
              className="bg-card/80 border border-border/60 rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Ban className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Kara Liste
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Kara listedeki TC kimlik numaraları ziyaretçi kaydı sırasında
                engellenir.
              </p>

              {/* Add form */}
              <form
                onSubmit={handleBlacklistFormSubmit}
                className="space-y-2 mb-4"
              >
                <div className="flex gap-2">
                  <input
                    data-ocid="company_dash.blacklist.tc.input"
                    value={blTcId}
                    onChange={(e) =>
                      setBlTcId(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="TC Kimlik No (11 hane)"
                    maxLength={11}
                    className="flex-1 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50 font-mono"
                  />
                  <button
                    type="submit"
                    data-ocid="company_dash.blacklist.add.button"
                    disabled={blAdding}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {blAdding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    Ekle
                  </button>
                </div>
                <input
                  data-ocid="company_dash.blacklist.reason.input"
                  value={blReason}
                  onChange={(e) => setBlReason(e.target.value)}
                  placeholder="Engelleme sebebi"
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50"
                />
              </form>

              {/* List */}
              {blacklistLoading ? (
                <div
                  data-ocid="company_dash.blacklist.loading_state"
                  className="space-y-2"
                >
                  <div className="h-10 bg-muted rounded-xl animate-pulse" />
                  <div className="h-10 bg-muted rounded-xl animate-pulse" />
                </div>
              ) : blacklist.length === 0 ? (
                <div
                  data-ocid="company_dash.blacklist.empty_state"
                  className="text-center py-8 text-muted-foreground"
                >
                  <Ban className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Kara listede kayıt yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blacklist.map((entry, i) => (
                    <div
                      key={entry.tcId}
                      data-ocid={`company_dash.blacklist.item.${i + 1}`}
                      className="flex items-start gap-3 p-3 bg-destructive/15 border border-destructive/30 rounded-xl"
                    >
                      <Ban className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-destructive">
                          {entry.tcId}
                        </p>
                        {entry.reason && (
                          <p className="text-xs text-red-600 mt-0.5 truncate">
                            {entry.reason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        data-ocid={`company_dash.blacklist.remove.button.${i + 1}`}
                        onClick={() => setConfirmBlacklistRemoveId(entry.tcId)}
                        className="p-1.5 text-destructive hover:text-destructive/80 hover:bg-destructive/15 rounded-lg transition-colors flex-shrink-0"
                        title="Listeden çıkar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Blacklist Add Confirmation Dialog */}
      <AlertDialog
        open={confirmBlacklistAddPending}
        onOpenChange={setConfirmBlacklistAddPending}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kara Listeye Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              Bu TC kimlik numarasını kara listeye eklemek istediğinizden emin
              misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="company_dash.blacklist_add.cancel_button">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="company_dash.blacklist_add.confirm_button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setConfirmBlacklistAddPending(false);
                handleBlacklistAdd();
              }}
            >
              Ekle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blacklist Remove Confirmation Dialog */}
      <AlertDialog
        open={!!confirmBlacklistRemoveId}
        onOpenChange={(open) => !open && setConfirmBlacklistRemoveId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kara Listeden Çıkar</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kişiyi kara listeden çıkarmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="company_dash.blacklist_remove.cancel_button">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="company_dash.blacklist_remove.confirm_button"
              onClick={() => {
                if (confirmBlacklistRemoveId) {
                  handleBlacklistRemove(confirmBlacklistRemoveId);
                }
                setConfirmBlacklistRemoveId(null);
              }}
            >
              Çıkar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div
          data-ocid="company_dash.profile.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  Şirket Profilini Düzenle
                </h3>
              </div>
              <button
                type="button"
                data-ocid="company_dash.profile.close_button"
                onClick={() => setShowProfileModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleProfileSave} className="space-y-3">
              {[
                {
                  id: "edit-name",
                  label: "Şirket Adı",
                  value: editName,
                  setter: setEditName,
                  ocid: "company_dash.profile.name.input",
                },
                {
                  id: "edit-sector",
                  label: "Sektör",
                  value: editSector,
                  setter: setEditSector,
                  ocid: "company_dash.profile.sector.input",
                },
                {
                  id: "edit-address",
                  label: "Adres",
                  value: editAddress,
                  setter: setEditAddress,
                  ocid: "company_dash.profile.address.input",
                },
                {
                  id: "edit-contact",
                  label: "Yetkili Kişi",
                  value: editContact,
                  setter: setEditContact,
                  ocid: "company_dash.profile.contact.input",
                },
              ].map((f) => (
                <div key={f.id} className="space-y-1">
                  <label
                    htmlFor={f.id}
                    className="block text-xs font-medium text-foreground"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    data-ocid={f.ocid}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50 text-foreground"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  data-ocid="company_dash.profile.cancel_button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  data-ocid="company_dash.profile.save_button"
                  disabled={profileSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {profileSaving && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {profileSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PIN Reset Modal */}
      {showResetPinModal && resetPinTarget && (
        <div
          data-ocid="company_dash.reset_pin.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">
                    PIN Sıfırla
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {resetPinTarget.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-ocid="company_dash.reset_pin.close_button"
                onClick={() => setShowResetPinModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPin || newPin.length < 4) {
                  toast.error("PIN en az 4 karakter olmalıdır");
                  return;
                }
                if (newPin !== confirmPin) {
                  toast.error("PIN'ler eşleşmiyor");
                  return;
                }
                setPinResetSaving(true);
                try {
                  await (
                    backend as {
                      setEmployeePin: (
                        id: string,
                        pin: string,
                      ) => Promise<void>;
                    }
                  ).setEmployeePin(resetPinTarget.id, newPin);
                  localStorage.setItem(`pin_set_${resetPinTarget.id}`, "1");
                  toast.success("PIN başarıyla sıfırlandı");
                  setShowResetPinModal(false);
                  setNewPin("");
                  setConfirmPin("");
                } catch {
                  toast.error("PIN sıfırlanamadı");
                } finally {
                  setPinResetSaving(false);
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label
                  htmlFor="new-pin-input"
                  className="text-xs font-medium text-foreground"
                >
                  Yeni PIN
                </label>
                <input
                  id="new-pin-input"
                  type="password"
                  data-ocid="company_dash.reset_pin.new.input"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Yeni PIN girin"
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="confirm-pin-input"
                  className="text-xs font-medium text-foreground"
                >
                  PIN Tekrar
                </label>
                <input
                  id="confirm-pin-input"
                  type="password"
                  data-ocid="company_dash.reset_pin.confirm.input"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="PIN'i tekrar girin"
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50 text-foreground"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  data-ocid="company_dash.reset_pin.cancel_button"
                  onClick={() => setShowResetPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  data-ocid="company_dash.reset_pin.save_button"
                  disabled={pinResetSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {pinResetSaving && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Sıfırla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login History Modal */}
      {showLoginHistoryModal && loginHistoryTarget && (
        <div
          data-ocid="company_dash.login_history.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <History className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">
                    Oturum Geçmişi
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {loginHistoryTarget.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-ocid="company_dash.login_history.close_button"
                onClick={() => setShowLoginHistoryModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {loginHistory.length === 0 ? (
              <div
                data-ocid="company_dash.login_history.empty_state"
                className="text-center py-8 text-muted-foreground"
              >
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Kayıtlı oturum geçmişi yok</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  <span>Tarih / Saat</span>
                  <span>Durum</span>
                </div>
                {loginHistory.map((ts, i) => (
                  <div
                    key={ts}
                    data-ocid={`company_dash.login_history.item.${i + 1}`}
                    className="grid grid-cols-2 gap-2 px-3 py-2.5 text-sm rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-foreground font-mono text-xs">
                      {new Date(ts).toLocaleString("tr-TR")}
                    </span>
                    <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Başarılı Giriş
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                data-ocid="company_dash.login_history.close_button"
                onClick={() => setShowLoginHistoryModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">
        {value || "—"}
      </span>
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
          ? "border-primary text-primary"
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
  "data-ocid": dataOcid,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "emerald" | "blue" | "amber";
  "data-ocid"?: string;
}) {
  const colorMap = {
    primary: {
      card: "stat-card-teal",
      icon: "bg-primary/20 text-primary",
      value: "text-primary",
    },
    emerald: {
      card: "stat-card-emerald",
      icon: "bg-emerald-500/20 text-emerald-400",
      value: "text-emerald-400",
    },
    blue: {
      card: "stat-card-blue",
      icon: "bg-violet-500/20 text-violet-400",
      value: "text-violet-400",
    },
    amber: {
      card: "stat-card-amber",
      icon: "bg-amber-500/20 text-amber-400",
      value: "text-amber-400",
    },
  };
  const c = colorMap[color];
  return (
    <div data-ocid={dataOcid} className={`rounded-2xl p-5 ${c.card}`}>
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
