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

## Outstanding: re-bundle the event posters

The backend catalogue was replaced with a September–December 2026 lineup, and
posters moved to `frontend/public/events/posters/<slug>.webp`. Two things here
still point at the old August 2026 lineup:

- `src/data/poster-assets.ts` bundles the six **archived** events' posters. None
  of them match a poster URL the API returns today, so every real poster is
  currently fetched over the network from `WEB_URL`.
- `src/data/mock-events.ts` mirrors those same six expired events.

Once the new posters exist in `frontend/public/events/posters/`, copy them into
`assets/posters/` and re-key `BUNDLED_POSTERS` to the new slugs (Metro needs
literal `require()` paths, so the map has to be written out by hand). Re-mirror
`mock-events.ts` against the current seed at the same time.

Poster URLs resolve against `WEB_URL`, not `API_URL` — posters are static assets
of the web app, so resolving them against the API origin returns a 404.
