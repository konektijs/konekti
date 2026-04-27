---
"@fluojs/microservices": patch
---

Tighten microservice transport ownership, abort, and shutdown contracts so caller-owned NATS clients are not closed by transport shutdown, NATS request/reply honors AbortSignal, and NATS/Kafka/RabbitMQ reject new publishes once close starts.
