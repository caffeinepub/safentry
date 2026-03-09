import { Trash2, UserPlus } from "lucide-react";
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

interface Props {
  companyId: string;
}

export default function EmployeeManager({ companyId }: Props) {
  const [list, setList] = useState<EmployeeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmpId, setAddEmpId] = useState("");
  const [addRole, setAddRole] = useState<EmployeeRole>(EmployeeRole.registrar);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    backend
      .getCompanyEmployees(companyId)
      .then((r) => setList(r as EmployeeEntry[]))
      .catch(() => toast.error("Personel listesi yüklenemedi"))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmpId.trim()) {
      toast.error("Personel kodu gerekli");
      return;
    }
    setAdding(true);
    try {
      await backend.addEmployeeToCompany(companyId, addEmpId.trim(), addRole);
      toast.success("Personel eklendi");
      setAddEmpId("");
      load();
    } catch {
      toast.error("Personel eklenemedi");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (empId: string) => {
    try {
      await backend.removeEmployeeFromCompany(companyId, empId);
      toast.success("Personel çıkarıldı");
      load();
    } catch {
      toast.error("İşlem başarısız");
    }
  };

  const handleRoleChange = async (empId: string, role: EmployeeRole) => {
    try {
      await backend.setEmployeeRole(companyId, empId, role);
      toast.success("Rol güncellendi");
      load();
    } catch {
      toast.error("Rol güncellenemedi");
    }
  };

  return (
    <div className="p-4 max-w-xl">
      <form
        onSubmit={handleAdd}
        className="bg-white border rounded-xl p-4 mb-4 space-y-3"
      >
        <div className="text-sm font-medium text-slate-700">Personel Ekle</div>
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
              <button
                type="button"
                data-ocid={`emp_manager.delete.button.${i + 1}`}
                onClick={() => handleRemove(e.employee.employeeId)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
