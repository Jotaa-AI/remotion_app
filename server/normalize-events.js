import {v4 as uuid} from 'uuid';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const normalizeEvents = ({events, durationSec}) => {
  const sorted = [...events]
    .map((event) => ({
      ...event,
      id: event.id || uuid(),
      startSec: Number(event.startSec || 0),
      durationSec: Number(event.durationSec || 1),
    }))
    .filter((event) => Number.isFinite(event.startSec) && Number.isFinite(event.durationSec))
    .sort((a, b) => a.startSec - b.startSec)
    .slice(0, 12);

  const normalized = [];

  for (const event of sorted) {
    const maxStart = Math.max(0, durationSec - 0.5);
    const startSec = clamp(event.startSec, 0, maxStart);
    const duration = clamp(event.durationSec, 0.5, 12);
    const endSec = clamp(startSec + duration, 0.5, durationSec);

    const last = normalized.at(-1);
    let finalStart = startSec;
    let finalEnd = endSec;

    // Evita solape agresivo moviendo eventos posteriores al final del anterior.
    if (last && finalStart < last.startSec + last.durationSec - 0.2) {
      finalStart = clamp(last.startSec + last.durationSec + 0.1, 0, maxStart);
      finalEnd = clamp(finalStart + duration, 0.5, durationSec);
    }

    if (finalEnd - finalStart < 0.45) {
      continue;
    }

    normalized.push({
      ...event,
      startSec: Number(finalStart.toFixed(2)),
      durationSec: Number((finalEnd - finalStart).toFixed(2)),
      confidence: event.confidence ?? 0.5,
    });
  }

  return normalized;
};
