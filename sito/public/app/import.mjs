import {KEYS} from './engine.mjs';
import {UNITS,eventUnits,fillMeasures} from './notation.mjs';

const children=(n,name)=>n?.children.filter(x=>x.name===name)||[];
const child=(n,name)=>children(n,name)[0];
const value=(n,name)=>child(n,name)?.text.trim();
const decode=s=>s.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,(_,number,entity)=>number?String.fromCodePoint(number[0].toLowerCase()==='x'?parseInt(number.slice(1),16):Number(number)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity]);
function parseXML(xml){
 if(xml.length>12_000_000)throw Error('La partitura è troppo grande. Esporta soltanto il basso.');
 const root={name:'#',attrs:{},children:[],text:''},stack=[root],tokens=xml.match(/<!--[^]*?-->|<!\[CDATA\[[^]*?\]\]>|<[^>]*>|[^<]+/g)||[];
 for(const token of tokens){
  if(token.startsWith('<?')||token.startsWith('<!')&&!token.startsWith('<![CDATA['))continue;
  if(token.startsWith('<![CDATA[')){stack.at(-1).text+=token.slice(9,-3);continue}
  if(token.startsWith('</')){if(stack.length<2||stack.at(-1).name!==token.slice(2,-1).trim())throw Error('XML non valido: chiusura incoerente.');stack.pop();continue}
  if(token.startsWith('<')){const name=token.match(/^<([\w:.-]+)/)?.[1];if(!name)throw Error('XML non valido.');const attrs={};for(const m of token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1]]=decode(m[2]??m[3]);const node={name:name.split(':').at(-1),attrs,children:[],text:''};stack.at(-1).children.push(node);if(!token.endsWith('/>'))stack.push(node)}
  else stack.at(-1).text+=decode(token);
 }
 if(stack.length!==1)throw Error('XML non valido: elemento incompleto.');return root.children[0];
}
function duration(node,bar){
 const type=value(node,'durationType')||value(node,'type'),dots=Number(value(node,'dots')??children(node,'dot').length);
 if(dots>1)throw Error('I doppi punti non sono ancora supportati: modifica il ritmo in MuseScore.');
 if(type==='measure')return {duration:'whole',length:bar,dotted:false,measureRest:true};
 const duration=type==='long'?'breve':type;
 if(!UNITS[duration])throw Error(`Figura ritmica ${type||'sconosciuta'} non supportata.`);
 const length=UNITS[duration]*(dots?1.5:1);
 if(!Number.isInteger(length))throw Error('Suddivisione ritmica troppo fine per l’editor.');
 return {duration,length,dotted:!!dots};
}
const meterUnits=meter=>{const [beats,denom]=meter.split('/').map(Number),bar=beats*64/denom;if(!Number.isInteger(bar)||bar<=0)throw Error(`Metrica ${meter} non supportata.`);return bar};
const keyName=(fifths,mode,tracks)=>{
 const candidates=Object.entries(KEYS).filter(([,k])=>k.fifths===fifths);
 if(!candidates.length)throw Error('Armatura non supportata.');
 if(mode==='minor'||mode==='major')return candidates.find(([,k])=>k.minor===(mode==='minor'))[0];
 const last=tracks.find(t=>t.events.some(e=>e.kind==='note'))?.events.filter(e=>e.kind==='note').at(-1)?.midi;
 return candidates.find(([,k])=>last!==undefined&&last%12===k.tonic%12)?.[0]||candidates.find(([,k])=>!k.minor)[0];
};
const sortTracks=tracks=>tracks.sort((a,b)=>{const bass=n=>/basso|bass|pedal/i.test(n.name)?1:0;return bass(b)-bass(a)||average(a.events)-average(b.events)});
const average=events=>{const ns=events.filter(e=>e.kind==='note');return ns.length?ns.reduce((sum,e)=>sum+e.midi,0)/ns.length:999};
function validate(result){
 result.tracks=result.tracks.filter(t=>t.events.some(e=>e.kind==='note'));
 if(!result.tracks.length)throw Error('Non trovo una linea di basso con note nel file.');
 for(const track of result.tracks){try{fillMeasures(track.events,result.meter,result.measureCount)}catch(error){track.error=error.message}}
 sortTracks(result.tracks);result.key=keyName(result.fifths,result.mode,result.tracks);return result;
}
export function parseMscx(xml){
 const root=parseXML(xml),score=root?.name==='Score'?root:child(root,'Score');if(!score)throw Error('Non è una partitura MuseScore MSCX.');
 const staves=children(score,'Staff').filter(s=>children(s,'Measure').length),warnings=[],parts=children(score,'Part');
 const first=staves.flatMap(s=>children(s,'Measure')).find(m=>child(child(m,'voice'),'TimeSig'))||children(staves[0],'Measure')[0];
 const firstVoice=child(first,'voice'),time=child(firstVoice,'TimeSig'),meter=time?`${value(time,'sigN')||4}/${value(time,'sigD')||4}`:'4/4',bar=meterUnits(meter);
 const signature=child(firstVoice,'KeySig');let fifths=Number(value(signature,'accidental')??0),mode=value(signature,'mode')||'';
 const tracks=staves.map((staff,staffIndex)=>{
  const id=staff.attrs.id||String(staffIndex+1),part=parts.find(p=>children(p,'Staff').some(s=>s.attrs.id===id)),name=value(part,'longName')||value(part,'trackName')||value(part,'shortName')||`Rigo ${id}`;
  const stats=new Map();for(const m of children(staff,'Measure'))children(m,'voice').forEach((v,i)=>{const pitches=children(v,'Chord').flatMap(c=>children(c,'Note').map(n=>Number(value(n,'pitch')))).filter(Number.isInteger);const old=stats.get(i)||[];stats.set(i,[...old,...pitches])});const voiceIndex=[...stats].sort((a,b)=>(a[1].length?a[1].reduce((s,n)=>s+n,0)/a[1].length:Infinity)-(b[1].length?b[1].reduce((s,n)=>s+n,0)/b[1].length:Infinity))[0]?.[0]??0;
  const events=[];let measure=0;
  for(const m of children(staff,'Measure')){
   const voices=children(m,'voice'),voice=voices[voiceIndex];if(!voice){measure++;continue}
   if(voices.length>1)warnings.push(`Rigo ${id}: importata una sola voce per rigo.`);
   const key=voices.map(v=>child(v,'KeySig')).find(Boolean),t=voices.map(v=>child(v,'TimeSig')).find(Boolean);if(voice.children.some(n=>n.name==='Tuplet'||child(n,'Tuplet')))throw Error(`Terzine o gruppi irregolari alla battuta ${measure+1}: esporta un tratto senza gruppi irregolari; non vengono convertiti in ritmi ordinari.`);
   if(key&&Number(value(key,'accidental'))!==fifths)throw Error(`Cambio di armatura alla battuta ${measure+1}: importa un tratto con tonalità costante.`);
   if(t&&`${value(t,'sigN')}/${value(t,'sigD')}`!==meter)throw Error(`Cambio di metrica alla battuta ${measure+1}: importa un tratto con metrica costante.`);
   let pos=measure*bar;
   for(const item of voice.children){if(item.name!=='Chord'&&item.name!=='Rest')continue;
    const d=duration(item,bar),notes=children(item,'Note'),midi=notes.map(n=>Number(value(n,'pitch'))).filter(Number.isInteger);
    if(item.name==='Chord'&&!midi.length)throw Error(`Nota senza altezza alla battuta ${measure+1}.`);
    if(midi.length>1)warnings.push(`Rigo ${id}, battuta ${measure+1}: usata la nota più grave dell’accordo.`);
    if(d.measureRest){events.push({start:pos,kind:'rest',duration:bar===64?'whole':'quarter',_measureRest:true});pos+=bar;continue}
    events.push(item.name==='Rest'?{start:pos,kind:'rest',duration:d.duration,dotted:d.dotted}:{start:pos,kind:'note',midi:Math.min(...midi),spelling:nativeSpelling(notes[midi.indexOf(Math.min(...midi))],Math.min(...midi)),duration:d.duration,dotted:d.dotted,accidental:'key',tieNext:!!child(notes[midi.indexOf(Math.min(...midi))],'Tie')});pos+=d.length;
   }
   if(pos>(measure+1)*bar)throw Error(`La battuta ${measure+1} supera la metrica ${meter}.`);
   measure++;
  }
  return {id,name,events};
 });
 // Le pause di battuta intera variano con la metrica: quelle implicite sono ricreate dal renderer.
 for(const track of tracks)track.events=track.events.filter(e=>!e._measureRest);
 return validate({tracks,meter,measureCount:Math.max(...staves.map(s=>children(s,'Measure').length)),fifths,mode,warnings});
}
function nativeSpelling(note,midi){const raw=value(note,'tpc')??value(note,'tpc1');if(raw===undefined)return undefined;const tpc=Number(raw);if(!Number.isInteger(tpc))return undefined;const letter=['Do','Sol','Re','La','Mi','Si','Fa'][((tpc%7)+7)%7],base={Do:14,Sol:15,Re:16,La:17,Mi:18,Si:19,Fa:13}[letter],alter=(tpc-base)/7,natural={Do:0,Re:2,Mi:4,Fa:5,Sol:7,La:9,Si:11}[letter],octave=(midi-natural-alter)/12-1;return Number.isInteger(octave)&&Math.abs(alter)<=2?{letter,alter,octave}:undefined}
const typeOf=(note,bar)=>{
 const fake={children:[]};const type=value(note,'type');if(!type)throw Error('MusicXML senza tipo della figura.');fake.children.push({name:'durationType',text:type,children:[]});for(const dot of children(note,'dot'))fake.children.push(dot);return duration(fake,bar);
};
const pitchOf=note=>{const p=child(note,'pitch');if(!p)return null;const step=value(p,'step'),oct=Number(value(p,'octave')),alter=Number(value(p,'alter')||0),semitone={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step];if(semitone===undefined||!Number.isInteger(oct))throw Error('Altezza MusicXML non valida.');return (oct+1)*12+semitone+alter};
export function parseMusicXml(xml){
 const root=parseXML(xml);if(root?.name!=='score-partwise')throw Error('Importa un MusicXML in formato score-partwise.');
 const parts=children(root,'part'),names=new Map(children(child(root,'part-list'),'score-part').map(p=>[p.attrs.id,value(p,'part-name')||p.attrs.id]));
 if(!parts.length)throw Error('MusicXML senza parti.');let meter=null,fifths=0,mode='',warnings=[];
 const tracks=parts.flatMap(part=>{
  const events=[],clefs=new Map();let measure=0,divisions=1;
  for(const m of children(part,'measure')){
   const attr=child(m,'attributes');
   if(attr){const newDiv=Number(value(attr,'divisions')||divisions);if(!Number.isFinite(newDiv)||newDiv<=0)throw Error('Divisioni MusicXML non valide.');divisions=newDiv;
    const time=child(attr,'time');if(time){const next=`${value(time,'beats')}/${value(time,'beat-type')}`;if(meter&&meter!==next)throw Error(`Cambio di metrica alla battuta ${measure+1}: importa un tratto con metrica costante.`);meter=next}
    const key=child(attr,'key');if(key){const next=Number(value(key,'fifths'));if(measure>0&&next!==fifths)throw Error(`Cambio di armatura alla battuta ${measure+1}: importa un tratto con tonalità costante.`);fifths=next;mode=value(key,'mode')||mode}
    for(const clef of children(attr,'clef'))clefs.set(clef.attrs.number||'1',value(clef,'sign'))}
   const bar=meterUnits(meter||'4/4');let pos=measure*bar,lastStart=pos;
   for(const item of m.children){
    if(item.name==='backup'){pos-=Number(value(item,'duration'))*16/divisions;continue}
    if(item.name==='forward'){pos+=Number(value(item,'duration'))*16/divisions;continue}
    if(item.name!=='note')continue;
    const actual=Number(value(item,'duration'))*16/divisions;
    if(child(item,'rest')?.attrs.measure==='yes'){pos+=bar;continue}
    const d=typeOf(item,bar);
    if(Number.isFinite(actual)&&Math.abs(actual-d.length)>0.01)throw Error(`Battuta ${measure+1}: terzine o durate irregolari non ancora supportate.`);
    const chord=!!child(item,'chord');if(chord)pos=lastStart;else lastStart=pos;
    const midi=pitchOf(item),tieNext=children(item,'tie').some(t=>t.attrs.type==='start');
    const staff=value(item,'staff')||'1',voice=value(item,'voice')||'1';
    if(midi===null){if(!chord)events.push({start:pos,kind:'rest',duration:d.duration,dotted:d.dotted,staff,voice})}
    else {const p=child(item,'pitch'),spelling={letter:{C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'}[value(p,'step')],alter:Number(value(p,'alter')||0),octave:Number(value(p,'octave'))};events.push({start:pos,kind:'note',midi,spelling,duration:d.duration,dotted:d.dotted,accidental:'key',tieNext,staff,voice});}
    if(!chord)pos+=d.length;else pos=lastStart+d.length;
   }
   measure++;
  }
  const id=part.attrs.id||String(parts.indexOf(part)+1),staffIds=[...new Set(events.map(e=>e.staff))];
  return staffIds.map(staff=>{
   const onStaff=events.filter(e=>e.staff===staff),voiceIds=[...new Set(onStaff.map(e=>e.voice))];
   const voice=voiceIds.sort((a,b)=>average(onStaff.filter(e=>e.voice===a))-average(onStaff.filter(e=>e.voice===b)))[0];
   if(voiceIds.length>1)warnings.push(`Parte ${names.get(id)||id}, rigo ${staff}: importata la voce più grave.`);
   const selected=onStaff.filter(e=>e.voice===voice),byStart=new Map();
   for(const e of selected){const previous=byStart.get(e.start);if(previous){if(e.kind==='note'&&previous.kind==='note'){warnings.push(`Parte ${names.get(id)||id}, rigo ${staff}: accordo ridotto alla nota più grave.`);if(e.midi<previous.midi)byStart.set(e.start,e)}else if(e.kind==='note')byStart.set(e.start,e)}else byStart.set(e.start,e)}
   const suffix=staffIds.length>1?` · rigo ${staff}${clefs.get(staff)==='F'?' (basso)':''}`:'';
   return {id:`${id}:${staff}`,name:`${names.get(id)||`Parte ${id}`}${suffix}`,events:[...byStart.values()].sort((a,b)=>a.start-b.start).map(({staff,voice,...e})=>e)};
  });
 });
 return validate({tracks,meter:meter||'4/4',measureCount:Math.max(...parts.map(p=>children(p,'measure').length)),fifths,mode,warnings});
}
export async function readScoreFile(file,zip=globalThis.JSZip){
 if(file.size>20_000_000)throw Error('File troppo grande (massimo 20 MB). Esporta solo il basso.');
 const lower=file.name.toLowerCase();let xml;
 if(/\.(mscx|musicxml|xml)$/.test(lower))xml=await file.text();
 else if(/\.(mscz|mxl)$/.test(lower)){
  if(!zip)throw Error('Modulo ZIP locale non disponibile.');
  const archive=await zip.loadAsync(await file.arrayBuffer());let entry;
  if(lower.endsWith('.mscz'))entry=Object.values(archive.files).find(f=>/\.mscx$/i.test(f.name)&&!f.dir);
  else{const container=archive.file('META-INF/container.xml');if(container){const root=parseXML(await container.async('string'));const path=child(child(root,'rootfiles'),'rootfile')?.attrs['full-path'];if(path)entry=archive.file(path)}entry??=Object.values(archive.files).find(f=>/\.(musicxml|xml)$/i.test(f.name)&&!f.name.startsWith('META-INF/'))}
  if(!entry)throw Error('Archivio senza partitura riconoscibile.');
  if(entry._data?.uncompressedSize>12_000_000)throw Error('La partitura compressa è troppo grande. Esporta soltanto il basso.');
  xml=await entry.async('string');
 }else throw Error('Scegli un file .mscz, .mscx, .musicxml, .xml o .mxl.');
 return lower.endsWith('.mscx')||lower.endsWith('.mscz')?parseMscx(xml):parseMusicXml(xml);
}
