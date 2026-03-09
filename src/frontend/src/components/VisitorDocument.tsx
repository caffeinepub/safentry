import { Printer, X } from "lucide-react";
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
}

interface Props {
  visitorId: string;
  companyId: string;
  onClose: () => void;
}

export default function VisitorDocument({
  visitorId,
  companyId,
  onClose,
}: Props) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

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

  if (loading)
    return (
      <div
        data-ocid="visitor_doc.loading_state"
        className="text-center py-8 text-slate-400 text-sm"
      >
        Yükleniyor...
      </div>
    );
  if (!visitor) return null;

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="flex items-center justify-between p-4 border-b no-print">
        <h3 className="font-semibold text-slate-800">Ziyaretçi Belgesi</h3>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="visitor_doc.print.button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-cyan-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Yazdır / PDF
          </button>
          <button
            type="button"
            data-ocid="visitor_doc.close.button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={printRef} className="p-6 print:p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SAFENTRY</h1>
            <p className="text-xs text-slate-500">Ziyaretçi Giriş Belgesi</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Belge Kodu</div>
            <div className="font-mono font-bold text-slate-800">
              {visitor.documentCode}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            <Section title="Ziyaretçi Bilgileri">
              <Row
                label="Ad Soyad"
                value={`${visitor.name} ${visitor.surname}`}
              />
              <Row label="TC Kimlik No" value={visitor.tcId || "-"} />
              <Row label="Telefon" value={visitor.phone} />
            </Section>

            <Section title="Ziyaret Bilgileri">
              <Row label="Kime Geldi" value={visitor.visitingPerson} />
              <Row label="Amaç" value={visitor.visitPurpose} />
              <Row label="Giriş Saati" value={fmt(visitor.entryTime)} />
              <Row
                label="Çıkış Saati"
                value={
                  visitor.exitTime ? fmt(visitor.exitTime) : "Devam Ediyor"
                }
              />
            </Section>

            {visitor.signatureData && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  ZİYARETÇİ İMZASI
                </div>
                <img
                  src={visitor.signatureData}
                  alt="Ziyaretçi imzası"
                  className="h-16 border border-slate-200 rounded bg-slate-50"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <QRCodeDocument value={visitor.documentCode} size={120} />
            <div className="text-xs text-slate-400 text-center">
              QR ile doğrulayın
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-slate-400 text-center">
            Bu belge Safentry sistemi üzerinden oluşturulmuştur.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-slate-500 w-28 flex-shrink-0">
        {label}:
      </span>
      <span className="text-sm text-slate-800 font-medium">{value}</span>
    </div>
  );
}
