import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import '../../i18n';
import { Banner } from './Banner';

afterEach(cleanup);

describe('Banner', () => {
  it('zeigt Text mit Symbol und kündigt ihn an (status), Gefahr als alert', () => {
    const { rerender, container } = render(<Banner tone="success">Verbunden mit Claude.</Banner>);
    expect(screen.getByRole('status')).toHaveTextContent('Verbunden mit Claude.');
    expect(container.querySelector('svg')).not.toBeNull(); // Symbol, nicht nur Farbe
    rerender(<Banner tone="danger">Datei beschädigt.</Banner>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('lässt sich ausblenden (Knopf mit Beschriftung)', () => {
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>Hinweis</Banner>);
    fireEvent.click(screen.getByRole('button', { name: 'Ausblenden' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
