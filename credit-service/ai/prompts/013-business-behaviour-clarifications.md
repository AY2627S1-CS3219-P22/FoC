<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Archived the exact user request and bounded clarification response against existing human-supplied requirements.
Author review: Pending human review.
Prompts and key responses: ../usage-log.md, entry 013.
-->

# Prompt archive — 013

## Exact user prompt

```text
what do we need to implement the business logic? is there anything unclear in the behaviour i have described for each function that i should clarify?
```

## Key assistant response (verbatim)

Yes. The main credit movements and response shapes are clear. What remains is defining edge cases and a few implementation details reserved for you by the assignment rules.

| Function | Behaviour still to clarify |
| --- | --- |
| **InitCredits** | If an account exists but its saved initialization response does not, what should happen? Normal duplicates already replay the original success; allocation remains strictly once. |
| **GetBalance** | What should happen when credit initialization is pending and the account does not exist yet? |
| **ReserveCredits** | Is there exactly one reservation per order for its entire lifetime? What happens when the order already has a reservation with different requester/amount values? Can a released order be reserved again? |
| **UpdateReservation** | Is `amount` the replacement total held for that order? Your F8.4 wording suggests this. What is the initial version, which successful operations increment it, and what happens on a stale `expectedVersion` or an unchanged amount? |
| **ReleaseCredits** | What happens if the reservation is missing or already `SETTLED`? An identical previously successful release already follows your replay rule. |
| **SettleCredits** | What happens if the reservation is missing or `RELEASED`, the courier has no credit account, the courier equals the requester, or another courier is supplied after settlement? |
| **GetReservation** | What should happen when no reservation exists for the order? |
| **Both history functions** | What are the default/maximum page sizes, treatment of invalid tokens/sizes, and ordering when timestamps are equal? Does an unknown user/order return an empty page or an error? Should later pages exclude entries added after page one? |

Your history schema supports signed movements. Please also confirm the exact entries/deltas for each action, including settlement's requester and courier entries, and whether an unchanged-amount update records history.

**One interaction needs an explicit decision:** your deterministic key identifies identical requests as the same action forever while their records remain. If you allow reserve → release → reserve for the same order, a later identical `ReleaseCredits(orderId)` would replay the first release instead of releasing the new hold. Whether that sequence is allowed must be settled before implementing that behaviour. F8.9.2 also mentions reserving and transferring after credits have been released; please confirm whether that belongs to this implementation or a later admin operation.

Across the functions, we still need your decisions on:

- **Validation and errors:** allowed amount range, whether zero is valid, ID validation, and gRPC codes for missing records, insufficient credits, version conflicts, and invalid state transitions.
- **Access checks:** which callers may invoke each operation, and where user/admin permissions are checked.
- **Implementation design:** finalized repository/domain method signatures, transaction ownership, the concrete locking strategy for both idempotency and shared account/reservation changes, and the exact request encoding hashed with SHA-256. Atomicity and duplicate replay themselves are already specified.

With those decisions, I can implement your existing domain classes, SQL repository, service operations, gRPC handlers, and behavioural/concurrency tests. Archive/restore remains deferred.

This review is recorded in the [credit-service usage log](/Users/rajirajeev/Documents/Karthika/NUS/Y4/CS3219/FoC/credit-service/ai/usage-log.md); no business code or design decisions were added.
