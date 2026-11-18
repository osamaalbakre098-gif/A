/** Schwellen für den einfachen Baum aus Überschriften (Schritt 6.6). Nie im Code verstreut. */
export const TREE_CONFIG = {
  /** Höchstens so viele Fähigkeiten je Thema; mehr wird in „Teil I/II" geteilt */
  maxSkillsPerTopic: 8,
  /** Ohne Überschriften: so viele Wörter pro Block (ca. 3–5 Seiten) */
  blockWords: 1500,
  /** Fähigkeitstitel höchstens so lang */
  maxTitleLength: 70,
} as const;
