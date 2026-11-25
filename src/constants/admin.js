// RBAC — কোন role কোন menu দেখবে
export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  verification_admin: 'Verification Admin',
  support_admin: 'Support Admin',
  content_admin: 'Content Admin',
  monitoring_admin: 'Monitoring Admin',
};

export const MENU_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: 'all' },
  { href: '/users', label: 'Users', icon: '👥', roles: ['super_admin', 'support_admin'] },
  { href: '/donors', label: 'Donors', icon: '🩸', roles: ['super_admin', 'support_admin'] },
  { href: '/requests', label: 'Blood Requests', icon: '📋', roles: ['super_admin', 'support_admin', 'monitoring_admin'] },
  { href: '/verifications', label: 'Verifications', icon: '🪪', roles: ['super_admin', 'verification_admin'] },
  { href: '/reports', label: 'Reports', icon: '🚩', roles: ['super_admin', 'support_admin', 'monitoring_admin'] },
  { href: '/hospitals', label: 'Hospitals', icon: '🏥', roles: ['super_admin', 'content_admin', 'support_admin', 'monitoring_admin'] },
  { href: '/blood-banks', label: 'Blood Banks', icon: '🏦', roles: ['super_admin', 'content_admin', 'support_admin', 'monitoring_admin'] },
  { href: '/config', label: 'App Config', icon: '⚙️', roles: ['super_admin', 'content_admin'] },
  { href: '/broadcast', label: 'Broadcast', icon: '📢', roles: ['super_admin', 'support_admin'] },
  { href: '/audit-logs', label: 'Audit Logs', icon: '📜', roles: ['super_admin', 'monitoring_admin'] },
];

export function canAccess(role, item) {
  if (role === 'super_admin') return true;
  if (item.roles === 'all') return true;
  return item.roles?.includes(role);
}

export function getMenuForRole(role) {
  return MENU_ITEMS.filter((item) => canAccess(role, item));
}