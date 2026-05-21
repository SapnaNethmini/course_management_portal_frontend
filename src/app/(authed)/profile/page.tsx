"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useProfile } from "@/application/hooks/useProfile";
import { useRoles } from "@/application/hooks/useRoles";

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}


export default function ProfilePage() {
  const P = useProfile();
  const { roles } = useRoles();

  // Identity fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [dirty, setDirty]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password fields
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Sync form from Redux on mount / user change
  useEffect(() => {
    if (P.user) {
      setFirstName(P.user.firstName ?? "");
      setLastName(P.user.lastName  ?? "");
      setPhone(P.user.phone ?? "");
      setDirty(false);
    }
  }, [P.user]);

  if (!P.user) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <Icon name="loader" size={24} style={{ color: "var(--color-muted)" }} />
      </div>
    );
  }

  const fullName = `${P.user.firstName} ${P.user.lastName}`.trim();

  const onSave = async () => {
    const changes: Parameters<typeof P.updateProfile>[0] = {};
    if (firstName.trim() !== (P.user!.firstName ?? "")) changes.firstName = firstName.trim();
    if (lastName.trim()  !== (P.user!.lastName  ?? "")) changes.lastName  = lastName.trim();
    if (phone.trim()     !== (P.user!.phone     ?? "")) changes.phone     = phone.trim();
    const ok = await P.updateProfile(changes);
    if (ok) setDirty(false);
  };

  const onCancel = () => {
    setFirstName(P.user!.firstName ?? "");
    setLastName(P.user!.lastName  ?? "");
    setPhone(P.user!.phone        ?? "");
    setDirty(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await P.uploadAvatar(file);
    e.target.value = "";
  };

  const onSubmitPassword = async () => {
    setConfirmError("");
    P.setPasswordError("");
    if (!currentPw) { P.setPasswordError("Enter your current password."); return; }
    if (newPw !== confirmPw) { setConfirmError("Passwords do not match."); return; }
    if (newPw.length < 10) { P.setPasswordError("New password must be at least 10 characters."); return; }
    const ok = await P.changePassword(currentPw, newPw);
    if (ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Your profile</h1>
          <RoleBadgeStack roles={roles} />
        </div>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          Manage your account details and preferences.
        </p>
      </div>

      {/* ── Identity ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Profile</h2>
        <p className="settings-sub">Your name and photo are visible to others on the platform.</p>

        <div className="avatar-row">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={onFileChange} />
          <button
            type="button"
            title="Click to change photo"
            onClick={() => fileInputRef.current?.click()}
            disabled={P.uploadingAvatar}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", flexShrink: 0, borderRadius: "50%" }}
          >
            <Avatar src={P.user.profilePhotoUrl ?? undefined} size="xl" name={fullName || P.user.email} />
            <span
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(21,42,36,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: P.uploadingAvatar ? 1 : 0, transition: "opacity 150ms" }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseOut={(e) => (!P.uploadingAvatar && (e.currentTarget.style.opacity = "0"))}
            >
              {P.uploadingAvatar
                ? <Icon name="loader" size={22} style={{ color: "#BCE955" }} />
                : <Icon name="upload-cloud" size={22} style={{ color: "#BCE955" }} />}
            </span>
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "var(--color-primary)", marginBottom: 4 }}>
              {fullName || P.user.email}
            </div>
            {P.user.createdAt && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)", marginBottom: 12 }}>
                Joined {formatJoined(P.user.createdAt)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button type="button" variant="secondary" icon="upload-cloud" size="sm" disabled={P.uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                {P.uploadingAvatar ? "Uploading…" : "Upload photo"}
              </Button>
            </div>
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-muted)" }}>
              JPG or PNG · max 2 MB
            </p>
          </div>
        </div>

        <div className="form-grid two">
          <Input label="First name" value={firstName} error={P.fieldErrors.firstName}
            onChange={(e) => { setFirstName(e.target.value); setDirty(true); if (P.fieldErrors.firstName) P.clearFieldError("firstName"); }} />
          <Input label="Last name" value={lastName} error={P.fieldErrors.lastName}
            onChange={(e) => { setLastName(e.target.value); setDirty(true); if (P.fieldErrors.lastName) P.clearFieldError("lastName"); }} />
          <Input label="Phone number" type="tel" value={phone} error={P.fieldErrors.phone}
            placeholder="+94 77 000 0000"
            onChange={(e) => { setPhone(e.target.value); setDirty(true); if (P.fieldErrors.phone) P.clearFieldError("phone"); }} />
          <Input label="Email" type="email" value={P.user.email} disabled hint="Email cannot be changed." />
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancel} disabled={!dirty || P.saving}>Cancel</Button>
          <Button icon="check" onClick={onSave} disabled={!dirty || P.saving}>
            {P.saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Language ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Language</h2>
        <p className="settings-sub">Notifications and emails will be sent in your preferred language.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-body-green)" }}>
            Preferred language
          </span>
          <LanguageSwitcher
            onChange={async (code) => {
              const map = { EN: "en", SI: "si", TA: "ta" } as const;
              await P.updateProfile({ preferredLanguage: map[code] });
            }}
          />
        </div>
      </div>

      {/* ── Password ──────────────────────────────────────────────── */}
      <div className="settings-card">
        <h2>Password</h2>
        <p className="settings-sub">Use a strong password you don&apos;t reuse elsewhere.</p>

        {P.passwordError && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--color-error-bg)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontFamily: "var(--font-body)", fontSize: 13, color: "#DC2626" }}>
            <Icon name="alert-circle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            {P.passwordError}
          </div>
        )}

        <div className="form-grid one" style={{ marginBottom: 12 }}>
          <Input label="Current password" type={showCurrent ? "text" : "password"} placeholder="Enter your current password"
            value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); P.setPasswordError(""); }}
            rightSlot={<button type="button" onClick={() => setShowCurrent((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showCurrent ? "Hide" : "Show"}><Icon name={showCurrent ? "eye-off" : "eye"} size={16} /></button>} />
        </div>

        <div className="form-grid two">
          <Input label="New password" type={showNew ? "text" : "password"} placeholder="At least 10 characters"
            value={newPw} onChange={(e) => { setNewPw(e.target.value); P.setPasswordError(""); }}
            hint={!P.passwordError ? "Mix uppercase, lowercase, numbers and symbols." : undefined}
            rightSlot={<button type="button" onClick={() => setShowNew((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showNew ? "Hide" : "Show"}><Icon name={showNew ? "eye-off" : "eye"} size={16} /></button>} />
          <Input label="Confirm new password" type={showConfirm ? "text" : "password"} placeholder="Re-enter new password"
            value={confirmPw} error={confirmError} onChange={(e) => { setConfirmPw(e.target.value); if (confirmError) setConfirmError(""); }}
            rightSlot={<button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }} aria-label={showConfirm ? "Hide" : "Show"}><Icon name={showConfirm ? "eye-off" : "eye"} size={16} /></button>} />
        </div>

        <div className="form-actions">
          <Button variant="ghost" disabled={P.savingPassword} onClick={() => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setConfirmError(""); P.setPasswordError(""); }}>Cancel</Button>
          <Button icon="check" disabled={P.savingPassword || !currentPw || !newPw || !confirmPw} onClick={onSubmitPassword}>
            {P.savingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
