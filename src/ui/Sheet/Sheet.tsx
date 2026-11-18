import { X } from 'lucide-react';
import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import './Sheet.css';

const CLOSE_DRAG = 96;

/**
 * Sheet von unten für Auswahl und Nebenaufgaben. Schließt per Ziehen nach unten, Schließen-Knopf, Escape
 * und Tippen auf den Hintergrund. Drei Höhen. Der Fokus kehrt nach dem Schließen zurück (natives `dialog`).
 */
export function Sheet({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const drag = useRef<{ y: number; id: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const setOffset = (px: number) =>
    ref.current?.style.setProperty('--sheet-drag', `${Math.max(0, px)}px`);
  const down = (e: PointerEvent) => {
    drag.current = { y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (drag.current?.id === e.pointerId) setOffset(e.clientY - drag.current.y);
  };
  const up = (e: PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    const dy = e.clientY - drag.current.y;
    drag.current = null;
    setOffset(0);
    if (dy > CLOSE_DRAG) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`sheet sheet--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div
        className="sheet__top"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        title={t('ui.dragHandle')}
      >
        <span className="sheet__handle" aria-hidden="true" />
      </div>
      <header className="sheet__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="sheet__close" aria-label={t('ui.close')} onClick={onClose}>
          <Icon as={X} />
        </button>
      </header>
      <div className="sheet__body">{children}</div>
      {footer && <footer className="sheet__foot">{footer}</footer>}
    </dialog>
  );
}
