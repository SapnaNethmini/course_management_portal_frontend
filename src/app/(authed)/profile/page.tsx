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
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import {
  loadProfileExtras,
  saveProfileExtras,
  EMPTY_PROFILE_EXTRAS,
  type ProfileExtras,
} from "@/lib/profileExtras";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"] as const;

// Visual required-marker — pure styling, no validation logic.
function ReqMark() {
  return (
    <span style={{ color: "#DC2626", marginLeft: 2 }} aria-hidden="true">
      *
    </span>
  );
}

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}


export default function ProfilePage() {
  const P = useProfile();
  const { roles } = useRoles();
  const dispatch = useAppDispatch();

  // Identity fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dirty, setDirty]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Extended profile (UI-only, persisted via localStorage; API later) ──
  const [extras, setExtras] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);
  const [extrasDirty, setExtrasDirty] = useState(false);
  const [extrasSaving, setExtrasSaving] = useState(false);
  const olPdfInputRef = useRef<HTMLInputElement | null>(null);
  const alPdfInputRef = useRef<HTMLInputElement | null>(null);

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
      setPhoneNumber(P.user.phoneNumber ?? "");
      setDirty(false);
    }
  }, [P.user]);

  // Hydrate the extras card from localStorage once we know the uid.
  useEffect(() => {
    if (!P.user?.uid) return;
    setExtras(loadProfileExtras(P.user.uid));
    setExtrasDirty(false);
  }, [P.user?.uid]);

  const patchExtras = (patch: Partial<ProfileExtras>) => {
    setExtras((prev) => ({ ...prev, ...patch }));
    setExtrasDirty(true);
  };

  const patchOl = (idx: number, field: "subject" | "result", value: string) => {
    setExtras((prev) => {
      const next = prev.olResults.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
      return { ...prev, olResults: next };
    });
    setExtrasDirty(true);
  };

  const patchAl = (idx: number, field: "subject" | "result", value: string) => {
    setExtras((prev) => {
      const next = prev.alResults.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
      return { ...prev, alResults: next };
    });
    setExtrasDirty(true);
  };

  const onExtrasFileChange = (which: "ol" | "al") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      dispatch(pushToast({ tone: "warning", title: "Invalid file", message: "Only PDF files are accepted." }));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dispatch(pushToast({ tone: "warning", title: "File too large", message: "Max 5 MB per transcript." }));
      e.target.value = "";
      return;
    }
    patchExtras(which === "ol" ? { olPdfName: file.name } : { alPdfName: file.name });
    e.target.value = "";
  };

  const onSaveExtras = async () => {
    if (!P.user?.uid) return;
    setExtrasSaving(true);
    // Simulated save — when the API gets these fields, swap this for a PATCH.
    await new Promise((r) => setTimeout(r, 200));
    saveProfileExtras(P.user.uid, extras);
    setExtrasDirty(false);
    setExtrasSaving(false);
    dispatch(pushToast({ tone: "success", title: "Profile details saved" }));
  };

  const onCancelExtras = () => {
    setExtras(loadProfileExtras(P.user?.uid));
    setExtrasDirty(false);
  };

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
    if (phoneNumber.trim() !== (P.user!.phoneNumber ?? "")) {
      changes.phoneNumber = phoneNumber.trim() || null;
    }
    const ok = await P.updateProfile(changes);
    if (ok) setDirty(false);
  };

  const onCancel = () => {
    setFirstName(P.user!.firstName ?? "");
    setLastName(P.user!.lastName  ?? "");
    setPhoneNumber(P.user!.phoneNumber ?? "");
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
          <div className="field">
            <label className="label">First name<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.firstName ? "input--error" : ""}`}
              required
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setDirty(true); if (P.fieldErrors.firstName) P.clearFieldError("firstName"); }}
            />
            {P.fieldErrors.firstName && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.firstName}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Last name<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.lastName ? "input--error" : ""}`}
              required
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setDirty(true); if (P.fieldErrors.lastName) P.clearFieldError("lastName"); }}
            />
            {P.fieldErrors.lastName && (
              <span className="hint" style={{ color: "#DC2626" }}>{P.fieldErrors.lastName}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Phone number<ReqMark /></label>
            <input
              className={`input ${P.fieldErrors.phoneNumber ? "input--error" : ""}`}
              type="tel"
              required
              placeholder="+94771234567"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setDirty(true);
                if (P.fieldErrors.phoneNumber) P.clearFieldError("phoneNumber");
              }}
            />
            <span className="hint" style={{ color: P.fieldErrors.phoneNumber ? "#DC2626" : undefined }}>
              {P.fieldErrors.phoneNumber ?? "International format, e.g. +94771234567"}
            </span>
          </div>
          <div className="field">
            <label className="label">Email<ReqMark /></label>
            <input className="input" type="email" value={P.user.email} disabled />
            <span className="hint">Email cannot be changed.</span>
          </div>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancel} disabled={!dirty || P.saving}>Cancel</Button>
          <Button icon="check" onClick={onSave} disabled={!dirty || P.saving}>
            {P.saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Personal details (UI only — API integration pending) ───── */}
      <div className="settings-card">
        <h2>Personal details</h2>
        <p className="settings-sub">
          Used by the admin team when reviewing your student application.
          These fields are stored locally for now and will sync to the server
          once the API is wired up.
        </p>

        <div className="form-grid one">
          <div className="field">
            <label className="label">Address</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Street, city, postal code, country"
              value={extras.address}
              onChange={(e) => patchExtras({ address: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid two">
          <div className="field">
            <label className="label">Date of birth</label>
            <input
              className="input"
              type="date"
              value={extras.dateOfBirth}
              onChange={(e) => patchExtras({ dateOfBirth: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Gender</label>
            <select
              className="input"
              value={extras.gender}
              onChange={(e) => patchExtras({ gender: e.target.value })}
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancelExtras} disabled={!extrasDirty || extrasSaving}>
            Cancel
          </Button>
          <Button icon="check" onClick={onSaveExtras} disabled={!extrasDirty || extrasSaving}>
            {extrasSaving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </div>

      {/* ── Educational qualifications ─────────────────────────────── */}
      <div className="settings-card">
        <h2>Educational qualifications</h2>
        <p className="settings-sub">
          Enter your O/L and A/L subject results. You can also attach the
          original result sheets as PDFs.
        </p>

        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", margin: "12px 0 10px" }}>
          O/L results (9 subjects)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {extras.olResults.map((row, idx) => (
            <div
              key={`ol-${idx}`}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 140px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-muted)",
                  textAlign: "center",
                }}
              >
                {idx + 1}.
              </span>
              <input
                className="input"
                placeholder={`Subject ${idx + 1}`}
                value={row.subject}
                onChange={(e) => patchOl(idx, "subject", e.target.value)}
              />
              <input
                className="input"
                placeholder="Result (A / B / C / S / W)"
                value={row.result}
                onChange={(e) => patchOl(idx, "result", e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <input
            ref={olPdfInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={onExtrasFileChange("ol")}
          />
          <Button
            type="button"
            variant="secondary"
            icon="upload-cloud"
            size="sm"
            onClick={() => olPdfInputRef.current?.click()}
          >
            {extras.olPdfName ? "Replace O/L PDF" : "Attach O/L results (PDF)"}
          </Button>
          {extras.olPdfName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-body-green)" }}>
              <Icon name="file-text" size={14} />
              {extras.olPdfName}
              <button
                type="button"
                onClick={() => patchExtras({ olPdfName: null })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex" }}
                aria-label="Remove O/L PDF"
              >
                <Icon name="x" size={14} />
              </button>
            </span>
          )}
        </div>

        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-primary)", margin: "0 0 10px" }}>
          A/L results (3 subjects)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {extras.alResults.map((row, idx) => (
            <div
              key={`al-${idx}`}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 140px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-muted)",
                  textAlign: "center",
                }}
              >
                {idx + 1}.
              </span>
              <input
                className="input"
                placeholder={`Subject ${idx + 1}`}
                value={row.subject}
                onChange={(e) => patchAl(idx, "subject", e.target.value)}
              />
              <input
                className="input"
                placeholder="Result (A / B / C / S / F)"
                value={row.result}
                onChange={(e) => patchAl(idx, "result", e.target.value)}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <input
            ref={alPdfInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={onExtrasFileChange("al")}
          />
          <Button
            type="button"
            variant="secondary"
            icon="upload-cloud"
            size="sm"
            onClick={() => alPdfInputRef.current?.click()}
          >
            {extras.alPdfName ? "Replace A/L PDF" : "Attach A/L results (PDF)"}
          </Button>
          {extras.alPdfName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-body-green)" }}>
              <Icon name="file-text" size={14} />
              {extras.alPdfName}
              <button
                type="button"
                onClick={() => patchExtras({ alPdfName: null })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex" }}
                aria-label="Remove A/L PDF"
              >
                <Icon name="x" size={14} />
              </button>
            </span>
          )}
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={onCancelExtras} disabled={!extrasDirty || extrasSaving}>
            Cancel
          </Button>
          <Button icon="check" onClick={onSaveExtras} disabled={!extrasDirty || extrasSaving}>
            {extrasSaving ? "Saving…" : "Save qualifications"}
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
