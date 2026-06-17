import { getPublicBrandRuntime } from "@/lib/env";
import { brand } from "@/config/brand.config";
import SubscriptionForm from "@/components/SubscriptionForm";
import styles from "./page.module.css";

// Render per-request so brand/disclosure env (BRAND_NAME, SMS_TERMS_URL, …) is
// read at runtime, not baked at build. This keeps the rendered consent snapshot
// in sync with the route handler's runtime re-derivation, and lets env-only
// changes (or enabling captcha) take effect without a rebuild.
export const dynamic = "force-dynamic";

// Server component: resolves non-secret brand runtime values from env and passes
// them to the client form as props. The Aggregator token is NEVER read here.
export default function Page() {
  const rt = getPublicBrandRuntime();
  const variant = brand.layoutVariant;

  return (
    <main className={styles.main} data-variant={variant}>
      {variant !== "centered-card" && brand.heroSrc ? (
        <div
          className={styles.hero}
          style={{ backgroundImage: `url(${brand.heroSrc})` }}
          aria-hidden="true"
        />
      ) : null}

      <section className={styles.panel}>
        <SubscriptionForm
          brandName={rt.brandName}
          termsUrl={rt.termsUrl}
          privacyUrl={rt.privacyUrl}
          defaultCountry={rt.defaultCountry}
          captchaSiteKey={rt.captchaSiteKey}
        />
      </section>
    </main>
  );
}
