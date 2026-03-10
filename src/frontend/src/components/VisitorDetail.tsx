import {
  Car,
  Clock,
  FileText,
  LogOut,
  Phone,
  Printer,
  Tag,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { backend } from "../lib/backendSingleton";
import QRCodeDocument from "./QRCodeDocument";

interface Visitor {
  visitorId: string;
  name: string;
  surname: string;
  tcId: string;
  phone: string;
  visitingPerson: string;
  visitPurpose: string;
  vehiclePlate?: string;
  entryTime: bigint;
  exitTime?: bigint;
  documentCode: string;
  signatureData: string;
  companyId: string;
  createdBy: string;
}

interface Props {
  visitorId: string;
  companyId: string;
  onClose: () => void;
  canCheckout?: boolean;
  onCheckoutDone?: () => void;
  companyName?: string;
}

function printBadge(visitor: Visitor, companyName: string) {
  const printWindow = window.open("", "_blank", "width=400,height=300");
  if (!printWindow) {
    toast.error("Pop-up pencere açılamadı. Tarayıcı izinlerini kontrol edin.");
    return;
  }
  const entryStr = new Date(
    Number(visitor.entryTime / BigInt(1_000_000)),
  ).toLocaleString("tr-TR");
  const purpose = visitor.visitPurpose.replace(/^\[.*?\]\s*/, "");
  printWindow.document.write(`
    <html><head><title>Ziyaretçi Rozeti</title>
    <style>
      @page { size: 8cm 5cm; margin: 0; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 10px; background: white; }
      .badge { border: 2px solid #1e3a2f; border-radius: 8px; padding: 12px; width: 260px; box-sizing: border-box; }
      .badge-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
      .badge-title { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
      .company { font-size: 11px; font-weight: 700; color: #1e3a2f; }
      .name { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 8px; line-height: 1.2; }
      .detail { font-size: 11px; color: #374151; margin-bottom: 3px; }
      .detail b { color: #111827; }
      .code { font-size: 10px; font-family: monospace; color: #9ca3af; margin-top: 8px; border-top: 1px solid #f3f4f6; padding-top: 6px; }
      @media print { body { padding: 0; } }
    </style>
    </head><body>
    <div class="badge">
      <div class="badge-header">
        <div class="badge-title">Ziyaretçi Rozeti</div>
        <div class="company">${companyName}</div>
      </div>
      <div class="name">${visitor.name} ${visitor.surname}</div>
      <div class="detail"><b>Ziyaret Edilen:</b> ${visitor.visitingPerson}</div>
      <div class="detail"><b>Amaç:</b> ${purpose}</div>
      <div class="detail"><b>Giriş:</b> ${entryStr}</div>
      ${visitor.vehiclePlate ? `<div class="detail"><b>Araç:</b> ${visitor.vehiclePlate}</div>` : ""}
      <div class="code">Belge Kodu: ${visitor.documentCode}</div>
    </div>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }<\/script>
    </body></html>
  `);
  printWindow.document.close();
}

export default function VisitorDetail({
  visitorId,
  companyId,
  onClose,
  canCheckout,
  onCheckoutDone,
  companyName = "",
}: Props) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadVisitor = useCallback(() => {
    setLoading(true);
    backend
      .getVisitorById(visitorId, companyId)
      .then((v) => {
        if (v) setVisitor(v as Visitor);
        else toast.error("Ziyaretçi bulunamadı");
      })
      .catch(() => toast.error("Hata oluştu"))
      .finally(() => setLoading(false));
  }, [visitorId, companyId]);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    loadVisitor();
  }, [loadVisitor]);

  const fmt = (ts: bigint) =>
    new Date(Number(ts / 1000000n)).toLocaleString("tr-TR");

  const handlePrint = () => {
    window.print();
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      await backend.checkoutVisitor(visitorId, companyId);
      toast.success("Çıkış işlemi tamamlandı");
      onCheckoutDone?.();
      loadVisitor();
    } catch {
      toast.error("Çıkış işlemi başarısız");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const skeletonKeys = ["sk-a", "sk-b", "sk-c", "sk-d"];

  return (
    <>
      {/* Native dialog */}
      <dialog
        ref={dialogRef}
        data-ocid="visitor_detail.dialog"
        aria-label="Ziyaretçi Detayı"
        onClick={handleDialogClick}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="no-print fixed inset-0 m-auto w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-elevated border border-border bg-white p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              {loading ? (
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              ) : (
                <h2 className="font-display font-semibold text-foreground text-sm">
                  {visitor ? `${visitor.name} ${visitor.surname}` : "—"}
                </h2>
              )}
              <p className="text-xs text-muted-foreground">Ziyaretçi Detayı</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCheckout && visitor && !visitor.exitTime && (
              <button
                type="button"
                data-ocid="visitor_detail.checkout.button"
                onClick={handleCheckout}
                disabled={checkingOut}
                className="flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-medium px-3 py-2 rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                {checkingOut ? "İşleniyor..." : "Çıkış Yap"}
              </button>
            )}
            {visitor && (
              <button
                type="button"
                data-ocid="visitor.badge_print.button"
                onClick={() => printBadge(visitor, companyName)}
                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                title="Rozet Yazdır"
              >
                <Tag className="w-3.5 h-3.5" />
                Rozet
              </button>
            )}
            <button
              type="button"
              data-ocid="visitor_detail.print.button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır
            </button>
            <button
              type="button"
              data-ocid="visitor_detail.close.button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div data-ocid="visitor_detail.loading_state" className="space-y-4">
              {skeletonKeys.map((k) => (
                <div
                  key={k}
                  className="h-12 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && !visitor && (
            <div
              data-ocid="visitor_detail.error_state"
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-sm">
                Ziyaretçi bilgisi bulunamadı.
              </p>
            </div>
          )}

          {!loading && visitor && (
            <div className="space-y-6">
              {/* Status + doc code */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    !visitor.exitTime
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !visitor.exitTime
                        ? "bg-emerald-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  {!visitor.exitTime ? "Aktif Ziyaret" : "Tamamlandı"}
                </span>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono font-medium text-muted-foreground">
                    {visitor.documentCode}
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard
                  icon={<User className="w-4 h-4" />}
                  label="Ad Soyad"
                  value={`${visitor.name} ${visitor.surname}`}
                />
                <InfoCard
                  icon={<User className="w-4 h-4" />}
                  label="TC Kimlik No"
                  value={visitor.tcId || "—"}
                  mono
                />
                <InfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="Telefon"
                  value={visitor.phone}
                />
                <InfoCard
                  icon={<User className="w-4 h-4" />}
                  label="Kime Geldi"
                  value={visitor.visitingPerson}
                />
                {visitor.vehiclePlate && (
                  <InfoCard
                    icon={<Car className="w-4 h-4" />}
                    label="Araç Plakası"
                    value={visitor.vehiclePlate}
                    mono
                  />
                )}
                <InfoCard
                  icon={<FileText className="w-4 h-4" />}
                  label="Ziyaret Amacı"
                  value={
                    parseVisitorPurpose(visitor.visitPurpose).displayPurpose
                  }
                  badge={
                    parseVisitorPurpose(visitor.visitPurpose).visitorType ??
                    undefined
                  }
                  fullWidth={!visitor.vehiclePlate}
                />
                <InfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Giriş Saati"
                  value={fmt(visitor.entryTime)}
                />
                <InfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Çıkış Saati"
                  value={
                    visitor.exitTime ? fmt(visitor.exitTime) : "Devam ediyor"
                  }
                />
              </div>

              {/* Signature + QR */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-border">
                {visitor.signatureData ? (
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Ziyaretçi İmzası
                    </p>
                    <img
                      src={visitor.signatureData}
                      alt="Ziyaretçi imzası"
                      className="h-20 max-w-full border border-border rounded-lg bg-muted/40 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      İmza
                    </p>
                    <div className="h-20 border border-dashed border-border rounded-lg flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        İmza yok
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    QR Doğrulama
                  </p>
                  <QRCodeDocument value={visitor.documentCode} size={96} />
                </div>
              </div>
            </div>
          )}
        </div>
      </dialog>

      {/* Print-only layout */}
      {visitor && (
        <div className="print-only hidden">
          <div
            style={{
              padding: "2rem",
              fontFamily: "sans-serif",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
                borderBottom: "2px solid #1a2e4a",
                paddingBottom: "1rem",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "#1a2e4a",
                    margin: 0,
                  }}
                >
                  SAFENTRY
                </h1>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#666",
                    margin: "4px 0 0",
                  }}
                >
                  Ziyaretçi Giriş Belgesi
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.65rem", color: "#999", margin: 0 }}>
                  BELGE KODU
                </p>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#1a2e4a",
                    margin: "2px 0 0",
                  }}
                >
                  {visitor.documentCode}
                </p>
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "2rem",
              }}
            >
              <tbody>
                <PrintRow
                  label="Ad Soyad"
                  value={`${visitor.name} ${visitor.surname}`}
                />
                <PrintRow label="TC Kimlik No" value={visitor.tcId || "—"} />
                <PrintRow label="Telefon" value={visitor.phone} />
                {visitor.vehiclePlate && (
                  <PrintRow label="Araç Plakası" value={visitor.vehiclePlate} />
                )}
                <PrintRow label="Kime Geldi" value={visitor.visitingPerson} />
                <PrintRow
                  label="Ziyaret Amacı"
                  value={visitor.visitPurpose.replace(/^\[.*?\]\s*/, "")}
                />
                <PrintRow label="Giriş Saati" value={fmt(visitor.entryTime)} />
                <PrintRow
                  label="Çıkış Saati"
                  value={
                    visitor.exitTime ? fmt(visitor.exitTime) : "Devam ediyor"
                  }
                />
              </tbody>
            </table>

            {visitor.signatureData && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.5rem",
                  }}
                >
                  ZİYARETÇİ İMZASI
                </p>
                <img
                  src={visitor.signatureData}
                  alt="İmza"
                  style={{
                    height: "64px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    background: "#f8fafc",
                  }}
                />
              </div>
            )}

            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p style={{ fontSize: "0.65rem", color: "#aaa", margin: 0 }}>
                Bu belge Safentry sistemi üzerinden oluşturulmuştur.
              </p>
              <p
                style={{
                  fontSize: "0.65rem",
                  color: "#aaa",
                  fontFamily: "monospace",
                  margin: 0,
                }}
              >
                {visitor.documentCode}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function parseVisitorPurpose(visitPurpose: string): {
  visitorType: string | null;
  displayPurpose: string;
} {
  if (visitPurpose.startsWith("[")) {
    const end = visitPurpose.indexOf("]");
    if (end > 0) {
      return {
        visitorType: visitPurpose.slice(1, end),
        displayPurpose: visitPurpose.slice(end + 2).trim(),
      };
    }
  }
  return { visitorType: null, displayPurpose: visitPurpose };
}

function InfoCard({
  icon,
  label,
  value,
  mono,
  fullWidth,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`bg-muted/50 rounded-xl p-3 ${fullWidth ? "sm:col-span-2" : ""}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {badge && (
          <span className="ml-auto text-xs bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <p
        className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td
        style={{
          padding: "0.5rem 0",
          fontSize: "0.75rem",
          color: "#888",
          width: "140px",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "0.5rem 0",
          fontSize: "0.875rem",
          color: "#1a2e4a",
          fontWeight: 500,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
