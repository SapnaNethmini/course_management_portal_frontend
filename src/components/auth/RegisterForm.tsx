"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { pushToast } from "@/application/slices/uiSlice";
import { API_PREFIX } from "@/infrastructure/api/request";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations("auth.register");
  const preferredLanguage = useAppSelector((s) => s.locale.current);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearField = (field: string) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t("firstNameRequired");
    if (!lastName.trim()) e.lastName = t("lastNameRequired");
    if (!email.trim()) e.email = t("emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t("emailInvalid");
    if (!pw) e.pw = t("passwordRequired");
    else if (pw.length < 10) e.pw = t("passwordTooShort");
    else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(pw))
      e.pw = t("passwordRequirements");
    if (!confirmPw) e.confirmPw = t("confirmPasswordRequired");
    else if (pw !== confirmPw) e.confirmPw = t("passwordsMismatch");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_PREFIX}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password: pw,
            preferredLanguage,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setFieldError("email", t("emailExists"));
        } else if (res.status === 400 && err?.field) {
          setFieldError(err.field, err.message);
        } else {
          dispatch(pushToast({ tone: "warning", title: t("signUpFailed"), message: err?.message ?? "" }));
        }
        return;
      }

      dispatch(
        pushToast({
          tone: "success",
          title: t("welcomeToast"),
          message: t("welcomeMessage"),
        }),
      );
      router.push(`/login?email=${encodeURIComponent(email.trim())}`);
    } catch {
      dispatch(pushToast({ tone: "warning", title: t("signUpFailed"), message: t("networkError") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t("title")}</h3>
          <p className="sub" style={{ margin: "4px 0 0" }}>{t("subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-grid two" style={{ marginBottom: 0 }}>
          <Input
            label={t("firstName")}
            placeholder={t("firstNamePlaceholder")}
            value={firstName}
            error={errors.firstName}
            onChange={(e) => { setFirstName(e.target.value); clearField("firstName"); }}
          />
          <Input
            label={t("lastName")}
            placeholder={t("lastNamePlaceholder")}
            value={lastName}
            error={errors.lastName}
            onChange={(e) => { setLastName(e.target.value); clearField("lastName"); }}
          />
        </div>
        <Input
          label={t("email")}
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          error={errors.email}
          onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
        />
        <Input
          label={t("password")}
          type={showPw ? "text" : "password"}
          placeholder={t("passwordPlaceholder")}
          value={pw}
          error={errors.pw}
          onChange={(e) => { setPw(e.target.value); clearField("pw"); }}
          hint={errors.pw ? undefined : t("passwordHint")}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }}
              aria-label={showPw ? t("hidePassword") : t("showPassword")}
            >
              <Icon name={showPw ? "eye-off" : "eye"} size={16} />
            </button>
          }
        />
        <Input
          label={t("confirmPassword")}
          type={showConfirmPw ? "text" : "password"}
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPw}
          onChange={(e) => { setConfirmPw(e.target.value); clearField("confirmPw"); }}
          error={errors.confirmPw}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowConfirmPw((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-body-green)", display: "flex" }}
              aria-label={showConfirmPw ? t("hidePassword") : t("showPassword")}
            >
              <Icon name={showConfirmPw ? "eye-off" : "eye"} size={16} />
            </button>
          }
        />
        <div style={{ marginTop: 22 }}>
          <Button full size="lg" type="submit" disabled={loading}>
            {loading ? t("creating") : t("createAccount")}
          </Button>
        </div>
      </form>
      <div className="alt">
        {t("alreadyHaveAccount")} <Link href="/login">{t("signIn")}</Link>
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ color: "inherit" }}>
            {t("backHome")}
          </Link>
        </div>
      </div>
    </>
  );
}
