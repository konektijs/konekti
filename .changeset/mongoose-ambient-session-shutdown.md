---
"@fluojs/mongoose": patch
---

Preserve Mongoose connection.transaction ambient session scope while tracking active sessions through shutdown so dispose hooks wait for transaction cleanup.
