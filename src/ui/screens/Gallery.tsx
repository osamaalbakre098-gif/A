import { Bell, ChevronRight, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  ChoiceList,
  Cluster,
  ContentCard,
  Dialog,
  EmptyState,
  Flashcard,
  FocusCircle,
  HintLadder,
  IconButton,
  ProgressArc,
  Stack,
  Switch,
  TextArea,
  TextField,
} from '../components';

/** Interne Galerie (nur Entwicklung): jeder Baustein in jedem Zustand. */
export default function Gallery() {
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
    document.documentElement.style.setProperty('--fs-base', `${(17 * scale) / 100}px`);
  }, [scale]);

  const choices = [
    { id: 'a', text: 'Addition' },
    { id: 'b', text: 'Subtraktion' },
    { id: 'c', text: 'Division' },
  ];

  return (
    <Stack as="main" space="section" className="gallery">
      <h1>Bausteine</h1>
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
          <Button>Primär</Button>
          <Button variant="secondary">Sekundär</Button>
          <Button variant="quiet">Ruhig</Button>
          <Button variant="danger">Gefahr</Button>
          <Button disabled>Deaktiviert</Button>
          <Button loading>Laden</Button>
          <IconButton label="Erinnerung" icon={<Bell size={22} strokeWidth={1.75} />} />
          <IconButton
            label="Weiter"
            icon={<ChevronRight size={22} strokeWidth={1.75} className="flip-rtl" />}
          />
        </Cluster>
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
          <Timer size={24} strokeWidth={1.75} aria-hidden="true" />
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
    </Stack>
  );
}
