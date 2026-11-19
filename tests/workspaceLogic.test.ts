import { describe, expect, it } from 'vitest';
import type { NextFunction, Response } from 'express';
import http from 'http';
import {
  validateAttachmentInput,
  validatePasswordStrength,
  validateProjectInput,
  validateTaskInput,
} from '../src/lib/validation.ts';
import {
  calculateDashboardMetrics,
  calculateProjectProgress,
  filterAndSortTasks,
  getProjectPermissions,
  getUserProjectRole,
  isTaskOverdue,
} from '../src/lib/workspaceLogic.ts';
import { authorizeTaskAction, createApp, type AuthenticatedRequest } from '../server.ts';
import type { Project, ProjectMember, Task } from '../src/types/orbit.ts';

const sampleProject: Project = {
  id: 'proj_1',
  name: 'Platform Core',
  description: 'Core services overhaul',
  status: 'Active',
  ownerId: 'owner_uid',
  ownerName: 'Alex',
  startDate: '2026-11-01',
  endDate: '2026-12-15',
  memberIds: ['owner_uid', 'member_uid'],
};

const sampleMembers: ProjectMember[] = [
  {
    id: 'proj_1_owner_uid',
    projectId: 'proj_1',
    projectOwnerId: 'owner_uid',
    userId: 'owner_uid',
    memberName: 'Alex',
    memberTitle: 'Lead',
    avatarColor: '#1E3A5F',
    role: 'owner',
    projectMemberIds: ['owner_uid', 'member_uid'],
    addedBy: 'owner_uid',
  },
  {
    id: 'proj_1_member_uid',
    projectId: 'proj_1',
    projectOwnerId: 'owner_uid',
    userId: 'member_uid',
    memberName: 'Sam',
    memberTitle: 'Engineer',
    avatarColor: '#2E6F5E',
    role: 'member',
    projectMemberIds: ['owner_uid', 'member_uid'],
    addedBy: 'owner_uid',
  },
];

const sampleTasks: Task[] = [
  {
    id: 'task_1',
    projectId: 'proj_1',
    projectOwnerId: 'owner_uid',
    projectMemberIds: ['owner_uid', 'member_uid'],
    title: 'Design auth middleware',
    description: 'Verify Firebase tokens',
    status: 'Completed',
    priority: 'High',
    dueDate: '2026-11-10',
    assigneeId: 'owner_uid',
    assigneeName: 'Alex',
    attachments: [],
    createdBy: 'owner_uid',
    createdAt: 1000,
  },
  {
    id: 'task_2',
    projectId: 'proj_1',
    projectOwnerId: 'owner_uid',
    projectMemberIds: ['owner_uid', 'member_uid'],
    title: 'Build Kanban board',
    description: 'Persist column drops',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: '2026-11-15',
    assigneeId: 'member_uid',
    assigneeName: 'Sam',
    attachments: [],
    createdBy: 'owner_uid',
    createdAt: 2000,
  },
  {
    id: 'task_3',
    projectId: 'proj_1',
    projectOwnerId: 'owner_uid',
    projectMemberIds: ['owner_uid', 'member_uid'],
    title: 'Write user docs',
    description: 'Setup and security notes',
    status: 'To Do',
    priority: 'Low',
    dueDate: '2026-11-25',
    assigneeId: 'member_uid',
    assigneeName: 'Sam',
    attachments: [],
    createdBy: 'owner_uid',
    createdAt: 3000,
  },
];

describe('Password & Input Validation', () => {
  it('enforces strong password rules', () => {
    expect(validatePasswordStrength('short').valid).toBe(false);
    expect(validatePasswordStrength('lowercaseonly1!').valid).toBe(false);
    expect(validatePasswordStrength('NoNumbers!').valid).toBe(false);
    expect(validatePasswordStrength('NoSpecial123').valid).toBe(false);
    expect(validatePasswordStrength('OrbitSecure#2026').valid).toBe(true);
  });

  it('validates project dates and boundaries', () => {
    expect(
      validateProjectInput({
        name: 'Launch',
        description: 'Specs',
        status: 'Active',
        startDate: '2026-12-10',
        endDate: '2026-12-01',
      }).valid
    ).toBe(false);

    expect(
      validateProjectInput({
        name: 'Launch',
        description: 'Specs',
        status: 'Active',
        startDate: '2026-12-01',
        endDate: '2026-12-20',
      }).valid
    ).toBe(true);
  });

  it('validates task and attachment inputs', () => {
    expect(
      validateTaskInput({
        title: '',
        description: 'desc',
        status: 'To Do',
        priority: 'Low',
        dueDate: '2026-11-20',
      }).valid
    ).toBe(false);

    expect(
      validateAttachmentInput({
        name: 'Spec',
        url: 'javascript:alert(1)',
        type: 'link',
      }).valid
    ).toBe(false);

    expect(
      validateAttachmentInput({
        name: 'Spec',
        url: 'https://example.com/spec.pdf',
        type: 'link',
      }).valid
    ).toBe(true);
  });
});

describe('Dashboard Metrics & Overdue Detection', () => {
  it('calculates real task and overdue metrics accurately', () => {
    const today = '2026-11-19';
    expect(isTaskOverdue(sampleTasks[0], today)).toBe(false); // Completed
    expect(isTaskOverdue(sampleTasks[1], today)).toBe(true); // Due 11-15, In Progress
    expect(isTaskOverdue(sampleTasks[2], today)).toBe(false); // Due 11-25

    const metrics = calculateDashboardMetrics([sampleProject], sampleTasks, today);
    expect(metrics).toEqual({
      totalProjects: 1,
      totalTasks: 3,
      todoTasks: 1,
      inProgressTasks: 1,
      completedTasks: 1,
      overdueTasks: 1,
    });
  });

  it('computes project completion percentage', () => {
    const progress = calculateProjectProgress(sampleTasks, 'proj_1');
    expect(progress).toEqual({ total: 3, completed: 1, percentage: 33 });
  });
});

describe('Search, Filtering, and Sorting', () => {
  it('filters by search, status, priority, assignee, and due date', () => {
    const today = '2026-11-19';
    const overdue = filterAndSortTasks(
      sampleTasks,
      { search: '', status: 'All', priority: 'All', assigneeId: 'All', dueFilter: 'overdue', sortBy: 'newest' },
      today
    );
    expect(overdue.map((t) => t.id)).toEqual(['task_2']);

    const samNewest = filterAndSortTasks(
      sampleTasks,
      { search: '', status: 'All', priority: 'All', assigneeId: 'member_uid', dueFilter: 'all', sortBy: 'newest' },
      today
    );
    expect(samNewest.map((t) => t.id)).toEqual(['task_3', 'task_2']);

    const searchKanban = filterAndSortTasks(
      sampleTasks,
      { search: 'kanban', status: 'All', priority: 'All', assigneeId: 'All', dueFilter: 'all', sortBy: 'oldest' },
      today
    );
    expect(searchKanban.map((t) => t.id)).toEqual(['task_2']);
  });
});

describe('RBAC Permissions & Backend Authorization', () => {
  it('enforces Owner vs Member vs Non-Member roles', () => {
    const ownerRole = getUserProjectRole(sampleProject, sampleMembers, 'owner_uid');
    const memberRole = getUserProjectRole(sampleProject, sampleMembers, 'member_uid');
    const outsiderRole = getUserProjectRole(sampleProject, sampleMembers, 'stranger_uid');

    expect(ownerRole).toBe('owner');
    expect(memberRole).toBe('member');
    expect(outsiderRole).toBeNull();

    const ownerPerms = getProjectPermissions(ownerRole);
    const memberPerms = getProjectPermissions(memberRole);
    const outsiderPerms = getProjectPermissions(outsiderRole);

    expect(ownerPerms.canDeleteProject).toBe(true);
    expect(ownerPerms.canManageMembers).toBe(true);
    expect(memberPerms.canDeleteProject).toBe(false);
    expect(memberPerms.canEditAllTaskFields).toBe(false);
    expect(memberPerms.canUpdateTaskStatus).toBe(true);
    expect(outsiderPerms.canViewProject).toBe(false);

    expect(authorizeTaskAction('member', 'delete').allowed).toBe(false);
    expect(authorizeTaskAction('member', 'update_full').allowed).toBe(false);
    expect(authorizeTaskAction('member', 'update_status').allowed).toBe(true);
    expect(authorizeTaskAction('owner', 'delete').allowed).toBe(true);
  });

  it('enforces backend HTTP authorization on Express API endpoints', async () => {
    const fakeAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const uidHeader = req.headers['x-test-uid'];
      if (!uidHeader || typeof uidHeader !== 'string') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      req.authUser = { uid: uidHeader, email: `${uidHeader}@example.com`, emailVerified: true };
      next();
    };

    const app = createApp(fakeAuth);
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // Unauthenticated request blocked with 401
      const unauthRes = await fetch(`${baseUrl}/api/projects/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      expect(unauthRes.status).toBe(401);

      // Member trying to delete task -> 403 Forbidden
      const memberDeleteRes = await fetch(`${baseUrl}/api/tasks/validate-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-uid': 'member_uid' },
        body: JSON.stringify({
          action: 'delete',
          projectOwnerId: 'owner_uid',
          projectMemberIds: ['owner_uid', 'member_uid'],
        }),
      });
      expect(memberDeleteRes.status).toBe(403);

      // Member updating status -> 200 OK
      const memberStatusRes = await fetch(`${baseUrl}/api/tasks/validate-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-uid': 'member_uid' },
        body: JSON.stringify({
          action: 'update_status',
          projectOwnerId: 'owner_uid',
          projectMemberIds: ['owner_uid', 'member_uid'],
        }),
      });
      expect(memberStatusRes.status).toBe(200);

      // Non-member trying to export project -> 403 Forbidden
      const outsiderExportRes = await fetch(`${baseUrl}/api/projects/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-uid': 'outsider_uid' },
        body: JSON.stringify({ project: sampleProject, tasks: sampleTasks }),
      });
      expect(outsiderExportRes.status).toBe(403);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
    }
  });
});
