# Event poster artwork

Real third-party events use genuine promotional artwork served by each
event's official ticket seller. The API returns that artwork through
`event.posterUrl` and records its listing page in `event.posterSourceUrl`;
sources are documented in `CREDITS.md` and in the Prisma seed beside each event.

TicketFlow's own listings (the November 2026 – February 2027 season, flagged
`isDemo`) use the `*.jpg` posters in this directory. They are original
TicketFlow artwork — drawn gradients and SVG, no stock imagery — and every one
carries the TicketFlow Kenya logo and the motto **"Good Events. Brighter
People."** Regenerate them from `frontend/` after editing
`scripts/event-posters/posters.json`:

    node scripts/event-posters/generate.js [slug ...]

Posters are 1600×1200 (4:3), the aspect the event cards and detail page crop
to; logo, title and motto sit inside the central safe area so the card badges
never cover them.

`components/EventPoster.tsx` renders artwork with `object-fit: cover`, a stable
aspect ratio, and a neutral "Poster unavailable" state if an image cannot load.
