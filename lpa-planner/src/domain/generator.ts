import type { Assignment, AssignmentReason, Auditor, Layer, Line, Week } from './types';
import {
  auditorsWhoAuditedLineLastWeek,
  isAuditorEligible,
  isFirewall,
  isGM,
  isQuarterlyDue,
} from './rules';

export type AssignmentDraft = Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>;

export interface GenerateResult {
  assignments: AssignmentDraft[];
  warnings: string[];
}

interface Requirement {
  line: Line;
  layers: Layer[];
  reason: AssignmentReason;
}

const LAYER_ORDER: Layer[] = ['L1', 'L2', 'L3'];

function baselineRequirement(line: Line, targetWeek: Week): Requirement {
  if (isFirewall(line)) {
    return { line, layers: ['L2', 'L3'], reason: 'firewall' };
  }
  if (isQuarterlyDue(line, targetWeek)) {
    return { line, layers: ['L2', 'L3'], reason: 'quarterly' };
  }
  return { line, layers: ['L1'], reason: 'normal' };
}

/**
 * Ajusta el grupo GM para garantizar que, sin excepción, al menos una línea GM
 * tenga L3 asignada esa semana. Si ninguna línea GM cayó en su ciclo trimestral,
 * se elige una (rotando por la que lleva más tiempo sin L3) y su requerimiento
 * se reemplaza por L3 sola (sustituye su L1 normal, por acuerdo con el usuario).
 */
function applyGmMinimumL3(requirements: Requirement[], warnings: string[]): void {
  const gmReqs = requirements.filter((r) => isGM(r.line));
  if (gmReqs.length === 0) return;

  const alreadyHasL3 = gmReqs.some((r) => r.layers.includes('L3'));
  if (alreadyHasL3) return;

  // Rotación justa: la línea GM con lastL3Date más antiguo (o nunca auditada) va primero.
  const sorted = [...gmReqs].sort((a, b) => {
    const aDate = a.line.lastL3Date ?? '';
    const bDate = b.line.lastL3Date ?? '';
    if (aDate === bDate) return a.line.name.localeCompare(b.line.name);
    return aDate.localeCompare(bDate);
  });

  const chosen = sorted[0];
  chosen.layers = ['L3'];
  chosen.reason = 'gm-l3';
  warnings.push(
    `Regla GM: se asignó L3 a "${chosen.line.name}" para cumplir el mínimo semanal del equipo GM (reemplaza su L1 normal).`,
  );
}

function buildRequirements(lines: Line[], targetWeek: Week): { requirements: Requirement[]; warnings: string[] } {
  const warnings: string[] = [];
  const activeLines = lines.filter((l) => l.active);
  const requirements = activeLines.map((line) => baselineRequirement(line, targetWeek));

  const hasActiveGM = activeLines.some(isGM);
  if (!hasActiveGM) {
    warnings.push('Regla GM: no hay líneas GM activas; no se pudo garantizar la L3 semanal del equipo.');
  } else {
    applyGmMinimumL3(requirements, warnings);
  }

  return { requirements, warnings };
}

function pickAuditor(
  line: Line,
  layer: Layer,
  targetWeek: Week,
  auditors: Auditor[],
  excludedAuditorIds: Set<string>,
  thisWeekUsage: Map<string, number>,
  historicalUsage: Map<string, number>,
): Auditor | null {
  const eligible = auditors.filter((a) => isAuditorEligible(a, line, layer, targetWeek, excludedAuditorIds));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const usageA = thisWeekUsage.get(a.id) ?? 0;
    const usageB = thisWeekUsage.get(b.id) ?? 0;
    if (usageA !== usageB) return usageA - usageB;
    const histA = historicalUsage.get(a.id) ?? 0;
    const histB = historicalUsage.get(b.id) ?? 0;
    if (histA !== histB) return histA - histB;
    return a.name.localeCompare(b.name);
  });

  return eligible[0];
}

function computeHistoricalUsage(history: Assignment[]): Map<string, number> {
  const usage = new Map<string, number>();
  for (const a of history) {
    if (!a.auditorId) continue;
    usage.set(a.auditorId, (usage.get(a.auditorId) ?? 0) + 1);
  }
  return usage;
}

/**
 * Genera la propuesta de asignaciones para `targetWeek` a partir del catálogo vigente
 * y el historial de asignaciones (usado para la regla de no-repetición consecutiva y
 * para el balanceo de carga entre auditores). No muta ningún dato de entrada.
 */
export function generateProposal(
  lines: Line[],
  auditors: Auditor[],
  history: Assignment[],
  targetWeek: Week,
): GenerateResult {
  const { requirements, warnings } = buildRequirements(lines, targetWeek);
  const historicalUsage = computeHistoricalUsage(history);
  const thisWeekUsage = new Map<string, number>();
  const assignments: AssignmentDraft[] = [];

  const sortedRequirements = [...requirements].sort((a, b) => a.line.name.localeCompare(b.line.name));

  for (const req of sortedRequirements) {
    const excluded = auditorsWhoAuditedLineLastWeek(history, req.line.id, targetWeek);
    const layersSorted = [...req.layers].sort((a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b));

    for (const layer of layersSorted) {
      const auditor = pickAuditor(
        req.line,
        layer,
        targetWeek,
        auditors,
        excluded,
        thisWeekUsage,
        historicalUsage,
      );

      if (auditor) {
        thisWeekUsage.set(auditor.id, (thisWeekUsage.get(auditor.id) ?? 0) + 1);
      } else {
        warnings.push(
          `Sin auditor disponible para "${req.line.name}" (${layer}). Requiere asignación manual.`,
        );
      }

      assignments.push({
        weekKey: targetWeek.key,
        lineId: req.line.id,
        layer,
        auditorId: auditor ? auditor.id : null,
        folio: '',
        status: 'propuesta',
        reason: req.reason,
        needsAttention: !auditor,
      });
    }
  }

  return { assignments, warnings };
}
