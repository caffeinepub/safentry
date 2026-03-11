import { AlertCircle, CheckCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backend } from "../lib/backendSingleton";

interface Props {
  company: { companyId: string; companyName: string };
  employee: { employeeId: string; name: string; surname: string };
  onExit: () => void;
}

const PURPOSE_OPTIONS = [
  "Toplantı",
  "İş Görüşmesi",
  "Teslimat",
  "Servis / Bakım",
  "Denetim",
  "Eğitim",
  "Ziyaret",
  "Diğer",
];

const VISITOR_TYPES = [
  "Misafir",
  "Müteahhit",
  "Kurye",
  "Servis",
  "Danışman",
  "Denetçi",
];

export default function KioskMode({
  company,
  employee: _employee,
  onExit,
}: Props) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [tcId, setTcId] = useState("");
  const [phone, setPhone] = useState("");
  const [visitingPerson, setVisitingPerson] = useState("");
  const [visitorType, setVisitorType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [purposeCustom, setPurposeCustom] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  function getPos(
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  function clearSig() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  }

  function resetForm() {
    setName("");
    setSurname("");
    setTcId("");
    setPhone("");
    setVisitingPerson("");
    setVisitorType("");
    setPurpose("");
    setPurposeCustom("");
    setVehiclePlate("");
    setNdaAccepted(false);
    setError("");
    clearSig();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !surname.trim() ||
      !tcId.trim() ||
      !phone.trim() ||
      !visitingPerson.trim() ||
      !purpose
    ) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (purpose === "Diğer" && !purposeCustom.trim()) {
      setError("Lütfen ziyaret amacını belirtin.");
      return;
    }
    if (!hasSig) {
      setError("Lütfen imza atın.");
      return;
    }
    if (!ndaAccepted) {
      setError("Lütfen gizlilik politikasını onaylayın.");
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL("image/png") : "";
    const visitorType_ = visitorType;
    const finalPurpose = purpose === "Diğer" ? purposeCustom : purpose;
    const visitPurpose = visitorType_
      ? `[${visitorType_}] ${finalPurpose}`
      : finalPurpose;

    setLoading(true);
    try {
      await backend.registerVisitor(
        company.companyId,
        name.trim(),
        surname.trim(),
        tcId.trim(),
        phone.trim(),
        visitingPerson.trim(),
        visitPurpose,
        signatureData,
        vehiclePlate.trim() || null,
      );
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        resetForm();
      }, 3000);
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (
        msg.toLowerCase().includes("blacklist") ||
        msg.toLowerCase().includes("kara")
      ) {
        setError("Bu TC kimlik numarası kara listede. Kayıt yapılamaz.");
      } else {
        setError("Kayıt sırasında hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-ocid="kiosk.panel"
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 overflow-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-white font-display font-bold text-lg">
            {company.companyName}
          </div>
          <div className="text-emerald-400 text-xs font-medium tracking-widest uppercase">
            Kiosk Modu
          </div>
        </div>
        <button
          type="button"
          data-ocid="kiosk.exit_button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          Çıkış
        </button>
      </div>

      {/* Success overlay */}
      {success && (
        <div
          data-ocid="kiosk.success_state"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-950/95"
        >
          <CheckCircle className="w-20 h-20 text-emerald-400 mb-6" />
          <div className="text-white font-display font-bold text-3xl mb-2">
            Kaydınız Alındı
          </div>
          <div className="text-emerald-300 text-lg">Hoş geldiniz! 🎉</div>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <h2 className="text-white font-display font-semibold text-xl text-center mb-2">
            Ziyaretçi Kaydı
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-white/70"
                htmlFor="k-name"
              >
                Ad *
              </label>
              <input
                id="k-name"
                data-ocid="kiosk.name_input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-surname"
                className="text-xs font-medium text-white/70"
              >
                Soyad *
              </label>
              <input
                id="k-surname"
                data-ocid="kiosk.surname_input"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Soyadınız"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-tcid"
                className="text-xs font-medium text-white/70"
              >
                TC Kimlik No *
              </label>
              <input
                id="k-tcid"
                data-ocid="kiosk.tcid_input"
                value={tcId}
                onChange={(e) =>
                  setTcId(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                placeholder="11 haneli TC No"
                inputMode="numeric"
                maxLength={11}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-phone"
                className="text-xs font-medium text-white/70"
              >
                Telefon *
              </label>
              <input
                id="k-phone"
                data-ocid="kiosk.phone_input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
                inputMode="tel"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-visiting"
                className="text-xs font-medium text-white/70"
              >
                Ziyaret Edilecek Kişi *
              </label>
              <input
                id="k-visiting"
                data-ocid="kiosk.visiting_person_input"
                value={visitingPerson}
                onChange={(e) => setVisitingPerson(e.target.value)}
                placeholder="Personel adı"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-plate"
                className="text-xs font-medium text-white/70"
              >
                Araç Plakası
              </label>
              <input
                id="k-plate"
                data-ocid="kiosk.plate_input"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="34 ABC 123"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="k-vtype"
                className="text-xs font-medium text-white/70"
              >
                Ziyaretçi Tipi
              </label>
              <select
                id="k-vtype"
                value={visitorType}
                onChange={(e) => setVisitorType(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              >
                <option value="" className="bg-slate-800">
                  Seçin
                </option>
                {VISITOR_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="k-purpose"
                className="text-xs font-medium text-white/70"
              >
                Ziyaret Amacı *
              </label>
              <select
                id="k-purpose"
                data-ocid="kiosk.purpose_select"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              >
                <option value="" className="bg-slate-800">
                  Seçin
                </option>
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-slate-800">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {purpose === "Diğer" && (
            <div className="space-y-1.5">
              <label
                htmlFor="k-purposec"
                className="text-xs font-medium text-white/70"
              >
                Açıklama *
              </label>
              <input
                id="k-purposec"
                value={purposeCustom}
                onChange={(e) => setPurposeCustom(e.target.value)}
                placeholder="Ziyaret amacını yazın"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
          )}

          {/* Signature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70">İmza *</span>
              <button
                type="button"
                onClick={clearSig}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Temizle
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={120}
              className="w-full rounded-xl border border-white/20 cursor-crosshair touch-none"
              style={{ background: "#f8fafc" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasSig && (
              <p className="text-xs text-white/40">
                Parmağınız veya mouse ile imza atın
              </p>
            )}
          </div>

          {/* NDA */}
          <div className="flex items-start gap-3">
            <input
              data-ocid="kiosk.nda_checkbox"
              type="checkbox"
              id="kiosk-nda"
              checked={ndaAccepted}
              onChange={(e) => setNdaAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-500"
            />
            <label
              htmlFor="kiosk-nda"
              className="text-xs text-white/70 leading-relaxed"
            >
              Şirketin gizlilik politikasını okudum ve kabul ediyorum. Ziyaretim
              süresince bina kurallarına uyacağımı beyan ederim.
            </label>
          </div>

          <button
            data-ocid="kiosk.submit_button"
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-white font-semibold py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="Kaydediliyor"
                  role="img"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Kaydediliyor...
              </>
            ) : (
              "Ziyareti Kaydet"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
