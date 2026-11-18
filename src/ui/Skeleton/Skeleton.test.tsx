import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import '../../i18n';
import { Skeleton } from './Skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('sagt „Wird geladen" statt Blöcke vorzulesen, zeigt Blöcke nur dekorativ', () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton__block')).toHaveLength(3);
    expect(container.querySelector('.skeleton__blocks')).toHaveAttribute('aria-hidden', 'true');
  });
  it('Erscheinen ist um 300 ms verzögert (kein Flackern)', async () => {
    const css = (await import('node:fs')).readFileSync('src/ui/Skeleton/Skeleton.css', 'utf8');
    expect(css).toMatch(/animation:[^;]*300ms/);
    expect(css).toMatch(/opacity:\s*0/);
  });
});
