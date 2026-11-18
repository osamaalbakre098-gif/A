import { cleanup, render } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { Divider, Grid, Screen, Spacer } from './Screen';

afterEach(cleanup);

describe('Layout-Bausteine', () => {
  it('Screen: schmal zum Lesen, breit für Raster', () => {
    const { container, rerender } = render(<Screen>x</Screen>);
    expect(container.firstElementChild).toHaveClass('screen');
    expect(container.firstElementChild).not.toHaveClass('screen--wide');
    rerender(<Screen wide>x</Screen>);
    expect(container.firstElementChild).toHaveClass('screen--wide');
  });
  it('Grid und Spacer setzen Abstände nur über Token-Variablen', () => {
    const { container } = render(
      <>
        <Grid gap={6} min="10rem">
          a
        </Grid>
        <Spacer size={8} />
        <Divider />
      </>,
    );
    const grid = container.querySelector('.grid') as HTMLElement;
    expect(grid.style.getPropertyValue('--grid-gap')).toBe('var(--space-6)');
    expect(
      (container.querySelector('.spacer') as HTMLElement).style.getPropertyValue('--spacer'),
    ).toBe('var(--space-8)');
    expect(container.querySelector('hr')).not.toBeNull();
  });
});
