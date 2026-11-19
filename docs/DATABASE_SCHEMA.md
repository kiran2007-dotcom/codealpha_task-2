# Database Schema — Orbit Workspace

Orbit Workspace uses Cloud Firestore with strict schema validation in `firestore.rules` synchronized with `firebase-blueprint.json`.

## Collections

### 1. `users/{userId}`
Private user profile (readable and writable only by the authenticated owner `uid == userId`).
- `uid` (string, immutable)
- `displayName` (string, 1–100)
- `email` (string, 3–254)
- `jobTitle` (string, 0–100)
- `department` (string, 0–100)
- `bio` (string, 0–500)
- `avatarColor` (hex string `#RRGGBB`)
- `createdAt` (server timestamp, immutable)
- `updatedAt` (server timestamp)

### 2. `emailDirectory/{emailHash}`
Non-PII exact SHA-256 email hash lookup table used exclusively when inviting registered teammates by email (`allow list: if false`).
- `uid`, `displayName`, `jobTitle`, `avatarColor`, `updatedAt`

### 3. `projects/{projectId}`
- `id`, `name` (1–120), `description` (0–2000), `status` (`Active | On Hold | Completed`)
- `ownerId` (immutable), `ownerName`
- `startDate`, `endDate` (`YYYY-MM-DD`)
- `memberIds` (bounded array of authorized UIDs, 1–25)
- `createdAt`, `updatedAt`

### 4. `projectMembers/{projectId}_{userId}`
- `id`, `projectId`, `projectOwnerId`, `userId`, `memberName`, `memberTitle`, `avatarColor`
- `role` (`owner | member`)
- `projectMemberIds` (bounded array 1–25)
- `addedBy`, `createdAt`, `updatedAt`

### 5. `tasks/{taskId}`
- `id`, `projectId`, `projectOwnerId`, `projectMemberIds`
- `title` (1–160), `description` (0–3000)
- `status` (`To Do | In Progress | Completed`)
- `priority` (`Low | Medium | High`)
- `dueDate` (`YYYY-MM-DD`)
- `assigneeId`, `assigneeName`
- `attachments` (bounded array 0–10 of `{ id, name, url, type, addedBy, addedAt }`)
- `createdBy`, `createdAt`, `updatedAt`

### 6. `comments/{commentId}`
Used for both task-level comments (`scope: 'task'`) and project-wide team discussions (`scope: 'discussion'`).
- `id`, `projectId`, `projectOwnerId`, `projectMemberIds`, `taskId`, `scope`, `authorId`, `authorName`, `body` (1–2000), `createdAt`

### 7. `notifications/{notificationId}`
Generated from real workspace events (task assignment, status change, comment added, member added, project updated).
- `id`, `recipientId`, `actorId`, `actorName`, `projectId`, `taskId`, `type`, `title`, `message`, `read`, `createdAt`

### 8. `activityLogs/{logId}`
Immutable audit log for project, task, member, and comment events.
- `id`, `projectId`, `projectOwnerId`, `projectMemberIds`, `entityType`, `entityId`, `action`, `details`, `actorId`, `actorName`, `createdAt`
