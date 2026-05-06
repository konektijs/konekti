---
"@fluojs/cron": patch
---

Use platform-neutral default distributed lock owner IDs, retain local lock ownership after Redis release failures so shutdown can retry, and document cron expression portability plus distributed-lock drift/fencing caveats.
