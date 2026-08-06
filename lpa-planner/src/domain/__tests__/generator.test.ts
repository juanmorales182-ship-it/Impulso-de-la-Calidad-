import { describe, expect, it } from 'vitest';
import type { Assignment, Auditor, Line } from '../types';
import { buildWeek } from '../weeks';
import { generateProposal } from '../generator';

const TARGET_WEEK = buildWeek(new Date('2026-08-06T12:00:00')); // jueves 2026-08-06 -> semana 2026-08-03..09

function makeLine(overrides: Partial<Line>): Line {
  return {
    id: overrides.id ?? `line-${Math.random()}`,
    name: 'LINEA-X',
    team: 'MT1',
    location: 'Principal',
    active: true,
    lastL2L3Date: null,
    lastL3Date: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function makeAuditor(overrides: Partial<Auditor>): Auditor {
  return {
    id: overrides.id ?? `auditor-${Math.random()}`,
    name: 'Auditor X',
    layers: ['L1', 'L2', 'L3'],
    location: 'Principal',
    active: true,
    unavailableWeeks: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('generateProposal', () => {
  it('assigns FIREWALL both L2 and L3 every week, regardless of quarterly state', () => {
    const line = makeLine({ id: 'fw', name: 'FIREWALL-1', team: 'FIREWALL' });
    const auditors = [makeAuditor({ id: 'a1', layers: ['L1', 'L2', 'L3'] })];
    const { assignments } = generateProposal([line], auditors, [], TARGET_WEEK);

    const layers = assignments.filter((a) => a.lineId === 'fw').map((a) => a.layer).sort();
    expect(layers).toEqual(['L2', 'L3']);
    expect(assignments.every((a) => a.reason === 'firewall')).toBe(true);
  });

  it('guarantees at least one GM line gets L3 when none is quarterly-due', () => {
    const recent = TARGET_WEEK.startDate;
    const gmLines = [
      makeLine({ id: 'delta', name: 'DELTA', team: 'GM', lastL2L3Date: recent }),
      makeLine({ id: 't1xx', name: 'T1XX', team: 'GM', lastL2L3Date: recent }),
      makeLine({ id: '31xx', name: '31XX', team: 'GM', lastL2L3Date: recent }),
    ];
    const auditors = [makeAuditor({ id: 'a1' })];
    const { assignments, warnings } = generateProposal(gmLines, auditors, [], TARGET_WEEK);

    const l3Assignments = assignments.filter((a) => a.layer === 'L3');
    expect(l3Assignments.length).toBe(1);
    expect(l3Assignments[0].reason).toBe('gm-l3');
    expect(warnings.some((w) => w.includes('Regla GM'))).toBe(true);

    // Las otras dos líneas GM deben quedar con su L1 normal.
    const l1Lines = assignments.filter((a) => a.layer === 'L1').map((a) => a.lineId);
    expect(l1Lines.length).toBe(2);
  });

  it('does not force an extra GM L3 when one GM line is already quarterly-due', () => {
    const gmLines = [
      makeLine({ id: 'delta', name: 'DELTA', team: 'GM', lastL2L3Date: '2026-01-01' }), // vencida -> quarterly
      makeLine({ id: 't1xx', name: 'T1XX', team: 'GM', lastL2L3Date: '2026-08-01' }), // reciente -> normal L1
    ];
    const auditors = [makeAuditor({ id: 'a1' })];
    const { assignments } = generateProposal(gmLines, auditors, [], TARGET_WEEK);

    const deltaLayers = assignments.filter((a) => a.lineId === 'delta').map((a) => a.layer).sort();
    expect(deltaLayers).toEqual(['L2', 'L3']);
    const t1xxLayers = assignments.filter((a) => a.lineId === 't1xx').map((a) => a.layer);
    expect(t1xxLayers).toEqual(['L1']);
  });

  it('rotates the forced GM L3 towards the line with the oldest lastL3Date', () => {
    const recent = TARGET_WEEK.startDate;
    const gmLines = [
      makeLine({ id: 'delta', name: 'DELTA', team: 'GM', lastL2L3Date: recent, lastL3Date: '2026-07-01' }),
      makeLine({ id: 't1xx', name: 'T1XX', team: 'GM', lastL2L3Date: recent, lastL3Date: '2026-01-01' }), // la más antigua
    ];
    const auditors = [makeAuditor({ id: 'a1' })];
    const { assignments } = generateProposal(gmLines, auditors, [], TARGET_WEEK);

    const l3 = assignments.find((a) => a.layer === 'L3');
    expect(l3?.lineId).toBe('t1xx');
  });

  it('gives normal lines weekly L1, and switches to L2+L3 when quarterly-due', () => {
    const notDue = makeLine({ id: 'a', name: 'A-LINE', lastL2L3Date: TARGET_WEEK.startDate });
    const due = makeLine({ id: 'b', name: 'B-LINE', lastL2L3Date: '2026-01-01' });
    const gm = makeLine({ id: 'gm1', name: 'DELTA', team: 'GM' });
    const auditors = [makeAuditor({ id: 'a1' })];
    const { assignments } = generateProposal([notDue, due, gm], auditors, [], TARGET_WEEK);

    expect(assignments.filter((a) => a.lineId === 'a').map((a) => a.layer)).toEqual(['L1']);
    expect(assignments.filter((a) => a.lineId === 'b').map((a) => a.layer).sort()).toEqual(['L2', 'L3']);
  });

  it('excludes an auditor who audited the same line the immediately preceding week', () => {
    const line = makeLine({ id: 'cx430', name: 'CX430' });
    const gm = makeLine({ id: 'gm1', name: 'DELTA', team: 'GM' });
    const juanito = makeAuditor({ id: 'juanito' });
    const otra = makeAuditor({ id: 'otra' });
    const prevWeekKey = '2026-W31'; // semana anterior a la 2026-W32 (target)
    const history: Assignment[] = [
      {
        id: 'h1',
        weekKey: prevWeekKey,
        lineId: 'cx430',
        layer: 'L1',
        auditorId: 'juanito',
        folio: '123',
        status: 'cerrada',
        reason: 'normal',
        needsAttention: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];
    const target = buildWeek(new Date('2026-08-06T12:00:00')); // 2026-W32
    expect(target.key).toBe('2026-W32');

    const { assignments } = generateProposal([line, gm], [juanito, otra], history, target);
    const cx430Assignment = assignments.find((a) => a.lineId === 'cx430');
    expect(cx430Assignment?.auditorId).toBe('otra');
  });

  it('only assigns auditors whose location is compatible with the line', () => {
    const line = makeLine({ id: 'ext-line', name: 'EXT-LINE', location: 'Ext.' });
    const gm = makeLine({ id: 'gm1', name: 'DELTA', team: 'GM' });
    const principalAuditor = makeAuditor({ id: 'p1', location: 'Principal' });
    const extAuditor = makeAuditor({ id: 'e1', location: 'Ext.' });
    const { assignments } = generateProposal([line, gm], [principalAuditor, extAuditor], [], TARGET_WEEK);

    const extLineAssignment = assignments.find((a) => a.lineId === 'ext-line');
    expect(extLineAssignment?.auditorId).toBe('e1');
  });

  it('skips inactive lines entirely', () => {
    const active = makeLine({ id: 'a', name: 'A', team: 'GM' });
    const inactive = makeLine({ id: 'b', name: 'B', active: false });
    const auditors = [makeAuditor({ id: 'a1' })];
    const { assignments } = generateProposal([active, inactive], auditors, [], TARGET_WEEK);

    expect(assignments.some((a) => a.lineId === 'b')).toBe(false);
  });

  it('does not assign an auditor marked unavailable that week, and flags needsAttention if none remain', () => {
    const line = makeLine({ id: 'a', name: 'A' });
    const gm = makeLine({ id: 'gm1', name: 'DELTA', team: 'GM' });
    const unavailable = makeAuditor({ id: 'u1', unavailableWeeks: [TARGET_WEEK.key] });
    const { assignments, warnings } = generateProposal([line, gm], [unavailable], [], TARGET_WEEK);

    const aAssignment = assignments.find((a) => a.lineId === 'a');
    expect(aAssignment?.auditorId).toBeNull();
    expect(aAssignment?.needsAttention).toBe(true);
    expect(warnings.some((w) => w.includes('Sin auditor disponible'))).toBe(true);
  });

  it('only qualifies auditors capable of the required layer', () => {
    const line = makeLine({ id: 'fw', name: 'FIREWALL-1', team: 'FIREWALL' });
    const l1Only = makeAuditor({ id: 'l1only', layers: ['L1'] });
    const l2l3 = makeAuditor({ id: 'l2l3', layers: ['L2', 'L3'] });
    const { assignments } = generateProposal([line], [l1Only, l2l3], [], TARGET_WEEK);

    expect(assignments.every((a) => a.auditorId === 'l2l3')).toBe(true);
  });
});
