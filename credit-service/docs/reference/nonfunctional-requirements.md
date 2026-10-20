<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Copied the human-supplied attachment verbatim inside a documentation wrapper; priorities and sprint labels are supplied by the human.
Author review: Pending human review.
Prompts and key responses: ../../ai/usage-log.md, entry 003.
-->

# Nonfunctional requirements

Source: user attachment received 2026-10-20 (Asia/Singapore).
The fenced content is verbatim human-supplied material, not AI-generated requirements.

```text
N1 		System Performance		
	N1.1	REST API response time should be within 2 seconds for 95% of requests for loads of up to 5,000 concurrent users	High	W7
	N1.1.1	Search results, current credits, order history/backlog, and user profile pages shall load within 2 seconds for 95% of requests	High	W7
	N1.1.2	Supplier search autocomplete should render within 200ms for 95% of searches	Medium	W7
	N1.2	Notification and in-app updates delivery latency shall meet defined thresholds based on message criticality and recipient type	High	W10-11
	N1.2.1	Order status updates for couriers (via push notification and in-app update) shall be delivered in < 500ms.	High	W10-11
	N1.2.2	Order status updates for requestors (via push notification and in-app update) shall be delivered in ≤ 5 seconds.	High	W10-11
	N1.2.3	Non-critical notifications (e.g., new errand availability) shall be delivered in ≤ 5 seconds.	High	W10-11
	N1.3	"Chat message delivery and confirmation latency over an active peer-to-peer link shall meet defined thresholds for both message rendering and 
delivery confirmation."	Medium	W10-11
	N1.3.1	Direct messages sent over an active peer-to-peer link shall render in the recipient's UI in < 500ms.	Medium	W10-11
	N1.3.2	Delivery receipts (sent/read status) shall be returned to the sender within 500ms of receipt confirmation by the peer.	Medium	W10-11
N2		Availability		
	N2.1	The deployed application should maintain at least 99% availability over a 365-day period.	Medium	W10-11
	N2.2	The deployment strategy should support application availability requirements per N4.1.	High	W10-11
	N2.2.1	The deployment environment shall support running at least two distinct application versions concurrently,  with the ability to route user traffic to each version independently, without functional interference between versions.	High	W10-11
	N2.2.2	The system shall support zero-downtime deployments, such that deployment of a new application version does not make the application unavailable to users and does not cause requests to fail solely because of the deployment.	Medium	W10-11
N3		Reliability		
	N3.1	The application should allow for fast rollbacks under 30 minutes in case of performance regressions or bugs in new software versions.	High	W10-11
	N3.2	The application shall automatically retry requests that fail due to transient network or service unavailability. Retried requests shall not cause duplicate processing of the same operation.	High	W10-11
	N3.3	The Order Service shall fail safely when the Credit Service is unavailable, such that no errand is successfully created unless the required credit reservation is confirmed.	High	W9/W10
N4		Concurrency and Data Consistency		
	N4.1	Repeated or concurrent submissions of the same operation shall result in at most one successful processing of that operation. Subsequent duplicate requests shall return the original result or indicate that the operation has already been processed.	High	W9/W10
	N4.2	When two or more requests concurrently modify the same database record, the system shall prevent lost updates such that no successfully committed update is unintentionally overwritten by another concurrent update	High	W9/W10
	N4.3	All credit transactions shall be atomic: a credit state change associated with a transaction shall either fully succeed or fully fail, with no partial state changes persisted.	High	W9/W10
N5		Usability		
	N5.1	"
The UI shall render without layout breakage (no overlapping elements, no horizontal scroll, no clipped text) 
on viewport widths from 320px to 1920px, covering mobile, tablet, and laptop form factors."	High	W7
	N5.2	The system shall be fully functional (100% of core user flows completable) on latest stable versions of Chrome, Safari, Edge, and Firefox	Medium	W7
N6		Maintainability		
	N6.1	All code changes shall pass automated CI checks before merge, including unit tests with at least 70% coverage.	High	W7
	N6.2	New code should pass automated all integration checks before pushing to production	High	W7
N7		Compliance and Regulatory		
	N7.1	Data collection and handling should adhere to PDPA guidelines.	High 	W7
	N7.2	Only necessary personal information such as name, photo and email will be collected and maintained.	High 	W7
	N7.3	Users personal account data will be removed after 4 years of inactivity	Medium	W8
N8		Security		
	N8.1	All user-supplied input used in database operations shall be handled using parameterised queries or equivalent protections against injection attacks.	High	W8
	N8.2	Personally identifiable information (name, address, phone, payment-linked identifiers if any) shall be encrypted, with access restricted to authorized roles and logged for audit.	High 	W8
	N8.3 	All protected Administration operations shall verify that the authenticated account has the required permission before execution.		W8
	N8.3.1	Following the principle of least privilege, any operation that is not explicitly permitted by the account’s assigned roles will be denied.	High 	W8
N9		Scalability		
	N9.1	The platform shall support auto scaling from 1,000 to 5,000 concurrent users, while maintaining an average response time of 2 seconds	High	W11 - 13
	N9.1.1	The system must scale to support 5000 concurrent credit transactions 	High	W11 - 13
	N9.2	The system shall support at least 2,000 notification fan-outs per minute without message delivery delay exceeding N1.2.3's 5-second target.	Low 	W11 - 13
N10		Data Freshness		
	N10.1	The user interface shall refresh cached errand listings at least once every 60 seconds.	High	W8-10
```
