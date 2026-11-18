import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import './Disclosure.css';

/** Aufklappbarer Bereich (natives `details`: Tastatur und Screenreader inklusive). */
export function Disclosure({
  summary,
  children,
  open,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="disc" open={open}>
      <summary className="disc__summary">
        <span>{summary}</span>
        <span className="disc__chev" aria-hidden="true">
          <Icon as={ChevronDown} size={20} />
        </span>
      </summary>
      <div className="disc__body">{children}</div>
    </details>
  );
}
