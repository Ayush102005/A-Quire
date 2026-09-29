import React from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

/**
 * UserAvatar — derives initials from the logged-in user's full_name.
 * Reads from localStorage (getCurrentUser) so no async fetch is needed.
 *
 * Props:
 *   size  — Tailwind size class, default 'w-8 h-8'
 *   text  — Tailwind text class, default 'text-sm'
 *   className — extra classes for the outer div
 */
export function getUserInitials(user) {
  if (!user) return '??';
  const name = user.full_name || user.email || '';
  // If full_name was accidentally stored as an email, use local part
  const cleaned = name.includes('@') ? name.split('@')[0] : name;
  return cleaned
    .replace(/[._\-+@]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
}

export default function UserAvatar({
  size = 'w-8 h-8',
  text = 'text-sm',
  className = '',
}) {
  const user = getCurrentUser();
  const initials = getUserInitials(user);
  return (
    <Link to="/settings" className={`block hover:opacity-80 transition-opacity ${className}`} title={user?.full_name || 'Profile'}>
      <div
        className={`${size} rounded-full bg-teal-100 flex items-center justify-center border border-teal-200 shrink-0`}
      >
        <span className={`${text} font-bold text-teal-800`}>{initials}</span>
      </div>
    </Link>
  );
}
