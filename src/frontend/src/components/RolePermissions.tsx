import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface RolePermissionSet {
  reportsAccess: boolean;
  blacklistManage: boolean;
  visitorDelete: boolean;
  exportData: boolean;
  viewAnnouncements: boolean;
}

export type RoleKey = "authorized" | "registrar";

export interface CompanyRolePermissions {
  authorized: RolePermissionSet;
  registrar: RolePermissionSet;
}

const DEFAULTS: CompanyRolePermissions = {
  authorized: {
    reportsAccess: true,
    blacklistManage: true,
    visitorDelete: false,
    exportData: true,
    viewAnnouncements: true,
  },
  registrar: {
    reportsAccess: false,
    blacklistManage: false,
    visitorDelete: false,
    exportData: false,
    viewAnnouncements: true,
  },
};

export function loadRolePermissions(companyId: string): CompanyRolePermissions {
  try {
    const raw = localStorage.getItem(`role_permissions_${companyId}`);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const PERMISSIONS: {
  key: keyof RolePermissionSet;
  label: string;
  desc: string;
}[] = [
  {
    key: "reportsAccess",
    label: "Raporlara Erişim",
    desc: "İstatistik ve rapor görüntüleme",
  },
  {
    key: "blacklistManage",
    label: "Kara Liste Yönetimi",
    desc: "Kara listeye ekleme/çıkarma",
  },
  {
    key: "visitorDelete",
    label: "Ziyaretçi Silme",
    desc: "Ziyaretçi kaydını silme",
  },
  { key: "exportData", label: "Dışa Aktarım", desc: "CSV/PDF dışa aktarma" },
  {
    key: "viewAnnouncements",
    label: "Duyuru Görüntüleme",
    desc: "Duyuruları görme",
  },
];

interface Props {
  companyId: string;
}

export default function RolePermissions({ companyId }: Props) {
  const [permissions, setPermissions] =
    useState<CompanyRolePermissions>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPermissions(loadRolePermissions(companyId));
  }, [companyId]);

  const toggle = (role: RoleKey, perm: keyof RolePermissionSet) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: !prev[role][perm],
      },
    }));
  };

  const save = () => {
    setSaving(true);
    localStorage.setItem(
      `role_permissions_${companyId}`,
      JSON.stringify(permissions),
    );
    setTimeout(() => {
      setSaving(false);
      toast.success("Rol yetkileri kaydedildi");
    }, 400);
  };

  const roleLabels: Record<RoleKey, { label: string; color: string }> = {
    authorized: {
      label: "Şirket Yetkilisi",
      color: "bg-blue-100 text-blue-800",
    },
    registrar: {
      label: "Kayıt Personeli",
      color: "bg-slate-100 text-slate-700",
    },
  };

  return (
    <div
      data-ocid="role_permissions.panel"
      className="bg-white border border-border rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Rol Yetkileri</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Her rol için izinleri özelleştirin. Şirket Sahibi her zaman tüm
        yetkilere sahiptir.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">
                İzin
              </th>
              {(Object.keys(roleLabels) as RoleKey[]).map((role) => (
                <th key={role} className="text-center py-2 px-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      roleLabels[role].color
                    }`}
                  >
                    {roleLabels[role].label}
                  </span>
                </th>
              ))}
              <th className="text-center py-2 px-3">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Şirket Sahibi
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr
                key={p.key}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-3 pr-4">
                  <p className="font-medium text-foreground">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.desc}
                  </p>
                </td>
                {(Object.keys(roleLabels) as RoleKey[]).map((role, ri) => (
                  <td key={role} className="text-center px-3 py-3">
                    <button
                      type="button"
                      data-ocid={`role_permissions.${role}.${p.key}.toggle`}
                      onClick={() => toggle(role, p.key)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 inline-flex items-center ${
                        permissions[role][p.key]
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      }`}
                      aria-label={`${roleLabels[role].label} ${p.label}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform absolute ${
                          permissions[role][p.key]
                            ? "translate-x-[18px]"
                            : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                    <span className="sr-only">{ri}</span>
                  </td>
                ))}
                {/* Owner - always enabled, not editable */}
                <td className="text-center px-3 py-3">
                  <span className="text-emerald-600">✓</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        data-ocid="role_permissions.save_button"
        onClick={save}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Kaydediliyor..." : "Yetkileri Kaydet"}
      </button>
    </div>
  );
}
