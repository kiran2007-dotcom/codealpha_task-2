# Orbit Workspace — Testing Checklist

## Automated Test Coverage (`npm test`)
- [x] Password strength validation (length, uppercase, lowercase, numeric, special character)
- [x] Project input validation (required fields, date ordering, length limits)
- [x] Task and attachment URL validation
- [x] Real-time dashboard KPI and overdue calculations
- [x] Search, status, priority, assignee, due-date filtering, and sorting
- [x] Role-Based Access Control matrix (Owner vs Member vs Outsider)
- [x] Backend Express HTTP authorization (401 unauthenticated, 403 member delete/export restriction, 200 authorized status update)
- [x] Firestore Security Rules & Blueprint invariants (`firestore.rules.test.ts` + ESLint security rules check)

## Manual End-to-End Verification Checklist
- [ ] Register / Sign in with Google or Email+Password and verify session persistence on reload
- [ ] Edit user profile (`Profile & Settings`) and verify changes persist in Firestore
- [ ] Toggle Dark Mode / Light Mode and verify contrast across all views
- [ ] Create, edit, export, and delete a Project (Owner)
- [ ] Invite a registered teammate by email in the Team tab and verify they see the project
- [ ] Create a Task, assign it to a teammate, and verify a Notification + Activity Log are created
- [ ] Drag a Task across Kanban columns (`To Do` -> `In Progress` -> `Completed`) and reload to confirm persistence
- [ ] Verify Project Member cannot delete tasks/projects or edit task priority/assignee (enforced in UI, backend API, and `firestore.rules`)
- [ ] Post a Task Comment and Team Discussion message and verify real-time updates
- [ ] Verify Search & Filters in both Project Task List and My Tasks views
- [ ] Verify responsive layout on mobile (`375px`) and desktop (`1440px`) viewports
