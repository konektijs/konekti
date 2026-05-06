---
"@fluojs/slack": patch
---

Stop retrying permanent Slack webhook failures such as 403 and 404 while preserving bounded retries for transient webhook statuses.
