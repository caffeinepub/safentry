import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Phone,
  QrCode,
  Search,
  Shield,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  visitingPerson: string;
  phone: string;
  entryTime: bigint;
  exitTime?: bigint;
}

export default function DocumentVerify({ onNavigate }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null | "notfound">(null);

  // QR scanner state
  const [qrOverlayOpen, setQrOverlayOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  const closeQrOverlay = useCallback(() => {
    stopCamera();
    detectedRef.current = false;
    setQrOverlayOpen(false);
  }, [stopCamera]);

  const scanFrame = useCallback(
    (
      jsQR: (
        data: Uint8ClampedArray,
        width: number,
        height: number,
      ) => { data: string } | null,
    ) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || detectedRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrResult = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
        );
        if (qrResult?.data) {
          detectedRef.current = true;
          setCode(qrResult.data);
          closeQrOverlay();
          // Auto-submit after state update
          setTimeout(() => {
            document.getElementById("dv-submit-btn")?.click();
          }, 100);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(() => scanFrame(jsQR));
    },
    [closeQrOverlay],
  );

  const openQrOverlay = useCallback(async () => {
    detectedRef.current = false;
    setQrOverlayOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      // Wait for video element to mount
      await new Promise((resolve) => setTimeout(resolve, 100));
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();

      // Load jsQR from CDN if not already loaded
      const getJsQR = ():
        | ((
            data: Uint8ClampedArray,
            width: number,
            height: number,
          ) => { data: string } | null)
        | null => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as any).jsQR ?? null;
      };

      if (!getJsQR()) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById("jsqr-cdn");
          if (existing) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.id = "jsqr-cdn";
          script.src =
            "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("jsQR yüklenemedi"));
          document.head.appendChild(script);
        });
      }

      const jsQR = getJsQR();
      if (!jsQR) throw new Error("jsQR bulunamadı");
      rafRef.current = requestAnimationFrame(() => scanFrame(jsQR));
    } catch (err) {
      stopCamera();
      setQrOverlayOpen(false);
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Kamera erişimine izin verilmedi"
          : "Kamera açılamadı";
      toast.error(msg);
    }
  }, [scanFrame, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) {
      toast.error("Lütfen belge kodunu girin");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await backend.verifyDocument(code.trim());
      setResult(res ? (res as VerifyResult) : "notfound");
    } catch {
      toast.error("Sorgulama sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ts: bigint) =>
    new Date(Number(ts / 1000000n)).toLocaleString("tr-TR");

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

            {/* QR Scan button */}
            <button
              type="button"
              data-ocid="doc_verify.qr_scan.button"
              onClick={openQrOverlay}
              className="w-full py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-border bg-muted hover:bg-muted/70 text-foreground"
            >
              <QrCode className="w-4 h-4" />
              Kamera ile Tara
            </button>

            <button
              id="dv-submit-btn"
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="font-display font-semibold text-emerald-800">
                    Belge Doğrulandı
                  </span>
                </div>
                {!result.exitTime ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Aktif Ziyaret
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Tamamlandı
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <ResultRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Ad Soyad"
                  value={`${result.name} ${result.surname}`}
                />
                <ResultRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Ziyaret Edilen Firma"
                  value={result.companyName}
                />
                <ResultRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Kime Geldi"
                  value={result.visitingPerson}
                />
                <ResultRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="Ziyaret Amacı"
                  value={result.visitPurpose}
                />
                <ResultRow
                  icon={<Phone className="w-3.5 h-3.5" />}
                  label="Telefon"
                  value={result.phone}
                />
                <ResultRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Giriş Saati"
                  value={fmt(result.entryTime)}
                />
                <ResultRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Çıkış Saati"
                  value={result.exitTime ? fmt(result.exitTime) : "İçeride"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Overlay */}
      {qrOverlayOpen && (
        <div
          data-ocid="doc_verify.qr_overlay.panel"
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
        >
          {/* Cancel button */}
          <button
            type="button"
            data-ocid="doc_verify.qr_overlay.close_button"
            onClick={closeQrOverlay}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="absolute top-4 left-0 right-0 text-center">
            <p className="text-white text-sm font-medium opacity-80">
              QR kodu çerçeveye hizalayın
            </p>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Hidden canvas for decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Targeting frame overlay */}
          <div className="relative z-10 pointer-events-none">
            <div className="w-64 h-64 relative">
              {/* Dark corners */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
              />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              {/* Scan line animation */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-white/60"
                style={{ animation: "qr-scan 2s linear infinite", top: "20%" }}
              />
            </div>
          </div>

          <style>{`
            @keyframes qr-scan {
              0% { top: 20%; }
              50% { top: 75%; }
              100% { top: 20%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-emerald-600 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
