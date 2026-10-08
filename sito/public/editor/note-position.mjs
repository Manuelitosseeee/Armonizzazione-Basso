export function localPoint(matrix, clientX, clientY) {
  if (!matrix || ![matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f, clientX, clientY].every(Number.isFinite)) throw Error('Il pentagramma non è ancora pronto per inserire una nota');
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 1e-12) throw Error('Il pentagramma non è ancora visibile: attendi il caricamento');
  const x = clientX - matrix.e, y = clientY - matrix.f;
  return { x: (matrix.d * x - matrix.c * y) / determinant, y: (matrix.a * y - matrix.b * x) / determinant };
}
export function staffLines(staff) {
  return [...staff.children].filter(n => n.localName === 'path').map(n => {
    const d = n.getAttribute('d') || '', match = /^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(d);
    return match ? { x1: +match[1], y: +match[2], x2: +match[3] } : null;
  }).filter(Boolean);
}
export function pitchAt(pointY, lines, clef, fifths = 0) {
  const ordered = [...lines].sort((a, b) => a.y - b.y);
  if (ordered.length < 2) throw Error('Pentagramma non riconoscibile');
  const bottom = ordered.at(-1).y, spacing = (bottom - ordered[0].y) / (ordered.length - 1);
  if (!Number.isFinite(pointY) || !Number.isFinite(spacing) || spacing <= 0) throw Error('Coordinate del pentagramma non valide');
  const reference = clef.shape === 'F' ? 24 : clef.shape === 'C' ? 28 : 32;
  const index = reference - (clef.line - 1) * 2 + Math.round((bottom - pointY) / (spacing / 2));
  const octave = Math.floor(index / 7), letterIndex = ((index % 7) + 7) % 7;
  const letter = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][letterIndex];
  const alteration = fifths > 0 && ['Fa', 'Do', 'Sol', 'Re', 'La', 'Mi', 'Si'].slice(0, fifths).includes(letter) ? 1 : fifths < 0 && ['Si', 'Mi', 'La', 'Re', 'Sol', 'Do', 'Fa'].slice(0, -fifths).includes(letter) ? -1 : 0;
  return Math.max(0, Math.min(127, (octave + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][letterIndex] + alteration));
}
// Interpolate between the positions engraved by the notation engine, then snap
// to the selected rhythmic value. This survives proportional note spacing.
export function rhythmPosition(x, anchors, from, bar, grid, left, right) {
  const points=[...anchors].filter(a=>Number.isFinite(a.x)&&Number.isFinite(a.start)).sort((a,b)=>a.x-b.x);
  if(!points.length)points.push({x:left,start:from});
  if(points[0].start>from)points.unshift({x:left,start:from});
  points.push({x:Math.max(right,points.at(-1).x+1),start:from+bar});
  let tick=from;
  if(x>=points[0].x){let i=0;while(i<points.length-2&&x>points[i+1].x)i++;const a=points[i],b=points[i+1];tick=a.start+(b.start-a.start)*Math.max(0,Math.min(1,(x-a.x)/Math.max(1,b.x-a.x)));}
  return from+Math.max(0,Math.min(Math.ceil(bar/grid)-1,Math.round((tick-from)/grid)))*grid;
}
