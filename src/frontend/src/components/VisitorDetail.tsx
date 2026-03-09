import { Clock, FileText, Phone, Printer, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}

export default function VisitorDetail({
  visitorId,
  companyId,
  onClose,
}: Props) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    backend
      .getVisitorById(visitorId, companyId)
      .then((v) => {
        if (v) setVisitor(v as Visitor);
        else toast.error("Ziyaretçi bulunamadı");
      })
      .catch(() => toast.error("Hata oluştu"))
      .finally(() => setLoading(false));
  }, [visitorId, companyId]);

  const fmt = (ts: bigint) =>
    new Date(Number(ts / 1000000n)).toLocaleString("tr-TR");

  const handlePrint = () => {
    window.print();
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
                <InfoCard
                  icon={<FileText className="w-4 h-4" />}
                  label="Ziyaret Amacı"
                  value={visitor.visitPurpose}
                  fullWidth
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
                <PrintRow label="Kime Geldi" value={visitor.visitingPerson} />
                <PrintRow label="Ziyaret Amacı" value={visitor.visitPurpose} />
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

function InfoCard({
  icon,
  label,
  value,
  mono,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
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
