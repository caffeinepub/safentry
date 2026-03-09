import { FileText, LogOut, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { backend } from "../lib/backendSingleton";
import VisitorDetail from "./VisitorDetail";
import VisitorDocument from "./VisitorDocument";

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
  companyId: string;
  canCheckout: boolean;
}

export default function VisitorList({ companyId, canCheckout }: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [docVisitorId, setDocVisitorId] = useState<string | null>(null);
  const [detailVisitorId, setDetailVisitorId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    backend
      .getVisitors(companyId)
      .then((list) => setVisitors(list as Visitor[]))
      .catch(() => toast.error("Ziyaretçiler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckout = async (e: React.MouseEvent, visitorId: string) => {
    e.stopPropagation();
    try {
      await backend.checkoutVisitor(visitorId, companyId);
      toast.success("Çıkış işlemi tamamlandı");
      load();
    } catch {
      toast.error("Çıkış işlemi başarısız");
    }
  };

  const handleDocumentClick = (e: React.MouseEvent, visitorId: string) => {
    e.stopPropagation();
    setDocVisitorId(visitorId);
  };

  const filtered = visitors.filter((v) => {
    const matchSearch =
      search === "" ||
      `${v.name} ${v.surname}`.toLowerCase().includes(search.toLowerCase()) ||
      v.tcId.includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "active" && !v.exitTime) ||
      (filter === "past" && !!v.exitTime);
    return matchSearch && matchFilter;
  });

  const fmt = (ts: bigint) =>
    new Date(Number(ts / 1000000n)).toLocaleString("tr-TR");

  if (docVisitorId) {
    return (
      <div className="p-4">
        <VisitorDocument
          visitorId={docVisitorId}
          companyId={companyId}
          onClose={() => setDocVisitorId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Search & filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            data-ocid="visitor_list.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya TC ile ara..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          data-ocid="visitor_list.filter.select"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white text-foreground"
        >
          <option value="all">Tümü</option>
          <option value="active">Aktif</option>
          <option value="past">Geçmiş</option>
        </select>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div data-ocid="visitor_list.loading_state" className="space-y-2">
          <div className="h-20 bg-muted rounded-xl animate-pulse" />
          <div className="h-20 bg-muted rounded-xl animate-pulse" />
          <div className="h-20 bg-muted rounded-xl animate-pulse" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          data-ocid="visitor_list.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 opacity-40" />
          </div>
          <p className="text-sm font-medium">Ziyaretçi bulunamadı</p>
          <p className="text-xs mt-1 opacity-70">
            Filtreyi değiştirin veya arama yapın
          </p>
        </div>
      )}

      {/* Visitor rows */}
      <div className="space-y-2">
        {filtered.map((v, i) => (
          <button
            type="button"
            key={v.visitorId}
            data-ocid={`visitor_list.item.${i + 1}`}
            onClick={() => setDetailVisitorId(v.visitorId)}
            className="w-full text-left bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-card transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm">
                    {v.name} {v.surname}
                  </span>
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
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {v.visitingPerson} · {v.visitPurpose}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  Giriş: {fmt(v.entryTime)}
                  {v.exitTime ? ` · Çıkış: ${fmt(v.exitTime)}` : ""}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  data-ocid={`visitor_list.document.button.${i + 1}`}
                  onClick={(e) => handleDocumentClick(e, v.visitorId)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Belge"
                >
                  <FileText className="w-4 h-4" />
                </button>
                {canCheckout && !v.exitTime && (
                  <button
                    type="button"
                    data-ocid={`visitor_list.checkout.button.${i + 1}`}
                    onClick={(e) => handleCheckout(e, v.visitorId)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {detailVisitorId && (
        <VisitorDetail
          visitorId={detailVisitorId}
          companyId={companyId}
          onClose={() => setDetailVisitorId(null)}
        />
      )}
    </div>
  );
}
