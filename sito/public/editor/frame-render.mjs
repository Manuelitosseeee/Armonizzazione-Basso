import {systemPlan} from './layout.mjs';
const NS = 'http://www.w3.org/2000/svg';
const element = (doc, name, attrs = {}) => {
  const node = doc.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
export function frameLines(frame, widthMm = 174) {
  const capacity = Math.max(1, Math.floor((widthMm - 4) / (frame.fontSize * .352778 * .65)));
  const lines = [];
  for (const paragraph of frame.text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > capacity) { lines.push(line); line = ''; }
      let rest = word;
      while (rest.length > capacity) { if (line) { lines.push(line); line = ''; } lines.push(rest.slice(0, capacity)); rest = rest.slice(capacity); }
      if (rest) line += (line ? ' ' : '') + rest;
    }
    lines.push(line);
  }
  return lines;
}
export function frameHeight(frame) {
  return frame.kind === 'textframe' ? Math.max(frame.heightMm, 4 + frameLines(frame).length * frame.fontSize * .352778 * 1.3) : frame.heightMm;
}
function bounds(system) {
  const rects = [...system.querySelectorAll('.bounding-box rect')].map(rect => {
    const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y'));
    return { x, y, right: x + Number(rect.getAttribute('width')), bottom: y + Number(rect.getAttribute('height')) };
  });
  if (!rects.length) throw Error('Impossibile misurare il sistema per inserire la cornice');
  return { top: Math.min(...rects.map(r => r.y)), bottom: Math.max(...rects.map(r => r.bottom)) };
}
// Native engraving is kept intact. Only whole systems are translated, with
// their notes, braces, barlines and spanners; page overflow starts a new sheet.
export function engravedPages(toolkit, score, doc, encode) {
  const pages = [];
  for (let page = 1; page <= toolkit.getPageCount(); page++) {
    const holder = doc.createElement('div'); holder.innerHTML = toolkit.renderToSVG(page);
    pages.push(holder.firstElementChild);
  }
  if (!score.measures.some(m => m.frames?.length || m.spacers?.length)) return pages;
  const systems = pages.flatMap(page => [...page.querySelectorAll('g.system')].filter(g => !g.classList.contains('bounding-box')));
  const profiles = new Map(), chosenSystems = new Map(), allPages = [...pages];
  for (const row of systemPlan(score).values()) {
    if (!Object.keys(row.spacings).length) continue;
    const key = JSON.stringify(row.spacings);
    if (!profiles.has(key)) {
      if (!encode || !toolkit.loadData(encode(row.spacings))) throw Error('Impossibile incidere la distanza dei pentagrammi');
      const snapshots = [];
      for (let i = 1; i <= toolkit.getPageCount(); i++) { const holder = doc.createElement('div'); holder.innerHTML = toolkit.renderToSVG(i); snapshots.push(holder.firstElementChild); }
      profiles.set(key, snapshots); allPages.push(...snapshots);
    }
    const measureId = score.measures[row.start].id;
    const system = profiles.get(key).map(p => p.querySelector('[id="' + measureId + '"]')).find(Boolean)?.closest('g.system');
    if (!system) throw Error('Sistema dello spaziatore non riconoscibile');
    chosenSystems.set(measureId, system);
  }
  const definitions = allPages.flatMap(page => [...page.querySelectorAll(':scope > defs > *')]);
  const styles = allPages.flatMap(page => [...page.querySelectorAll(':scope > style')]);
  const measureFrames = new Map(score.measures.map(m => [m.id, m.frames || []]));
  const result = []; let margin, cursor;
  const capacity = 29700 - 2500 - 1800;
  const startPage = () => {
    const page = pages[0].cloneNode(true); page.id = 'editor-sheet-' + (result.length + 1);
    const defs = page.querySelector('defs'); defs.replaceChildren(...definitions.map(d => d.cloneNode(true)));
    for (const style of page.querySelectorAll(':scope > style')) style.remove();
    for (const style of styles) { const copy = style.cloneNode(true); copy.textContent = copy.textContent.replaceAll('#' + style.parentElement.id + ' ', '#' + page.id + ' '); page.append(copy); }
    margin = page.querySelector('.page-margin'); margin.replaceChildren(); margin.setAttribute('transform', 'translate(1800,2500)');
    cursor = 0; result.push(page);
  };
  startPage();
  for (const originalSystem of systems) {
    const originalMeasure = [...originalSystem.querySelectorAll('g.measure')].find(g => !g.classList.contains('bounding-box'));
    const system = chosenSystems.get(originalMeasure?.id) || originalSystem;
    const box = bounds(system), firstMeasure = [...system.querySelectorAll('g.measure')].find(g => !g.classList.contains('bounding-box'));
    const frames = measureFrames.get(firstMeasure?.id) || [];
    const frameSpace = frames.reduce((n, f) => n + frameHeight(f) * 100, 0), height = box.bottom - box.top;
    if (height + frameSpace > capacity) throw Error('La cornice e il sistema superano una pagina A4: riduci altezza, testo o dimensione del carattere');
    const nativePage = pages.find(p => p.contains(originalSystem));
    const firstOnNativePage = [...nativePage.querySelectorAll('g.system')].find(g => !g.classList.contains('bounding-box')) === originalSystem;
    if (cursor && (cursor + frameSpace + height > capacity || firstOnNativePage)) startPage();
    for (const frame of frames) {
      const size = frameHeight(frame) * 100, group = element(doc, 'g', { id: frame.id, class: 'editorFrame', 'data-frame': frame.id });
      group.append(element(doc, 'rect', { x: 0, y: cursor, width: 17400, height: Math.max(size, 80), class: 'editorFrameGuide' }));
      if (frame.kind === 'textframe') {
        const x = frame.align === 'center' ? 8700 : frame.align === 'right' ? 17200 : 200;
        const text = element(doc, 'text', { x, y: cursor + 200 + frame.fontSize * .352778 * 100, 'font-size': frame.fontSize * .352778 * 100, 'font-family': 'serif', 'text-anchor': frame.align === 'center' ? 'middle' : frame.align === 'right' ? 'end' : 'start' });
        for (const [i, line] of frameLines(frame).entries()) { const span = element(doc, 'tspan', { x, dy: i ? frame.fontSize * .352778 * 130 : 0 }); span.textContent = line; text.append(span); }
        group.append(text);
      }
      margin.append(group); cursor += size;
    }
    const positioned = element(doc, 'g', { transform: `translate(0,${cursor - box.top})`, class: 'editorPositionedSystem' });
    positioned.append(system.cloneNode(true)); margin.append(positioned); cursor += height + 1200;
  }
  return result;
}
