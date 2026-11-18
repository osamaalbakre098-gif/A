import type { LucideIcon } from 'lucide-react';
import { Icon } from '../components/Icon';
import './TabBar.css';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

/**
 * Untere Navigation (bis 767 px) beziehungsweise Seitenleiste (ab 768 px): vier gleich breite Felder in EINER Zeile,
 * Beschriftung nie umbrechend. `variant` erzwingt eine Form (Galerie, Tests); sonst entscheidet die Breite.
 */
export function TabBar({
  items,
  active,
  label,
  variant = 'auto',
}: {
  items: NavItem[];
  active: string | null;
  label: string;
  variant?: 'auto' | 'tabs' | 'sidebar';
}) {
  return (
    <nav aria-label={label} className={`tabbar tabbar--${variant}`}>
      <ul>
        {items.map(({ id, label: text, icon, href }) => (
          <li key={id}>
            <a
              href={href}
              aria-current={id === active ? 'page' : undefined}
              className="tabbar__link"
            >
              <span className="tabbar__icon">
                <Icon as={icon} filled={id === active} />
              </span>
              <span className="tabbar__label">{text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Seitenleiste ab 768 px (gleiche Ziele, Beschriftung neben dem Symbol). */
export function SidebarNav(props: Omit<Parameters<typeof TabBar>[0], 'variant'>) {
  return <TabBar {...props} variant="sidebar" />;
}
