import type { TodayData } from './Heute';

/** Beispieldaten – nur zur Ansicht, kommen nicht aus der Datenbank. Der Studienleiter (Schritt 9) ersetzt sie. */
export const DEMO_TODAY: Omit<TodayData, 'state'> = {
  hour: 9,
  reviews: 8,
  progress: { done: 3, total: 8 },
  topic: 'Vektoraddition',
  minutes: 35,
  resume: { topic: 'Vektoraddition', done: 2, total: 4 },
  review: { count: 12, minutes: 9 },
  tomorrow: {
    count: 8,
    minutes: 6,
    exam: { subject: 'Physik', date: 'Fr., 22.11.', sits: 'Vektoren', building: 'Kräfte' },
  },
  tree: { subject: 'Physik', nodes: ['sits', 'sits', 'building', 'building', 'refresh', 'new'] },
};
