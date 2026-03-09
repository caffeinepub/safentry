import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { backend } from "../lib/backendSingleton";
import VisitorDocument from "./VisitorDocument";

interface Props {
  companyId: string;
  employeeId: string;
}

export default function VisitorRegisterForm({
  companyId,
  employeeId: _employeeId,
}: Props) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [tcId, setTcId] = useState("");
  const [phone, setPhone] = useState("");
  const [visitingPerson, setVisitingPerson] = useState("");
  const [visitPurpose, setVisitPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedVisitorId, setSavedVisitorId] = useState<string | null>(null);

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

  const getPos = (
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

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
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
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSig) return "";
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !surname || !phone || !visitingPerson || !visitPurpose) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    setLoading(true);
    try {
      const sigData = getSignatureData();
      const visitorId = await backend.registerVisitor(
        companyId,
        name,
        surname,
        tcId,
        phone,
        visitingPerson,
        visitPurpose,
        sigData,
      );
      setSavedVisitorId(visitorId);
      toast.success("Ziyaretçi kaydedildi");
    } catch {
      toast.error("Ziyaretçi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setName("");
    setSurname("");
    setTcId("");
    setPhone("");
    setVisitingPerson("");
    setVisitPurpose("");
    setSavedVisitorId(null);
    setHasSig(false);
    clearSignature();
  };

  if (savedVisitorId) {
    return (
      <div className="p-4">
        <VisitorDocument
          visitorId={savedVisitorId}
          companyId={companyId}
          onClose={reset}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="vf-name"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Ad *
          </label>
          <input
            id="vf-name"
            data-ocid="visitor_form.name.input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ad"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label
            htmlFor="vf-surname"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Soyad *
          </label>
          <input
            id="vf-surname"
            data-ocid="visitor_form.surname.input"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Soyad"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="vf-tc"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            TC Kimlik No
          </label>
          <input
            id="vf-tc"
            data-ocid="visitor_form.tc.input"
            value={tcId}
            onChange={(e) => setTcId(e.target.value)}
            placeholder="TC Kimlik No"
            maxLength={11}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>
        <div>
          <label
            htmlFor="vf-phone"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Telefon *
          </label>
          <input
            id="vf-phone"
            data-ocid="visitor_form.phone.input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="vf-visiting"
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          Kime Geldi *
        </label>
        <input
          id="vf-visiting"
          data-ocid="visitor_form.visiting_person.input"
          value={visitingPerson}
          onChange={(e) => setVisitingPerson(e.target.value)}
          placeholder="Ziyaret edilecek kişi"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label
          htmlFor="vf-purpose"
          className="block text-xs font-medium text-slate-600 mb-1"
        >
          Ziyaret Amacı *
        </label>
        <input
          id="vf-purpose"
          data-ocid="visitor_form.purpose.input"
          value={visitPurpose}
          onChange={(e) => setVisitPurpose(e.target.value)}
          placeholder="Ziyaretin amacı"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600">
            Ziyaretçi İmzası
          </span>
          <button
            type="button"
            data-ocid="visitor_form.clear_sig.button"
            onClick={clearSignature}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Temizle
          </button>
        </div>
        <canvas
          data-ocid="visitor_form.signature.canvas_target"
          ref={canvasRef}
          width={600}
          height={150}
          className="signature-canvas w-full h-32 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasSig && (
          <p className="text-xs text-slate-400 mt-1">
            Ziyaretçi parmağı veya fare ile imzalayabilir
          </p>
        )}
      </div>

      <button
        data-ocid="visitor_form.submit.button"
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-700 text-white py-3 rounded-lg font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : "Ziyaretçiyi Kaydet"}
      </button>
    </form>
  );
}
