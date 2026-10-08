import {expandHarmony,voicePresent,voiceRhythm,soundingNotes,tieLinks} from './harmonic-rhythm.mjs';
import {harmonyFigure,tonalFigure,upperStemUp} from './harmony-figures.mjs';
import {KEYS,noteSpelling,chromaticSpelling,label} from './engine.mjs';

export const UNITS={breve:128,whole:64,half:32,quarter:16,eighth:8,'16th':4,'32nd':2,'64th':1};
export const eventUnits=e=>UNITS[e.duration]*(e.dotted?1.5:1);
export function validTies(events){const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start);for(let i=0;i<notes.length;i++)if(notes[i].tieNext&&(!notes[i+1]||notes[i].start+eventUnits(notes[i])!==notes[i+1].start||notes[i].midi!==notes[i+1].midi))throw Error(`Legatura non valida sulla nota ${i+1}: serve la stessa altezza, subito dopo.`);return true}
const STEP={Do:'C',Re:'D',Mi:'E',Fa:'F',Sol:'G',La:'A',Si:'B'};
const alter={key:null,natural:0,sharp:1,'double-sharp':2,flat:-1,'double-flat':-2};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
export function fillMeasures(events,meter,measureCount=0){
 const [beats,denominator]=meter.split('/').map(Number),bar=beats*64/denominator;
 if(!Number.isInteger(bar)||bar<=0)throw Error('Metrica non valida');
 validTies(events);
 const end=Math.max(bar,...events.map(e=>e.start+eventUnits(e)));
 const bars=Math.max(measureCount,Math.ceil(end/bar)),filled=[];
 const sizes=Object.entries(UNITS).sort((a,b)=>b[1]-a[1]);
 const group=denominator===8&&beats%3===0?3*64/denominator:bar;
 for(let m=0;m<bars;m++){
  const from=m*bar,to=from+bar,items=events.filter(e=>e.start>=from&&e.start<to).sort((a,b)=>a.start-b.start);
  let cursor=from;
  const addRests=until=>{while(cursor<until){
   const remaining=Math.min(until-cursor,group-(cursor-from)%group);
   const [duration,size]=sizes.find(([,size])=>size<=remaining&&((cursor-from)%group)%size===0);
   filled.push({start:cursor,duration,kind:'rest',implicit:true});cursor+=size;
  }};
  for(const e of items){
   const duration=eventUnits(e);
   if(!Number.isInteger(e.start)||!duration||e.start<cursor||e.start+duration>to)throw Error(`La battuta ${m+1} contiene figure sovrapposte o fuori dalla metrica ${meter}.`);
   addRests(e.start);filled.push(e);cursor=e.start+duration;
  }
  addRests(to);
 }
 return filled;
}
function pitch(midi,key,accidental='key',baseMidi=midi,localKey=key,explicitSpelling){
 const spelling=explicitSpelling||chromaticSpelling(baseMidi,localKey);
 if(!spelling)throw Error('Nota fuori tonalità: impossibile scrivere MusicXML');
 const a=explicitSpelling?spelling.alter:accidental==='key'?spelling.alter:alter[accidental],fifths=KEYS[key].fifths;
 const signature=fifths>0&&['Fa','Do','Sol','Re','La','Mi','Si'].slice(0,fifths).includes(spelling.letter)?1:fifths<0&&['Si','Mi','La','Re','Sol','Do','Fa'].slice(0,-fifths).includes(spelling.letter)?-1:0;
 const printed=accidental!=='key'||a!==signature,accidentalText=({'-2':'flat-flat','-1':'flat',0:'natural',1:'sharp',2:'double-sharp'})[a];
 return `<pitch><step>${STEP[spelling.letter]}</step>${a?`<alter>${a}</alter>`:''}<octave>${spelling.octave}</octave></pitch>${printed?`<accidental>${accidentalText}</accidental>`:''}`;
}
export function musicXML(options){const {key,meter,measureCount=0,partSpacing='strette',includeDegrees=true}=options;const {events,solutions}=expandHarmony(options.events,options.solutions);
 const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start),[beats,beatType]=meter.split('/').map(Number),bar=beats*64/beatType;
 const complete=fillMeasures(events,meter,measureCount),last=complete.at(-1),bars=(last.start+eventUnits(last))/bar,harmonized=!!solutions?.length;
 const shared=harmonized&&partSpacing==='late',tracks=shared?[[1,2,3],[0]]:harmonized?[[3],[2],[1],[0]]:[[0]],voices=tracks.flat(),staffFor=v=>!harmonized?1:v===0||v===1&&partSpacing==='strette'?2:1;
 const directions=(c,previous,voice,staff,offset)=>{const tone=tonalFigure(c,previous,key);return `<direction placement="below"><direction-type><words default-y="-55" default-x="0" font-size="10" halign="center" justify="center">${esc(harmonyFigure(c))}</words>${tone?`<words default-y="-38" default-x="0" font-size="9" halign="center">${esc(tone)}</words>`:''}</direction-type>${offset===undefined?'':`<offset>${offset}</offset>`}<voice>${voice}</voice><staff>${staff}</staff></direction>`;};
 const links=tieLinks(events,solutions);let measures='';
 for(let m=0;m<bars;m++){
  const from=m*bar,to=from+bar,items=complete.filter(e=>e.start>=from&&e.start<to);
  let body=m===0?`<attributes><divisions>16</divisions><key><fifths>${KEYS[key].fifths}</fifths><mode>${KEYS[key].minor?'minor':'major'}</mode></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>${harmonized?'<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>':'<clef><sign>F</sign><line>4</line></clef>'}</attributes>`:'';
  for(let track=0;track<tracks.length;track++){
   if(track)body+=`<backup><duration>${bar}</duration></backup>`;
   const trackVoices=tracks[track];
   for(const e of items){for(const [chordIndex,v] of trackVoices.entries()){
   const source=notes.indexOf(e),seg=solutions?.[source];if(v===0&&e._bassHeld&&seg&&includeDegrees){const anchor=items.find(n=>n._sourceIndex===e._sourceIndex&&!n._bassHeld);body+=directions(seg,solutions?.[source-1],shared?track+1:4,2,e.start-anchor.start-eventUnits(voiceRhythm(anchor,0)))}if(!voicePresent(e,v))continue;const rhythm=voiceRhythm(e,v);
   const voice=shared?track+1:harmonized?4-v:1,staff=staffFor(v),stem=shared&&v>0?(upperStemUp(solutions?.[notes.indexOf(e)]||{voices:[]},key)?'up':'down'):harmonized?(v===3||v===1?'up':'down'):'down';
    const i=notes.indexOf(e),c=solutions?.[i],n=v===0?e.midi:c?.voices[v],previous=notes[i-1],next=notes[i+1];
    const continued=links.some(l=>l.to===i&&l.voice===v),outgoing=links.some(l=>l.from===i&&l.voice===v);
    const duration=`<duration>${eventUnits(rhythm)}</duration>`,figure=`<type>${rhythm.duration}</type>${rhythm.dotted?'<dot/>':''}`;
    if(e.kind==='rest'||n===undefined){if(shared&&chordIndex>0)continue;body+=`<note><rest/>${duration}<voice>${voice}</voice>${figure}<staff>${staff}</staff></note>`;continue}
    const spelling=v?c?.spellings?.[v]:e.spelling||c?.spellings?.[0],written=pitch(n,key,v?'key':e.accidental,spelling?n:v?n:e.baseMidi??e.midi,c?.key||key,spelling),accidental=written.match(/<accidental>[^<]+<\/accidental>/)?.[0]||'',tone=written.replace(accidental,'');
    if(v===0&&c&&includeDegrees)body+=directions(c,solutions?.[i-1],voice,staff);
    body+=`<note>${shared&&chordIndex>0?'<chord/>':''}${tone}${duration}${continued?'<tie type="stop"/>':''}${outgoing?'<tie type="start"/>':''}<voice>${voice}</voice>${figure}${accidental}${rhythm.duration==='whole'||rhythm.duration==='breve'?'':`<stem>${stem}</stem>`}<staff>${staff}</staff>${continued||outgoing?`<notations>${continued?'<tied type="stop"/>':''}${outgoing?'<tied type="start"/>':''}</notations>`:''}</note>`;
   }}
  }
  measures+=`<measure number="${m+1}">${body}${m===bars-1?'<barline location="right"><bar-style>light-heavy</bar-style></barline>':''}</measure>`;
 }
 return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>Armonizzazione del basso</work-title></work><defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults><part-list><score-part id="P1"><part-name>Armonizzazione</part-name><part-abbreviation>Arm.</part-abbreviation><score-instrument id="I1"><instrument-name>Pianoforte</instrument-name><instrument-abbreviation>Pf.</instrument-abbreviation></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
const varlen=n=>{let bytes=[n&127];while(n>>=7)bytes.unshift((n&127)|128);return bytes};
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
export function midiBytes({events,solutions,bpm}){
 const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start),ev=[];
 validTies(events);
 for(const sound of soundingNotes(events,solutions)){const start=sound.start*30,end=(sound.start+sound.length)*30;ev.push({tick:start,data:[0x90+sound.voice,sound.midi,78]},{tick:end-1,data:[0x80+sound.voice,sound.midi,0]})}
 ev.sort((a,b)=>a.tick-b.tick||a.data[0]-b.data[0]);const tempo=Math.round(60000000/bpm),track=[0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255];let last=0;
 for(const e of ev){track.push(...varlen(e.tick-last),...e.data);last=e.tick}track.push(0,255,47,0);
 return new Uint8Array([...Array.from('MThd',c=>c.charCodeAt(0)),...u32(6),0,0,0,1,1,224,...Array.from('MTrk',c=>c.charCodeAt(0)),...u32(track.length),...track]);
}
