import { Component, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './components';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  /** Wechselt der Schlüssel (andere Seite), wird der Fehler zurückgesetzt. */
  resetKey: string;
}
interface State {
  failed: boolean;
  key: string;
}

class Boundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }
  static getDerivedStateFromProps(p: Props, s: State): Partial<State> | null {
    return p.resetKey !== s.key ? { failed: false, key: p.resetKey } : null;
  }
  componentDidCatch(error: unknown) {
    console.error('Seitenfehler', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Fängt Fehler einer Seite ab: der Rahmen und die Navigation bleiben bedienbar, nichts wird gelöscht. */
export default function ErrorBoundary({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string;
}) {
  const { t } = useTranslation();
  return (
    <Boundary
      resetKey={resetKey}
      fallback={
        <EmptyState
          title={t('app.errorTitle')}
          text={t('app.errorText')}
          action={
            <a className="btn btn--secondary" href="#today">
              {t('nav.today')}
            </a>
          }
        />
      }
    >
      {children}
    </Boundary>
  );
}
