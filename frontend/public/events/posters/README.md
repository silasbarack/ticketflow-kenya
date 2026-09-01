# Event poster artwork

The active September 2026 homepage catalogue uses genuine promotional artwork
served by each event's official ticket seller. The API returns that artwork in
`event.posterUrl` and records its listing page in `event.posterSourceUrl`.

No generated or substitute artwork is used for a real event. The active poster
sources are documented in `CREDITS.md` and in the Prisma seed beside each event.

`components/EventPoster.tsx` renders artwork with `object-fit: cover`, a stable
aspect ratio and a neutral “Poster unavailable” state when the official image
cannot load. It never fabricates a fallback poster.

Older local files in this directory are unreferenced archive assets. They are
not returned by the current seed or displayed in the public event catalogue.
