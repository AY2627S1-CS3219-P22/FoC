<!--
AI Assistance Disclosure:
Tool: OpenAI Codex (model: GPT-6), date: 2026-10-20 (Asia/Singapore).
Scope: Copied the human-supplied attachment verbatim inside a documentation wrapper; priorities and sprint labels are supplied by the human.
Author review: Pending human review.
Prompts and key responses: ../../ai/usage-log.md, entry 003.
-->

# Functional requirements

Source: user attachment received 2026-10-20 (Asia/Singapore).
The fenced content is verbatim human-supplied material, not AI-generated requirements.

```text
Functional Requirements	Priority	Planned Sprint	PR
User Service			
F1 User Account Creation			
F1.1 The system shall allow users to create an account with a first name, last name, unique username, unique email and password.	High	W7	https://github.com/AY2627S1-CS3219-P22/FoC/pull/19
F1.1.1 The system shall verify that the user's email and username is unique prior to successful account creation.	High	W7	
F1.1.2 The system should verify that the user's password follows password verification rules including a minimum of 8 characters, and at least 1 special character, 1 uppercase character, 1 numeric character and reject any registration attempt with a non-compliant password.	High	W7	
F1.1.3 The system shall verify that all fields have been filled prior to successful account creation.	High	W7	
F1.1.4 The system shall verify that the email address ends with the suffix `@u.nus.edu` or `@nus.edu.sg`	High	W7	
F1.1.5 The system shall require users to verify their email address using a one-time password (OTP)  (details in F4).	High	W8	pending
F2 User Account Management			
F2.1 The system shall allow users to login with their registered email and password.	High	W7	https://github.com/AY2627S1-CS3219-P22/FoC/pull/21
F2.1.1 The system shall reject and notify the user if they have tried to login with an invalid email or incorrect password.	High	W7	
F2.1.2 The system shall not allow the user to attempt login if an email or password has not been input.	High	W7	
F2.2 The system shall allow users to log out of their account.	High	W7	
F2.2.1 The system shall terminate user session upon logout	High	W7	
F2.3 The system shall allow authenticated users to view their profile information, including their first name, last name, username, email address, and assigned user role.	High	W7	
F2.4 The system should allow authenticated users to update their own profile information.	Medium	W7	
F2.4.1 The system should restrict the email address and assigned user role fields from being edited by the user.	Medium	W7	
F2.4.2 The system should reject any edits to username if the desired username is already in use by another account.	Medium	W7	
F2.4.3 The system should notify the user if a profile update fails due to duplicate username or invalid input format.	Medium	W7	
F2.5 The system should support authenticated users to change their password using a one-time password (OTP) via email verification (details in F4).	Low	W7	pending, depend on F4
F2.6 The system shall allow internal services to retrieve public user profile informations (username, first name, and last name) by User ID.	High	W7	https://github.com/AY2627S1-CS3219-P22/FoC/pull/21
F2.7 The system should support users in deleting their account.	Low	W8	pending
F2.7.1 The system shall terminate all of user's active sessions upon deletion.	Low	W8	pending
F2.7.2 Upon the user's deletion of their account, data regarding their password, first name, last name and username should be deleted.	Low	W8	pending
F2.7.3 Upon the user's deletion of their account, their email and remaining credits will be stored in a separate archive database for up to 4 years.	Low	W8	pending, depend on archive database
F2.7.4 The user will be notified that if they create an account using the same email within 4 year, previous credits will be restored.	Low	W8	pending, depend on archive database
F2.7.5 The system shall reject account deletion requests if the user has active errands, uncompleted errands, open requests or has an unresolved dispute associated with an errand in which they participated as requester or courier, regardless of whether they are the party who raised the dispute.	Low	W8	pending, depend on Order Service and Credit Service
F3 User Role-based Access Control			
F3.1 The system shall support the User and Administrator account roles.	High	W7	"https://github.com/AY2627S1-CS3219-P22/FoC/pull/19


"
F3.1.1 The system shall assign the User role to every newly registered account by default.	High	W7	
F3.1.2 The system shall allow an account to hold both the User and Administrator roles simultaneously.	High	W7	
F3.2 The system should ensure that at least one active account retains the Administrator role at all times after system initialization.	Medium	W7	https://github.com/AY2627S1-CS3219-P22/FoC/pull/64
F3.2.1 The system should initialize the application with at least one active Administrator account.	Medium	W7	
F3.2.2 The system shall reject an attempt to delete the only remaining active Administrator account.	Medium	W7	
F3.3 The system shall support the assignment and revocation of the Administrator role.	Medium	W7	
F3.3.1 The system should allow only an authorised administrator to assign or revoke another user's Administrator role.	Medium	W7	
F3.3.2 The system should ensure if an account without the Administrator role attempts to assign or revoke an Administrator role, the system will reject the request and leave all account roles unchanged.	Low	W7	
F4 One-Time Password (OTP)			
F4.1 The system shall generate and send a secure numeric One-Time Password (OTP) to the targe email address upon request.	High	W8	pending
F4.1.1 The system shall invalidate an OTP after an expiration period of 10 minutes.	Medium	W8	pending
F4.1.2 The system shall enforce a 60-second cooldown period before allowing a user to request a new OTP for the same email address.	Low	W8	pending
F4.1.3 The system shall reject verification attempts and invalidate the OTP after 3 consecutive failed attempts.	Low	W8	pending
F4.1.4 The system shall invalidate an OTP immediately upon successful verification to prevent reuse.	Low	W8	pending
Supplier Service			
F5 Supplier (Stores/Locations/Facilities) Management			
F5.1 The system should support creation of suppliers by admins.	High	W7	
F5.1.1 The system should only allow admin to add or delete new stores/locations/facilities.	High	W7	
F5.1.2 The system shall require the supplier name, category type, and location to be provided before a supplier can be created.	High	W7	
F5.1.3 The system shall uniquely identify each registered supplier to prevent duplicate entity records.	High	W7	
F5.1.4 The system should ensure that each creation has a unique name if there are one or more other suppliers with identical/similar longitude and latitude coordinates.	High	W7	
F5.2 The system should allow users to view and search a list of suppliers.	High	W7	
F5.2.1 The system shall display available campus stores, facilities, and locations from which users can request errands.	High	W7	
F5.2.2 The system should allow users to be able to view supplier information such as name, category, location, opening hours and description.	High	W7	
F5.2.3 The system should allow users to be able to search and filter suppliers by name, category and location.	High	W7	
F5.2.4 The system should allow autocomplete for supplier search	Low	W7	
F5.3 The system should allow admins to update supplier information.	High	W7	
F5.3.1 The system should allow admins to update information such as coordinates, description, name, opening hours and picture of existing suppliers. 	High	W7	
F5.4 The system should support the deletion of suppliers by admins.	High	W7	
F5.4.1 The system should maintain information about the deleted suppliers to preserve old order history.	High	W7	
Order Service			
F6 Request Management			
F6.1 The system shall allow a user to act as both a requester and a courier using the same account.	High	W8	
F6.1.1 The system should allow a user to create errand requests as a requester regardless of whether they are currently fulfilling another errand as a courier.	High	W8	
F6.1.2 The system should allow a user to accept an errand request as a courier even if they have an open errand request as a requester.	High	W8	
F6.1.3 The system should not allow a user to accept their own errand request.	High	W8	
F6.2 The system shall allow users to create errand requests as requesters.	High	W8	
F6.2.1 The system should allow requester to select a pickup supplier/location and a destination location for the errand.	High	W8	
F6.2.2 The system should allow the requester to specify a title, expiry date, description and number of credits for the errand.	High	W8	
F6.2.3 The system should require all mandatory request information to be provided before creating the errand request.	High	W8	
F6.2.4 The system should assign a unique identifier to each errand request.	High	W8	
F6.2.5 Before creating an errand request, the system shall verify that the requestor has sufficient available credits.	High	W9/W10	
F6.2.6 The system shall prevent the errand request from being created if the requester has insufficient available credits.	High	W9/W10	
F6.2.7 The system shall request the credit service to reserve the required credits from the requester and create the errand only if the reservation succeeds.	High	W9/W10	
F6.3 The system should support the editing of a request prior to acceptance by a courier.	High	W8	
F6.3.1 The system shall allow the requestor to update the number of credits, request description, expiry date, and supplier location before it is accepted by a courier.	High	W9/W10	
F6.3.2 If an update changes the required number of credits, the system shall verify that the requester has sufficient available credits for the updated amount before requesting the Credit Service to release the previously reserved credits and reserve the updated amount.	High	W9/W10	
F6.3.3 If an errand edit and courier acceptance for the same request occur concurrently, the system shall prioritize the courier acceptance and reject the edit.	High	W9/W10	
F6.3.4 Once an errand update has been successfully initiated, the system shall remove the errand from the open errand list and prevent further courier acceptance until the update is completed.	High	W9/W10	
F6.4 The system shall support cancellation and expiry of errand requests.	Medium	W9/W10	
F6.4.1 The system shall allow the requester to cancel an errand request that has not yet been accepted by a courier.	Medium	W9/W10	
F6.4.2 The system shall mark an errand request as expired when its specified expiry date and time are reached and remove it from the open errand list.	Medium	W9/W10	
F6.4.3 If a requestor's cancellation or expiry and a courier's acceptance request for the same errand occur concurrently, the system shall prioritize the cancellation or expiry.	Medium	W9/W10	
F6.5 The system shall maintain an activity history for each user's errand requests.	Medium	W9/W10	
F6.5.1 Upon confirmation of errand completion, cancellation or expiry, the system shall add the errand, its details, and the user's role as requester to the user's activity history.	Medium	W9/W10	
F6.5.2 The system shall allow users to view their past errand requests in their activity history.	Medium	W9/W10	
F6.5.3 Upon deletion of a user's account, the system shall retain all completed, expired, and cancelled errands, including their details and the user's requester role, while disconnecting them from the deleted account and displaying the username as "DeletedUser".	Medium	W9/W10	
F6.6 The system should maintain the status history for each errand.	Medium	W9/W10	
F6.6.1 The system shall record a timestamped entry for each errand's creation (with initial field values), each edit (record both the changed field(s) and their before/after values), acceptance, pickup, delivery, and completion/cancellation/expiry.	Medium	W9/W10	
F6.6.2 The system shall allow only authorised users with the Administrator role to view an errand's status history.	Medium	W9/W10	
F7 Courier Errand Management			
F7.1 The system shall allow users to view available errand requests.	High	W8	
F7.1.1 The system should display errand requests available for acceptance, except the user's own errand requests, if any.	High	W8	
F7.1.2 The system shall allow users to view the relevant details of an open errand before accepting it.	High	W8	
F7.2 The system should allow users to accept available errand requests.	High	W8	
F7.2.1 The system should not allow a requester to accept their own errand request.	High	W8	
F7.2.2 The system should ensure that each errand request is assigned to at most one courier.	High	W8	
F7.2.3 Once an errand has been assigned to a courier, the system shall remove it from the list of available requests and prevent other couriers from accepting it.	High	W8	
F7.2.4 If two or more couriers accept the same job concurrently, the system shall allow only one acceptance to succeed and reject all other attempts.	High	W8	
F7.3 The system should allow a courier to manage errands assigned to them.	High	W9/W10	
F7.3.1 The system should allow courier to view the errands currently assigned to them.	High	W9/W10	
F7.3.2 The system should allow couriers to view the relevant pick up supplier/location, delivery location and the description of an assigned errand.	High	W9/W10	
F7.4 The system shall allow the assigned courier to update the progress of an errand.	High	W9/W10	
F7.4.1 The system shall allow the assigned courier to mark an errand as picked up.	High	W9/W10	
F7.4.2 The system shall allow the assigned courier to mark an errand as delivered.	High	W9/W10	
F7.5 The system shall support the handling of states of requests.	High	W9/W10	
F7.5.1 Upon errand creation, the system should assign the status of the request to “Unassigned”.	High	W9/W10	
F7.5.2 Upon acceptance of the request by a courier, the system should assign the status of the request to “Assigned”.	High	W9/W10	
F7.5.3 When the courier indicates that the errand has been picked up, the system should assign the status of the request to “Picked Up”.	High	W9/W10	
F7.5.4 When the courier confirms delivery of the errand, the system should assign the status to “Delivered”.	High	W9/W10	
F7.5.5 Upon the cancellation of request by the requester, the system should assign the status to "Cancelled".	High	W9/W10	
F7.5.6 Once an errand has been completed or cancelled, the system shall prevent further errand-status updates.	High	W9/W10	
F7.5.7 The system shall prevent users other than the assigned courier from updating courier-controlled statuses.	High	W9/W10	
F7.6 Upon errand completion, cancellation or expiry the system should request the credit management service to handle the relevant transfers	High	W9/W10	
F7.6.1 Upon successful completion of errand, the system should request credit service to handle the transfer of credits to the courier.	High	W9/W10	
F7.6.2 Upon cancellation or expiry of errand, the system should request credit service to handle the transfer of credits back to the requester.	High	W9/W10	
F7.7 The system should maintain an activity history of errands completed by each courier.	Medium	W9/W10	
F7.7.1 Upon errand completion, the system should add the errand, its details and the user's role as courier to the user's activity history.	Medium	W9/W10	
F7.7.2 The system should allow users to view their past courier history.	Medium	W9/W10	
F7.7.3 Upon deletion of a user's account, the system shall retain all completed errands associated with the user, including their details and the user's courier role, while disconnecting them from the deleted account and displaying the username as "DeletedUser".	Medium	W9/W10	
Credit Service			
F8 Credit Management			
F8.1 The system should maintain a non-negative credit balance for each user.	High	W8	
F8.1.1 The system should allocate an initial amount of 10 credits to a user upon registration.	High	W8	
F8.1.2 The system should never allow the credit balance of a user to go negative.	High	W8	
F8.2 The system should display users' credit balance details.	High	W8 - W10	
F8.2.1 The system should display users' total credit balance, available credit balance and reserved credit balance	Medium	W8 - W10	
F8.2.2 The system should display users' past credit transfer history.	Medium	W8 - W10	
F8.2.3 The system shall record a history entry each time a reservation is created, updated, released, or transferred, capturing the amount of credits, timestamp, and associated errand ID.	Low	W8 - W10	
F8.3 The system should reserve credits when an errand request is created.	High	W8 - W10	
F8.3.1 Upon successful creation of an errand, the system should reserve the required number of credits from the requester's balance	High	W8 - W10	
F8.3.2 Reserved credits should not be available for use in another errand request while they remain reserved.	High	W8 - W10	
F8.3.3 The system shall verify sufficient available balance and reserve the required credits as a single atomic operation.	High	W8 - W10	
F8.4 The system should update the reserved credits when user updates the number of offered credits for an existing errand.	High	W8 - W10	
F8.4.1 The system shall verify that the requestor has sufficient available balance to cover the updated credit amount before applying any change to the existing reservation.	High	W8 - W10	
F8.4.2 If sufficient balance is available, the system shall release the previously reserved credits and reserve the updated amount within the same atomic operation.	High	W8 - W10	
F8.4.3 If sufficient balance is not available for the updated amount, the system shall reject the update in its entirety and leave the original reservation unchanged.	High	W8 - W10	
F8.5 The system should transfer the reserved credits upon successful completion of an errand.	High	W8 - W10	
F8.5.1 After delivery is confirmed by the courier, the system should transfer the reserved credits to the assigned courier.	High	W8 - W10	
F8.5.2 Credits for a completed errand should only be transferred once.	High	W8 - W10	
F8.6 The system should release reserved credits when an errand is not completed.	Medium	W8 - W10	
F8.6.1 Reserved credits should be released back to the requester if an errand request is cancelled by the requestor before being accepted.	Medium	W8 - W10	
F8.6.2 The system should release the reserved credits back to the requester if an errand request expires before being accepted.	Medium	W8 - W10	
F8.6.3 Reserved credits shall be released back to the requester if an accepted errand is not completed within the user specified time of delivery.	Medium	W8 - W10	
F8.7 The system shall archive a user's balance on account deletion.	High	W8 - W10	
F8.7.1 The system shall only archive a user's balance if they have no active errands. 	Medium	W8 - W10	
F8.7.2 The system shall restore an archived balance if a matching email re-registers within 4 years.	Medium	W8 - W10	
F8.8 The system should maintain the integrity of credit transactions.	High	W8 - W10	
F8.8.1 The system should ensure that each credit transfer or release associated with an errand is procesed only once, rejecting duplicate or repeated execution requests.	High	W8 - W10	
"F8.8.2 Each credit transfer shall either fully complete (debit from source, credit to destination 
both persisted) or fully fail with no partial state change"	High	W8 - W10	
F8.9: The system shall allow an administrator to trigger a manual credit adjustment as an outcome of a resolved dispute.	Low	W8 - W10	
F8.9.1 The system shall transfer reserved credits if the disputed errand has still reserved credits from the requestor.	Low	W8 - W10	
F8.9.2 The system shall reserve and transfer credits if the disputed errand has no reserved credits.	Low	W8 - W10	
Communication Service			
F9 Notifications Service			
F9.1 The system should notify requesters of relevant updates to their errands.	High	W10 - W11	
F9.1.1 The system should notify the requester when a courier accepts their errand request.	High	W10 - W11	
F9.1.2 The system should notify the requester when the courier marks the errand as picked up.	High	W10 - W11	
F9.1.3 The system should notify the requester when the courier marks the errand as delivered/arrived.	High	W10 - W11	
F9.1.4 The system should notify the requester when their errand is completed or cancelled.	High	W10 - W11	
F9.1.5 The system shall notify the requester and assigned courier whenever the status of their errand changes.	High	W10 - W11	
F9.2 The system should notify couriers of relevant errand events.	Medium	W10 - W11	
F9.2.1 The system should notify couriers of newly available errand requests if they indicate they would like to be notified in their Profile.	High	W10 - W11	
F9.2.2 The system should notify an assigned courier when an accepted errand is approaching its deadline.	Medium	W9 - W11	
F9.2.3 The system should notify the requestor when the courier confirms completion of the errand.	High	W10 - W11	
F9.2.4 Upon successful errand creation the system should notify the requester that their specified number of credits are in reserve, and will only be charged from their account upon errand completion	High	W10 - W11	
F10 Chat Communication 			
F10.1 The system should allow participants of an active errand to exchange messages.	Low	W10 - W11	
F10.1.1 The system should allow the requester to send messages to the assigned courier.	Low	W10 - W11	
F10.1.2 The system should allow the assigned courier to send messages to the requester.	Low	W10 - W11	
F10.1.3 The system should deliver new messages to the other participant in real time.	Low	W10 - W11	
F10.2 The system should restrict access to errand conversations.	Low	W10 - W11	
F10.2.1 The system should allow only the requester and assigned courier to access the conversation associated with an errand.	Low	W10 - W11	
F10.2.2 The system should prevent other users from viewing or sending messages in the conversation.	Low	W10 - W11	
F10.3 The system should maintain messages associated with an errand.	Low	W10 - W11	
F10.3.1 The system should display messages exchanged between the requester and courier in chronological order.	Low	W10 - W11	
F10.3.2 The system should associate each displayed message with its sender.	Low	W10 - W11	
F10.4 The system should not preserve chatrooms and messages after the errand is no longer active.	Low	W10 - W11	
F10.4.1 The system should delete messages and chatrooms 1 hour after the errand has been marked as delivered by the courier.	Low	W10 - W11	
F10.4.2 The system should prevent new messages from being sent 10 minutes after the errand is completed or cancelled.	Low	W10 - W11	
F10.5 The system should filter vulgar or harmful chat messages sent by a user, and consequently flag the users account and message for admin review	Medium	W10 - W11	
Admin Dashboard Service			
F11 Order Listing			
F11.1 The system shall allow an authenticated administrator to view a list of all past and present errand requests across all users.	Medium	W10 - W11	
F11.1.1 The system shall allow an authenticated administrator to view a list of all open/in-progress errand requests across all users.	Medium	W10 - W11	
F11.1.2 The system shall allow an administrator to view a list of all completed, cancelled, and expired errand requests across all users.	Medium	W10 - W11	
F11.2 The system should allow an administrator to filter/search the order listing by status, requester, courier, supplier, or date range.	Low	W10 - W11	
F11.3 The system should allow an administrator to view an individual order's full status-transition history.	Low	W10 - W11	
F11.4 The system shall restrict access to the admin order listing to users holding the Administrator role.	Low	W10 - W11	
```
