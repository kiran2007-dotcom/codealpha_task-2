import { BLUEPRINT_LIMITS, type ProjectStatus, type TaskAttachment, type TaskPriority, type TaskStatus } from '../types/orbit.ts';

export interface PasswordValidationResult {
  valid: boolean;
  score: number;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const errors: string[] = [];
  if (!checks.minLength) errors.push('At least 8 characters');
  if (!checks.hasUppercase) errors.push('One uppercase letter');
  if (!checks.hasLowercase) errors.push('One lowercase letter');
  if (!checks.hasNumber) errors.push('One number');
  if (!checks.hasSpecial) errors.push('One special character');

  const score = Object.values(checks).filter(Boolean).length;
  return {
    valid: errors.length === 0,
    score,
    checks,
    errors,
  };
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function isValidBlueprintId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= BLUEPRINT_LIMITS.MAX_ID_LENGTH &&
    BLUEPRINT_LIMITS.ID_PATTERN.test(id)
  );
}

export function isValidDateString(dateStr: string): boolean {
  if (!BLUEPRINT_LIMITS.DATE_PATTERN.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(dateStr);
}

export function validateProjectInput(input: {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
}): { valid: boolean; error?: string } {
  const name = input.name.trim();
  if (!name || name.length > BLUEPRINT_LIMITS.MAX_PROJECT_NAME_LENGTH) {
    return { valid: false, error: `Project name must be 1–${BLUEPRINT_LIMITS.MAX_PROJECT_NAME_LENGTH} characters.` };
  }
  if (input.description.trim().length > BLUEPRINT_LIMITS.MAX_PROJECT_DESC_LENGTH) {
    return { valid: false, error: `Description cannot exceed ${BLUEPRINT_LIMITS.MAX_PROJECT_DESC_LENGTH} characters.` };
  }
  if (!['Active', 'On Hold', 'Completed'].includes(input.status)) {
    return { valid: false, error: 'Invalid project status.' };
  }
  if (!isValidDateString(input.startDate) || !isValidDateString(input.endDate)) {
    return { valid: false, error: 'Valid start and end dates (YYYY-MM-DD) are required.' };
  }
  if (input.endDate < input.startDate) {
    return { valid: false, error: 'End date cannot be earlier than start date.' };
  }
  return { valid: true };
}

export function validateTaskInput(input: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}): { valid: boolean; error?: string } {
  const title = input.title.trim();
  if (!title || title.length > BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH) {
    return { valid: false, error: `Task title must be 1–${BLUEPRINT_LIMITS.MAX_TASK_TITLE_LENGTH} characters.` };
  }
  if (input.description.trim().length > BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH) {
    return { valid: false, error: `Task description cannot exceed ${BLUEPRINT_LIMITS.MAX_TASK_DESC_LENGTH} characters.` };
  }
  if (!['To Do', 'In Progress', 'Completed'].includes(input.status)) {
    return { valid: false, error: 'Invalid task status.' };
  }
  if (!['Low', 'Medium', 'High'].includes(input.priority)) {
    return { valid: false, error: 'Invalid task priority.' };
  }
  if (!isValidDateString(input.dueDate)) {
    return { valid: false, error: 'A valid due date (YYYY-MM-DD) is required.' };
  }
  return { valid: true };
}

export function validateAttachmentInput(input: {
  name: string;
  url: string;
  type: string;
}): { valid: boolean; error?: string; normalized?: Pick<TaskAttachment, 'name' | 'url' | 'type'> } {
  const name = sanitizeText(input.name, BLUEPRINT_LIMITS.MAX_ATTACHMENT_NAME_LENGTH);
  const url = sanitizeText(input.url, BLUEPRINT_LIMITS.MAX_ATTACHMENT_URL_LENGTH);
  const type = sanitizeText(input.type || 'link', 40) || 'link';

  if (!name) {
    return { valid: false, error: 'Attachment name is required.' };
  }
  if (!BLUEPRINT_LIMITS.URL_PATTERN.test(url)) {
    return { valid: false, error: 'Attachment URL must start with http:// or https://.' };
  }
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'Attachment URL is malformed.' };
  }
  return { valid: true, normalized: { name, url, type } };
}
