-- AI Assistance Disclosure:
-- Tool: OpenAI Codex (model: GPT-6), date: 2026-10-26 (Asia/Singapore).
-- Scope: Removed idempotency user_id and created_at as specified by the human.
-- Author review: Pending human review.
-- Prompts/key responses: ../ai/usage-log.md, entry 045.
-- AI-generated; human review pending.

ALTER TABLE idempotency_records
    DROP COLUMN user_id,
    DROP COLUMN created_at;
