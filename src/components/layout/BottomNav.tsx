import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sprout, ScanLine, CalendarCheck, UserRound } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/catalogue', label: 'My Garden', icon: Sprout, end: false },
  { to: '/identify', label: 'Identify', icon: ScanLine, end: false },
  { to: '/care', label: 'Care', icon: CalendarCheck, end: false },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
] as const;

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-xs ${
                  isActive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default BottomNav;
