# Orbit Workspace

Orbit Workspace is a full-stack Project Management and Team Collaboration Platform built with React, TypeScript, Tailwind CSS, Node.js (Express), Firebase Authentication, and Cloud Firestore.

## Key Features

- **Authentication & Account Security**: Google Sign-In (`signInWithPopup`) and Email/Password registration with strict password validation, email verification enforcement, persistent auth sessions, and editable user profiles.
- **Real-Time Workspace Dashboard**: Live KPI metrics (Total Projects, Total Tasks, To Do, In Progress, Completed, Overdue) computed directly from Firestore records, Assigned-to-Me task list, Recently Updated Projects with completion progress, and Team Activity feed.
- **Project Management**: Create, edit, and delete projects with descriptions, start/end dates, status tracking (`Active`, `On Hold`, `Completed`), and Markdown report export.
- **Team Collaboration & RBAC**: Project Owner and Project Member roles enforced in both `firestore.rules` and Node.js backend endpoints. Invite registered teammates by email, manage memberships, post task comments, and collaborate in project-wide team discussions.
- **Task Management & Kanban Board**: 3-column Kanban board (`To Do`, `In Progress`, `Completed`) with drag-and-drop and instant status persistence, task priorities (`Low`, `Medium`, `High`), due dates, link attachments, and per-task activity history.
- **Search, Filters & Views**: Global and scoped search, multi-criteria filtering (status, priority, assigned member, due date), sorting (newest, oldest, due date), interactive Monthly Calendar view, Notification Center, and Light/Dark theme support.

## Folder Structure

```text
orbit-workspace/
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── TESTING_CHECKLIST.md
│   └── USER_GUIDE.md
├── src/
│   ├── components/
│   │   ├── AuthView.tsx
│   │   ├── Avatar.tsx
│   │   ├── DashboardView.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── MyTasksView.tsx
│   │   ├── NotificationsView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── ProjectDetailView.tsx
│   │   ├── ProjectModal.tsx
│   │   ├── ProjectsView.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatusLabels.tsx
│   │   ├── TaskCreateModal.tsx
│   │   ├── TaskDetailModal.tsx
│   │   └── TopBar.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── validation.ts
│   │   └── workspaceLogic.ts
│   ├── services/
│   │   └── firestoreService.ts
│   ├── types/
│   │   └── orbit.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
│   └── workspaceLogic.test.ts
├── eslint.config.js
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules
├── firestore.rules.test.ts
├── package.json
├── security_spec.md
└── server.ts
```

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Firebase Configuration**:
   - Ensure `firebase-applet-config.json` contains your Firebase project configuration (`projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId`).
   - In the Firebase Console under **Authentication -> Sign-in method**, ensure **Google** is enabled. To also allow Email/Password registration, enable the **Email/Password** provider in Firebase Console.
   - Deploy `firestore.rules` to your Firestore database.
3. **Run in Development**:
   ```bash
   npm run dev
   ```
   The Express + Vite application starts on `http://localhost:3000`.
4. **Run Automated Tests & Typechecks**:
   ```bash
   npm test
   npm run lint
   npx eslint firestore.rules
   ```
5. **Production Build & Start**:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## Documentation

- [Database Schema](docs/DATABASE_SCHEMA.md)
- [User Guide](docs/USER_GUIDE.md)
- [Testing Checklist](docs/TESTING_CHECKLIST.md)
- [Security Specification](security_spec.md)
