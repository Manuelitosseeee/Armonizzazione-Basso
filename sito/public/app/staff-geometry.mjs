import {PDF_ENGRAVING as P} from './pdf.mjs';
// Geometry in staff spaces: one diatonic step is half a 10-unit space.
export const STAFF={upper:{top:92,bottom:132,reference:30},lower:{top:92+P.staffDistance*10/P.staffSpace,bottom:132+P.staffDistance*10/P.staffSpace,reference:18},space:10};
export function staffY(diatonic,lower){const s=lower?STAFF.lower:STAFF.upper;return s.bottom-(diatonic-s.reference)*STAFF.space/2;}
export function staffStep(y,lower){const s=lower?STAFF.lower:STAFF.upper;return s.reference+Math.round((s.bottom-y)/(STAFF.space/2));}
export function ledgerLines(y,lower){const s=lower?STAFF.lower:STAFF.upper,out=[];for(let l=s.bottom+10;l<=y+.01;l+=10)out.push(l);for(let l=s.top-10;l>=y-.01;l-=10)out.push(l);return out;}
export function dotY(y,lower){const s=lower?STAFF.lower:STAFF.upper;return Math.abs((y-s.bottom)/10-Math.round((y-s.bottom)/10))<.01?y-5:y;}
export const HEAD={rx:P.headRx*10/P.staffSpace,ry:P.headRy*10/P.staffSpace,stem:P.stemX*10/P.staffSpace,wholeRx:P.wholeRx*10/P.staffSpace,wholeRy:P.headRy*10/P.staffSpace};
// Opposite voices a unison/second apart must not obscure each other's head.
export function headOffsets(ys,lower){const offsets=ys.map(()=>0);for(let i=0;i<ys.length;i++)for(let j=i+1;j<ys.length;j++){if(lower[i]===lower[j]&&Math.abs(ys[i]-ys[j])<=5){let shift=i;offsets[shift]=12;while(ys.some((y,k)=>k!==shift&&lower[k]===lower[shift]&&Math.abs(y-ys[shift])<=5&&offsets[k]===offsets[shift]))offsets[shift]+=12;}}return offsets;}
// Anchor the G-clef spiral at G4 (second line) and bass-clef dots around F3.
export const CLEFS={treble:{x:20,y:132.668,scale:.042},bass:{x:20,y:STAFF.lower.top+10+644*.045,scale:.045}};

export const SCREEN_SCALE=1.65; // 16.5 CSS pixels between staff lines, never fit-to-width.
