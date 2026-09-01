# Expo HAS CHANGED

This project is pinned to **Expo SDK 54** — deliberately, not accidentally.

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Do not upgrade the SDK

The target Android device can only install **Expo Go 54.0.8** from the Play Store (newer Expo Go builds are based on React Native 0.83+ and require a higher Android API level than the device has). Expo Go supports exactly one SDK per build, so raising the SDK here makes the app refuse to open on that phone with:

> "Project is incompatible with this version of Expo Go."

If you run `npx expo install --fix` or any tool suggests moving to SDK 55/56/57, **don't** — it will silently break on-device testing. Upgrading is only safe once the project moves to a development build (`expo-dev-client` + EAS), at which point Expo Go is no longer involved.

## SDK 54 gotchas already hit here

- `expo-sharing` and `expo-image` ship **no config plugin** in SDK 54 — they must NOT appear in `app.json`'s `plugins` array (they only gained plugins in SDK 57).
- `ios.icon` must be a PNG path; the Apple Icon Composer `.icon` bundle format is SDK 57+.
- `expo-file-system/legacy` **is** available in SDK 54 (19.0.x) and is what `src/services/tickets.service.ts` uses.
