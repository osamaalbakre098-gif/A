import { ChevronLeft, Settings } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import './AppBar.css';

/** Zurück-Knopf der Kopfzeile: rund, 44 px, in RTL gespiegelt. */
export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="appbar__btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon as={ChevronLeft} mirror />
    </button>
  );
}

/** Großer Titel eines Bildschirms (genau eine `h1`). Die Kopfzeile zeigt ihn klein, sobald er hinausgescrollt ist. */
export function LargeTitle({ children }: { children: ReactNode }) {
  return <h1 className="large-title">{children}</h1>;
}

/**
 * Kopfzeile: links Zurück (nicht auf Hauptebenen), Mitte kleiner Titel (erst beim Scrollen), rechts runder Einstellungs-Knopf.
 * Sie beobachtet die `h1` im Inhalt und blendet deren Text ein, sobald sie nicht mehr zu sehen ist.
 */
export function AppBar({
  onBack,
  settingsHref = '#settings',
  watch = '#main h1',
  right,
  forceTitle,
}: {
  onBack?: (() => void) | undefined;
  settingsHref?: string;
  /** Selektor der großen Überschrift im Inhalt */
  watch?: string;
  right?: ReactNode;
  /** Für Galerie und Tests: kleinen Titel fest zeigen */
  forceTitle?: string;
}) {
  const { t } = useTranslation();
  const barRef = useRef<HTMLElement>(null);
  const [title, setTitle] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (forceTitle !== undefined) return;
    let io: IntersectionObserver | undefined;
    let current: Element | null = null;
    const attach = () => {
      const h = document.querySelector(watch);
      if (h === current) return;
      io?.disconnect();
      current = h;
      if (!h) {
        setTitle('');
        setScrolled(false);
        return;
      }
      setTitle(h.textContent ?? '');
      const barH = barRef.current?.getBoundingClientRect().height ?? 0;
      io = new IntersectionObserver(
        ([e]) => setScrolled(!!e && !e.isIntersecting && e.boundingClientRect.top < barH),
        {
          rootMargin: `-${Math.round(barH)}px 0px 0px 0px`,
        },
      );
      io.observe(h);
    };
    attach();
    const main = document.getElementById('main');
    const mo = new MutationObserver(attach);
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, [watch, forceTitle]);

  const shown = forceTitle ?? title;
  const visible = forceTitle !== undefined || scrolled;
  return (
    <header ref={barRef} className={`appbar${visible ? ' appbar--scrolled' : ''}`}>
      <div className="appbar__side">
        {onBack && <BackButton onClick={onBack} label={t('nav.back')} />}
      </div>
      <p className="appbar__title" aria-hidden="true">
        {shown}
      </p>
      <div className="appbar__side appbar__side--end">
        {right}
        <a
          className="appbar__btn"
          href={settingsHref}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
        >
          <Icon as={Settings} />
        </a>
      </div>
    </header>
  );
}
