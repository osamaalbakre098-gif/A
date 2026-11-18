import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

function Trigger({ opts }: { opts: ToastOptions }) {
  const t = useToast();
  return <button onClick={() => t.show(opts)}>zeige</button>;
}
const open = (opts: ToastOptions) =>
  render(
    <ToastProvider>
      <Trigger opts={opts} />
    </ToastProvider>,
  );

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('der Bereich ist ein status-Bereich (Screenreader), Hinweis verschwindet nach 4 s', () => {
    open({ text: 'Gespeichert.' });
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByText('zeige'));
    expect(screen.getByText('Gespeichert.')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(3900));
    expect(screen.getByText('Gespeichert.')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText('Gespeichert.')).toBeNull();
  });
  it('„Rückgängig" ruft die Aktion auf und schließt', () => {
    const undo = vi.fn();
    open({ text: 'Gelöscht', action: { label: 'Rückgängig', onClick: undo } });
    fireEvent.click(screen.getByText('zeige'));
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.queryByText('Gelöscht')).toBeNull();
  });
  it('sticky bleibt stehen', () => {
    open({ text: 'Neue Version bereit', sticky: true });
    fireEvent.click(screen.getByText('zeige'));
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Neue Version bereit')).toBeInTheDocument();
  });
});
