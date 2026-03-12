import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Key,
  KeyRound,
  Link2,
  List,
  Loader2,
  LogOut,
  MapPin,
  Medal,
  Package,
  Plus,
  Repeat2,
  Shield,
  SmilePlus,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import AssetManager, {
  hasUnreturnedAssets,
  loadAssets,
} from "../components/AssetManager";
import EmployeeManager from "../components/EmployeeManager";
import HourlyDensityChart from "../components/HourlyDensityChart";
import KioskMode from "../components/KioskMode";
import PurposeDistributionChart from "../components/PurposeDistributionChart";
import { loadRolePermissions } from "../components/RolePermissions";
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
  | "davetler"
  | "kayitlar"
  | "sira"
  | "duyuru"
  | "approvals";

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

  // Queue Management State
  interface QueueEntry {
    id: string;
    number: number;
    name: string;
    purpose: string;
    status: "waiting" | "called";
    addedAt: Date;
  }
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [queueCounter, setQueueCounter] = useState(1);
  const [queueName, setQueueName] = useState("");
  const [queuePurpose, setQueuePurpose] = useState("");
  const [employee, setEmployee] = useState<{
    employeeId: string;
    name: string;
    surname: string;
  } | null>(null);
  const [company, setCompany] = useState<{
    companyId: string;
    companyName: string;
    loginCode?: string;
  } | null>(null);
  const [role, setRole] = useState<string>("registrar");
  const [stats, setStats] = useState<{
    totalVisitors: bigint;
    activeVisitorsToday: bigint;
    totalVisitorsToday: bigint;
  } | null>(null);
  const [topPersons, setTopPersons] = useState<[string, bigint][]>([]);
  const [chartVisitors, setChartVisitors] = useState<Visitor[]>([]);
  const [purposeDist, setPurposeDist] = useState<[string, bigint][]>([]);
  const [totalPersonnel, setTotalPersonnel] = useState(0);
  const [todayMyVisitors, setTodayMyVisitors] = useState(0);
  const [allMyVisitorsCount, setAllMyVisitorsCount] = useState(0);

  // Security screen state
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetVisitorId, setAssetVisitorId] = useState<string | null>(null);
  const [assetVisitorName, setAssetVisitorName] = useState("");
  const securityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Evacuation modal
  const [showEvacuation, setShowEvacuation] = useState(false);

  // Date range PDF report
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  // PIN change modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");

  // Visitor notification banner
  const [myActiveVisitors, setMyActiveVisitors] = useState<Visitor[]>([]);

  // Feature: Availability Status
  const [availability, setAvailability] = useState<
    "available" | "in_meeting" | "out_of_office"
  >(() => {
    const emp = JSON.parse(
      sessionStorage.getItem("safentry_employee") || "null",
    );
    if (!emp) return "available";
    return (
      (localStorage.getItem(`availability_${emp.employeeId}`) as
        | "available"
        | "in_meeting"
        | "out_of_office") || "available"
    );
  });
  const [companyEmployees, setCompanyEmployees] = useState<
    Array<{
      employeeId: string;
      name: string;
      surname: string;
      availability: string;
    }>
  >([]);

  // Feature: Working Hours Warning
  const [outsideWorkingHours, setOutsideWorkingHours] = useState(false);

  // Feature: Post-Visit Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackVisitorId, setFeedbackVisitorId] = useState("");
  const [feedbackVisitorName, setFeedbackVisitorName] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState("");

  // Feature: Bulk CSV Upload
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvTotal, setCsvTotal] = useState(0);
  const [csvResult, setCsvResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

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
  const [createAppointmentDate, setCreateAppointmentDate] = useState("");
  const [createAppointmentTime, setCreateAppointmentTime] = useState("");

  // Announcement banner state
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<
    string | null
  >(null);

  // Host Approvals state
  const [pendingApprovals, setPendingApprovals] = useState<
    Array<{
      visitorId: string;
      name: string;
      surname: string;
      visitingPerson: string;
      visitPurpose: string;
      entryTime: bigint;
    }>
  >([]);

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

  // Load company employees for availability display
  useEffect(() => {
    if (!company) return;
    backend
      .getCompanyEmployees(company.companyId)
      .then((emps) => {
        const list = (
          emps as {
            role: string;
            employee: { employeeId: string; name: string; surname: string };
          }[]
        ).map((e) => ({
          employeeId: e.employee.employeeId,
          name: e.employee.name,
          surname: e.employee.surname,
          availability:
            localStorage.getItem(`availability_${e.employee.employeeId}`) ||
            "available",
        }));
        setCompanyEmployees(list);
      })
      .catch(() => {});
  }, [company]);

  // Check working hours
  useEffect(() => {
    if (!company) return;
    const wh = localStorage.getItem(`workinghours_${company.companyId}`);
    if (!wh) return;
    const { start, end } = JSON.parse(wh) as { start: string; end: string };
    const now = new Date();
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    setOutsideWorkingHours(nowMins < startMins || nowMins > endMins);
  }, [company]);

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

  const handleAvailabilityChange = (
    status: "available" | "in_meeting" | "out_of_office",
  ) => {
    setAvailability(status);
    if (employee) {
      localStorage.setItem(`availability_${employee.employeeId}`, status);
    }
  };

  const handleJoinWithInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Davet kodu gerekli");
      return;
    }
    setJoining(true);
    try {
      const fn = backend.usePersonnelInviteCode.bind(backend);
      await fn(joinCode.trim());
      toast.success("Şirkete başarıyla katıldınız! Sayfayı yenileyiniz.");
      setShowJoinModal(false);
      setJoinCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already used"))
        toast.error("Bu davet kodu zaten kullanılmış");
      else if (msg.includes("Invalid")) toast.error("Geçersiz davet kodu");
      else toast.error("Katılanamadı");
    } finally {
      setJoining(false);
    }
  };

  const handleSecurityCheckout = async (visitorId: string) => {
    if (!company) return;
    setCheckingOutId(visitorId);
    try {
      await backend.checkoutVisitor(visitorId, company.companyId);
      toast.success("Çıkış işlemi tamamlandı");
      // Find visitor name for feedback modal
      const visitor = activeVisitors.find((v) => v.visitorId === visitorId);
      if (visitor) {
        setFeedbackVisitorId(visitorId);
        setFeedbackVisitorName(`${visitor.name} ${visitor.surname}`);
        setFeedbackRating(0);
        setFeedbackNote("");
        setShowFeedbackModal(true);
      }
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
        .getTopVisitedPersons(c.companyId, BigInt(10))
        .then((r) => setTopPersons(r as [string, bigint][]))
        .catch(() => {}),
      backend
        .getVisitors(c.companyId)
        .then((r) => {
          const visitors = r as unknown as Visitor[];
          setChartVisitors(visitors);
          // Compute purpose distribution from visitors
          const purposeMap = new Map<string, bigint>();
          for (const v of visitors) {
            const purpose = v.visitPurpose || "Belirtilmemiş";
            purposeMap.set(purpose, (purposeMap.get(purpose) ?? 0n) + 1n);
          }
          setPurposeDist(Array.from(purposeMap.entries()));
        })
        .catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (company && tab === "stats") {
      loadStats(company);
    }
  }, [company, tab, loadStats]);

  // Load total personnel count for owner
  useEffect(() => {
    if (!company) return;
    backend
      .getCompanyEmployees(company.companyId)
      .then((emps) => setTotalPersonnel((emps as unknown[]).length))
      .catch(() => {});
  }, [company]);

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
    if (company && tab === "kayitlar") {
      setAuditLoading(true);
      backend
        .getAuditLogs(company.companyId)
        .then((logs) => {
          const sorted = [...logs].sort((a, b) =>
            Number(b.timestamp - a.timestamp),
          );
          setAuditLogs(sorted);
        })
        .catch(() => setAuditLogs([]))
        .finally(() => setAuditLoading(false));
    }
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
    // Check appointment conflict
    if (createAppointmentDate && createAppointmentTime) {
      const conflict = invites.some((inv) => {
        const appt = localStorage.getItem(`appt_${inv.inviteCode}`);
        if (!appt) return false;
        const { date, time } = JSON.parse(appt) as {
          date: string;
          time: string;
        };
        return (
          date === createAppointmentDate &&
          time === createAppointmentTime &&
          inv.status === "pending"
        );
      });
      if (conflict) {
        toast.warning(
          "Bu saatte başka bir randevu var, devam etmek istiyor musunuz?",
        );
      }
    }
    setCreating(true);
    try {
      const code = await backend.createInvite(
        company.companyId,
        createVisitingPerson.trim(),
        createVisitPurpose,
      );
      // Store appointment info
      if (createAppointmentDate && createAppointmentTime && code) {
        localStorage.setItem(
          `appt_${code}`,
          JSON.stringify({
            date: createAppointmentDate,
            time: createAppointmentTime,
          }),
        );
      }
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

  const handleFeedbackSubmit = () => {
    if (feedbackRating > 0) {
      localStorage.setItem(
        `feedback_${feedbackVisitorId}`,
        JSON.stringify({
          rating: feedbackRating,
          note: feedbackNote,
          timestamp: Date.now(),
        }),
      );
      toast.success("Değerlendirme kaydedildi");
    }
    setShowFeedbackModal(false);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company || !employee) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      toast.error("CSV dosyası boş veya hatalı");
      return;
    }
    const dataLines = lines.slice(1); // skip header
    setCsvTotal(dataLines.length);
    setCsvProgress(0);
    setCsvResult(null);
    setCsvUploading(true);
    let successCount = 0;
    let failedCount = 0;
    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map((c) => c.trim());
      const [name, surname, tcId, phone, visitingPerson, visitPurpose] = cols;
      if (!name || !surname || !tcId) {
        failedCount++;
        setCsvProgress(i + 1);
        continue;
      }
      try {
        await backend.registerVisitor(
          company.companyId,
          name,
          surname,
          tcId,
          phone || "",
          visitingPerson || "",
          visitPurpose || "Toplantı",
          "bulk-import",
          null,
        );
        successCount++;
      } catch {
        failedCount++;
      }
      setCsvProgress(i + 1);
    }
    setCsvUploading(false);
    setCsvResult({ success: successCount, failed: failedCount });
    if (csvFileInputRef.current) csvFileInputRef.current.value = "";
  };

  const downloadSampleCsv = () => {
    const csv =
      "ad,soyad,tcId,telefon,ziyaretEdilen,ziyaretAmaci\nAhmet,Yılmaz,12345678901,05301234567,Mehmet Demir,Toplantı\nAyşe,Kaya,98765432109,05449876543,Ali Veli,Mülakat";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ornek_ziyaretci_listesi.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const canManageEmployees = role === "owner";
  const rolePerms = company ? loadRolePermissions(company.companyId) : null;
  const canViewStats =
    role === "owner" ||
    (role === "authorized" && (rolePerms?.authorized.reportsAccess ?? true)) ||
    (role === "registrar" && (rolePerms?.registrar.reportsAccess ?? false));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canManageBlacklist =
    role === "owner" ||
    (role === "authorized" &&
      (rolePerms?.authorized.blacklistManage ?? true)) ||
    (role === "registrar" && (rolePerms?.registrar.blacklistManage ?? false));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canExport =
    role === "owner" ||
    (role === "authorized" && (rolePerms?.authorized.exportData ?? true)) ||
    (role === "registrar" && (rolePerms?.registrar.exportData ?? false));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _canViewAnnouncements =
    role === "owner" ||
    (role === "authorized" &&
      (rolePerms?.authorized.viewAnnouncements ?? true)) ||
    (role === "registrar" && (rolePerms?.registrar.viewAnnouncements ?? true));

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

  // Compute avg satisfaction from feedback
  const avgSatisfaction = (() => {
    const visitors = chartVisitors;
    if (!visitors.length) return null;
    let total = 0;
    let count = 0;
    for (const v of visitors) {
      const fb = localStorage.getItem(`feedback_${v.visitorId}`);
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

  const inviteLink = (code: string) =>
    `${window.location.origin}${window.location.pathname}?invite=${code}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-header px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <span className="text-sm font-display font-bold text-emerald-400">
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
            data-ocid="kiosk.open_modal_button"
            onClick={() => setKioskMode(true)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-lg transition-colors border border-primary/30"
            title="Kiosk Modu"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kiosk</span>
          </button>
          <button
            type="button"
            data-ocid="employee_dash.join_company.button"
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
            title="Davet Koduyla Şirkete Katıl"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Katıl</span>
          </button>
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
          className="flex items-start gap-2 px-4 py-2.5 bg-primary/15 border-b border-primary/20 text-primary"
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
        className="flex items-center gap-4 px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300"
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            Bugün: <span className="font-bold">{todayMyVisitors}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            Aktif: <span className="font-bold">{myActiveVisitors.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            Toplam: <span className="font-bold">{allMyVisitorsCount}</span>
          </span>
        </div>
        {canManageEmployees && (
          <div
            data-ocid="employee_dash.personnel_count.card"
            className="flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium">
              Personel: <span className="font-bold">{totalPersonnel}</span>
            </span>
          </div>
        )}
      </div>

      {/* Availability Status Card */}
      <div className="flex items-center gap-3 px-4 py-2 glass-header">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <SmilePlus className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Durumunuz:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["available", "in_meeting", "out_of_office"] as const).map(
            (status) => {
              const labels = {
                available: "Uygun",
                in_meeting: "Toplantıda",
                out_of_office: "Dışarıda",
              };
              const colors = {
                available:
                  availability === status
                    ? "bg-green-600 text-white border-green-600"
                    : "text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/15",
                in_meeting:
                  availability === status
                    ? "bg-amber-500 text-white border-amber-500"
                    : "text-amber-400 border-amber-500/40 hover:bg-amber-500/15",
                out_of_office:
                  availability === status
                    ? "bg-red-600 text-white border-red-600"
                    : "text-red-400 border-red-500/40 hover:bg-red-500/15",
              };
              return (
                <button
                  key={status}
                  type="button"
                  data-ocid={`availability.${status}.toggle`}
                  onClick={() => handleAvailabilityChange(status)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${colors[status]}`}
                >
                  {labels[status]}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Working Hours Warning */}
      {/* Announcement Banner */}
      {company &&
        (() => {
          const ann = localStorage.getItem(
            `announcements_${company.companyId}`,
          );
          if (!ann) return null;
          const list = JSON.parse(ann) as {
            id: string;
            text: string;
            createdAt: string;
            authorName: string;
          }[];
          const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
          const recent = list.filter(
            (a) => new Date(a.createdAt).getTime() > sevenDaysAgo,
          );
          if (!recent.length) return null;
          const latest = recent[0];
          if (dismissedAnnouncementId === latest.id) return null;
          return (
            <div className="mx-4 mt-2 flex items-start gap-3 bg-amber-500/15 border border-amber-500/40 rounded-xl px-4 py-3">
              <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-300">Duyuru</p>
                <p className="text-xs text-amber-300/80 line-clamp-2">
                  {latest.text}
                </p>
              </div>
              <button
                type="button"
                data-ocid="announcement_banner.close_button"
                onClick={() => setDismissedAnnouncementId(latest.id)}
                className="flex-shrink-0 text-amber-500 hover:text-amber-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

      {outsideWorkingHours && tab === "register" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-300">
          <span className="text-xs font-medium">
            ⚠ Mesai saatleri dışında kayıt yapılıyor
          </span>
        </div>
      )}

      <nav className="glass-header">
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
          {role === "owner" && (
            <TabBtn
              active={tab === "kayitlar"}
              onClick={() => setTab("kayitlar")}
              ocid="audit.tab"
              icon={<BookOpen className="w-4 h-4" />}
              label="Kayıtlar"
            />
          )}
          <TabBtn
            active={tab === "sira"}
            onClick={() => setTab("sira")}
            ocid="employee_dash.sira.tab"
            icon={<Users className="w-4 h-4" />}
            label="Sıra"
          />
          <TabBtn
            active={tab === "duyuru"}
            onClick={() => setTab("duyuru")}
            ocid="employee_dash.duyuru.tab"
            icon={<Bell className="w-4 h-4" />}
            label="Duyurular"
          />
          <TabBtn
            active={tab === "approvals"}
            onClick={() => {
              setTab("approvals");
              // Load pending approvals for current employee
              if (employee && company) {
                const fullName = `${employee.name} ${employee.surname}`;
                backend
                  .getVisitors(company.companyId)
                  .then((visitors) => {
                    const pending = (visitors as any[])
                      .filter((v: any) => {
                        if (!v.exitTime && v.visitingPerson === fullName) {
                          const status = localStorage.getItem(
                            `hostApproval_${v.visitorId}`,
                          );
                          return status === "pending";
                        }
                        return false;
                      })
                      .map((v: any) => ({
                        visitorId: v.visitorId,
                        name: v.name,
                        surname: v.surname,
                        visitingPerson: v.visitingPerson,
                        visitPurpose:
                          typeof v.visitPurpose === "string"
                            ? v.visitPurpose
                            : "",
                        entryTime: v.entryTime,
                      }));
                    setPendingApprovals(pending);
                  })
                  .catch(() => setPendingApprovals([]));
              }
            }}
            ocid="employee_dash.approvals.tab"
            icon={<ThumbsUp className="w-4 h-4" />}
            label="Onaylar"
          />
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {tab === "register" && (
          <div>
            {company &&
              (() => {
                const lim = localStorage.getItem(
                  `visitor_limit_${company.companyId}`,
                );
                const limit = lim ? Number(lim) : 50;
                const active = stats ? Number(stats.activeVisitorsToday) : 0;
                if (active >= limit) {
                  return (
                    <div className="mx-4 mt-2 flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Maksimum eşzamanlı ziyaretçi sayısına ulaşıldı ({limit}{" "}
                        kişi)
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            <VisitorRegisterForm
              companyId={company.companyId}
              employeeId={employee.employeeId}
            />
            {companyEmployees.length > 0 && (
              <div className="px-4 pb-4 max-w-lg">
                <div
                  data-ocid="availability.panel"
                  className="bg-card/80 border border-border/60 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Personel Durumları
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {companyEmployees.slice(0, 10).map((emp) => {
                      const statusColors = {
                        available:
                          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                        in_meeting:
                          "bg-amber-500/15 text-amber-400 border-amber-500/30",
                        out_of_office:
                          "bg-red-500/15 text-red-400 border-red-500/30",
                      };
                      const statusLabels = {
                        available: "Uygun",
                        in_meeting: "Toplantıda",
                        out_of_office: "Dışarıda",
                      };
                      const st =
                        (emp.availability as
                          | "available"
                          | "in_meeting"
                          | "out_of_office") || "available";
                      return (
                        <div
                          key={emp.employeeId}
                          data-ocid="availability.employee.item"
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${statusColors[st]}`}
                        >
                          <span className="font-medium truncate flex-1">
                            {emp.name} {emp.surname}
                          </span>
                          <span className="flex-shrink-0 opacity-75">
                            {statusLabels[st]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "list" && (
          <VisitorList companyId={company.companyId} canCheckout={true} />
        )}
        {tab === "security" && (
          <div className="p-4">
            {/* Evacuation Modal */}
            {showEvacuation && (
              <dialog
                data-ocid="evacuation.modal"
                open
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 m-0 max-w-none w-full h-full border-0 print:bg-transparent print:static print:block"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowEvacuation(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowEvacuation(false);
                }}
              >
                <div className="glass-panel rounded-2xl shadow-elevated w-full max-w-2xl mx-4 overflow-hidden print:shadow-none print:rounded-none print:max-w-full print:mx-0">
                  <div className="flex items-center justify-between p-5 border-b border-border print:hidden">
                    <div>
                      <h2 className="font-semibold text-foreground">
                        Tahliye Listesi
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeVisitors.length} aktif ziyaretçi
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-ocid="evacuation.print_button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      >
                        🖨 Yazdır
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEvacuation(false)}
                        className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                  {/* Printable area */}
                  <div className="p-5 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible">
                    <div className="print-only hidden print:block mb-4">
                      <h1 className="text-lg font-bold">
                        {company?.companyName} — ACİL TAHLİYE LİSTESİ
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleString("tr-TR")}
                      </p>
                    </div>
                    {activeVisitors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Binada aktif ziyaretçi yok
                      </p>
                    ) : (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2 border-border">
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground">
                              Sıra
                            </th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground">
                              Ad Soyad
                            </th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                              TC Kimlik No
                            </th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground">
                              Giriş Saati
                            </th>
                            <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                              Ziyaret Edilen
                            </th>
                            <th className="text-left py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                              Telefon
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeVisitors.map((v, i) => {
                            const evacComps = (() => {
                              try {
                                const r = localStorage.getItem(
                                  `companions_${v.visitorId}`,
                                );
                                return r
                                  ? (JSON.parse(r) as {
                                      name: string;
                                      tcId?: string;
                                    }[])
                                  : [];
                              } catch {
                                return [] as { name: string; tcId?: string }[];
                              }
                            })();
                            return (
                              <>
                                <tr
                                  key={v.visitorId}
                                  className="border-b border-border/50 last:border-0"
                                >
                                  <td className="py-2 pr-3 text-muted-foreground font-medium">
                                    {i + 1}
                                  </td>
                                  <td className="py-2 pr-3 font-medium">
                                    {v.name} {v.surname}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground hidden sm:table-cell">
                                    {v.tcId}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground">
                                    {new Date(
                                      Number(v.entryTime / BigInt(1_000_000)),
                                    ).toLocaleTimeString("tr-TR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-2 pr-3 text-muted-foreground hidden md:table-cell">
                                    {typeof v.visitingPerson === "string"
                                      ? v.visitingPerson
                                      : ""}
                                  </td>
                                  <td className="py-2 text-muted-foreground hidden md:table-cell">
                                    {typeof v.phone === "string" ? v.phone : ""}
                                  </td>
                                </tr>
                                {evacComps.map((c, ci) => (
                                  <tr
                                    key={`${v.visitorId}_c${ci}`}
                                    className="border-b border-border/30"
                                  >
                                    <td className="py-1 pr-3 text-muted-foreground text-[10px]">
                                      {i + 1}.{ci + 1}
                                    </td>
                                    <td className="py-1 pr-3 text-xs text-muted-foreground italic">
                                      {c.name}{" "}
                                      <span className="text-[10px] opacity-60">
                                        (refakatçi)
                                      </span>
                                    </td>
                                    <td className="py-1 pr-3 text-xs text-muted-foreground hidden sm:table-cell font-mono">
                                      {c.tcId || "—"}
                                    </td>
                                    <td className="py-1 pr-3 text-xs text-muted-foreground">
                                      —
                                    </td>
                                    <td className="py-1 pr-3 hidden md:table-cell" />
                                    <td className="py-1 hidden md:table-cell" />
                                  </tr>
                                ))}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </dialog>
            )}

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Güvenlik Ekranı
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Binada aktif olan ziyaretçiler · Her 30 saniyede güncellenir
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="evacuation.open_modal_button"
                  onClick={() => setShowEvacuation(true)}
                  disabled={activeVisitors.length === 0}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  🚨 Tahliye Listesi
                </button>
                <button
                  type="button"
                  onClick={() => loadActiveVisitors(company.companyId)}
                  className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Yenile
                </button>
              </div>
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
                className="bg-card/80 border border-border/60 rounded-2xl overflow-hidden backdrop-blur-sm"
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
                            <div className="font-medium text-foreground text-sm flex items-center gap-1.5 flex-wrap">
                              {v.name} {v.surname}
                              {(() => {
                                const comps = (() => {
                                  try {
                                    const r = localStorage.getItem(
                                      `companions_${v.visitorId}`,
                                    );
                                    return r ? JSON.parse(r) : [];
                                  } catch {
                                    return [];
                                  }
                                })();
                                return comps.length > 0 ? (
                                  <span
                                    className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-blue-200"
                                    title={comps
                                      .map((c: { name: string }) => c.name)
                                      .join(", ")}
                                  >
                                    +{comps.length}
                                  </span>
                                ) : null;
                              })()}
                              {(() => {
                                const tag = localStorage.getItem(
                                  `visitorTag_${v.visitorId}`,
                                );
                                if (!tag) return null;
                                const tagColors: Record<string, string> = {
                                  VIP: "bg-amber-500/20 text-amber-400 border-amber-500/40",
                                  Dikkat:
                                    "bg-orange-500/20 text-orange-400 border-orange-500/40",
                                  Kısıtlı:
                                    "bg-red-500/20 text-red-400 border-red-500/40",
                                };
                                return (
                                  <span
                                    className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${tagColors[tag] || "bg-muted/60 text-foreground/80 border-border"}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              {parseVisitorTypeBadge(v.visitPurpose)}
                              {(() => {
                                const status = localStorage.getItem(
                                  `hostApproval_${v.visitorId}`,
                                );
                                if (!status || status === "none") return null;
                                const statusConfig: Record<
                                  string,
                                  { label: string; cls: string }
                                > = {
                                  pending: {
                                    label: "⏳ Onay Bekliyor",
                                    cls: "text-amber-400 bg-amber-500/15 border-amber-500/40",
                                  },
                                  approved: {
                                    label: "✓ Onaylandı",
                                    cls: "text-emerald-700 bg-emerald-50 border-primary/30",
                                  },
                                  rejected: {
                                    label: "✗ Reddedildi",
                                    cls: "text-red-400 bg-red-500/15 border-red-500/30",
                                  },
                                };
                                const cfg = statusConfig[status];
                                if (!cfg) return null;
                                return (
                                  <span
                                    className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.cls}`}
                                  >
                                    {cfg.label}
                                  </span>
                                );
                              })()}
                              {(() => {
                                const zone = localStorage.getItem(
                                  `visitorZone_${v.visitorId}`,
                                );
                                if (!zone) return null;
                                return (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium bg-blue-500/15 text-blue-400 border-blue-500/30">
                                    <MapPin className="w-2.5 h-2.5" /> {zone}
                                  </span>
                                );
                              })()}
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
                            <div className="text-xs text-emerald-400 font-medium mt-0.5">
                              {elapsedTime(v.entryTime)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {(role === "owner" || role === "authorized") && (
                                <div className="relative">
                                  <select
                                    data-ocid={`security.tag.select.${i + 1}`}
                                    value={
                                      localStorage.getItem(
                                        `visitorTag_${v.visitorId}`,
                                      ) || ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        localStorage.setItem(
                                          `visitorTag_${v.visitorId}`,
                                          val,
                                        );
                                      } else {
                                        localStorage.removeItem(
                                          `visitorTag_${v.visitorId}`,
                                        );
                                      }
                                      // Force re-render
                                      setActiveVisitors((prev) => [...prev]);
                                    }}
                                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                                  >
                                    <option value="">Etiket</option>
                                    <option value="VIP">⭐ VIP</option>
                                    <option value="Dikkat">⚠️ Dikkat</option>
                                    <option value="Kısıtlı">🚫 Kısıtlı</option>
                                  </select>
                                </div>
                              )}
                              <button
                                type="button"
                                data-ocid={`security.asset.open_modal_button.${i + 1}`}
                                onClick={() => {
                                  setAssetVisitorId(v.visitorId);
                                  setAssetVisitorName(`${v.name} ${v.surname}`);
                                  setShowAssetModal(true);
                                }}
                                title="Zimmet/Teslim Takibi"
                                className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${
                                  hasUnreturnedAssets(v.visitorId)
                                    ? "text-orange-700 bg-orange-50 hover:bg-orange-100"
                                    : "text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                <Package className="w-3.5 h-3.5" />
                                {(() => {
                                  const assets = loadAssets(v.visitorId);
                                  const unreturned = assets.filter(
                                    (a) => a.status === "given",
                                  ).length;
                                  return unreturned > 0 ? (
                                    <span className="bg-orange-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                      {unreturned}
                                    </span>
                                  ) : null;
                                })()}
                              </button>
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
                className="bg-card/80 border border-border/60 rounded-2xl overflow-hidden backdrop-blur-sm"
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
                            {(() => {
                              const appt = localStorage.getItem(
                                `appt_${inv.inviteCode}`,
                              );
                              if (!appt) return null;
                              const { date, time } = JSON.parse(appt) as {
                                date: string;
                                time: string;
                              };
                              return (
                                <div className="text-xs text-primary mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {date} {time}
                                </div>
                              );
                            })()}
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
                                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-primary/30 px-2.5 py-1.5 rounded-lg transition-colors"
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

            {/* Bulk CSV Upload Section */}
            <div
              data-ocid="csv_upload.panel"
              className="mt-4 bg-card/80 border border-border/60 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Toplu CSV ile Ön Kayıt
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                CSV formatı:{" "}
                <span className="font-mono bg-muted px-1 rounded">
                  ad,soyad,tcId,telefon,ziyaretEdilen,ziyaretAmaci
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <label
                  htmlFor="csv-file-input"
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors ${csvUploading ? "bg-muted text-muted-foreground" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {csvUploading
                    ? `${csvProgress}/${csvTotal} işleniyor...`
                    : "CSV Yükle"}
                  <input
                    id="csv-file-input"
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    data-ocid="csv_upload.upload_button"
                    className="hidden"
                    disabled={csvUploading}
                    onChange={handleCsvUpload}
                  />
                </label>
                <button
                  type="button"
                  data-ocid="csv_upload.download_sample_csv.button"
                  onClick={downloadSampleCsv}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Örnek CSV İndir
                </button>
              </div>
              {csvUploading && (
                <div
                  data-ocid="csv_upload.loading_state"
                  className="w-full bg-muted rounded-full h-1.5 mb-2"
                >
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{
                      width:
                        csvTotal > 0
                          ? `${(csvProgress / csvTotal) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              )}
              {csvResult && (
                <div
                  data-ocid="csv_upload.success_state"
                  className={`text-xs font-medium px-3 py-2 rounded-xl ${csvResult.failed === 0 ? "bg-primary/10 text-primary border border-primary/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/40"}`}
                >
                  ✓ {csvResult.success} başarılı
                  {csvResult.failed > 0 ? `, ${csvResult.failed} hatalı` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "employees" && canManageEmployees && (
          <EmployeeManager
            companyId={company.companyId}
            currentEmployeeId={employee.employeeId}
          />
        )}
        {tab === "kayitlar" && role === "owner" && (
          <div className="p-4 max-w-4xl">
            <h2 className="font-display font-semibold text-foreground text-base mb-4">
              Denetim Kaydı
            </h2>
            {auditLoading ? (
              <div data-ocid="audit.loading_state" className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div
                data-ocid="audit.empty_state"
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Henüz kayıt yok</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table data-ocid="audit.table" className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Tarih / Saat
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        İşlem
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Yapan
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Detay
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log, i) => {
                      const actionMap: Record<
                        string,
                        { label: string; cls: string }
                      > = {
                        BLACKLIST_ADD: {
                          label: "Kara Liste Eklendi",
                          cls: "bg-red-500/15 text-red-400 border border-red-500/30",
                        },
                        BLACKLIST_REMOVE: {
                          label: "Kara Listeden Çıkarıldı",
                          cls: "bg-orange-50 text-orange-700 border border-orange-200",
                        },
                        EMPLOYEE_REMOVED: {
                          label: "Personel Çıkarıldı",
                          cls: "bg-red-500/15 text-red-400 border border-red-500/30",
                        },
                        VISITOR_CHECKOUT: {
                          label: "Çıkış Yapıldı",
                          cls: "bg-primary/10 text-primary border border-primary/30",
                        },
                      };
                      const action = actionMap[log.action] || {
                        label: log.action,
                        cls: "bg-muted text-muted-foreground border border-border",
                      };
                      const ts = new Date(
                        Number(log.timestamp / 1_000_000n),
                      ).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <tr
                          key={log.logId || i}
                          className="bg-card/50 hover:bg-primary/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {ts}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${action.cls}`}
                            >
                              {action.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground font-mono">
                            {log.performedBy}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                  <StatCard
                    label="Ort. Ziyaret Süresi"
                    value={avgDurationLabel}
                    icon={<Clock className="w-5 h-5" />}
                    color="blue"
                  />
                  {avgSatisfaction !== null && (
                    <StatCard
                      label="Ort. Memnuniyet"
                      value={`${avgSatisfaction} ★`}
                      icon={<Star className="w-5 h-5" />}
                      color="primary"
                    />
                  )}
                </div>

                <div data-ocid="employee_dash.weekly_chart.section">
                  <WeeklyVisitorChart visitors={chartVisitors} />
                </div>

                <div data-ocid="employee_dash.hourly_chart.section">
                  <HourlyDensityChart visitors={chartVisitors} />
                </div>

                {purposeDist.length > 0 && (
                  <div data-ocid="employee_dash.purpose_chart.section">
                    <PurposeDistributionChart data={purposeDist} />
                  </div>
                )}

                {topPersons.length > 0 && (
                  <div
                    data-ocid="top_visited.panel"
                    className="bg-card/80 border border-border/60 rounded-2xl p-5"
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
                                ? "bg-amber-500/15 text-amber-400"
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
                    data-ocid="employee_dash.frequent_visitors.section"
                    className="bg-card/80 border border-border/60 rounded-2xl p-5"
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
                          <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm text-foreground truncate">
                            {item.name} {item.surname}
                          </span>
                          <span className="text-sm font-semibold text-primary">
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
                  className="bg-card/80 border border-border/60 rounded-2xl p-5"
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
                        htmlFor="erpt_start"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Başlangıç Tarihi
                      </label>
                      <input
                        id="erpt_start"
                        type="date"
                        data-ocid="date_report.start_input"
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="erpt_end"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Bitiş Tarihi
                      </label>
                      <input
                        id="erpt_end"
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
                              ? v.visitPurpose.replace(/\[.*?\]\s*/, "")
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
                        `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ziyaret Raporu</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0}h2{font-size:13px;font-weight:normal;color:#555;margin:4px 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}@media print{button{display:none}}</style></head><body><h1>${company.companyName} — Ziyaret Raporu</h1><h2>${reportStart} – ${reportEnd} · ${filtered.length} ziyaret</h2><table><thead><tr><th>#</th><th>Ad Soyad</th><th>TC Kimlik No</th><th>Giriş</th><th>Çıkış</th><th>Ziyaret Amacı</th><th>Ziyaret Edilen</th></tr></thead><tbody>${rows}</tbody></table><br/><button onclick="window.print()">Yazdır / PDF Kaydet</button></body></html>`,
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

        {tab === "sira" && (
          <div className="p-6 max-w-2xl space-y-6">
            <h2 className="font-display font-semibold text-foreground text-base">
              Sıra Yönetimi
            </h2>

            {/* Summary badges */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-xl">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Bekleyen: {queue.filter((q) => q.status === "waiting").length}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-primary/30 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">
                  Çağrılan: {queue.filter((q) => q.status === "called").length}
                </span>
              </div>
            </div>

            {/* Add to queue form */}
            <div className="bg-card/80 border border-border/60 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <input
                  data-ocid="queue.name_input"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  placeholder="Ziyaretçi adı (zorunlu)"
                  className="flex-1 min-w-32 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50"
                />
                <input
                  data-ocid="queue.purpose_input"
                  value={queuePurpose}
                  onChange={(e) => setQueuePurpose(e.target.value)}
                  placeholder="Ziyaret amacı (isteğe bağlı)"
                  className="flex-1 min-w-32 border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-secondary/50"
                />
                <button
                  type="button"
                  data-ocid="queue.add_button"
                  disabled={!queueName.trim()}
                  onClick={() => {
                    if (!queueName.trim()) return;
                    setQueue((prev) => [
                      ...prev,
                      {
                        id: `q-${Date.now()}`,
                        number: queueCounter,
                        name: queueName.trim(),
                        purpose: queuePurpose.trim(),
                        status: "waiting" as const,
                        addedAt: new Date(),
                      },
                    ]);
                    setQueueCounter((c) => c + 1);
                    setQueueName("");
                    setQueuePurpose("");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Users className="w-3.5 h-3.5" />
                  Kuyruğa Ekle
                </button>
              </div>
            </div>

            {/* Queue list */}
            {queue.length === 0 ? (
              <div
                data-ocid="queue.empty_state"
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Sıra boş</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 border rounded-xl transition-colors ${
                      entry.status === "called"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-card/60 border-border/60"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        entry.status === "called"
                          ? "bg-emerald-500 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {entry.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.name}
                      </p>
                      {entry.purpose && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.purpose}
                        </p>
                      )}
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === "called"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {entry.status === "called" ? "Çağrıldı" : "Bekliyor"}
                    </div>
                    {entry.status === "waiting" && (
                      <button
                        type="button"
                        data-ocid={`queue.call_button.${i + 1}`}
                        onClick={() =>
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.id === entry.id
                                ? { ...q, status: "called" as const }
                                : q,
                            ),
                          )
                        }
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Çağır"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      data-ocid={`queue.delete_button.${i + 1}`}
                      onClick={() =>
                        setQueue((prev) =>
                          prev.filter((q) => q.id !== entry.id),
                        )
                      }
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Kaldır"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Post-Visit Feedback Modal */}
      {showFeedbackModal && (
        <div
          data-ocid="feedback.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm">
                  Ziyaretçi Değerlendirmesi
                </h3>
                <p className="text-xs text-muted-foreground">
                  {feedbackVisitorName}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-2">
                Değerlendirme (1-5)
              </p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    data-ocid={`feedback.star.${star}`}
                    onClick={() => setFeedbackRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${star <= feedbackRating ? "text-amber-400" : "text-muted/50"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="feedback-note"
                className="text-xs font-medium text-foreground block mb-1.5"
              >
                Not{" "}
                <span className="text-muted-foreground">(isteğe bağlı)</span>
              </label>
              <textarea
                id="feedback-note"
                data-ocid="feedback.textarea"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                rows={2}
                placeholder="Kısa bir not..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-secondary/50 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="feedback.skip_button"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Atla
              </button>
              <button
                type="button"
                data-ocid="feedback.submit_button"
                onClick={handleFeedbackSubmit}
                disabled={feedbackRating === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {tab === "approvals" && (
        <div className="p-4 sm:p-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-foreground">
              Bekleyen Onaylar
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Size gelen ziyaretçiler için giriş onayı veya reddi yapın.
          </p>
          {pendingApprovals.length === 0 ? (
            <div
              data-ocid="approvals.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <ThumbsUp className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-sm font-medium">Bekleyen onay yok</p>
            </div>
          ) : (
            <div data-ocid="approvals.list" className="space-y-3">
              {pendingApprovals.map((v, i) => (
                <div
                  key={v.visitorId}
                  data-ocid={`approvals.item.${i + 1}`}
                  className="bg-card/80 border border-border/60 rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-foreground">
                      {v.name} {v.surname}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {v.visitPurpose} •{" "}
                      {new Date(
                        Number(v.entryTime / BigInt(1_000_000)),
                      ).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      Onay Bekliyor
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      data-ocid={`approvals.confirm_button.${i + 1}`}
                      onClick={() => {
                        localStorage.setItem(
                          `hostApproval_${v.visitorId}`,
                          "approved",
                        );
                        setPendingApprovals((prev) =>
                          prev.filter((a) => a.visitorId !== v.visitorId),
                        );
                        toast.success(`${v.name} ${v.surname} kabul edildi`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      Kabul Et
                    </button>
                    <button
                      type="button"
                      data-ocid={`approvals.cancel_button.${i + 1}`}
                      onClick={() => {
                        localStorage.setItem(
                          `hostApproval_${v.visitorId}`,
                          "rejected",
                        );
                        setPendingApprovals((prev) =>
                          prev.filter((a) => a.visitorId !== v.visitorId),
                        );
                        toast.error(`${v.name} ${v.surname} reddedildi`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-100 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-200 transition-colors"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Duyurular Tab */}
      {tab === "duyuru" && company && (
        <div className="p-4 sm:p-6 max-w-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-semibold text-foreground">
              Duyurular
            </h2>
          </div>
          {(() => {
            const ann = localStorage.getItem(
              `announcements_${company.companyId}`,
            );
            if (!ann)
              return (
                <div
                  data-ocid="duyuru.empty_state"
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Henüz duyuru yok
                </div>
              );
            const list = JSON.parse(ann) as {
              id: string;
              text: string;
              createdAt: string;
              authorName: string;
            }[];
            if (!list.length)
              return (
                <div
                  data-ocid="duyuru.empty_state"
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Henüz duyuru yok
                </div>
              );
            return (
              <div className="space-y-3">
                {list.map((item, i) => (
                  <div
                    key={item.id}
                    data-ocid={`duyuru.item.${i + 1}`}
                    className="bg-card/80 border border-border/60 rounded-2xl p-4 space-y-2"
                  >
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {item.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bell className="w-3 h-3" />
                      <span>{item.authorName}</span>
                      <span>·</span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Invite Modal */}
      {showCreateInvite && (
        <div
          data-ocid="davetler.create.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
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
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
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
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
                  >
                    {VISIT_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="create-appt-date"
                      className="block text-sm font-medium text-foreground"
                    >
                      Randevu Tarihi
                    </label>
                    <input
                      id="create-appt-date"
                      type="date"
                      data-ocid="davetler.appointment_date.input"
                      value={createAppointmentDate}
                      onChange={(e) => setCreateAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
                    />
                  </div>
                  {createAppointmentDate && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="create-appt-time"
                        className="block text-sm font-medium text-foreground"
                      >
                        Saat
                      </label>
                      <select
                        id="create-appt-time"
                        data-ocid="davetler.appointment_time.select"
                        value={createAppointmentTime}
                        onChange={(e) =>
                          setCreateAppointmentTime(e.target.value)
                        }
                        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
                      >
                        <option value="">Seçin</option>
                        {Array.from({ length: 27 }, (_, i) => {
                          const totalMinutes = 7 * 60 + i * 30;
                          const h = Math.floor(totalMinutes / 60)
                            .toString()
                            .padStart(2, "0");
                          const m = (totalMinutes % 60)
                            .toString()
                            .padStart(2, "0");
                          return `${h}:${m}`;
                        }).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                      className="flex-1 text-xs font-mono bg-secondary/50 border border-primary/30 rounded-lg px-2 py-2 text-foreground min-w-0"
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
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
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

      {/* Asset Manager Modal */}
      {showAssetModal && assetVisitorId && (
        <AssetManager
          visitorId={assetVisitorId}
          visitorName={assetVisitorName}
          onClose={() => {
            setShowAssetModal(false);
            setAssetVisitorId(null);
            // Refresh active visitors to update badges
            if (company) loadActiveVisitors(company.companyId);
          }}
        />
      )}

      {/* PIN Change Modal */}
      {kioskMode && employee && company && (
        <KioskMode
          company={{
            companyId: company.companyId,
            companyName: company.companyName,
          }}
          employee={{
            employeeId: employee.employeeId,
            name: employee.name,
            surname: employee.surname,
          }}
          onExit={() => setKioskMode(false)}
        />
      )}

      {showJoinModal && (
        <div
          data-ocid="employee_dash.join_modal.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Davet Koduyla Şirkete Katıl
              </h3>
              <button
                type="button"
                data-ocid="employee_dash.join_modal.close_button"
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Şirketinizden aldığınız davet kodunu girin.
            </p>
            <form onSubmit={handleJoinWithInviteCode} className="space-y-3">
              <input
                data-ocid="employee_dash.join_code.input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Davet kodu"
                maxLength={10}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="employee_dash.join_modal.cancel_button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  data-ocid="employee_dash.join_modal.submit_button"
                  disabled={joining}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {joining ? "Katılıyor..." : "Katıl"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showPinModal && (
        <div
          data-ocid="employee_dash.pin_modal.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="glass-panel rounded-2xl shadow-elevated p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
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
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
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
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-secondary/50"
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
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
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
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl p-5 ${c.card}`}>
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
