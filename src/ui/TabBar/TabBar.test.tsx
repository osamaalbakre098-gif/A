import { cleanup, render, screen } from '@testing-library/react';
import { House, Library, Search, Sprout } from 'lucide-react';
import { describe, expect, it, afterEach } from 'vitest';
import { SidebarNav, TabBar, type NavItem } from './TabBar';

const items: NavItem[] = [
  { id: 'today', label: 'Heute', icon: House, href: '#today' },
  { id: 'subjects', label: 'Fächer', icon: Library, href: '#subjects' },
  { id: 'progress', label: 'Fortschritt', icon: Sprout, href: '#progress' },
  { id: 'search', label: 'Suche', icon: Search, href: '#search' },
];

afterEach(cleanup);

describe('TabBar', () => {
  it('vier Ziele, genau eines ist aktuell (aria-current), Navigation hat eine Beschriftung', () => {
    render(<TabBar items={items} active="subjects" label="Hauptnavigation" />);
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
    const cur = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page');
    expect(cur).toHaveLength(1);
    expect(cur[0]).toHaveTextContent('Fächer');
  });
  it('SidebarNav ist dieselbe Navigation in Seitenleistenform', () => {
    const { container } = render(<SidebarNav items={items} active="today" label="Seitenleiste" />);
    expect(container.querySelector('.tabbar--sidebar')).not.toBeNull();
  });
  it('CSS: vier gleiche Spalten, Beschriftung ohne Umbruch', async () => {
    const css = (await import('node:fs')).readFileSync('src/ui/TabBar/TabBar.css', 'utf8');
    expect(css).toMatch(/repeat\(4, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/white-space: nowrap/);
  });
});
