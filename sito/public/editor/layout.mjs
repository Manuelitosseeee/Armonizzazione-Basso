// Layout distances use millimetres. Verovio's unit=9 makes one MEI virtual
// unit 0.9 mm on the A4 page; no glyphs are rescaled or redrawn.
export const MM_PER_VU = .9;
export const DEFAULT_STAFF_GAP_MM = 10.8;
export function spacerTarget(spacer, staffCount) {
  const target = spacer.direction === 'up' ? spacer.staff : spacer.staff + 1;
  if (target < 1 || target >= staffCount) throw Error('Lo spaziatore richiede due pentagrammi adiacenti: scegli quello superiore per scendere o quello inferiore per salire');
  return target;
}
export function hasEncodedLayout(score) {
  return score.measures.some(m => m.spacers?.length || m.frames?.length || m.layout?.some(x => ['system', 'page', 'section'].includes(x)));
}
// With manual layout, use deterministic system boundaries. A spacer belongs
// to the system containing its measure, rather than changing every later row.
export function systemPlan(score) {
  const plan = new Map(); let start = 0;
  for (let i = 0; i < score.measures.length; i++) {
    const previous = score.measures[i - 1]?.layout || [];
    if (i && (score.measures[i].frames?.length || previous.some(x => ['system', 'page', 'section'].includes(x)) || i - start >= 4 && !previous.includes('join'))) start = i;
    if (!plan.has(start)) plan.set(start, { start, page: previous.includes('page'), spacings: {} });
    const system = plan.get(start);
    for (const spacer of score.measures[i].spacers || []) {
      const target = spacerTarget(spacer, score.staves.length);
      system.spacings[target] = Math.max(system.spacings[target] || 0, spacer.gapMm);
    }
  }
  return plan;
}
