import { Calendar, Clock, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { backend } from "../lib/backendSingleton";

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
  vehiclePlate?: string;
}

function fmt(t: bigint): string {
  return new Date(Number(t / 1_000_000n)).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(entry: bigint, exit?: bigint): string {
  const end = exit ? Number(exit / 1_000_000n) : Date.now();
  const ms = end - Number(entry / 1_000_000n);
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function parseDisplayPurpose(visitPurpose: string): string {
  if (visitPurpose.startsWith("[")) {
    const end = visitPurpose.indexOf("]");
    if (end > 0) {
      const rest = visitPurpose.slice(end + 1).trim();
      return rest || visitPurpose.slice(1, end);
    }
  }
  return visitPurpose;
}

interface Props {
  tcId: string;
  visitorName: string;
  companyId: string;
  onClose: () => void;
}

export default function VisitorProfileModal({
  tcId,
  visitorName,
  companyId,
  onClose,
}: Props) {
  const [visits, setVisits] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    backend
      .getVisitorsByTcId(companyId, tcId)
      .then((data) => {
        if (!active) return;
        const sorted = [...data].sort((a, b) =>
          Number(b.entryTime - a.entryTime),
        );
        setVisits(sorted);
      })
      .catch(() => setVisits([]))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, tcId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        data-ocid="visitor_profile.dialog"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="font-display font-semibold text-foreground text-base">
              {visitorName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">TC: {tcId}</span>
              {visits.length > 0 && (
                <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                  {visits.length} ziyaret
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            data-ocid="visitor_profile.close_button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : visits.length === 0 ? (
            <div
              data-ocid="visitor_profile.empty_state"
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Ziyaret geçmişi bulunamadı
              </p>
            </div>
          ) : (
            <div data-ocid="visitor_profile.list" className="space-y-2">
              {visits.map((v, i) => (
                <div
                  key={v.visitorId}
                  data-ocid={`visitor_profile.item.${i + 1}`}
                  className="border border-border rounded-xl p-3.5 bg-white hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {v.visitingPerson}
                      </span>
                    </div>
                    {!v.exitTime ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">
                        Aktif
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full border border-border">
                        Çıktı
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Giriş: {fmt(v.entryTime)}</span>
                    </div>
                    {v.exitTime && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>Çıkış: {fmt(v.exitTime)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Süre: {duration(v.entryTime, v.exitTime)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/70 truncate">
                      {parseDisplayPurpose(v.visitPurpose)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
