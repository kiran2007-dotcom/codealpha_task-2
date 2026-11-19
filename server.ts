import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  validateAttachmentInput,
  validatePasswordStrength,
  validateProjectInput,
  validateTaskInput,
} from './src/lib/validation.ts';
import { getProjectPermissions } from './src/lib/workspaceLogic.ts';
import type { ProjectRole } from './src/types/orbit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseClientConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseClientConfig | null {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as FirebaseClientConfig;
    if (!parsed.projectId || parsed.projectId === 'remixed-project-id') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const firebaseConfig = loadFirebaseConfig();
const adminApp = firebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp({ projectId: firebaseConfig.projectId })
  : null;

export interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
  };
}

export async function verifyBearerToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization Bearer token.' });
    return;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Empty authentication token.' });
    return;
  }

  if (!adminApp) {
    res.status(503).json({ error: 'Firebase project configuration is not initialized.' });
    return;
  }

  try {
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Email address must be verified before performing workspace actions.' });
      return;
    }
    req.authUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: Boolean(decoded.email_verified),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
  }
}

export function authorizeTaskAction(
  role: ProjectRole | null,
  action: 'create' | 'update_full' | 'update_status' | 'update_attachment' | 'delete'
): { allowed: boolean; reason?: string } {
  const perms = getProjectPermissions(role);
  if (!perms.canViewProject) {
    return { allowed: false, reason: 'User is not an authorized member of this project.' };
  }
  switch (action) {
    case 'create':
      return perms.canCreateTask
        ? { allowed: true }
        : { allowed: false, reason: 'Permission denied to create tasks.' };
    case 'update_full':
      return perms.canEditAllTaskFields
        ? { allowed: true }
        : { allowed: false, reason: 'Only Project Owners can edit task title, priority, due date, or assignee.' };
    case 'update_status':
      return perms.canUpdateTaskStatus
        ? { allowed: true }
        : { allowed: false, reason: 'Permission denied to update task status.' };
    case 'update_attachment':
      return perms.canAddAttachment
        ? { allowed: true }
        : { allowed: false, reason: 'Permission denied to modify attachments.' };
    case 'delete':
      return perms.canDeleteTask
        ? { allowed: true }
        : { allowed: false, reason: 'Only Project Owners can delete tasks.' };
    default:
      return { allowed: false, reason: 'Unknown task action.' };
  }
}

export function createApp(
  authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void> = verifyBearerToken
) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'orbit-workspace-api',
      firebaseConfigured: Boolean(firebaseConfig?.projectId),
    });
  });

  app.post('/api/auth/validate-password', (req: Request, res: Response) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const result = validatePasswordStrength(password);
    res.status(result.valid ? 200 : 400).json(result);
  });

  app.post('/api/projects/validate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser?.uid;
    const action = req.body?.action as 'create' | 'update' | 'delete' | undefined;
    const ownerId = typeof req.body?.ownerId === 'string' ? req.body.ownerId : '';

    if (!action || !['create', 'update', 'delete'].includes(action)) {
      res.status(400).json({ error: 'Invalid project action.' });
      return;
    }

    if (action === 'update' || action === 'delete') {
      if (!ownerId || ownerId !== uid) {
        res.status(403).json({ error: 'Only the Project Owner can modify or delete this project.' });
        return;
      }
    }

    if (action === 'create' || action === 'update') {
      const check = validateProjectInput({
        name: String(req.body?.name ?? ''),
        description: String(req.body?.description ?? ''),
        status: req.body?.status,
        startDate: String(req.body?.startDate ?? ''),
        endDate: String(req.body?.endDate ?? ''),
      });
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
    }

    res.json({ authorized: true });
  });

  app.post('/api/tasks/validate-action', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser?.uid || '';
    const action = req.body?.action as 'create' | 'update_full' | 'update_status' | 'update_attachment' | 'delete';
    const projectOwnerId = typeof req.body?.projectOwnerId === 'string' ? req.body.projectOwnerId : '';
    const memberIds = Array.isArray(req.body?.projectMemberIds)
      ? req.body.projectMemberIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    let derivedRole: ProjectRole | null = null;
    if (projectOwnerId === uid) derivedRole = 'owner';
    else if (memberIds.includes(uid)) derivedRole = 'member';

    const authz = authorizeTaskAction(derivedRole, action);
    if (!authz.allowed) {
      res.status(403).json({ error: authz.reason });
      return;
    }

    if (action === 'create' || action === 'update_full') {
      const validation = validateTaskInput({
        title: String(req.body?.title ?? ''),
        description: String(req.body?.description ?? ''),
        status: req.body?.status,
        priority: req.body?.priority,
        dueDate: String(req.body?.dueDate ?? ''),
      });
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }
    }

    res.json({ authorized: true, role: derivedRole });
  });

  app.post('/api/attachments/validate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const check = validateAttachmentInput({
      name: String(req.body?.name ?? ''),
      url: String(req.body?.url ?? ''),
      type: String(req.body?.type ?? 'link'),
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }
    res.json({ valid: true, attachment: check.normalized });
  });

  app.post('/api/projects/export', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser?.uid || '';
    const project = req.body?.project;
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

    if (!project || typeof project !== 'object') {
      res.status(400).json({ error: 'Project payload is required.' });
      return;
    }

    const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
    if (project.ownerId !== uid && !memberIds.includes(uid)) {
      res.status(403).json({ error: 'Access denied: you are not a member of this project.' });
      return;
    }

    const lines: string[] = [
      `# ${String(project.name || 'Project Report')}`,
      `Status: ${String(project.status || 'Active')}`,
      `Timeline: ${String(project.startDate || '')} to ${String(project.endDate || '')}`,
      `Owner: ${String(project.ownerName || '')}`,
      '',
      '## Description',
      String(project.description || 'No description provided.'),
      '',
      `## Tasks (${tasks.length})`,
      ...tasks.map(
        (t: { title?: string; status?: string; priority?: string; dueDate?: string; assigneeName?: string }) =>
          `- [${String(t.status || 'To Do')}] ${String(t.title || 'Untitled')} | Priority: ${String(t.priority || 'Medium')} | Due: ${String(t.dueDate || 'N/A')} | Assignee: ${String(t.assigneeName || 'Unassigned')}`
      ),
    ];

    res.json({
      filename: `${String(project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.md`,
      content: lines.join('\n'),
    });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Orbit Workspace server listening on http://0.0.0.0:${port}`);
  });
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  void startServer();
}
