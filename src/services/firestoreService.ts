import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { sanitizeText, validateAttachmentInput, validateProjectInput, validateTaskInput } from '../lib/validation.ts';
import {
  BLUEPRINT_LIMITS,
  type ActivityEntityType,
  type Comment,
  type EmailDirectoryEntry,
  type NotificationType,
  type Project,
  type ProjectMember,
  type ProjectRole,
  type ProjectStatus,
  type Task,
  type TaskAttachment,
  type TaskPriority,
  type TaskStatus,
  type UserProfile,
  type AppNotification,
} from '../types/orbit.ts';

const AVATAR_PALETTE = ['#1E3A5F', '#2E6F5E', '#334155', '#155E75', '#374151', '#166534'];

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function generateDocId(prefix: string): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `${prefix}_${rand}`;
}

export async function sha256Email(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function callBackendApi<T>(endpoint: string, payload: unknown): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required.');
  }
  const token = await currentUser.getIdToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function ensureUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const uid = firebaseUser.uid;
  const userRef = doc(db, 'users', uid);
  const email = sanitizeText(firebaseUser.email || '', BLUEPRINT_LIMITS.MAX_EMAIL_LENGTH);
  const emailHash = email ? await sha256Email(email) : '';

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  if (existingSnap.exists()) {
    const profile = existingSnap.data() as UserProfile;
    if (emailHash) {
      const dirRef = doc(db, 'emailDirectory', emailHash);
      try {
        const dirSnap = await getDoc(dirRef);
        if (!dirSnap.exists()) {
          const batch = writeBatch(db);
          batch.set(dirRef, {
            uid,
            displayName: profile.displayName,
            jobTitle: profile.jobTitle,
            avatarColor: profile.avatarColor,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `emailDirectory/${emailHash}`);
      }
    }
    return profile;
  }

  const fallbackName = email ? email.split('@')[0] : 'Workspace Member';
  const displayName = sanitizeText(
    firebaseUser.displayName || fallbackName,
    BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH
  );
  const avatarColor = pickAvatarColor(uid);

  const newProfile: UserProfile = {
    uid,
    displayName,
    email,
    jobTitle: 'Team Member',
    department: 'Product & Engineering',
    bio: '',
    avatarColor,
  };

  try {
    const batch = writeBatch(db);
    batch.set(userRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (emailHash) {
      batch.set(doc(db, 'emailDirectory', emailHash), {
        uid,
        displayName,
        jobTitle: newProfile.jobTitle,
        avatarColor,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserProfile(
  profile: UserProfile,
  updates: {
    displayName: string;
    jobTitle: string;
    department: string;
    bio: string;
    avatarColor: string;
  }
): Promise<void> {
  const displayName = sanitizeText(updates.displayName, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH);
  if (!displayName) {
    throw new Error('Display name is required.');
  }
  const jobTitle = sanitizeText(updates.jobTitle, BLUEPRINT_LIMITS.MAX_JOB_TITLE_LENGTH);
  const department = sanitizeText(updates.department, BLUEPRINT_LIMITS.MAX_DEPARTMENT_LENGTH);
  const bio = sanitizeText(updates.bio, BLUEPRINT_LIMITS.MAX_BIO_LENGTH);
  const avatarColor = BLUEPRINT_LIMITS.HEX_COLOR_PATTERN.test(updates.avatarColor)
    ? updates.avatarColor
    : profile.avatarColor;

  const emailHash = profile.email ? await sha256Email(profile.email) : '';

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', profile.uid), {
      displayName,
      jobTitle,
      department,
      bio,
      avatarColor,
      updatedAt: serverTimestamp(),
    });
    if (emailHash) {
      batch.set(doc(db, 'emailDirectory', emailHash), {
        uid: profile.uid,
        displayName,
        jobTitle,
        avatarColor,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
  }
}

export async function lookupRegisteredUserByEmail(email: string): Promise<EmailDirectoryEntry | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  const hash = await sha256Email(normalized);
  try {
    const snap = await getDoc(doc(db, 'emailDirectory', hash));
    if (!snap.exists()) return null;
    return snap.data() as EmailDirectoryEntry;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `emailDirectory/${hash}`);
  }
}

export async function createProject(
  actor: UserProfile,
  input: {
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
  }
): Promise<string> {
  const validation = validateProjectInput(input);
  if (!validation.valid) throw new Error(validation.error);

  await callBackendApi('/api/projects/validate', {
    action: 'create',
    ...input,
  });

  const projectId = generateDocId('proj');
  const memberDocId = `${projectId}_${actor.uid}`;
  const logId = generateDocId('log');
  const name = sanitizeText(input.name, BLUEPRINT_LIMITS.MAX_PROJECT_NAME_LENGTH);
  const description = sanitizeText(input.description, BLUEPRINT_LIMITS.MAX_PROJECT_DESC_LENGTH);

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'projects', projectId), {
      id: projectId,
      name,
      description,
      status: input.status,
      ownerId: actor.uid,
      ownerName: actor.displayName,
      startDate: input.startDate,
      endDate: input.endDate,
      memberIds: [actor.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'projectMembers', memberDocId), {
      id: memberDocId,
      projectId,
      projectOwnerId: actor.uid,
      userId: actor.uid,
      memberName: actor.displayName,
      memberTitle: actor.jobTitle || 'Project Owner',
      avatarColor: actor.avatarColor,
      role: 'owner',
      projectMemberIds: [actor.uid],
      addedBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId,
      projectOwnerId: actor.uid,
      projectMemberIds: [actor.uid],
      entityType: 'project' as ActivityEntityType,
      entityId: projectId,
      action: 'Created project',
      details: `${actor.displayName} created project "${name}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return projectId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}`);
  }
}

export async function updateProject(
  actor: UserProfile,
  project: Project,
  updates: {
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
  }
): Promise<void> {
  const validation = validateProjectInput(updates);
  if (!validation.valid) throw new Error(validation.error);

  await callBackendApi('/api/projects/validate', {
    action: 'update',
    ownerId: project.ownerId,
    ...updates,
  });

  const name = sanitizeText(updates.name, BLUEPRINT_LIMITS.MAX_PROJECT_NAME_LENGTH);
  const description = sanitizeText(updates.description, BLUEPRINT_LIMITS.MAX_PROJECT_DESC_LENGTH);
  const logId = generateDocId('log');

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'projects', project.id), {
      name,
      description,
      status: updates.status,
      startDate: updates.startDate,
      endDate: updates.endDate,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'project' as ActivityEntityType,
      entityId: project.id,
      action: 'Updated project',
      details: `${actor.displayName} updated project details (${updates.status})`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });
    for (const memberUid of project.memberIds) {
      if (memberUid !== actor.uid) {
        const notifId = generateDocId('notif');
        batch.set(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: memberUid,
          actorId: actor.uid,
          actorName: actor.displayName,
          projectId: project.id,
          taskId: '',
          type: 'project_updated' as NotificationType,
          title: `Project updated: ${name}`.slice(0, 140),
          message: `${actor.displayName} updated details for "${name}".`.slice(0, 400),
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
  }
}

export async function deleteProject(
  project: Project,
  members: ProjectMember[],
  tasks: Task[],
  comments: Comment[],
  logs: { id: string; projectId: string }[]
): Promise<void> {
  await callBackendApi('/api/projects/validate', {
    action: 'delete',
    ownerId: project.ownerId,
  });

  const deletions: Array<() => void> = [];
  const refs: Array<{ col: string; id: string }> = [
    ...tasks.filter((t) => t.projectId === project.id).map((t) => ({ col: 'tasks', id: t.id })),
    ...comments.filter((c) => c.projectId === project.id).map((c) => ({ col: 'comments', id: c.id })),
    ...logs.filter((l) => l.projectId === project.id).map((l) => ({ col: 'activityLogs', id: l.id })),
    ...members
      .filter((m) => m.projectId === project.id && m.userId !== project.ownerId)
      .map((m) => ({ col: 'projectMembers', id: m.id })),
    ...members
      .filter((m) => m.projectId === project.id && m.userId === project.ownerId)
      .map((m) => ({ col: 'projectMembers', id: m.id })),
    { col: 'projects', id: project.id },
  ];

  // Chunk into batches of <= 400 operations; keep project + owner member in the final batch
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
      const slice = refs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of slice) {
        batch.delete(doc(db, item.col, item.id));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${project.id}`);
  }
  void deletions;
}

export async function addProjectMember(
  actor: UserProfile,
  project: Project,
  target: EmailDirectoryEntry,
  existingMembers: ProjectMember[],
  tasks: Task[],
  comments: Comment[],
  logs: { id: string; projectId: string }[]
): Promise<void> {
  if (project.ownerId !== actor.uid) {
    throw new Error('Only the Project Owner can add team members.');
  }
  if (project.memberIds.includes(target.uid)) {
    throw new Error(`${target.displayName} is already a member of this project.`);
  }
  if (project.memberIds.length >= BLUEPRINT_LIMITS.MAX_MEMBERS_PER_PROJECT) {
    throw new Error(`Projects are limited to ${BLUEPRINT_LIMITS.MAX_MEMBERS_PER_PROJECT} members.`);
  }

  const nextMemberIds = [...project.memberIds, target.uid];
  const memberDocId = `${project.id}_${target.uid}`;
  const logId = generateDocId('log');
  const notifId = generateDocId('notif');

  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  ops.push((b) =>
    b.update(doc(db, 'projects', project.id), {
      memberIds: nextMemberIds,
      updatedAt: serverTimestamp(),
    })
  );
  ops.push((b) =>
    b.set(doc(db, 'projectMembers', memberDocId), {
      id: memberDocId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      userId: target.uid,
      memberName: target.displayName,
      memberTitle: target.jobTitle || 'Team Member',
      avatarColor: target.avatarColor,
      role: 'member' as ProjectRole,
      projectMemberIds: nextMemberIds,
      addedBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  for (const m of existingMembers.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'projectMembers', m.id), {
        projectMemberIds: nextMemberIds,
        updatedAt: serverTimestamp(),
      })
    );
  }
  for (const t of tasks.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'tasks', t.id), {
        projectMemberIds: nextMemberIds,
        updatedAt: serverTimestamp(),
      })
    );
  }
  for (const c of comments.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'comments', c.id), {
        projectMemberIds: nextMemberIds,
      })
    );
  }
  for (const l of logs.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'activityLogs', l.id), {
        projectMemberIds: nextMemberIds,
      })
    );
  }

  ops.push((b) =>
    b.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: nextMemberIds,
      entityType: 'member' as ActivityEntityType,
      entityId: target.uid,
      action: 'Added team member',
      details: `${actor.displayName} added ${target.displayName} to "${project.name}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    })
  );

  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 400)) op(batch);
      await batch.commit();
    }
    // Create notification after membership exists so security rule exists(memberPath) passes
    const notifBatch = writeBatch(db);
    notifBatch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientId: target.uid,
      actorId: actor.uid,
      actorName: actor.displayName,
      projectId: project.id,
      taskId: '',
      type: 'member_added' as NotificationType,
      title: `Added to ${project.name}`.slice(0, 140),
      message: `${actor.displayName} added you to "${project.name}".`.slice(0, 400),
      read: false,
      createdAt: serverTimestamp(),
    });
    await notifBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `projectMembers/${memberDocId}`);
  }
}

export async function removeProjectMember(
  actor: UserProfile,
  project: Project,
  targetMember: ProjectMember,
  existingMembers: ProjectMember[],
  tasks: Task[],
  comments: Comment[],
  logs: { id: string; projectId: string }[]
): Promise<void> {
  if (project.ownerId !== actor.uid) {
    throw new Error('Only the Project Owner can remove team members.');
  }
  if (targetMember.userId === project.ownerId) {
    throw new Error('The Project Owner cannot be removed from the project.');
  }

  const nextMemberIds = project.memberIds.filter((uid) => uid !== targetMember.userId);
  const logId = generateDocId('log');

  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  ops.push((b) => b.delete(doc(db, 'projectMembers', targetMember.id)));
  ops.push((b) =>
    b.update(doc(db, 'projects', project.id), {
      memberIds: nextMemberIds,
      updatedAt: serverTimestamp(),
    })
  );

  for (const m of existingMembers.filter(
    (item) => item.projectId === project.id && item.userId !== targetMember.userId
  )) {
    ops.push((b) =>
      b.update(doc(db, 'projectMembers', m.id), {
        projectMemberIds: nextMemberIds,
        updatedAt: serverTimestamp(),
      })
    );
  }
  for (const t of tasks.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'tasks', t.id), {
        projectMemberIds: nextMemberIds,
        assigneeId: t.assigneeId === targetMember.userId ? '' : t.assigneeId,
        assigneeName: t.assigneeId === targetMember.userId ? '' : t.assigneeName,
        updatedAt: serverTimestamp(),
      })
    );
  }
  for (const c of comments.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'comments', c.id), {
        projectMemberIds: nextMemberIds,
      })
    );
  }
  for (const l of logs.filter((item) => item.projectId === project.id)) {
    ops.push((b) =>
      b.update(doc(db, 'activityLogs', l.id), {
        projectMemberIds: nextMemberIds,
      })
    );
  }

  ops.push((b) =>
    b.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: nextMemberIds,
      entityType: 'member' as ActivityEntityType,
      entityId: targetMember.userId,
      action: 'Removed team member',
      details: `${actor.displayName} removed ${targetMember.memberName} from "${project.name}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    })
  );

  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 400)) op(batch);
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projectMembers/${targetMember.id}`);
  }
}

export async function createTask(
  actor: UserProfile,
  project: Project,
  input: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    assigneeId: string;
    assigneeName: string;
  }
): Promise<string> {
  const validation = validateTaskInput(input);
  if (!validation.valid) throw new Error(validation.error);

  await callBackendApi('/api/tasks/validate-action', {
    action: 'create',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
    ...input,
  });

  const taskId = generateDocId('task');
  const logId = generateDocId('log');
  const title = sanitizeText(input.title, BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH);
  const description = sanitizeText(input.description, BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH);

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'tasks', taskId), {
      id: taskId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      title,
      description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      assigneeName: sanitizeText(input.assigneeName, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH),
      attachments: [],
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: taskId,
      action: 'Created task',
      details: `${actor.displayName} created task "${title}" (${input.priority})`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    if (input.assigneeId && input.assigneeId !== actor.uid && project.memberIds.includes(input.assigneeId)) {
      const notifId = generateDocId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: input.assigneeId,
        actorId: actor.uid,
        actorName: actor.displayName,
        projectId: project.id,
        taskId,
        type: 'task_assigned' as NotificationType,
        title: `Task assigned: ${title}`.slice(0, 140),
        message: `${actor.displayName} assigned you "${title}" in ${project.name}.`.slice(0, 400),
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tasks/${taskId}`);
  }
}

export async function updateTaskStatus(
  actor: UserProfile,
  project: Project,
  task: Task,
  nextStatus: TaskStatus
): Promise<void> {
  if (task.status === nextStatus) return;

  await callBackendApi('/api/tasks/validate-action', {
    action: 'update_status',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
  });

  const logId = generateDocId('log');
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', task.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: task.id,
      action: 'Updated task status',
      details: `${actor.displayName} moved "${task.title}" from ${task.status} to ${nextStatus}`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    const recipientIds = new Set<string>();
    if (project.ownerId !== actor.uid) recipientIds.add(project.ownerId);
    if (task.assigneeId && task.assigneeId !== actor.uid && project.memberIds.includes(task.assigneeId)) {
      recipientIds.add(task.assigneeId);
    }

    for (const recipientId of recipientIds) {
      const notifId = generateDocId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId,
        actorId: actor.uid,
        actorName: actor.displayName,
        projectId: project.id,
        taskId: task.id,
        type: 'task_status' as NotificationType,
        title: `Status updated: ${task.title}`.slice(0, 140),
        message: `${actor.displayName} moved "${task.title}" to ${nextStatus}.`.slice(0, 400),
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function updateTaskDetails(
  actor: UserProfile,
  project: Project,
  existingTask: Task,
  updates: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string;
    assigneeId: string;
    assigneeName: string;
  }
): Promise<void> {
  const validation = validateTaskInput(updates);
  if (!validation.valid) throw new Error(validation.error);

  await callBackendApi('/api/tasks/validate-action', {
    action: 'update_full',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
    ...updates,
  });

  const title = sanitizeText(updates.title, BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH);
  const description = sanitizeText(updates.description, BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH);
  const logId = generateDocId('log');

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', existingTask.id), {
      title,
      description,
      status: updates.status,
      priority: updates.priority,
      dueDate: updates.dueDate,
      assigneeId: updates.assigneeId,
      assigneeName: sanitizeText(updates.assigneeName, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: existingTask.id,
      action: 'Updated task',
      details: `${actor.displayName} updated task "${title}" (${updates.priority}, ${updates.status})`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    if (
      updates.assigneeId &&
      updates.assigneeId !== existingTask.assigneeId &&
      updates.assigneeId !== actor.uid &&
      project.memberIds.includes(updates.assigneeId)
    ) {
      const notifId = generateDocId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: updates.assigneeId,
        actorId: actor.uid,
        actorName: actor.displayName,
        projectId: project.id,
        taskId: existingTask.id,
        type: 'task_assigned' as NotificationType,
        title: `Task assigned: ${title}`.slice(0, 140),
        message: `${actor.displayName} assigned you "${title}" in ${project.name}.`.slice(0, 400),
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${existingTask.id}`);
  }
}

export async function deleteTask(
  actor: UserProfile,
  project: Project,
  task: Task
): Promise<void> {
  await callBackendApi('/api/tasks/validate-action', {
    action: 'delete',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
  });

  const logId = generateDocId('log');
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'tasks', task.id));
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: task.id,
      action: 'Deleted task',
      details: `${actor.displayName} deleted task "${task.title}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${task.id}`);
  }
}

export async function addTaskAttachment(
  actor: UserProfile,
  project: Project,
  task: Task,
  input: { name: string; url: string; type: string }
): Promise<void> {
  if (task.attachments.length >= BLUEPRINT_LIMITS.MAX_ATTACHMENTS_PER_TASK) {
    throw new Error(`Tasks support up to ${BLUEPRINT_LIMITS.MAX_ATTACHMENTS_PER_TASK} attachments.`);
  }
  const validation = validateAttachmentInput(input);
  if (!validation.valid || !validation.normalized) {
    throw new Error(validation.error);
  }

  await callBackendApi('/api/tasks/validate-action', {
    action: 'update_attachment',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
  });
  await callBackendApi('/api/attachments/validate', validation.normalized);

  const nextAttachment: TaskAttachment = {
    id: generateDocId('att'),
    ...validation.normalized,
    addedBy: actor.displayName,
    addedAt: new Date().toISOString().slice(0, 10),
  };

  const logId = generateDocId('log');
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', task.id), {
      attachments: [...task.attachments, nextAttachment],
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: task.id,
      action: 'Added attachment',
      details: `${actor.displayName} attached "${nextAttachment.name}" to "${task.title}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function removeTaskAttachment(
  actor: UserProfile,
  project: Project,
  task: Task,
  attachmentId: string
): Promise<void> {
  await callBackendApi('/api/tasks/validate-action', {
    action: 'update_attachment',
    projectOwnerId: project.ownerId,
    projectMemberIds: project.memberIds,
  });

  const nextAttachments = task.attachments.filter((a) => a.id !== attachmentId);
  const logId = generateDocId('log');
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', task.id), {
      attachments: nextAttachments,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'task' as ActivityEntityType,
      entityId: task.id,
      action: 'Removed attachment',
      details: `${actor.displayName} removed an attachment from "${task.title}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
  }
}

export async function addComment(
  actor: UserProfile,
  project: Project,
  scope: 'task' | 'discussion',
  task: Task | null,
  rawBody: string
): Promise<void> {
  const body = sanitizeText(rawBody, BLUEPRINT_LIMITS.MAX_COMMENT_BODY_LENGTH);
  if (!body) throw new Error('Comment cannot be empty.');

  const commentId = generateDocId('cmt');
  const logId = generateDocId('log');
  const entityId = scope === 'task' && task ? task.id : project.id;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'comments', commentId), {
      id: commentId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      taskId: task ? task.id : '',
      scope,
      authorId: actor.uid,
      authorName: actor.displayName,
      body,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'activityLogs', logId), {
      id: logId,
      projectId: project.id,
      projectOwnerId: project.ownerId,
      projectMemberIds: project.memberIds,
      entityType: 'comment' as ActivityEntityType,
      entityId,
      action: scope === 'task' ? 'Commented on task' : 'Posted in discussion',
      details:
        scope === 'task' && task
          ? `${actor.displayName} commented on "${task.title}"`
          : `${actor.displayName} posted a team message in "${project.name}"`,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: serverTimestamp(),
    });

    const recipients = new Set<string>();
    if (scope === 'task' && task) {
      if (task.assigneeId && task.assigneeId !== actor.uid && project.memberIds.includes(task.assigneeId)) {
        recipients.add(task.assigneeId);
      }
      if (project.ownerId !== actor.uid) recipients.add(project.ownerId);
    } else {
      for (const uid of project.memberIds) {
        if (uid !== actor.uid) recipients.add(uid);
      }
    }

    for (const recipientId of recipients) {
      const notifId = generateDocId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId,
        actorId: actor.uid,
        actorName: actor.displayName,
        projectId: project.id,
        taskId: task ? task.id : '',
        type: 'comment_added' as NotificationType,
        title:
          scope === 'task' && task
            ? `New comment on ${task.title}`.slice(0, 140)
            : `New message in ${project.name}`.slice(0, 140),
        message: `${actor.displayName}: "${body.slice(0, 180)}"`.slice(0, 400),
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${commentId}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const item of unread.slice(0, 400)) {
      batch.update(doc(db, 'notifications', item.id), { read: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

export async function exportProjectReport(
  project: Project,
  tasks: Task[]
): Promise<{ filename: string; content: string }> {
  return callBackendApi('/api/projects/export', { project, tasks });
}
