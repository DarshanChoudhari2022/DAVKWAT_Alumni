# Payment Recovery Implementation Plan

> **For agentic workers:** Execute this approved approach inline, task by task.

**Goal:** Recover missed Easebuzz confirmations and distinguish gateway failure from verification failure on Vercel Hobby.
**Architecture:** One signature-checked, atomic finalizer serves callbacks and authenticated transaction retrieval. A daily, authenticated cron processes a bounded, fairly ordered batch; signed-in members and admins can trigger checks sooner. Never mark a network timeout as payment failure.
**Tech stack:** Existing Next.js, Supabase, Easebuzz transaction v2 API; no paid services.
**Spec:** User selected automatic recovery with Vercel free-plan constraints in this conversation.

## Constraints and review focus

- Daily cron only. Faster checks require an open member page or admin action.
- Verify signatures, merchant environment, amount, transaction and member/plan identity before finalization.
- Repeated/concurrent successes must not extend membership twice; late failures cannot downgrade success.
- Store last-check result and safe diagnostic history; avoid logging credentials or signed payloads.
- Check ownership and cooldowns server-side; bound network timeout, batch and concurrency.
- No repeat-payment suggestion while verification is unresolved. Trust approval stays independent.

## Tasks

- [x] Add signed transaction retrieval and tests for failure, malformed data, wrong identity, timeout and invalid signature.
- [x] Add verification columns/migration, audit logging and recovery engine. Exercise pending-to-success, failed-to-success, and unavailable gateway/database paths.
- [x] Add authenticated member/admin checks, daily cron with Bearer CRON_SECRET, and bounded fair selection; test access and scheduling.
- [x] Add member polling, safe payment-return copy and admin check/history details. Prevent unresolved repeat charges.
- [x] Run targeted tests, full tests, typecheck and build; document migration/env/webhook deployment requirements.

Deployment handoff: live Supabase migration 0024, Production CRON_SECRET, and merchant webhook enablement require the user's project access. Ankit's independently verified transaction was recovered through the existing live signature-verifying webhook (HTTP 200, duplicate false); no second charge was created.
