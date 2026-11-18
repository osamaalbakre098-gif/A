import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import './CopyBlock.css';

/** Textblock mit Kopieren-Knopf. Der Block scrollt waagerecht INNERHALB der Karte, nie die Seite. */
export function CopyBlock({
  text,
  copyLabel,
  copiedLabel,
  label,
  preview,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  /** Beschriftung für Screenreader */
  label: string;
  /** Kurzansicht statt des ganzen Textes (lange Pakete) */
  preview?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Zwischenablage nicht erlaubt: der Text steht markierbar da
    }
  };
  return (
    <div className="copyblock">
      <pre className="copyblock__text" tabIndex={0} aria-label={label}>
        {preview ?? text}
      </pre>
      <button type="button" className="btn btn--secondary btn--block" onClick={() => void copy()}>
        <Icon as={copied ? Check : Copy} size={20} />
        <span role="status">{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
