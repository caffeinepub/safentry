import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

export interface Companion {
  id: string;
  name: string;
  tcId?: string;
  relationship?: string;
}

interface Props {
  companions: Companion[];
  onChange: (companions: Companion[]) => void;
}

export default function CompanionManager({ companions, onChange }: Props) {
  const [name, setName] = useState("");
  const [tcId, setTcId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [showForm, setShowForm] = useState(false);

  const addCompanion = () => {
    if (!name.trim()) return;
    const c: Companion = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      tcId: tcId.trim() || undefined,
      relationship: relationship.trim() || undefined,
    };
    onChange([...companions, c]);
    setName("");
    setTcId("");
    setRelationship("");
    setShowForm(false);
  };

  const removeCompanion = (id: string) => {
    onChange(companions.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">
            Refakatçiler{" "}
            {companions.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {companions.length}
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          data-ocid="visitor_form.companion.open_modal_button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Refakatçi Ekle
        </button>
      </div>

      {companions.length > 0 && (
        <div className="space-y-1.5">
          {companions.map((c, i) => (
            <div
              key={c.id}
              data-ocid={`visitor_form.companion.item.${i + 1}`}
              className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-900 truncate">
                  {c.name}
                </p>
                <p className="text-[10px] text-emerald-600 truncate">
                  {[c.tcId, c.relationship].filter(Boolean).join(" · ") ||
                    "Refakatçi"}
                </p>
              </div>
              <button
                type="button"
                data-ocid={`visitor_form.companion.delete_button.${i + 1}`}
                onClick={() => removeCompanion(c.id)}
                className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          data-ocid="visitor_form.companion.panel"
          className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2"
        >
          <p className="text-xs font-semibold text-slate-700">Yeni Refakatçi</p>
          <input
            type="text"
            data-ocid="visitor_form.companion.input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ad Soyad *"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={tcId}
              onChange={(e) => setTcId(e.target.value)}
              placeholder="TC Kimlik (opsiyonel)"
              maxLength={11}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="İlişki (opsiyonel)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              data-ocid="visitor_form.companion.save_button"
              onClick={addCompanion}
              disabled={!name.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
