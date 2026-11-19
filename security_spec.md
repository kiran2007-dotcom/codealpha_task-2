# Orbit Workspace — Security Specification (Payload-First TDD)

## 1. Data Invariants

1. **Identity Integrity**: Every user document `/users/{userId}` can only be read, created, or updated by the verified user whose `request.auth.uid == userId`, with `uid == request.auth.uid`.
2. **PII Isolation**: User email addresses are stored exclusively in `/users/{userId}` (no `allow list`). Teammate invitations use `/emailDirectory/{sha256(email)}` which stores zero email PII and prohibits `list` queries (`allow list: if false`).
3. **Master Gate Membership**: Every project sub-resource (`tasks`, `comments`, `activityLogs`) validates live membership via `/projectMembers/{projectId}_{uid}` on single-document reads and all writes. Membership revocation immediately revokes access.
4. **Role Segregation (Owner vs Member)**:
   - Only `projects/{projectId}.ownerId` can edit project metadata, delete projects, add/remove members, edit task titles/priorities/due dates/assignees, or delete tasks.
   - Project Members can only read authorized project resources, update task `status` and `attachments`, create comments/discussions, and log activity for actions they perform (`actorId == request.auth.uid`).
5. **Bounded Arrays & Input Limits**: Every string field has an explicit `.size()` bound, every ID matches `^[a-zA-Z0-9_\-]+$`, and membership arrays are capped at 25 elements.
6. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`; `createdAt`, `ownerId`, and `projectId` are immutable after creation.
7. **Zero Client Query Delegation**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` without `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Attack Payloads

1. **Shadow Field Injection on User Profile**: Creating `/users/u1` with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check rejects unknown keys).
2. **PII Scraping via List**: Calling `getDocs(collection(db, 'users'))` -> `PERMISSION_DENIED` (`allow list: if false`).
3. **ID Poisoning**: Creating `/projects/` with a 500-character ID or special characters `../admin` -> `PERMISSION_DENIED` (`isValidId`).
4. **Owner Spoofing on Project Create**: Creating `/projects/p1` with `ownerId: 'victim_uid'` -> `PERMISSION_DENIED` (`incoming().ownerId == request.auth.uid`).
5. **Orphaned Project Without Owner Membership**: Creating `/projects/p1` outside a batch without `/projectMembers/p1_u1` -> `PERMISSION_DENIED` (`existsAfter` check).
6. **Privilege Escalation by Member**: Project Member updating `tasks/t1` field `priority` or `assigneeId` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(['status', 'attachments', 'updatedAt'])` for members).
7. **Cross-Project Task Injection**: Non-member creating a task referencing `projectId: 'secret_proj'` -> `PERMISSION_DENIED` (`isProjectMember` fails).
8. **Unverified Email Bypass**: Authenticated user with `email_verified: false` attempting any write -> `PERMISSION_DENIED` (`isVerifiedUser()` fails).
9. **Notification Spam**: User creating a notification for `recipientId: 'stranger'` not in the project -> `PERMISSION_DENIED` (`exists(/projectMembers/{projectId}_{recipientId})` fails).
10. **Actor Spoofing in Comments / Logs**: User posting a comment or activity log with `authorId: 'other_uid'` or `actorId: 'other_uid'` -> `PERMISSION_DENIED`.
11. **Timestamp Backdating**: Creating a project or task with `createdAt: new Date(0)` instead of `serverTimestamp()` -> `PERMISSION_DENIED` (`incoming().createdAt == request.time`).
12. **Immutable Field Mutation**: Updating `projects/p1` to change `ownerId` or `createdAt`, or updating `tasks/t1` to change `projectId` -> `PERMISSION_DENIED`.
