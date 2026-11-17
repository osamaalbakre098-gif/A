import DataPanel, { browserDeps } from './DataPanel';

const deps = browserDeps();

/** „Deine Daten" mit den echten Browser-Abhängigkeiten. Wird erst bei Bedarf geladen (Datenbank, ZIP). */
export default function DataPage() {
  return <DataPanel deps={deps} />;
}
