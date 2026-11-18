import type { ReactNode } from 'react';
import './StickyAction.css';

/**
 * Hauptaktion, die über der Navigation angeheftet bleibt (UI_VORGABE 2, Hauptsache pro Bildschirm).
 * Immer ohne Scrollen erreichbar, auch bei 200 % Schrift; steht am Ende des Inhalts im `Screen`.
 */
export function StickyAction({ children }: { children: ReactNode }) {
  return <div className="sticky-action">{children}</div>;
}
