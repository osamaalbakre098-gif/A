import type { CSSProperties, ElementType, ReactNode } from 'react';

export type Space = 'tight' | 'stack' | 'group' | 'section' | 'inline';

const VAR: Record<Space, string> = {
  tight: 'var(--space-tight)',
  stack: 'var(--space-stack)',
  group: 'var(--space-group)',
  section: 'var(--space-section)',
  inline: 'var(--space-inline)',
};

interface LayoutProps {
  space?: Space;
  as?: ElementType;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  [k: string]: unknown;
}

/** Senkrechter Stapel: der Abstand kommt nur von `gap`, Kinder haben keine eigenen Außenabstände. */
export function Stack({
  space = 'stack',
  as: Tag = 'div',
  className,
  style,
  children,
  ...rest
}: LayoutProps) {
  return (
    <Tag
      className={`stack ${className ?? ''}`.trim()}
      style={{ ...style, ['--gap' as string]: VAR[space] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Waagerechte Reihe, die umbricht, wenn es eng wird. */
export function Cluster({
  space = 'inline',
  as: Tag = 'div',
  className,
  style,
  children,
  ...rest
}: LayoutProps) {
  return (
    <Tag
      className={`cluster ${className ?? ''}`.trim()}
      style={{ ...style, ['--gap' as string]: VAR[space] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
