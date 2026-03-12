import {
  AlertTriangle,
  Check,
  Clipboard,
  Clock,
  Key,
  KeyRound,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmployeeRole } from "../backend";
import { backend } from "../lib/backendSingleton";

interface EmployeeEntry {
  role: EmployeeRole;
  employee: {
    employeeId: string;
    name: string;
    surname: string;
    createdAt: bigint;
  };
}

interface InviteCode {
  code: string;
  companyId: string;
  role: EmployeeRole;
  createdAt: bigint;
  usedBy: [] | [string];
}

interface Props {
  companyId: string;
  loginCode?: string;
  currentEmployeeId?: string;
  isCompanyOwner?: boolean;
  onResetPin?: (empId: string, name: string) => void;
  onViewHistory?: (empId: string, name: string) => void;
}

export default function EmployeeManager({
  companyId,
  loginCode,
  currentEmployeeId,
  isCompanyOwner = false,
  onResetPin,
  onViewHistory,
}: Props) {
  const [list, setList] = useState<EmployeeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmpId, setAddEmpId] = useState("");
  const [addRole, setAddRole] = useState<EmployeeRole>(EmployeeRole.registrar);
  const [adding, setAdding] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Invite code state
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteRole, setInviteRole] = useState<EmployeeRole>(
    EmployeeRole.registrar,
  );
  const [generatingCode, setGeneratingCode] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const promise = loginCode
      ? backend.getCompanyEmployeesAsCompany(loginCode)
      : backend.getCompanyEmployees(companyId);
    promise
      .then((r) => setList(r as EmployeeEntry[]))
      .catch(() => toast.error("Personel listesi yüklenemedi"))
      .finally(() => setLoading(false));
  }, [loginCode, companyId]);

  const loadInviteCodes = useCallback(() => {
    if (!loginCode) return;
    backend
      .getPersonnelInviteCodes(loginCode)
      .then((r) => setInviteCodes(r as InviteCode[]))
      .catch(() => {});
  }, [loginCode]);

  useEffect(() => {
    load();
    loadInviteCodes();
  }, [load, loadInviteCodes]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmpId.trim()) {
      toast.error("Personel kodu gerekli");
      return;
    }
    setAdding(true);
    try {
      await backend.addEmployeeToCompanyAsCompany(
        loginCode!,
        addEmpId.trim(),
        addRole,
      );
      toast.success("Personel eklendi");
      setAddEmpId("");
      load();
    } catch {
      toast.error("Personel eklenemedi. Personel kodu geçersiz olabilir.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!confirmRemoveId) return;
    setRemoving(true);
    try {
      await backend.removeEmployeeFromCompanyAsCompany(
        loginCode!,
        confirmRemoveId,
      );
      toast.success("Personel çıkarıldı");
      setConfirmRemoveId(null);
      load();
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async (empId: string, role: EmployeeRole) => {
    try {
      if (loginCode) {
        await backend.setEmployeeRoleAsCompany(loginCode, empId, role);
      } else {
        await backend.setEmployeeRole(companyId, empId, role);
      }
      toast.success("Rol güncellendi");
      load();
    } catch {
      toast.error("Rol güncellenemedi");
    }
  };

  const handleGenerateInviteCode = async () => {
    if (!loginCode) return;
    setGeneratingCode(true);
    try {
      const code = await backend.generatePersonnelInviteCode(
        loginCode,
        inviteRole,
      );
      setNewCode(code as string);
      loadInviteCodes();
    } catch {
      toast.error("Davet kodu oluşturulamadı");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const roleLabel = (role: EmployeeRole) => {
    if (role === EmployeeRole.owner) return "Sahip";
    if (role === EmployeeRole.authorized) return "Yetkili";
    return "Kayıt Personeli";
  };

  const confirmEntry = confirmRemoveId
    ? list.find((e) => e.employee.employeeId === confirmRemoveId)
    : null;

  return (
    <div className="p-4 max-w-xl space-y-4">
      {loginCode && (
        <form
          onSubmit={handleAdd}
          className="bg-white border rounded-xl p-4 space-y-3"
        >
          <div className="text-sm font-medium text-slate-700">
            Personel Ekle (Kod ile)
          </div>
          <div className="flex gap-2">
            <input
              id="emp-id-input"
              data-ocid="emp_manager.emp_id.input"
              value={addEmpId}
              onChange={(e) => setAddEmpId(e.target.value)}
              placeholder="8 haneli personel kodu"
              maxLength={8}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
            <select
              data-ocid="emp_manager.role.select"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as EmployeeRole)}
              className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value={EmployeeRole.registrar}>Kayıt Personeli</option>
              <option value={EmployeeRole.authorized}>Yetkili</option>
              <option value={EmployeeRole.owner}>Sahip</option>
            </select>
            <button
              data-ocid="emp_manager.add.button"
              type="submit"
              disabled={adding}
              className="bg-cyan-700 text-white px-3 py-2 rounded-lg hover:bg-cyan-800 transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Invite Code Section */}
      {loginCode && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <button
            type="button"
            data-ocid="emp_manager.invite_code.toggle"
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 w-full"
          >
            <Key className="w-4 h-4 text-cyan-600" />
            Davet Kodu ile Ekle
            <span className="ml-auto text-xs text-slate-400">
              {showInvite ? "▲" : "▼"}
            </span>
          </button>

          {showInvite && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Personele gönderebileceğiniz tek kullanımlık bir davet kodu
                oluşturun. Personel bu kodu kendi panelinden girerek şirketinize
                katılır.
              </p>
              <div className="flex gap-2">
                <select
                  data-ocid="emp_manager.invite_role.select"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as EmployeeRole)
                  }
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none"
                >
                  <option value={EmployeeRole.registrar}>
                    Kayıt Personeli
                  </option>
                  <option value={EmployeeRole.authorized}>Yetkili</option>
                  <option value={EmployeeRole.owner}>Sahip</option>
                </select>
                <button
                  type="button"
                  data-ocid="emp_manager.generate_invite.button"
                  onClick={handleGenerateInviteCode}
                  disabled={generatingCode}
                  className="bg-cyan-700 text-white px-4 py-2 rounded-lg hover:bg-cyan-800 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                >
                  {generatingCode ? "Oluşturuluyor..." : "Kod Oluştur"}
                </button>
              </div>

              {newCode && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-medium text-cyan-800">
                    Oluşturulan Davet Kodu:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white border border-cyan-200 rounded-lg px-3 py-2 font-mono text-base tracking-widest text-slate-800 select-all text-center">
                      {newCode}
                    </div>
                    <button
                      type="button"
                      data-ocid="emp_manager.copy_invite.button"
                      onClick={() => copyCode(newCode)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-700 text-white text-xs font-medium hover:bg-cyan-800 transition-colors"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Clipboard className="w-3.5 h-3.5" />
                      )}
                      {copiedCode ? "Kopyalandı" : "Kopyala"}
                    </button>
                  </div>
                  <p className="text-xs text-cyan-700">
                    Bu kodu personele iletin. Tek kullanımlıktır.
                  </p>
                </div>
              )}

              {inviteCodes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-500">
                    Oluşturulan Kodlar
                  </div>
                  {inviteCodes
                    .slice(-5)
                    .reverse()
                    .map((ic, i) => (
                      <div
                        key={ic.code}
                        data-ocid={`emp_manager.invite_code.item.${i + 1}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                          ic.usedBy.length > 0
                            ? "bg-slate-50 text-slate-400 line-through"
                            : "bg-green-50 text-slate-700"
                        }`}
                      >
                        <span className="font-mono flex-1">{ic.code}</span>
                        <span className="text-slate-400">
                          {roleLabel(ic.role)}
                        </span>
                        <span
                          className={
                            ic.usedBy.length > 0
                              ? "text-slate-400"
                              : "text-green-600 font-medium"
                          }
                        >
                          {ic.usedBy.length > 0 ? "Kullanıldı" : "Aktif"}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div
          data-ocid="emp_manager.loading_state"
          className="text-slate-400 text-sm"
        >
          Yükleniyor...
        </div>
      )}

      {!loading && list.length === 0 && (
        <div
          data-ocid="emp_manager.empty_state"
          className="text-center py-8 text-slate-400 text-sm"
        >
          Henüz personel yok
        </div>
      )}

      <div className="space-y-2">
        {list.map((e, i) => (
          <div
            key={e.employee.employeeId}
            data-ocid={`emp_manager.item.${i + 1}`}
            className="bg-white border rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-medium text-slate-800 text-sm">
                {e.employee.name} {e.employee.surname}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {e.employee.employeeId}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                data-ocid={`emp_manager.role.select.${i + 1}`}
                value={e.role}
                onChange={(ev) =>
                  handleRoleChange(
                    e.employee.employeeId,
                    ev.target.value as EmployeeRole,
                  )
                }
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value={EmployeeRole.registrar}>Kayıt Personeli</option>
                <option value={EmployeeRole.authorized}>Yetkili</option>
                <option value={EmployeeRole.owner}>Sahip</option>
              </select>
              {isCompanyOwner && onResetPin && (
                <button
                  type="button"
                  data-ocid={`emp_manager.reset_pin.button.${i + 1}`}
                  onClick={() =>
                    onResetPin(
                      e.employee.employeeId,
                      `${e.employee.name} ${e.employee.surname}`,
                    )
                  }
                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="PIN Sıfırla"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}
              {isCompanyOwner && onViewHistory && (
                <button
                  type="button"
                  data-ocid={`emp_manager.history.button.${i + 1}`}
                  onClick={() =>
                    onViewHistory(
                      e.employee.employeeId,
                      `${e.employee.name} ${e.employee.surname}`,
                    )
                  }
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Oturum Geçmişi"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              {e.employee.employeeId !== currentEmployeeId && (
                <button
                  type="button"
                  data-ocid={`emp_manager.delete_button.${i + 1}`}
                  onClick={() => setConfirmRemoveId(e.employee.employeeId)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Şirketten çıkar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Remove Dialog */}
      {confirmRemoveId && (
        <div
          data-ocid="emp_manager.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Personeli Çıkar
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>
                    {confirmEntry?.employee.name}{" "}
                    {confirmEntry?.employee.surname}
                  </strong>{" "}
                  adlı personeli şirketten çıkarmak istediğinizden emin misiniz?
                  Bu işlem geri alınamaz.
                </p>
              </div>
              <button
                type="button"
                data-ocid="emp_manager.close_button"
                onClick={() => setConfirmRemoveId(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                data-ocid="emp_manager.cancel_button"
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="emp_manager.confirm_button"
                onClick={handleRemoveConfirm}
                disabled={removing}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {removing ? "Çıkarılıyor..." : "Evet, Çıkar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
