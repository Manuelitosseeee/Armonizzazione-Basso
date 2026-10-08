import {KEYS,label,chromaticSpelling} from './engine.mjs';
const letters=['Do','Re','Mi','Fa','Sol','La','Si'];
export function keyAbbreviation(key){const info=KEYS[key];if(!info)throw Error('Tonalità non valida: '+key);return key.replace(/ (maggiore|minore)$/,'').toUpperCase()+(info.minor?'m':'M');}
export function referenceKey(c,fallback){return c?.homeKey||c?.key||fallback;}
export function scoreFigure(c){
 if(!c||!Number.isInteger(c.root)||c.root<0||c.root>6||!Number.isInteger(c.inv)||c.inv<0||c.inv>(c.seventh?3:2))return '';
 const degree=c.tonicizedDegree??c.secondaryDegree;
 const figure=label({...c,secondaryDegree:undefined,tonicizedDegree:undefined});
 return figure+(degree===undefined?'':' del '+['I','II','III','IV','V','VI','VII'][degree]);
}
export function tonalFigure(c,previous,key,restart=false){const current=referenceKey(c,key);return restart||!previous||referenceKey(previous,key)!==current?keyAbbreviation(current)+':':'';}
export function harmonyFigure(c){return scoreFigure(c);}
export function upperStemUp(c,key){const values=[1,2,3].filter(v=>c.voices[v]!==undefined).map(v=>{const p=c.spellings?.[v]||chromaticSpelling(c.voices[v],c.key||key);return p.octave*7+letters.indexOf(p.letter)});return values.reduce((a,b)=>a+b,0)/values.length<34;}
