import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './Toast.css';

export interface ToastOptions {
  text: string;
  /** Knopf rechts, z. B. „Rückgängig" */
  action?: { label: string; onClick: () => void };
  /** Standard 4000 ms. `sticky` bleibt, bis der Nutzer reagiert (z. B. „Neue Version bereit"). */
  duration?: number;
  sticky?: boolean;
}
interface Item extends ToastOptions {
  id: number;
}

const Ctx = createContext<{
  show: (t: ToastOptions) => number;
  dismiss: (id: number) => void;
} | null>(null);

function ToastView({ item, onDone }: { item: Item; onDone: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useCallback(() => {
    if (item.sticky) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(onDone, item.duration ?? 4000);
  }, [item.sticky, item.duration, onDone]);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => {
    start();
    return stop;
  }, [start]);
  return (
    <div className="toast" onMouseEnter={stop} onMouseLeave={start} onFocus={stop} onBlur={start}>
      <span className="toast__text">{item.text}</span>
      {item.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            item.action?.onClick();
            onDone();
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}

/** Hält die Hinweise unten über der Navigation. Der Bereich ist immer da, damit Screenreader neue Hinweise ankündigen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback((t: ToastOptions) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((i) => (
          <ToastView key={i.id} item={i} onDone={() => dismiss(i.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast außerhalb von ToastProvider');
  return c;
}
