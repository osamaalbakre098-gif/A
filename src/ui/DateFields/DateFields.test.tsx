import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateFields, toIso } from './DateFields';

afterEach(cleanup);

const labels = { legend: 'Datum', day: 'Tag', month: 'Monat', year: 'Jahr', invalid: 'Kein Datum' };

describe('toIso', () => {
  it('gültige Daten, auch Schaltjahr', () => {
    expect(toIso('5', '3', '2026')).toBe('2026-03-05');
    expect(toIso('29', '2', '2028')).toBe('2028-02-29');
  });
  it('ungültige Daten ergeben leer', () => {
    expect(toIso('31', '2', '2026')).toBe('');
    expect(toIso('29', '2', '2027')).toBe('');
    expect(toIso('0', '1', '2026')).toBe('');
    expect(toIso('1', '13', '2026')).toBe('');
    expect(toIso('1', '1', '26')).toBe('');
    expect(toIso('a', '1', '2026')).toBe('');
  });
});

describe('DateFields', () => {
  it('meldet ISO erst bei vollständigem, gültigem Datum', () => {
    const on = vi.fn();
    render(<DateFields labels={labels} value="" onChange={on} />);
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Monat'), { target: { value: '12' } });
    expect(on).toHaveBeenLastCalledWith('');
    fireEvent.change(screen.getByLabelText('Jahr'), { target: { value: '2026' } });
    expect(on).toHaveBeenLastCalledWith('2026-12-12');
  });
  it('lässt nur Ziffern zu und zeigt bei unmöglichem Datum eine Meldung', () => {
    const on = vi.fn();
    render(<DateFields labels={labels} value="" onChange={on} />);
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: '3x1' } });
    expect(screen.getByLabelText('Tag')).toHaveValue('31');
    fireEvent.change(screen.getByLabelText('Monat'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Jahr'), { target: { value: '2026' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Kein Datum');
    expect(on).toHaveBeenLastCalledWith('');
  });
  it('füllt die Felder aus einem vorhandenen Datum', () => {
    render(<DateFields labels={labels} value="2026-03-05" onChange={() => {}} />);
    expect(screen.getByLabelText('Tag')).toHaveValue('5');
    expect(screen.getByLabelText('Monat')).toHaveValue('3');
    expect(screen.getByLabelText('Jahr')).toHaveValue('2026');
  });
});
