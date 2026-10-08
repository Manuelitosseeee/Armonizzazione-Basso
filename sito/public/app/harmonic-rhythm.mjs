const units={breve:128,whole:64,half:32,quarter:16,eighth:8,'16th':4,'32nd':2,'64th':1};
export const rhythmicUnits=e=>units[e.duration]*(e.dotted?1.5:1);
export function rhythmValue(length){for(const [duration,n]of Object.entries(units))if(n===length)return {duration,dotted:false};for(const [duration,n]of Object.entries(units))if(n*1.5===length)return {duration,dotted:true};throw Error('Suddivisione ritmica non rappresentabile.');}
export function expandHarmony(events,solutions){
 const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start),out=[],chords=[];
 for(const e of [...events].sort((a,b)=>a.start-b.start)){const i=notes.indexOf(e),c=solutions?.[i],segments=c?.segments;if(!segments?.length){out.push({...e,_sourceIndex:i});if(i>=0)chords.push(c);continue}
 let offset=0;for(let j=0;j<segments.length;j++){const s=segments[j],length=rhythmicUnits(s);if(s.offset!==offset||length<=0)throw Error('Cadenza ritmica incoerente.');out.push({...e,...rhythmValue(length),start:e.start+offset,tieNext:j===segments.length-1&&!!e.tieNext,_sourceIndex:i,_bassHeld:j>0,_bassDuration:e.duration,_bassDotted:!!e.dotted,_bassTieNext:!!e.tieNext,_cadenceSegment:j});const chord={...(j===0?c:{homeKey:c.homeKey,tonicizedDegree:c.tonicizedDegree}),...s};delete chord.segments;delete chord.offset;delete chord.duration;delete chord.dotted;chords.push(chord);offset+=length}if(offset!==rhythmicUnits(e))throw Error('La cadenza non copre la durata del basso.');
 }
 return {events:out,solutions:solutions?chords:null};
}
export const voicePresent=(e,v)=>v!==0||!e._bassHeld;
export const voiceRhythm=(e,v)=>v===0&&e._bassDuration?{duration:e._bassDuration,dotted:e._bassDotted}:e;
export function soundingNotes(events,solutions){const expanded=expandHarmony(events,solutions),notes=expanded.events.filter(e=>e.kind==='note'),sounds=[];
 notes.forEach((e,i)=>{const c=expanded.solutions?.[i],voices=c?.voices||[e.midi];voices.forEach((midi,voice)=>{if(!voicePresent(e,voice)||!Number.isInteger(midi))return;const r=voiceRhythm(e,voice),length=rhythmicUnits(r),previous=sounds.findLast(s=>s.voice===voice),outgoing=voice===0?(e._bassTieNext??e.tieNext):e.tieNext;if(previous?.tieNext&&previous.start+previous.length===e.start&&previous.midi===midi){previous.length+=length;previous.tieNext=!!outgoing}else sounds.push({start:e.start,length,midi,voice,sourceIndex:e._sourceIndex,tieNext:!!outgoing})})});return sounds;
}
export function tieLinks(events,solutions){const notes=events.filter(e=>e.kind==='note'),links=[];notes.forEach((e,i)=>{(solutions?.[i]?.voices||[e.midi]).forEach((midi,v)=>{if(!voicePresent(e,v)||!(v===0?(e._bassTieNext??e.tieNext):e.tieNext))return;const end=e.start+rhythmicUnits(voiceRhythm(e,v)),j=notes.findIndex((n,k)=>k>i&&n.start===end&&voicePresent(n,v));if(j>=0&&(solutions?.[j]?.voices[v]??notes[j].midi)===midi)links.push({from:i,to:j,voice:v})})});return links;}
