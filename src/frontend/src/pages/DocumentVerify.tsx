import { ArrowLeft, CheckCircle2, Search, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Screen } from "../App";
import { backend } from "../lib/backendSingleton";

interface Props {
  onNavigate: (screen: Screen) => void;
}

interface VerifyResult {
  visitorId: string;
  name: string;
  surname: string;
  companyName: string;
  visitPurpose: string;
}

export default function DocumentVerify({ onNavigate }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null | "notfound">(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Lütfen belge kodunu girin");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await backend.verifyDocument(code.trim());
      setResult(res ? res : "notfound");
    } catch {
      toast.error("Sorgulama sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          data-ocid="doc_verify.back.button"
          onClick={() => onNavigate("landing")}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Search
            className="w-4 h-4"
            style={{ color: "oklch(0.72 0.16 62)" }}
          />
          <h1 className="font-display font-semibold text-foreground text-sm">
            Belge Sorgulama
          </h1>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6 pt-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "oklch(0.72 0.16 62 / 0.10)" }}
            >
              <Shield
                className="w-7 h-7"
                style={{ color: "oklch(0.72 0.16 62)" }}
              />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Belge Doğrulama
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ziyaretçi belge kodunu girerek doğrulayın
            </p>
          </div>

          <form
            onSubmit={handleVerify}
            className="bg-white rounded-2xl shadow-card border border-border p-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="dv-code"
                className="block text-sm font-medium text-foreground"
              >
                Belge Kodu
              </label>
              <input
                id="dv-code"
                data-ocid="doc_verify.code.input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Belge kodunu girin"
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono bg-white text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              data-ocid="doc_verify.search.button"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm text-white"
              style={{ background: "oklch(0.60 0.16 62)" }}
            >
              <Search className="w-4 h-4" />
              {loading ? "Sorgulanıyor..." : "Sorgula"}
            </button>
          </form>

          {result === "notfound" && (
            <div
              data-ocid="doc_verify.error_state"
              className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5 text-center animate-fade-in"
            >
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="font-display font-semibold text-red-700">
                Belge Bulunamadı
              </p>
              <p className="text-sm text-red-500 mt-1">
                Girilen koda ait bir ziyaret belgesi sistemde kayıtlı değil.
              </p>
            </div>
          )}

          {result && result !== "notfound" && (
            <div
              data-ocid="doc_verify.success_state"
              className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="font-display font-semibold text-emerald-800">
                  Belge Doğrulandı
                </span>
              </div>
              <div className="space-y-3">
                <ResultRow
                  label="Ad Soyad"
                  value={`${result.name} ${result.surname}`}
                />
                <ResultRow
                  label="Ziyaret Edilen Firma"
                  value={result.companyName}
                />
                <ResultRow label="Ziyaret Amacı" value={result.visitPurpose} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
