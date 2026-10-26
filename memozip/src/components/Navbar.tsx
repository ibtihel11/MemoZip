import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FolderOpen, Home, Library, LogOut, MessageSquare, Settings, type LucideIcon } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const mainNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/folders', label: 'Folders', icon: FolderOpen },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
];
export const settingsNav: NavItem = { to: '/settings', label: 'Settings', icon: Settings };

/**
 * Floating, centered top navigation. On desktop it holds the logo, the three
 * main destinations, the theme switcher and the account menu. On phones the
 * destinations move to the bottom tab bar (MobileNav) and this bar stays slim.
 */
export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="pointer-events-none sticky top-0 z-30 flex justify-center px-3 pt-4 sm:px-4 sm:pt-5">
      <div className="pointer-events-auto flex h-16 w-full max-w-md items-center justify-between gap-2 rounded-full border border-border bg-surface/80 py-2 pl-5 pr-2.5 shadow-[0_8px_28px_rgb(0_0_0/0.28)] backdrop-blur-xl lg:w-auto lg:max-w-none lg:justify-center lg:gap-2 lg:pl-7">
        <Link 
          to="/" 
          aria-label="MemoZip home" 
          className="shrink-0 rounded-full p-2 transition-transform hover:scale-105 active:scale-95 lg:pr-4 lg:pl-1 lg:pt-2"
        >
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 border-x border-border px-3 lg:flex">
          {mainNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium transition',
                  isActive ? 'bg-accent/15 text-accent-text' : 'text-muted hover:bg-surface2 hover:text-fg',
                )
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 lg:pl-2">
          <ThemeSwitcher />
          <Dropdown
            label="Account menu"
            triggerClassName="grid h-10 w-10 place-items-center rounded-full bg-accent/15 lg:h-11 lg:w-11 text-[0.9375rem] font-semibold text-accent-text transition hover:bg-accent/25"
            items={[
              { label: 'Settings', icon: <Settings size={16} />, onSelect: () => navigate('/settings') },
              {
                label: 'Log out',
                icon: <LogOut size={16} />,
                separatorBefore: true,
                onSelect: async () => {
                  await logout();
                  navigate('/login');
                },
              },
            ]}
          >
            {initials(user?.name ?? '')}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

/** Bottom tab bar for phones. */
export function MobileNav() {
  const items = [...mainNav, settingsNav];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-1 py-3 text-xs font-medium transition', isActive ? 'text-accent-text' : 'text-subtle hover:text-fg')
              }
            >
              <Icon size={22} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
