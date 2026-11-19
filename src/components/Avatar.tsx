interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, color = '#1E3A5F', size = 'md' }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'OW';

  const sizeClass =
    size === 'sm'
      ? 'w-7 h-7 text-xs'
      : size === 'lg'
        ? 'w-12 h-12 text-base'
        : 'w-8 h-8 text-xs';

  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-lg font-semibold text-white shrink-0 select-none`}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
