import { CheckCircle2, Loader2, UserCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { backend } from "../lib/backendSingleton";

type InviteStatus = "pending" | "submitted" | "finalized" | "cancelled";

interface InviteInfo {
  status: InviteStatus;
  visitingPerson: string;
  companyName: string;
  visitPurpose: string;
}

export default function InviteForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [tcId, setTcId] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code =
      new URLSearchParams(window.location.search).get("invite") || "";
    setInviteCode(code);
    if (!code) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    backend
      .getInvitePublic(code)
      .then((res) => {
        if (!res) {
          setNotFound(true);
        } else {
          setInfo(res as InviteInfo);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !surname.trim() || !tcId.trim() || !phone.trim()) {
      setError("Lütfen tüm alanları doldurunuz.");
      return;
    }
    if (tcId.length !== 11 || !/^\d+$/.test(tcId)) {
      setError("TC Kimlik No 11 haneli rakam olmalıdır.");
      return;
    }
    setSubmitting(true);
    try {
      await backend.submitInviteInfo(
        inviteCode,
        name.trim(),
        surname.trim(),
        tcId.trim(),
        phone.trim(),
      );
      setSubmitted(true);
    } catch {
      setError("Bilgiler kaydedilemedi. Lütfen tekrar deneyiniz.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-700 mb-4 shadow-lg">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Safentry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ziyaretçi Ön Kayıt Formu
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-border shadow-md overflow-hidden">
          {loading && (
            <div
              data-ocid="invite_form.loading_state"
              className="flex items-center justify-center py-16"
            >
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          )}

          {!loading && notFound && (
            <div
              data-ocid="invite_form.error_state"
              className="text-center py-12 px-6"
            >
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-3 opacity-60" />
              <h2 className="font-display font-semibold text-foreground text-lg mb-2">
                Davet Bulunamadı
              </h2>
              <p className="text-sm text-muted-foreground">
                Bu davet linki geçersiz veya süresi dolmuş olabilir.
              </p>
            </div>
          )}

          {!loading &&
            info &&
            (info.status === "cancelled" || info.status === "finalized") && (
              <div
                data-ocid="invite_form.invalid_state"
                className="text-center py-12 px-6"
              >
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
                <h2 className="font-display font-semibold text-foreground text-lg mb-2">
                  Davet Geçersiz
                </h2>
                <p className="text-sm text-muted-foreground">
                  Bu davet geçersiz veya kullanılmış. Lütfen yeni bir davet
                  linki talep ediniz.
                </p>
              </div>
            )}

          {!loading && info && info.status === "submitted" && !submitted && (
            <div
              data-ocid="invite_form.submitted_state"
              className="text-center py-12 px-6"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="font-display font-semibold text-foreground text-lg mb-2">
                Bilgileriniz Kaydedildi
              </h2>
              <p className="text-sm text-muted-foreground">
                Bilgileriniz alındı. Karşılanmayı bekleyiniz.
              </p>
            </div>
          )}

          {!loading &&
            (submitted ||
              (info && info.status === "submitted" && submitted)) && (
              <div
                data-ocid="invite_form.success_state"
                className="text-center py-12 px-6"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h2 className="font-display font-semibold text-foreground text-lg mb-2">
                  Teşekkürler!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Bilgileriniz başarıyla kaydedildi. Karşılanmayı bekleyiniz.
                </p>
              </div>
            )}

          {!loading && info && info.status === "pending" && !submitted && (
            <div className="p-6">
              {/* Invite details */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  Davet Detayları
                </p>
                <p className="text-sm text-foreground font-medium">
                  {info.companyName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ziyaret Edilen:{" "}
                  <span className="font-medium text-foreground">
                    {info.visitingPerson}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Amaç:{" "}
                  <span className="font-medium text-foreground">
                    {info.visitPurpose.replace(/^\[.*?\]\s*/, "")}
                  </span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="invite-name"
                      className="block text-xs font-medium text-foreground mb-1"
                    >
                      Ad *
                    </label>
                    <input
                      id="invite-name"
                      data-ocid="invite_form.name.input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adınız"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="invite-surname"
                      className="block text-xs font-medium text-foreground mb-1"
                    >
                      Soyad *
                    </label>
                    <input
                      id="invite-surname"
                      data-ocid="invite_form.surname.input"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="Soyadınız"
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="invite-tcid"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    TC Kimlik No *
                  </label>
                  <input
                    id="invite-tcid"
                    data-ocid="invite_form.tcid.input"
                    value={tcId}
                    onChange={(e) =>
                      setTcId(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="11 haneli TC kimlik numaranız"
                    maxLength={11}
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="invite-phone"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Telefon *
                  </label>
                  <input
                    id="invite-phone"
                    data-ocid="invite_form.phone.input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefon numaranız"
                    type="tel"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                  />
                </div>

                {error && (
                  <p
                    data-ocid="invite_form.error_state"
                    className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  data-ocid="invite_form.submit_button"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Kaydediliyor..." : "Bilgileri Gönder"}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
