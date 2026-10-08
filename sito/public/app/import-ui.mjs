import {modalHost} from './overlay-host.mjs';
import {validMeter} from './session-state.mjs';
import {KEYS,chromaticSpelling} from './engine.mjs';
import {readScoreFile} from './import.mjs';
import {engravedSvg} from './pdf-view.mjs';
import {eventUnits,UNITS} from './notation.mjs';
import {LETTERS,reviewMidi,inspectImport} from './import-review.mjs';
const $=id=>document.getElementById(id);
const names={breve:'Breve',whole:'Semibreve',half:'Minima',quarter:'Semiminima',eighth:'Croma','16th':'Semicroma','32nd':'Biscroma','64th':'Semibiscroma'};
function select(options,value,update){const el=document.createElement('select');el.replaceChildren(...options.map(([label,v])=>new Option(label,String(v))));el.value=String(value);el.onchange=()=>update(el.value);return el;}
function number(value,min,max,step,update){const el=document.createElement('input');el.type='number';el.value=String(value);el.min=min;el.max=max;el.step=step;el.onchange=()=>update(Number(el.value));return el;}
export function initImport({onInsert,onStatus,onInternalPaste=()=>{},hasInternalClipboard=()=>false}){
 let pending=null,url=null,controller=null,generation=0,lastFocus=null;
 const panel=$('importPanel'),message=$('importMessage'),host=modalHost(panel,$('app'));panel.hidden=true;
 const tell=t=>{message.textContent=t;onStatus(t)};
 if($('omrConnection'))$('omrConnection').hidden=true;
 $('pasteImage').hidden=true;$('pasteImage').disabled=true;
 $('reviewKey').replaceChildren(...Object.keys(KEYS).map(k=>new Option(k,k)));
 function release(){if(url){URL.revokeObjectURL(url);url=null}$('importOriginal').replaceChildren();}
 function open(){lastFocus=document.activeElement;const target=document.fullscreenElement||document.querySelector?.('.fullscreenFallback');host.open(target);panel.hidden=false;$('importClose').focus?.();}
 function cancel(){generation++;controller?.abort();controller=null;pending=null;release();panel.hidden=true;host.close();$('importScore').disabled=false;lastFocus?.focus?.();}
 function meter(){return `${$('reviewBeats').value}/${$('reviewDenominator').value}`}
 function draft(){if(!pending)return null;const track=pending.tracks[Number($('importStaff').value)];return {events:track?.events||[],key:$('reviewKey').value,meter:meter(),measureCount:pending.measureCount};}
 function validate(){
  if(!pending){$('confirmImport').disabled=true;return null}
  try{const data=inspectImport(draft());$('confirmImport').disabled=false;$('reviewValidation').textContent=[...new Set([...pending.warnings,...data.warnings])].join(' ');return data}
  catch(error){$('confirmImport').disabled=true;$('reviewValidation').textContent=error.message;return null}
 }
 function preview(){const data=validate();$('importScorePreview').replaceChildren();if(!data)return;try{const scene=engravedSvg({...data,solutions:null,partSpacing:'strette',includeDegrees:false},(tag,attrs={},text='')=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);el.textContent=text;return el});for(const s of scene.pages||[])$('importScorePreview').append(s);if(!scene.pages?.length&&scene.svg)$('importScorePreview').append(scene.svg)}catch(error){$('reviewValidation').textContent=error.message}}
 function table(){
  const data=draft();if(!data)return;if(!validMeter(meter())){validate();return;}const track=pending.tracks[Number($('importStaff').value)],bar=Number($('reviewBeats').value)*64/Number($('reviewDenominator').value),beat=64/Number($('reviewDenominator').value);
  $('reviewRows').replaceChildren(...track.events.map((e,i)=>{
   const row=document.createElement('tr');
   const cell=(el,label)=>{const td=document.createElement('td');if(typeof el==='string')td.textContent=el;else{el.setAttribute('aria-label',`${label}, evento ${i+1}`);td.append(el)}row.append(td)};
   const update=fn=>{try{fn();delete track.error;preview()}catch(err){$('reviewValidation').textContent=err.message;$('confirmImport').disabled=true}};
   cell(String(i+1));
   cell(number(Math.floor(e.start/bar)+1,1,1000,1,v=>update(()=>{e.start=(v-1)*bar+(e.start%bar)})),'Battuta');
   cell(number(1+(e.start%bar)/beat,1,Number($('reviewBeats').value),1/beat,v=>update(()=>{e.start=Math.floor(e.start/bar)*bar+(v-1)*beat})),'Tempo');
   cell(select([['Nota','note'],['Pausa','rest']],e.kind,v=>{e.kind=v;if(v==='note'&&!Number.isInteger(e.midi)){e.midi=48;e.spelling=chromaticSpelling(48,data.key)}if(v==='rest'){delete e.tieNext;delete e.spelling;delete e.midi}table()}),'Tipo');
   const spelling=e.spelling||chromaticSpelling(e.midi??48,data.key);
   if(e.kind==='note'){
    const pitch=(k,v)=>update(()=>{const s={...spelling,[k]:v};const midi=reviewMidi(s);e.spelling=s;e.midi=midi;delete e.baseMidi;e.accidental='key';table()});
    cell(select(Object.keys(LETTERS).map(l=>[l,l]),spelling.letter,v=>pitch('letter',v)),'Nota');
    cell(select([['𝄫',-2],['♭',-1],['♮',0],['♯',1],['𝄪',2]],spelling.alter,v=>pitch('alter',Number(v))),'Alterazione');
    cell(number(spelling.octave,-1,9,1,v=>pitch('octave',v)),'Ottava');
   }else{cell('—');cell('—');cell('—')}
   cell(select(Object.entries(names).map(([v,l])=>[l,v]),e.duration,v=>update(()=>{e.duration=v})),'Durata');
   for(const [property,label]of [['dotted','Punto'],['tieNext','Legatura']]){const c=document.createElement('input');c.type='checkbox';c.checked=!!e[property];c.disabled=property==='tieNext'&&e.kind==='rest';c.onchange=()=>update(()=>{e[property]=c.checked});cell(c,label)}
   const remove=document.createElement('button');remove.textContent='×';remove.title='Elimina evento';remove.onclick=()=>{track.events.splice(i,1);table()};cell(remove,'Elimina');return row;
  }));preview();
 }
 $('importStaff').onchange=table;
 for(const id of ['reviewKey','reviewBeats','reviewDenominator'])$(id).onchange=table;
 $('reviewAdd').onclick=()=>{if(!pending)return;const t=pending.tracks[Number($('importStaff').value)],bar=Number($('reviewBeats').value)*64/Number($('reviewDenominator').value);if(!validMeter(meter())){validate();return}const duration=Object.entries(UNITS).find(([,n])=>n<=Math.min(16,bar))?.[0]||'64th',length=UNITS[duration];let start=Math.max(0,...t.events.map(e=>e.start+eventUnits(e)));if(start%bar+length>bar)start=Math.ceil(start/bar)*bar;t.events.push({kind:'note',midi:48,duration,start,accidental:'key'});table()};
 $('reviewReflow').onclick=()=>{if(!pending)return;const t=pending.tracks[Number($('importStaff').value)],bar=Number($('reviewBeats').value)*64/Number($('reviewDenominator').value);if(!validMeter(meter())){validate();return}if(t.events.some(e=>!Number.isInteger(eventUnits(e))||eventUnits(e)>bar)){tell('Una figura supera la durata della battuta: correggi il valore prima di ricompattare.');$('confirmImport').disabled=true;return}let start=0;for(const e of t.events){const length=eventUnits(e);if(start%bar+length>bar)start=Math.ceil(start/bar)*bar;e.start=start;start+=length}pending.measureCount=Math.max(1,Math.ceil(start/bar));table()};
 async function load(file){
  cancel();open();const run=++generation;controller=new AbortController();const signal=controller.signal;pending=null;$('importReview').hidden=true;$('confirmImport').disabled=true;$('importScore').disabled=true;
  try{
   if(!/\.(mscz|mscx|musicxml|xml|mxl)$/i.test(file.name))throw Error('Importazione disponibile per MuseScore (.mscz, .mscx) e MusicXML (.musicxml, .xml, .mxl). Il riconoscimento di immagini e PDF è stato rimosso.');
   tell(`Lettura di ${file.name}…`);const parsed=await readScoreFile(file);if(run!==generation)return;pending={...parsed,fileName:file.name};
   if(run!==generation){pending=null;return}
   $('importStaff').replaceChildren(...pending.tracks.map((t,i)=>new Option(`${t.name} · ${t.events.filter(e=>e.kind==='note').length} note`,String(i))));$('importStaff').value='0';$('reviewKey').value=pending.key;const [beats,denom]=pending.meter.split('/');$('reviewBeats').value=beats;$('reviewDenominator').value=denom;$('importReview').hidden=false;table();tell('Controlla l’anteprima. Premi “Inserisci solo il basso” quando è corretto.');
  }catch(error){if(run===generation&&error.name!=='AbortError')tell(`Importazione: ${error.message}`)}
  finally{if(run===generation){controller=null;$('importScore').disabled=false}}
 }
 $('importScore').onclick=()=>$('scoreFile').click();$('scoreFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(file)await load(file)};
 $('importClose').onclick=cancel;$('importCancel').onclick=cancel;
 $('confirmImport').onclick=()=>{const data=validate();if(!data)return;const track=pending.tracks[Number($('importStaff').value)];onInsert({...data,name:track.name,fileName:pending.fileName});cancel()};
 document.addEventListener('paste',e=>{
  if(e.target?.closest?.('input,textarea,[contenteditable]'))return;
  if(!panel.hidden)return;
  // Il testo esterno non deve incollare una vecchia nota conservata in memoria.
  const text=e.clipboardData?.getData('text/plain')||'',mark=e.clipboardData?.getData('application/x-armonizza')||'';
  if(hasInternalClipboard()&&(mark==='selection'||text==='Armonizza: selezione musicale')){e.preventDefault();onInternalPaste()}
 });
 document.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Escape'){e.preventDefault();cancel()}});
 return {load,cancel};
}
