"use client";

import { useMemo, useState, useId, useRef, useEffect, useCallback } from "react";
import { brand } from "@/config/brand.config";
import { COUNTRIES } from "@/lib/countries";
import { normalizePhone, nationalDigitCount } from "@/lib/phone";
import { validateForm, type FormValues } from "@/lib/validation";
import {
  buildConsentDisclosure,
  buildTermsLabel,
  disclosureToPlainText,
  type DisclosureSegment,
} from "@/lib/disclosure";
import type { SubscribeResponse } from "@/types";
import { Turnstile } from "./Turnstile";
import styles from "./SubscriptionForm.module.css";

type SubmitState = "idle" | "submitting" | "success" | "duplicate" | "error";

export interface SubscriptionFormProps {
  brandName: string;
  termsUrl: string;
  privacyUrl: string;
  defaultCountry: string;
  captchaSiteKey: string;
}

const GENERIC_ERROR = brand.errorBody;

export default function SubscriptionForm({
  brandName,
  termsUrl,
  privacyUrl,
  defaultCountry,
  captchaSiteKey,
}: SubscriptionFormProps) {
  const ids = {
    first: useId(),
    last: useId(),
    country: useId(),
    phone: useId(),
    terms: useId(),
    marketing: useId(),
    status: useId(),
  };

  const initialCountry =
    COUNTRIES.find((c) => c.code === defaultCountry && c.enabled)?.code ??
    COUNTRIES.find((c) => c.enabled)!.code;

  const [values, setValues] = useState<FormValues>({
    firstName: "",
    lastName: "",
    country: initialCountry,
    phone: "",
    consentTerms: false, // SPEC: unchecked by default (compliance)
    consentMarketing: false, // SPEC: unchecked by default (compliance)
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  // Result overlay phase: blur fade-in -> hold -> fade-out -> reset.
  const [overlayPhase, setOverlayPhase] = useState<"in" | "out">("in");

  // Honeypot — must stay empty for a human (SPEC 01 §6).
  const hpRef = useRef<HTMLInputElement>(null);
  // Synchronous re-entrancy guard: blocks a double-submit burst before React
  // re-renders and disables the button (state-derived `submitting` lags).
  const inFlight = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const consentSegments = useMemo(
    () => buildConsentDisclosure({ brandName, termsUrl, privacyUrl }),
    [brandName, termsUrl, privacyUrl],
  );
  const termsSegments = useMemo(
    () => buildTermsLabel({ brandName, termsUrl, privacyUrl }),
    [brandName, termsUrl, privacyUrl],
  );
  // The exact text snapshot equals the rendered disclosure text (SPEC 01 §8).
  const consentSnapshot = useMemo(
    () => disclosureToPlainText(consentSegments),
    [consentSegments],
  );

  const validation = useMemo(() => validateForm(values), [values]);
  const phoneCount = nationalDigitCount(values.phone, values.country);
  const submitting = submitState === "submitting";
  // Captcha (when env-gated on) must be solved before submit is enabled, so the
  // button isn't a dead click that returns a server 422.
  const captchaReady = !captchaSiteKey || captchaToken !== "";
  const canSubmit = validation.canSubmit && captchaReady && !submitting;

  function update<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }
  function markTouched(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }
  function showError(key: keyof typeof validation.errors): string | undefined {
    return touched[key] ? validation.errors[key] : undefined;
  }

  const isResult =
    submitState === "success" ||
    submitState === "duplicate" ||
    submitState === "error";

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Dismiss the ERROR overlay: fade out, then return to the form with the
  // entered data preserved (so the user can retry without retyping).
  const dismissError = useCallback(() => {
    clearTimers();
    setOverlayPhase("out");
    timers.current.push(
      setTimeout(() => {
        setServerError(null);
        setSubmitState("idle");
      }, 360),
    );
  }, [clearTimers]);

  // Result lifecycle: every result blur-fades in. Error auto-fades out after
  // ~3s and restores the filled form; success/duplicate stay as a terminal
  // confirmation.
  useEffect(() => {
    if (!isResult) return;
    setOverlayPhase("in");
    if (submitState === "error") {
      timers.current.push(setTimeout(dismissError, 2600));
    }
    return clearTimers;
  }, [isResult, submitState, dismissError, clearTimers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Mark all touched so any remaining errors surface.
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      consentTerms: true,
      consentMarketing: true,
    });
    if (inFlight.current || !validation.canSubmit || !captchaReady) return;

    const phone = normalizePhone(values.phone, values.country);
    if (!phone.ok || !phone.e164) return; // guarded by validation, defensive

    inFlight.current = true;
    setSubmitState("submitting");
    setServerError(null);

    const payload = {
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      country: values.country,
      phone_e164: phone.e164,
      consent_terms: values.consentTerms,
      consent_marketing: values.consentMarketing,
      consent_text_snapshot: consentSnapshot,
      form_url: typeof window !== "undefined" ? window.location.href : "",
      idempotency_key:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      captcha_token: captchaToken,
      hp_field: hpRef.current?.value ?? "",
    };

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: SubscribeResponse = { success: false };
      try {
        data = (await res.json()) as SubscribeResponse;
      } catch {
        /* fall through to error */
      }

      if (res.ok && data.success) {
        setSubmitState(data.duplicate ? "duplicate" : "success");
      } else {
        setServerError(data.message ?? GENERIC_ERROR);
        setSubmitState("error");
      }
    } catch {
      setServerError(GENERIC_ERROR);
      setSubmitState("error");
    } finally {
      inFlight.current = false;
    }
  }

  const overlayTitle =
    submitState === "error"
      ? brand.errorTitle
      : submitState === "duplicate"
        ? brand.duplicateTitle
        : brand.successTitle;
  const overlayBody =
    submitState === "error"
      ? (serverError ?? brand.errorBody)
      : submitState === "duplicate"
        ? brand.duplicateBody
        : brand.successBody;

  return (
    <div className={styles.shell}>
      <form
        className={styles.card}
        onSubmit={handleSubmit}
        noValidate
        inert={isResult}
      >
        <Header />

      {/* Polite region announces the in-flight state only; errors are announced
          once by the role="alert" panel below (avoids a double announcement). */}
      <p id={ids.status} className={styles.srOnly} aria-live="polite" role="status">
        {submitting ? "Submitting your sign-up…" : ""}
      </p>

      <div className={styles.row}>
        <Field
          id={ids.first}
          label="First name"
          error={showError("firstName")}
        >
          <input
            id={ids.first}
            className={styles.input}
            type="text"
            autoComplete="given-name"
            maxLength={60}
            value={values.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            onBlur={() => markTouched("firstName")}
            aria-invalid={!!showError("firstName")}
            aria-describedby={showError("firstName") ? `${ids.first}-err` : undefined}
            required
          />
        </Field>

        <Field id={ids.last} label="Last name" error={showError("lastName")}>
          <input
            id={ids.last}
            className={styles.input}
            type="text"
            autoComplete="family-name"
            maxLength={60}
            value={values.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            onBlur={() => markTouched("lastName")}
            aria-invalid={!!showError("lastName")}
            aria-describedby={showError("lastName") ? `${ids.last}-err` : undefined}
            required
          />
        </Field>
      </div>

      {/* Country + phone share one row to save vertical space (DOM order preserved). */}
      <div className={styles.phoneRow}>
        <Field id={ids.country} label="Country">
          <select
            id={ids.country}
            className={styles.input}
            value={values.country}
            onChange={(e) => update("country", e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} disabled={!c.enabled}>
                {c.flag} {c.name} ({c.dialCode}){c.enabled ? "" : " — soon"}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id={ids.phone}
          label="Phone number"
          error={showError("phone")}
          hint={`${phoneCount}/10 digits`}
        >
          <input
            id={ids.phone}
            className={styles.input}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(415) 867-5309"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => markTouched("phone")}
            aria-invalid={!!showError("phone")}
            aria-describedby={showError("phone") ? `${ids.phone}-err` : `${ids.phone}-hint`}
            required
          />
        </Field>
      </div>

      {/* Checkbox A — Terms & Privacy */}
      <ConsentCheckbox
        id={ids.terms}
        checked={values.consentTerms}
        onChange={(v) => {
          update("consentTerms", v);
          markTouched("consentTerms");
        }}
        error={showError("consentTerms")}
        segments={termsSegments}
        termsUrl={termsUrl}
        privacyUrl={privacyUrl}
      />

      {/* Checkbox B — SMS marketing consent (PEWC). Compliance-locked copy. */}
      <ConsentCheckbox
        id={ids.marketing}
        checked={values.consentMarketing}
        onChange={(v) => {
          update("consentMarketing", v);
          markTouched("consentMarketing");
        }}
        error={showError("consentMarketing")}
        segments={consentSegments}
        termsUrl={termsUrl}
        privacyUrl={privacyUrl}
        legal
      />

      {/* Honeypot: visually hidden, off the a11y tree and tab order. */}
      <div className={styles.hp} aria-hidden="true">
        <label htmlFor={`${ids.first}-website`}>Website</label>
        <input
          ref={hpRef}
          id={`${ids.first}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {captchaSiteKey ? (
        <Turnstile siteKey={captchaSiteKey} onToken={setCaptchaToken} />
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
      >
        {submitting ? (
          <span className={styles.spinnerWrap}>
            <span className={styles.spinner} aria-hidden="true" />
            Submitting…
          </span>
        ) : (
          "Sign me up"
        )}
        </button>
      </form>

      {isResult ? (
        <ResultOverlay
          phase={overlayPhase}
          tone={submitState === "error" ? "error" : "success"}
          title={overlayTitle}
          body={overlayBody}
          onDismiss={submitState === "error" ? dismissError : undefined}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header() {
  return (
    <div className={styles.header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.logo} src={brand.logoSrc} alt={brand.logoAlt} />
      <h1 className={styles.headline}>{brand.headline}</h1>
      <p className={styles.subhead}>{brand.subhead}</p>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-err`} className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  error,
  segments,
  termsUrl,
  privacyUrl,
  legal = false,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  segments: DisclosureSegment[];
  termsUrl: string;
  privacyUrl: string;
  legal?: boolean;
}) {
  return (
    <div className={styles.checkRow}>
      <label className={styles.checkLabel}>
        <input
          id={id}
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <span className={legal ? styles.legalText : styles.checkText}>
          {renderSegments(segments, termsUrl, privacyUrl)}
        </span>
      </label>
      {error ? (
        <span id={`${id}-err`} className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function renderSegments(
  segments: DisclosureSegment[],
  termsUrl: string,
  privacyUrl: string,
) {
  return segments.map((seg, i) => {
    if (!seg.href) return <span key={i}>{seg.text}</span>;
    const href = seg.href === "terms" ? termsUrl : privacyUrl;
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        // Prevent the wrapping <label> from toggling the checkbox on link click.
        onClick={(e) => e.stopPropagation()}
      >
        {seg.text}
      </a>
    );
  });
}

function ResultOverlay({
  phase,
  tone,
  title,
  body,
  onDismiss,
}: {
  phase: "in" | "out";
  tone: "success" | "error";
  title: string;
  body: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`${styles.overlay} ${phase === "out" ? styles.overlayOut : styles.overlayIn} ${onDismiss ? styles.dismissable : ""}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      onClick={onDismiss}
    >
      <div className={styles.overlayCard}>
        <span className={styles.iconBadge} data-tone={tone}>
          {tone === "error" ? <AlertIcon /> : <CheckIcon />}
        </span>
        <h2 className={styles.overlayTitle}>{title}</h2>
        <p className={styles.overlayBody}>{body}</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 7.5v5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="16.6" r="1.4" fill="currentColor" />
    </svg>
  );
}
