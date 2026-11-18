import { Bell, ChevronRight, House, Library, Search, Sprout, Timer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorView } from '../ErrorBoundary';
import './Gallery.css';
import {
  AppBar,
  Banner,
  Button,
  ChoiceList,
  Cluster,
  ContentCard,
  Dialog,
  Divider,
  EmptyState,
  Flashcard,
  FocusCircle,
  Grid,
  HintLadder,
  Icon,
  IconButton,
  LargeTitle,
  ProgressArc,
  Screen,
  Sheet,
  Skeleton,
  Spacer,
  Stack,
  SidebarNav,
  Switch,
  TabBar,
  TextArea,
  TextField,
  ToastProvider,
  useToast,
  type NavItem,
} from '../components';

/** Interne Galerie (nur Entwicklung): jeder Baustein in jedem Zustand. */
const NAV: NavItem[] = [
  { id: 'today', label: 'Heute', icon: House, href: '#' },
  { id: 'subjects', label: 'Fächer', icon: Library, href: '#' },
  { id: 'progress', label: 'Fortschritt', icon: Sprout, href: '#' },
  { id: 'search', label: 'Suche', icon: Search, href: '#' },
];

function GalleryBody() {
  const toast = useToast();
  const [sheet, setSheet] = useState<null | 'sm' | 'md' | 'lg'>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [theme, setTheme] = useState('light');
  const [dir, setDir] = useState('ltr');
  const [sw, setSw] = useState(true);
  const [choice, setChoice] = useState<string | null>(null);
  const [dlg, setDlg] = useState(false);
  const [scale, setScale] = useState(100);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === 'rtl' ? 'ar' : 'de';
  }, [theme, dir]);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-base', `${(16 * scale) / 100}px`);
  }, [scale]);

  const choices = [
    { id: 'a', text: 'Addition' },
    { id: 'b', text: 'Subtraktion' },
    { id: 'c', text: 'Division' },
  ];

  return (
    <Screen wide className="gallery">
      <LargeTitle>Bausteine</LargeTitle>
      <Stack space="stack">
        <Cluster>
          {['light', 'dark', 'contrast'].map((t) => (
            <Button
              key={t}
              variant={theme === t ? 'primary' : 'secondary'}
              onClick={() => setTheme(t)}
            >
              {t}
            </Button>
          ))}
          <Button variant="secondary" onClick={() => setDir(dir === 'ltr' ? 'rtl' : 'ltr')}>
            {dir}
          </Button>
        </Cluster>
        <div className="field">
          <label className="field__label" htmlFor="g-scale">
            Textgröße: <span className="tabular">{scale} %</span>
          </label>
          <input
            id="g-scale"
            type="range"
            min={90}
            max={200}
            step={10}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="range"
          />
        </div>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-btn">
        <h2 id="g-btn">Buttons</h2>
        <Cluster>
          <Button>Primär (48)</Button>
          <Button size="l">Primär (52)</Button>
          <Button variant="secondary">Sekundär</Button>
          <Button variant="plain">Text</Button>
          <Button variant="destructive">Löschen</Button>
          <Button disabled>Deaktiviert</Button>
          <Button loading>Laden</Button>
          <IconButton label="Erinnerung" icon={Bell} />
          <IconButton label="Weiter" icon={ChevronRight} mirror variant="primary" />
          <IconButton label="Schließen" icon={X} variant="quiet" />
        </Cluster>
        <Button size="l" fullWidth>
          Starten (volle Breite)
        </Button>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-fields">
        <h2 id="g-fields">Eingabe</h2>
        <TextField label="Antwort" hint="Ein Wort genügt" />
        <TextField label="Mit Fehler" defaultValue="x" error="Bitte mindestens zwei Zeichen." />
        <TextArea label="Notiz" />
        <Switch label="Ruhiger Modus" checked={sw} onChange={setSw} />
        <Switch label="Deaktiviert" checked={false} onChange={() => {}} disabled />
      </Stack>

      <Stack as="section" space="section" aria-labelledby="g-cards">
        <h2 id="g-cards">Karten</h2>
        <ContentCard title="Jetzt lernen" hero accent="ocean">
          <p>8 Wiederholungen · Vektoraddition · ca. 35 Min.</p>
          <Cluster>
            <Button>Los</Button>
          </Cluster>
        </ContentCard>
        <Flashcard
          front="Was ist ein Vektor?"
          back="Eine Größe mit Betrag und Richtung."
          labels={{ answer: 'Deine Antwort', reveal: 'Aufdecken', dontKnow: 'Weiß ich nicht' }}
        />
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-practice">
        <h2 id="g-practice">Üben</h2>
        <ChoiceList
          legend="Welche Rechenart gehört zu 3 + 4?"
          choices={choices}
          value={choice}
          onChange={setChoice}
        />
        <ChoiceList
          legend="Beantwortet (richtig/falsch)"
          choices={choices}
          value="b"
          onChange={() => {}}
          result={{ correctId: 'a' }}
        />
        <HintLadder
          hints={['Was ist gegeben, was gesucht?', 'Welche Regel passt?', 'Der nächste Schritt…']}
          labels={{ next: 'Hinweis', title: 'Hinweise' }}
        />
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-prog">
        <h2 id="g-prog">Zeit und Fortschritt</h2>
        <Cluster space="group">
          <Icon as={Timer} />
          <FocusCircle remainingSec={754} totalSec={1500} label="Verbleibende Zeit" />
          <ProgressArc done={2} total={4} label="Blöcke" />
        </Cluster>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-misc">
        <h2 id="g-misc">Leerzustand und Dialog</h2>
        <EmptyState
          title="Alles für heute erledigt"
          text="Morgen warten 12 Karten (~8 Min.)."
          action={
            <Button variant="secondary" onClick={() => setDlg(true)}>
              Dialog öffnen
            </Button>
          }
        />
        <Dialog open={dlg} onClose={() => setDlg(false)} title="Neue Version bereit">
          <p>Jetzt neu laden?</p>
          <Cluster>
            <Button onClick={() => setDlg(false)}>Schließen</Button>
          </Cluster>
        </Dialog>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-type">
        <h2 id="g-type">Schrift</h2>
        <div className="g-card">
          <p className="g-type g-type--large">Titel groß · Guten Morgen</p>
          <p className="g-type g-type--title">Titel · Jetzt lernen</p>
          <p className="g-type g-type--headline">Überschrift · Danach</p>
          <p className="g-type g-type--row">Zeilentitel · Vektoraddition</p>
          <p className="g-type g-type--body">
            Fließtext: Madar plant, du lernst. Alles bleibt auf deinem Gerät.
          </p>
          <p className="g-type g-type--secondary">Zusatztext · 3 Dateien · 14 von 40 sitzen</p>
          <p className="g-type g-type--note">Hinweis · ca. 35 Min.</p>
          <p className="g-type g-type--tab">Tab-Beschriftung · Fortschritt</p>
        </div>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-roles">
        <h2 id="g-roles">Farbrollen</h2>
        <Grid min="9rem" gap={3}>
          {[
            'bg',
            'bg-grouped',
            'surface',
            'surface-raised',
            'fill',
            'fill-pressed',
            'separator',
            'outline',
            'accent',
            'accent-tint',
            'success',
            'warning',
            'danger',
            'arc-active',
            'arc-inactive',
          ].map((r) => (
            <div key={r} className="g-swatch">
              <span className="g-swatch__chip" style={{ background: `var(--${r})` }} />
              <span className="t-note">--{r}</span>
            </div>
          ))}
        </Grid>
        <Cluster>
          {['sage', 'ocean', 'brick', 'sand', 'plum', 'moss', 'slate', 'amber'].map((c) => (
            <span key={c} className="g-dot" style={{ background: `var(--subj-${c})` }} title={c} />
          ))}
        </Cluster>
        <p className="t-note">Fachfarben sind nur Punkte, nie Flächen.</p>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-layout">
        <h2 id="g-layout">Layout: Stack, Cluster, Grid, Divider, Spacer</h2>
        <Grid min="8rem" gap={3}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="g-card">
              Feld {n}
            </div>
          ))}
        </Grid>
        <Divider />
        <Spacer size={6} />
        <p className="t-note">
          Abstände: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72 px (Raster).
        </p>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-nav">
        <h2 id="g-nav">Navigation</h2>
        <p className="t-note">
          Kopfzeile: Hauptebene (ohne Zurück, ohne kleinen Titel) und Unterebene (mit Zurück und
          kleinem Titel).
        </p>
        <div className="g-frame">
          <AppBar forceTitle="" />
          <div className="g-frame__body">
            <LargeTitle>Heute</LargeTitle>
          </div>
        </div>
        <div className="g-frame">
          <AppBar forceTitle="Vektoraddition" onBack={() => {}} />
          <div className="g-frame__body">
            <LargeTitle>Vektoraddition</LargeTitle>
          </div>
        </div>
        <p className="t-note">Untere Navigation (bis 767 px): vier Felder, eine Zeile.</p>
        <div className="g-frame g-frame--nav">
          <TabBar items={NAV} active="subjects" label="Hauptnavigation (Beispiel)" variant="tabs" />
        </div>
        <p className="t-note">Seitenleiste (ab 768 px):</p>
        <div className="g-frame g-frame--side">
          <SidebarNav items={NAV} active="today" label="Seitenleiste (Beispiel)" />
        </div>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-banner">
        <h2 id="g-banner">Hinweise (Banner)</h2>
        <Banner tone="info">Du bist offline. Alles Gelernte bleibt gespeichert.</Banner>
        <Banner tone="success">Verbunden mit Claude.</Banner>
        <Banner tone="warning" action={<Button variant="secondary">Platz schaffen</Button>}>
          Der Speicher wird knapp.
        </Banner>
        <Banner tone="danger">Diese Datei ist beschädigt. Versuche eine andere Datei.</Banner>
        {bannerOpen && (
          <Banner tone="info" onDismiss={() => setBannerOpen(false)}>
            Mit „Ausblenden" lässt sich dieser Hinweis schließen.
          </Banner>
        )}
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-toast">
        <h2 id="g-toast">Toast und Sheet</h2>
        <Cluster>
          <Button
            variant="secondary"
            onClick={() => toast.show({ text: 'Gespeichert. Madar plant rückwärts.' })}
          >
            Toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.show({
                text: 'Fach gelöscht',
                action: { label: 'Rückgängig', onClick: () => {} },
              })
            }
          >
            Toast mit Rückgängig
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.show({
                text: 'Neue Version bereit',
                sticky: true,
                action: { label: 'Jetzt laden', onClick: () => {} },
              })
            }
          >
            Toast bleibt
          </Button>
        </Cluster>
        <Cluster>
          {(['sm', 'md', 'lg'] as const).map((z) => (
            <Button key={z} variant="secondary" onClick={() => setSheet(z)}>
              Sheet {z}
            </Button>
          ))}
        </Cluster>
        <Sheet
          open={sheet !== null}
          onClose={() => setSheet(null)}
          title="Warum jetzt?"
          size={sheet ?? 'md'}
          footer={
            <Button size="l" fullWidth onClick={() => setSheet(null)}>
              Verstanden
            </Button>
          }
        >
          <Stack space="stack">
            <p>12 Karten sind fällig.</p>
            <p>Prüfung in 12 Tagen.</p>
            {sheet === 'lg' &&
              Array.from({ length: 12 }, (_, i) => <p key={i}>Weitere Zeile {i + 1}</p>)}
          </Stack>
        </Sheet>
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-skel">
        <h2 id="g-skel">Ladezustand</h2>
        <p className="t-note">Platzhalter erscheinen erst nach 300 ms.</p>
        <Skeleton variant="rows" lines={3} />
        <Skeleton variant="card" />
        <Skeleton lines={3} />
      </Stack>

      <Stack as="section" space="stack" aria-labelledby="g-err">
        <h2 id="g-err">Fehleransicht</h2>
        <ErrorView error={new Error('Beispiel')} />
      </Stack>
    </Screen>
  );
}

export default function Gallery() {
  return (
    <ToastProvider>
      <GalleryBody />
    </ToastProvider>
  );
}
