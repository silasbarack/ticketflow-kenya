/**
 * Variant-aware Expo config for TicketFlow Kenya.
 *
 * `app.json` remains the single source of truth for everything shared by all
 * builds (name, icon, splash, plugins, permissions). This file only layers on
 * the handful of values that must differ per build variant, so the development
 * and production apps can be installed side by side on one phone without
 * overwriting each other.
 *
 * The variant is chosen by the APP_VARIANT environment variable, which
 * `eas.json` sets per build profile:
 *
 *   APP_VARIANT=development  →  TicketFlow Kenya Dev      com.ticketflowkenya.app.dev
 *   APP_VARIANT=preview      →  TicketFlow Kenya Preview  com.ticketflowkenya.app.preview
 *   (unset / anything else)  →  TicketFlow Kenya          com.ticketflowkenya.app
 *
 * Production branding is the default, so an accidentally-unset variable can
 * never silently ship a "Dev"-labelled build — it can only fail the other way,
 * which is the safe direction.
 *
 * Running in Expo Go is unaffected: Expo Go ignores the Android package and
 * iOS bundle identifier entirely, so `npx expo start` still works as before.
 */

const PRODUCTION_PACKAGE = 'com.ticketflowkenya.app';
const PRODUCTION_SCHEME = 'ticketflowkenya';

const VARIANTS = {
  development: {
    nameSuffix: ' Dev',
    packageSuffix: '.dev',
    schemeSuffix: '-dev',
    icon: './assets/images/icon-dev.png',
    adaptiveIcon: './assets/images/adaptive-icon-dev.png',
  },
  preview: {
    nameSuffix: ' Preview',
    packageSuffix: '.preview',
    schemeSuffix: '-preview',
    // Preview shows production artwork — it is what testers should be judging.
    icon: null,
    adaptiveIcon: null,
  },
};

module.exports = ({ config }) => {
  const variant = VARIANTS[process.env.APP_VARIANT];

  // No variant selected: return the production config from app.json untouched.
  if (!variant) {
    return {
      ...config,
      android: { ...config.android, package: PRODUCTION_PACKAGE },
      ios: { ...config.ios, bundleIdentifier: PRODUCTION_PACKAGE },
      scheme: config.scheme ?? PRODUCTION_SCHEME,
    };
  }

  const baseScheme = config.scheme ?? PRODUCTION_SCHEME;

  return {
    ...config,
    name: `${config.name}${variant.nameSuffix}`,
    // A distinct scheme keeps deep links unambiguous when the production app
    // and a variant are installed on the same device.
    scheme: `${baseScheme}${variant.schemeSuffix}`,
    icon: variant.icon ?? config.icon,
    android: {
      ...config.android,
      package: `${PRODUCTION_PACKAGE}${variant.packageSuffix}`,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        ...(variant.adaptiveIcon ? { foregroundImage: variant.adaptiveIcon } : {}),
      },
    },
    ios: {
      ...config.ios,
      bundleIdentifier: `${PRODUCTION_PACKAGE}${variant.packageSuffix}`,
    },
  };
};
