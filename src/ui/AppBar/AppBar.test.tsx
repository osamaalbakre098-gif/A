import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import '../../i18n';
import { AppBar, LargeTitle } from './AppBar';

afterEach(cleanup);

describe('AppBar', () => {
  it('Hauptebene: kein Zurück; Einstellungs-Knopf mit Beschriftung und 44 px großer Klasse', () => {
    render(<AppBar forceTitle="" />);
    expect(screen.queryByRole('button', { name: 'Zurück' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
      'href',
      '#settings',
    );
  });
  it('Unterebene: Zurück ruft die Aktion auf, kleiner Titel ist nur Anschauung (aria-hidden)', () => {
    const back = vi.fn();
    const { container } = render(<AppBar forceTitle="Vektoren" onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(back).toHaveBeenCalled();
    expect(container.querySelector('.appbar__title')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.appbar')).toHaveClass('appbar--scrolled');
  });
  it('LargeTitle ist genau eine h1', () => {
    render(<LargeTitle>Heute</LargeTitle>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
