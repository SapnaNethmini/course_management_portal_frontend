"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { TccrWordmark } from "@/components/ui/TccrWordmark";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { apiRequest } from "@/infrastructure/api/request";
import { avatarUrl } from "@/lib/kit";

/**
 * TCCR public landing page. Mirrors
 * src/ui_structure/v2/project/tccr-screens-public.jsx (TPublicHomePage):
 *
 *   TopNav · Hero · Stats · Modules · How it works · Why · FAQ · Final CTA · Footer
 *
 * All copy is read from `src/messages/{en,si,ta}.json` via next-intl's
 * `useTranslations`. The structural data (module variants, glyph icons,
 * step active flags) stays in code; only user-visible strings live in JSON.
 */

const MODULE_KEYS = [
  { variant: "bs" as const, glyph: "book-open", titleKey: "modules.bs.title", bodyKey: "modules.bs.body" },
  { variant: "cg" as const, glyph: "users", titleKey: "modules.cg.title", bodyKey: "modules.cg.body" },
];

const STEP_KEYS = [
  { active: false, numberKey: "how.step1.number", titleKey: "how.step1.title", bodyKey: "how.step1.body" },
  { active: true, numberKey: "how.step2.number", titleKey: "how.step2.title", bodyKey: "how.step2.body" },
  { active: false, numberKey: "how.step3.number", titleKey: "how.step3.title", bodyKey: "how.step3.body" },
];

const FEATURE_KEYS = [
  { ico: "layers", titleKey: "why.features.hierarchy.title", bodyKey: "why.features.hierarchy.body" },
  { ico: "calendar-clock", titleKey: "why.features.semesters.title", bodyKey: "why.features.semesters.body" },
  { ico: "shield-check", titleKey: "why.features.access.title", bodyKey: "why.features.access.body" },
  { ico: "clipboard-list", titleKey: "why.features.reports.title", bodyKey: "why.features.reports.body" },
  { ico: "bar-chart-3", titleKey: "why.features.analytics.title", bodyKey: "why.features.analytics.body" },
  { ico: "languages", titleKey: "why.features.languages.title", bodyKey: "why.features.languages.body" },
];

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export default function PublicHomePage() {
  const router = useRouter();
  const t = useTranslations("publicHome");
  const tCommon = useTranslations("common");
  const goLogin = () => router.push("/login");
  const goRegister = () => router.push("/register");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Live stats — backend may or may not respond. Falls back to the static
  // copy from the prototype if either endpoint 401/403s.
  const [stats, setStats] = useState<{ members: number | null; courses: number | null }>({
    members: null,
    courses: null,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [usersRes, coursesRes] = await Promise.allSettled([
        apiRequest<{ total: number }>(`/users?role=student&limit=1`, { auth: false }),
        apiRequest<{ total: number }>(`/courses?state=published&limit=1`, { auth: false }),
      ]);
      if (cancelled) return;
      setStats({
        members: usersRes.status === "fulfilled" ? usersRes.value.total : null,
        courses: coursesRes.status === "fulfilled" ? coursesRes.value.total : null,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="public">
      <FloatingNav onSignUp={goRegister} />

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section className="section section--dark hero">
        <div className="container-x hero-grid">
          <div>
            <Eyebrow dark>{t("hero.eyebrow")}</Eyebrow>
            <h1>
              {t("hero.titleLine1")}
              <br />
              <span className="accent">{t("hero.titleAccent")}</span> {t("hero.titleLine2Suffix")}
            </h1>
            <p>{t("hero.body")}</p>
            <div className="hero-cta">
              <Button size="lg" iconAfter="arrow-right" onClick={goRegister}>
                {t("hero.ctaCreate")}
              </Button>
              <Button size="lg" variant="secondary-light" icon="log-in" onClick={goLogin}>
                {t("hero.ctaSignIn")}
              </Button>
            </div>
            <div className="hero-proof">
              <div className="stack">
                {[5, 14, 32, 47].map((n) => (
                  <Avatar key={n} src={avatarUrl(n)} size="sm" />
                ))}
              </div>
              <span>
                <b style={{ color: "#fff" }}>{t("hero.proofStat")}</b> {t("hero.proofSuffix")}
              </span>
            </div>
          </div>
          <div className="hero-img">
            <img src="/tccr-logo.jpeg" alt={t("hero.imageAlt")} />
          </div>
        </div>
      </section>

      {/* ─── STATS strip ────────────────────────────────────────────── */}
      <section className="section section--white" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="container-x">
          <div className="stats">
            <Stat
              num={stats.members == null ? "3,200" : stats.members.toLocaleString()}
              suffix="+"
              label={t("stats.members")}
              sub={t("stats.membersSub")}
            />
            <Stat num="142" label={t("stats.cellGroups")} sub={t("stats.cellGroupsSub")} />
            <Stat
              num={stats.courses == null ? "21" : stats.courses.toLocaleString()}
              label={t("stats.courses")}
              sub={t("stats.coursesSub")}
            />
            <Stat num="94" suffix="%" label={t("stats.attendance")} sub={t("stats.attendanceSub")} />
          </div>
        </div>
      </section>

      {/* ─── MODULES ────────────────────────────────────────────────── */}
      <section className="section section--light" id="modules">
        <div className="container-x">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>{t("modules.eyebrow")}</Eyebrow>
            <h2 className="section-title section-title--center">
              {t("modules.titleLine1")}
              <br />
              <span className="accent">{t("modules.titleAccent")}</span> {t("modules.titleLine2Suffix")}
            </h2>
            <p className="section-sub" style={{ margin: "16px auto 0", textAlign: "center" }}>
              {t("modules.subtitle")}
            </p>
          </div>
          <div className="module-tiles" style={{ marginTop: 48 }}>
            {MODULE_KEYS.map((m) => (
              <button key={m.variant} type="button" className={`mod-tile ${m.variant}`} onClick={goRegister}>
                <div>
                  <div className="label">{t("modules.moduleLabel")}</div>
                  <h2>{t(m.titleKey)}</h2>
                  <p>{t(m.bodyKey)}</p>
                </div>
                <div className="pill-row">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goRegister();
                    }}
                  >
                    {t("modules.getStarted")} <Icon name="arrow-right" size={14} />
                  </button>
                </div>
                <div className="glyph" aria-hidden="true">
                  <Icon name={m.glyph} size={200} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────── */}
      <section className="section section--deep">
        <div className="container-x">
          <Eyebrow dark>{t("how.eyebrow")}</Eyebrow>
          <h2 className="section-title">
            {t("how.title")} <span className="accent">{t("how.titleAccent")}</span> {t("how.titleSuffix")}
          </h2>
          <p className="section-sub">{t("how.subtitle")}</p>
          <div className="process-grid">
            <div className="steps">
              {STEP_KEYS.map((s) => (
                <div key={s.numberKey} className={`step${s.active ? " active" : ""}`}>
                  <div className="num">{t(s.numberKey)}</div>
                  <div>
                    <h4>{t(s.titleKey)}</h4>
                    <p>{t(s.bodyKey)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-img" style={{ aspectRatio: "1/1", borderRadius: 24 }}>
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
                alt={t("how.imageAlt")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY ────────────────────────────────────────────────────── */}
      <section className="section section--white" id="why">
        <div className="container-x">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>{t("why.eyebrow")}</Eyebrow>
            <h2 className="section-title section-title--center">
              {t("why.titleLine1")} <span className="accent">{t("why.titleAccent1")}</span>
              <br />
              {t("why.titleLine2Prefix")} <span className="accent">{t("why.titleAccent2")}</span>{" "}
              {t("why.titleLine2Suffix")}
            </h2>
          </div>
          <div className="feature-grid">
            {FEATURE_KEYS.map((f) => (
              <div className="feature-card" key={f.titleKey}>
                <div className="ico">
                  <Icon name={f.ico} size={26} />
                </div>
                <h3>{t(f.titleKey)}</h3>
                <p>{t(f.bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────────── */}
      <section className="section section--light" id="faq">
        <div className="container-x">
          <div style={{ textAlign: "center" }}>
            <Eyebrow>{t("faq.eyebrow")}</Eyebrow>
            <h2 className="section-title section-title--center">
              {t("faq.titleLine1")} <span className="accent">{t("faq.titleAccent")}</span>
              {t("faq.titleSuffix")}
            </h2>
          </div>
          <div className="faq-list">
            {FAQ_KEYS.map((key, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={key} className={`faq${isOpen ? " open" : ""}`}>
                  <button
                    className="faq-summary"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="ico">
                      <Icon name={isOpen ? "minus" : "plus"} size={18} />
                    </span>
                    {t(`faq.items.${key}.q`)}
                  </button>
                  {isOpen && <div className="body">{t(`faq.items.${key}.a`)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────────── */}
      <section className="section section--dark final-cta">
        <div className="ring" />
        <Avatar
          src={avatarUrl(7)}
          size="md"
          style={{ position: "absolute", top: "20%", left: "12%", border: "3px solid #BCE955", transform: "rotate(-6deg)" }}
        />
        <Avatar
          src={avatarUrl(15)}
          size="lg"
          style={{ position: "absolute", top: "30%", right: "14%", border: "3px solid #BCE955", transform: "rotate(8deg)" }}
        />
        <Avatar
          src={avatarUrl(22)}
          size="sm"
          style={{ position: "absolute", bottom: "22%", left: "20%", border: "3px solid #BCE955", transform: "rotate(4deg)" }}
        />
        <Avatar
          src={avatarUrl(38)}
          size="md"
          style={{ position: "absolute", bottom: "24%", right: "20%", border: "3px solid #BCE955", transform: "rotate(-3deg)" }}
        />
        <div className="container-x" style={{ position: "relative" }}>
          <Eyebrow dark>{t("finalCta.eyebrow")}</Eyebrow>
          <h2 className="section-title section-title--center" style={{ marginTop: 18 }}>
            {t("finalCta.titleLine1")} <span className="accent">{t("finalCta.titleAccent")}</span>{" "}
            {t("finalCta.titleSuffix")}
          </h2>
          <p className="section-sub" style={{ margin: "20px auto 28px", textAlign: "center" }}>
            {t("finalCta.subtitle")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" iconAfter="arrow-right" onClick={goRegister}>
              {t("hero.ctaCreate")}
            </Button>
            <Button size="lg" variant="secondary-light" onClick={goLogin}>
              {t("hero.ctaSignIn")}
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="footer footer--minimal">
        <div className="footer-bottom footer-bottom--solo">
          <TccrWordmark variant="reversed" />
          <span>{tCommon("footer.copyright")}</span>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function Stat({ num, suffix, label, sub }: { num: string; suffix?: string; label: string; sub: string }) {
  return (
    <div className="stat">
      <div className="num">
        {num}
        {suffix && <span className="accent">{suffix}</span>}
      </div>
      <div className="lab">{label}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}
