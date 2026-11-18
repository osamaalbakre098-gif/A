import { Component, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './components/Button';
import { Cluster, Stack } from './components/Layout';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  /** Wird mit dem Fehler aufgerufen und liefert die Ansicht; so kennt sie den Text zum Kopieren. */
  render: (error: unknown) => ReactNode;
  /** Wechselt der Schlüssel (andere Seite), wird der Fehler zurückgesetzt. */
  resetKey: string;
}
interface State {
  error: unknown;
  failed: boolean;
  key: string;
}

class Boundary extends Component<Props, State> {
  state: State = { failed: false, error: null, key: this.props.resetKey };
  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { failed: true, error };
  }
  static getDerivedStateFromProps(p: Props, s: State): Partial<State> | null {
    return p.resetKey !== s.key ? { failed: false, error: null, key: p.resetKey } : null;
  }
  componentDidCatch(error: unknown) {
    console.error('Seitenfehler', error);
  }
  render() {
    return this.state.failed ? this.props.render(this.state.error) : this.props.children;
  }
}

const describe = (e: unknown) =>
  e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ''}`.trim() : String(e);

/** „Das hat nicht geklappt": was passiert ist, warum, was jetzt. Nie eine weiße Seite. */
export function ErrorView({ error, home = true }: { error: unknown; home?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(describe(error));
      setCopied(true);
    } catch {
      // Zwischenablage nicht erlaubt: der Fehler steht in der Konsole
    }
  };
  return (
    <Stack space="stack" className="empty error-view" role="alert">
      <h1 className="large-title">{t('error.title')}</h1>
      <p>{t('error.text')}</p>
      <Cluster className="cluster--center">
        <Button size="l" onClick={() => location.reload()}>
          {t('error.reload')}
        </Button>
        {home && (
          <a className="btn btn--secondary" href="#today">
            {t('error.home')}
          </a>
        )}
        <Button variant="plain" onClick={() => void copy()}>
          {copied ? t('error.copied') : t('error.copy')}
        </Button>
      </Cluster>
    </Stack>
  );
}

/** Fängt Fehler einer Seite ab: der Rahmen und die Navigation bleiben bedienbar, nichts wird gelöscht. */
export default function ErrorBoundary({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string;
}) {
  return (
    <Boundary resetKey={resetKey} render={(e) => <ErrorView error={e} />}>
      {children}
    </Boundary>
  );
}

/** Ganz außen um die App: fängt auch Fehler im Rahmen selbst ab. */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Boundary resetKey="root" render={(e) => <ErrorView error={e} home={false} />}>
      {children}
    </Boundary>
  );
}
