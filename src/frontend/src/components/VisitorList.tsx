import {
  CalendarRange,
  Download,
  FileText,
  LogOut,
  Search,
} from "lucide-react";
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
  /** If provided, use loginCode-based backend call (for company panel) */
  loginCode?: string;
}

export default function VisitorList({
  companyId,
  canCheckout,
  loginCode,
}: Props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [docVisitorId, setDocVisitorId] = useState<string | null>(null);
  const [detailVisitorId, setDetailVisitorId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const promise = loginCode
      ? backend.getVisitorsAsCompany(loginCode)
      : backend.getVisitors(companyId);
    promise
      .then((list) => setVisitors(list as Visitor[]))
      .catch(() => toast.error("Ziyaretçiler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [companyId, loginCode]);

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
      v.tcId.includes(search) ||
      v.phone.includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "active" && !v.exitTime) ||
      (filter === "past" && !!v.exitTime);

    let matchDate = true;
    if (dateFrom) {
      const from = new Date(dateFrom).getTime() * 1_000_000;
      matchDate = matchDate && Number(v.entryTime) >= from;
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() * 1_000_000 + 86_400_000_000_000;
      matchDate = matchDate && Number(v.entryTime) <= to;
    }

    return matchSearch && matchFilter && matchDate;
  });

  const fmt = (ts: bigint) =>
    new Date(Number(ts / 1000000n)).toLocaleString("tr-TR");

  const handleExport = () => {
    const headers = [
      "Ad Soyad",
      "TC No",
      "Telefon",
      "Ziyaret Edilen",
      "Amaç",
      "Giriş Zamanı",
      "Çıkış Zamanı",
      "Durum",
      "Belge Kodu",
    ];
    const rows = filtered.map((v) => [
      `${v.name} ${v.surname}`,
      v.tcId,
      v.phone,
      v.visitingPerson,
      v.visitPurpose,
      fmt(v.entryTime),
      v.exitTime ? fmt(v.exitTime) : "",
      v.exitTime ? "Tamamlandı" : "Aktif",
      v.documentCode,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ziyaretciler-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} kayıt dışa aktarıldı`);
  };

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
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              data-ocid="visitor_list.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, TC veya telefon ile ara..."
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
          <button
            type="button"
            data-ocid="visitor_list.date_filter.toggle"
            onClick={() => setShowDateFilter((p) => !p)}
            title="Tarih filtresi"
            className={`p-2 rounded-lg border transition-colors ${
              showDateFilter || dateFrom || dateTo
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarRange className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-ocid="visitor_list.export.button"
            onClick={handleExport}
            title="CSV olarak dışa aktar"
            disabled={filtered.length === 0}
            className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {showDateFilter && (
          <div className="flex gap-2 items-center bg-muted/50 border border-border rounded-xl p-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Tarih:
            </span>
            <input
              type="date"
              data-ocid="visitor_list.date_from.input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <input
              type="date"
              data-ocid="visitor_list.date_to.input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                data-ocid="visitor_list.date_filter.clear.button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                Temizle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary badge */}
      {!loading && (
        <div className="text-xs text-muted-foreground mb-3">
          {filtered.length} ziyaretçi{" "}
          {filter !== "all" || search || dateFrom || dateTo ? "(filtreli)" : ""}
        </div>
      )}

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
          canCheckout={canCheckout}
          onCheckoutDone={load}
        />
      )}
    </div>
  );
}
