import { Package, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface AssetItem {
  id: string;
  name: string;
  quantity: number;
  status: "given" | "returned";
  givenAt: string;
  returnedAt?: string;
}

const STORAGE_KEY = (visitorId: string) => `assets_${visitorId}`;

export function loadAssets(visitorId: string): AssetItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(visitorId));
    if (!raw) return [];
    return JSON.parse(raw) as AssetItem[];
  } catch {
    return [];
  }
}

export function saveAssets(visitorId: string, items: AssetItem[]): void {
  localStorage.setItem(STORAGE_KEY(visitorId), JSON.stringify(items));
}

export function hasUnreturnedAssets(visitorId: string): boolean {
  const items = loadAssets(visitorId);
  return items.some((i) => i.status === "given");
}

interface Props {
  visitorId: string;
  visitorName: string;
  onClose: () => void;
}

export default function AssetManager({
  visitorId,
  visitorName,
  onClose,
}: Props) {
  const [items, setItems] = useState<AssetItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState(1);

  useEffect(() => {
    setItems(loadAssets(visitorId));
  }, [visitorId]);

  const persist = (updated: AssetItem[]) => {
    setItems(updated);
    saveAssets(visitorId, updated);
  };

  const addItem = () => {
    if (!newName.trim()) return;
    const item: AssetItem = {
      id: `a_${Date.now()}`,
      name: newName.trim(),
      quantity: newQty,
      status: "given",
      givenAt: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    persist([...items, item]);
    setNewName("");
    setNewQty(1);
    toast.success("Zimmet eklendi");
  };

  const markReturned = (id: string) => {
    persist(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "returned" as const,
              returnedAt: new Date().toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : i,
      ),
    );
    toast.success("Zimmet teslim alındı");
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  const unreturned = items.filter((i) => i.status === "given");

  return (
    <div
      data-ocid="asset_manager.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-card rounded-2xl shadow-xl p-5 max-w-md w-full mx-4 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Zimmet / Teslim
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {visitorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="asset_manager.close_button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Add new item */}
        <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground/80">
            Yeni Zimmet Ekle
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              data-ocid="asset_manager.input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Eşya adı (rozet, anahtar, kart...)"
              className="flex-1 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card"
            />
            <input
              type="number"
              min={1}
              max={99}
              value={newQty}
              onChange={(e) => setNewQty(Math.max(1, Number(e.target.value)))}
              className="w-14 border border-border rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card"
            />
          </div>
          <button
            type="button"
            data-ocid="asset_manager.primary_button"
            onClick={addItem}
            disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Zimmet Ekle
          </button>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div
            data-ocid="asset_manager.empty_state"
            className="text-center py-6 text-muted-foreground"
          >
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Henüz zimmet eklenmedi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unreturned.length > 0 && (
              <div
                data-ocid="asset_manager.error_state"
                className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700"
              >
                <Package className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">
                  {unreturned.length} teslim edilmemiş zimmet var
                </span>
              </div>
            )}
            {items.map((item, idx) => (
              <div
                key={item.id}
                data-ocid={`asset_manager.item.${idx + 1}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  item.status === "given"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="ml-1 text-muted-foreground">
                        ×{item.quantity}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.status === "given"
                      ? `Verildi: ${item.givenAt}`
                      : `Teslim: ${item.returnedAt}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === "given" && (
                    <button
                      type="button"
                      data-ocid={`asset_manager.confirm_button.${idx + 1}`}
                      onClick={() => markReturned(item.id)}
                      title="Teslim alındı olarak işaretle"
                      className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Teslim
                    </button>
                  )}
                  {item.status === "returned" && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                      ✓ Teslim
                    </span>
                  )}
                  <button
                    type="button"
                    data-ocid={`asset_manager.delete_button.${idx + 1}`}
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          data-ocid="asset_manager.cancel_button"
          onClick={onClose}
          className="w-full py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
