import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi, afterEach } from 'vitest';
import '../../i18n';
import { Sheet } from './Sheet';

// jsdom kennt showModal/close nicht in allen Versionen: einfache Nachbildung
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(cleanup);

describe('Sheet', () => {
  it('öffnet mit Titel, schließt per Knopf', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose} title="Warum jetzt?">
        <p>12 Karten sind fällig.</p>
      </Sheet>,
    );
    expect(container.querySelector('dialog')).toHaveAttribute('open');
    expect(container.querySelector('dialog')).toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Warum jetzt?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalled();
  });
  it('Tippen auf den Hintergrund schließt, Tippen auf den Inhalt nicht', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose} title="T">
        <p>Inhalt</p>
      </Sheet>,
    );
    fireEvent.click(screen.getByText('Inhalt'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('dialog')!);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('Ziehen nach unten über 96 px schließt, kurzes Ziehen nicht', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose} title="T">
        x
      </Sheet>,
    );
    const top = container.querySelector('.sheet__top') as HTMLElement;
    top.setPointerCapture = () => {};
    fireEvent.pointerDown(top, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(top, { clientY: 150, pointerId: 1 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(top, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(top, { clientY: 260, pointerId: 1 });
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('zeigt eine Fußleiste nur, wenn eine übergeben wird', () => {
    const { container, rerender } = render(
      <Sheet open onClose={() => {}} title="T">
        x
      </Sheet>,
    );
    expect(container.querySelector('.sheet__foot')).toBeNull();
    rerender(
      <Sheet open onClose={() => {}} title="T" footer={<button>Ok</button>}>
        x
      </Sheet>,
    );
    expect(container.querySelector('.sheet__foot')).not.toBeNull();
  });
});
