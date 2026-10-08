import {scoreFigure as label} from './harmony-figures.mjs';
import {proposeAutomaticSevenths} from './automatic-sevenths.mjs';
import {initMobileUI} from './mobile-ui.mjs';
import {validMeter,restoredManual,validateSavedEvents} from './session-state.mjs';
import {expandHarmony,soundingNotes,voiceRhythm} from './harmonic-rhythm.mjs';
import {initReferenceUI} from './reference-ui.mjs';
import {deleteMeasure,initScoreWorkspace} from './score-workspace.mjs';
import {noteFlag,flagStemLength} from './note-flags.mjs';
import {initAppearance,numberDuration} from './appearance.mjs';
import {generateMeteredBass,generationKeys} from './bass-generator.mjs';
import {engravedSvg} from './pdf-view.mjs';
import {STAFF,staffY,staffStep,ledgerLines,dotY,HEAD,headOffsets,CLEFS,SCREEN_SCALE} from './staff-geometry.mjs';
import {GLYPHS} from './music-glyphs.mjs';
import {proposeHarmonyEdit,proposeHeldPlagal} from './actions.mjs';
import {KEYS,RULES,generateBass,harmonize,diagnoseNoSolution,pitchName,noteSpelling,degree,issues,candidateForVoices,supportedSevenths,bachResolution} from './engine.mjs';
import {TONAL_RULES,closeKeys,harmonizeTonal,generateTonalBass,tonalIssues,tonalCandidates,readingLabel,manualModulationCandidates,tonicizedDegree} from './tonal.mjs';
import {chromaticSpelling,chromaticName} from './engine.mjs';
RULES.push(...TONAL_RULES);
import {reviewChromaticModulations} from './chromatic-review.mjs';
import {ANALYSIS_RULES} from './analysis-rules.mjs';
RULES.push(...ANALYSIS_RULES);
import {PianoSampler} from './piano.mjs';
import {scorePdf,scoreLayout} from './pdf.mjs';
import {initImport} from './import-ui.mjs';
import {musicXML,midiBytes,fillMeasures,eventUnits,validTies} from './notation.mjs';
const $=id=>document.getElementById(id);const state={key:'Do maggiore',deferHarmony:false,meter:'4/4',partSpacing:'strette',scoreLayout:'pages',figuresOnly:false,includeFigures:true,harmonicRequests:{},rhythmLocks:{},mode:'generate',generateBars:2,generatedModulations:[],level:1,bass:generateBass(),events:[],measureCount:4,page:0,solutions:[],chosen:0,selected:null,locks:{},variation:0,bpm:84,loop:false,playing:false,seventhsEnabled:false,allowedSevenths:[1,4],manual:false,manualMode:false,manualNotes:{},secondaryEnabled:false,secondaryTargets:[1,2,3,4,5],modulationMode:'off',maxModulations:12,tonalDestination:'',returnHome:false,tonalEvents:[],tool:{kind:'note',duration:'quarter',accidental:'key',dotted:false}};const piano=new PianoSampler();let playTimer,mobileUI;
const appearance=initAppearance({document,storage:localStorage,onChange:()=>{render();save()}});
const levels={1:'Triadi allo stato fondamentale; controlli su conduzione delle voci, sensibile e ordine funzionale.',2:'Triadi allo stato fondamentale e in primo rivolto.',3:'Triadi con rivolti consentiti dal contesto; settime selezionabili con preparazione e risoluzione.'};
const durations=[['breve','𝅜','Breve'],['whole','𝅝','Semibreve'],['half','𝅗𝅥','Minima'],['quarter','𝅘𝅥','Semiminima'],['eighth','𝅘𝅥𝅮','Croma'],['16th','𝅘𝅥𝅯','Semicroma'],['32nd','𝅘𝅥𝅰','Biscroma'],['64th','𝅘𝅥𝅱','Semibiscroma']];
const rests=[['breve','𝄺','Pausa di breve'],['whole','𝄻','Pausa di semibreve'],['half','𝄼','Pausa di minima'],['quarter','𝄽','Pausa di semiminima'],['eighth','𝄾','Pausa di croma'],['16th','𝄿','Pausa di semicroma'],['32nd','𝅀','Pausa di biscroma'],['64th','𝅁','Pausa di semibiscroma']];
const accidentals=[['key','–','Armatura'],['natural','♮','Bequadro'],['sharp','♯','Diesis'],['double-sharp','𝄪','Doppio diesis'],['flat','♭','Bemolle'],['double-flat','𝄫','Doppio bemolle']];
const durationFlags={eighth:1,'16th':2,'32nd':3,'64th':4};
const units={breve:128,whole:64,half:32,quarter:16,eighth:8,'16th':4,'32nd':2,'64th':1};
const sharpOrder=['Fa','Do','Sol','Re','La','Mi','Si'],flatOrder=['Si','Mi','La','Re','Sol','Do','Fa'];
function signatureAlteration(letter){const fifths=KEYS[state.key].fifths;return fifths>0&&sharpOrder.slice(0,fifths).includes(letter)?1:fifths<0&&flatOrder.slice(0,-fifths).includes(letter)?-1:0}
function writtenAccidental(midi,spelling=chromaticSpelling(midi,state.key)){if(!spelling)return '';const inKey=signatureAlteration(spelling.letter);return spelling.alter===inKey?'':({0:'♮',1:'♯',2:'𝄪','-1':'♭','-2':'𝄫'})[spelling.alter]||''}
const measureUnits=()=>{const [beats,unit]=state.meter.split('/').map(Number);return beats*64/unit};
const PAGE_BARS=4;
const noteEvents=()=>state.events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start);
function syncBass(){state.bass=noteEvents().map(e=>e.midi)}
function ensureMeasures(addBlank=true){const last=Math.max(0,...state.events.map(e=>e.start+eventUnits(e)));state.measureCount=Math.max(state.measureCount,1,Math.ceil(last/measureUnits())+(addBlank&&state.mode!=='generate'&&last>0?1:0))}
function generatedEvents(){let cursor=0;const bar=measureUnits();state.events=state.bass.map(midi=>{if(cursor+16>(Math.floor(cursor/bar)+1)*bar)cursor=(Math.floor(cursor/bar)+1)*bar;const event={start:cursor,midi,kind:'note',duration:'quarter',accidental:'key'};cursor+=16;return event});state.measureCount=state.mode==='generate'?Math.max(1,Math.ceil(cursor/bar)):4;state.page=0;ensureMeasures()}
for(const [group,minor] of [['Tonalità maggiori',false],['Tonalità minori',true]]){const options=document.createElement('optgroup');options.label=group;for(const [key,data] of Object.entries(KEYS))if(data.minor===minor)options.append(new Option(`${key} · ${Math.abs(data.fifths)} ${data.fifths>0?'♯':data.fifths<0?'♭':'alterazioni'}`,key));$('key').add(options)}
function save(){try{localStorage.setItem('armonizza-v2',JSON.stringify({key:state.key,deferHarmony:state.deferHarmony,meter:state.meter,partSpacing:state.partSpacing,scoreLayout:state.scoreLayout,includeFigures:state.includeFigures,pdfSystemsPerPage:state.pdfSystemsPerPage,harmonicRequests:state.harmonicRequests,rhythmLocks:state.rhythmLocks,manualSolution:state.manual?current():null,mode:state.mode,generateBars:state.generateBars,generatedModulations:state.generatedModulations,level:state.level,events:state.events,measureCount:state.measureCount,page:state.page,locks:state.locks,bpm:state.bpm,variation:state.variation,seventhsEnabled:state.seventhsEnabled,allowedSevenths:state.allowedSevenths,manualNotes:state.manualNotes,secondaryEnabled:state.secondaryEnabled,secondaryTargets:state.secondaryTargets,modulationMode:state.modulationMode,maxModulations:state.maxModulations,tonalDestination:state.tonalDestination,returnHome:state.returnHome,tonalEvents:state.tonalEvents}))}catch{}}
try{const x=JSON.parse(localStorage.getItem('armonizza-v2'));if(x&&KEYS[x.key]&&Array.isArray(x.events)){Object.assign(state,{key:x.key,deferHarmony:!!x.deferHarmony,meter:validMeter(x.meter)?x.meter:'4/4',partSpacing:x.partSpacing==='late'?'late':'strette',scoreLayout:['paged','scroll','pages'].includes(x.scoreLayout)?x.scoreLayout:'pages',figuresOnly:false,includeFigures:x.includeFigures!==false,pdfSystemsPerPage:Number.isInteger(x.pdfSystemsPerPage)&&x.pdfSystemsPerPage>=2&&x.pdfSystemsPerPage<=20?x.pdfSystemsPerPage:4,harmonicRequests:x.harmonicRequests||{},rhythmLocks:x.rhythmLocks||{},mode:x.mode==='write'?'write':'generate',generateBars:Math.min(128,Math.max(1,Number(x.generateBars)||2)),generatedModulations:Array.isArray(x.generatedModulations)?x.generatedModulations:[],level:[1,2,3].includes(Number(x.level))?Number(x.level):1,events:x.events.filter(e=>Number.isInteger(e.start)&&units[e.duration]&&['note','rest'].includes(e.kind)),measureCount:Math.min(1000,Math.max(1,Math.floor(Number(x.measureCount))||4)),page:Math.max(0,Number(x.page)||0),locks:x.locks||{},bpm:Math.min(160,Math.max(48,Number(x.bpm)||84)),variation:x.variation||0,seventhsEnabled:!!x.seventhsEnabled,allowedSevenths:Array.isArray(x.allowedSevenths)?x.allowedSevenths.filter(n=>Number.isInteger(n)&&n>=0&&n<=6):[1,4],manualNotes:x.manualNotes||{},secondaryEnabled:!!x.secondaryEnabled,secondaryTargets:Array.isArray(x.secondaryTargets)?x.secondaryTargets.filter(n=>Number.isInteger(n)&&n>0&&n<7):[1,2,3,4,5],modulationMode:['off','auto','manual'].includes(x.modulationMode)?x.modulationMode:'off',maxModulations:[1,2,4,12].includes(x.maxModulations)?x.maxModulations:12,tonalDestination:KEYS[x.tonalDestination]?x.tonalDestination:'',returnHome:!!x.returnHome,tonalEvents:Array.isArray(x.tonalEvents)?x.tonalEvents:[]});if(!validateSavedEvents(state.events,state.meter))throw Error('Dati salvati non validi.');const manual=restoredManual(x.manualSolution,state.events);if(manual){state.solutions=[manual];state.chosen=0;state.manual=true}syncBass();ensureMeasures(false);state.page=Math.min(state.page,Math.floor((state.measureCount-1)/PAGE_BARS))}else generatedEvents()}catch{state.meter='4/4';state.solutions=[];state.manual=false;state.harmonicRequests={};state.rhythmLocks={};state.locks={};state.manualNotes={};state.bass=generateBass(state.key);generatedEvents()}
$('key').value=state.key;if(![...$('meter').options].some(option=>option.value===state.meter))$('meter').add(new Option(state.meter,state.meter));$('meter').value=state.meter;$('partSpacing').value=state.partSpacing;$('level').value=state.level;$('bpm').value=state.bpm;state.manualMode=state.mode==='write';
function current(){return state.solutions[state.chosen]||null}
function selectedChord(){const c=current()?.[state.selected?.i];return c?.segments?.[state.selected?.segment??0]||c}
function canAddSeventh(){const c=selectedChord();return !state.harmonyEdit?.busy&&!!c&&!c.seventh&&!current()?.[state.selected?.i]?.segments&&state.selected.i<noteEvents().length-1&&supportedSevenths(c.key||state.key).includes(c.root)}
try{if(localStorage.getItem('armonizza-paper-workspace-v1')!=='1'){state.scoreLayout='pages';localStorage.setItem('armonizza-paper-workspace-v1','1')}}catch{}
function wizardSourceKey(index){const start=noteEvents()[index]?.start;return state.tonalEvents.filter(e=>e.kind==='modulation'&&e.start<start).sort((a,b)=>a.start-b.start).at(-1)?.key||current()?.[Math.max(0,index-1)]?.homeKey||state.key}
function renderModulationWizard(){
 if(state.modWizard){$('modulationsPanel').open=true;$('sidebarTools').open=true;}
 const w=state.modWizard;$('modulationChoice').hidden=!w||!['choice','confirm'].includes(w.step);$('modulationConfirmation').hidden=!(w&&(w.step==='confirm'||w.step==='choice'&&$('modulationKeyMode').value==='manual'));$('cancelModulation').hidden=!w;
 $('modulationPrompt').textContent=!w?'Seleziona la nota alterata e poi quella di arrivo.':w.step==='altered'?'Seleziona la nota alterata nel basso.':w.step==='arrival'?`Nota ${w.index+1} selezionata. Ora seleziona la nota di arrivo.`:w.step==='confirm'?`La tonalità di arrivo è ${w.proposal.key}, confermi?${w.proposal.uncertain?' È una lettura possibile da verificare nel contesto.':''}`:`Note ${w.index+1} → ${w.confirm+1}: scegli come individuare la tonalità.`;
 linkNoteReferences($('modulationPrompt'));
 const manual=$('modulationKeyMode').value==='manual';$('wizardKeyLabel').hidden=!manual;$('recalculateModulation').hidden=manual;$('chooseModulationKey').hidden=manual;$('calculateModulation').textContent=manual?'Usa questa tonalità':'Calcola da solo';
 if(w&&['choice','confirm'].includes(w.step)){const previous=$('wizardKey').value,keys=Object.keys(KEYS);$('wizardKey').replaceChildren(...keys.map(k=>new Option(k,k)));$('wizardKey').value=keys.includes(previous)?previous:keys[0]}
}
function selectModulationNote(i,voice){
 const w=state.modWizard;if(voice!==0){setStatus('Seleziona una nota del basso.');return}
 if(w.step==='altered'){w.index=i;w.step='arrival'}else if(w.step==='arrival'){
  if(i<=w.index){setStatus('La nota di arrivo deve seguire la nota alterata.');return}
  w.confirm=i;w.step='choice';$('modulationKeyMode').value='auto';
 }else return;
 state.selected={i,voice:0};state.page=Math.floor(noteEvents()[i].start/measureUnits()/PAGE_BARS);render();
}
function calculateWizard(recalculate=false){
 const w=state.modWizard;if(!w||!['choice','confirm'].includes(w.step))return;
 if($('modulationKeyMode').value==='manual'){
  const key=$('wizardKey').value;if(!KEYS[key]){setStatus('Scegli una tonalità valida.');return}
  const arrival=degree(noteEvents()[w.confirm].midi,key);
  w.proposal={key,arrivalMode:arrival===0||arrival===2||arrival===4?'tonic':'manual',uncertain:true,reason:'Tonalità scelta manualmente; cadenza da verificare'};
 }else{
  if(!w.candidates){const notes=noteEvents();w.candidates=manualModulationCandidates({bass:notes.map(e=>e.midi),bassSpellings:notes.map(e=>e.spelling||null),key:wizardSourceKey(w.index)},w.index,w.confirm);w.rejected=[]}
  if(recalculate&&w.proposal)w.rejected.push(w.proposal.key);
  w.proposal=w.candidates.find(c=>!w.rejected.includes(c.key));
  if(!w.proposal){w.step='choice';$('modulationKeyMode').value='manual';setStatus('Non ci sono altre tonalità compatibili con queste due note. Puoi scegliere la tonalità oppure annullare e cambiare la nota di arrivo.');render();return}
 }
 w.step='confirm';render();
}
$('selectModulation').onclick=()=>{cancelSolve();if(noteEvents().length<2){setStatus('Scrivi o importa almeno due note di basso.');return}if(state.playing)stop();state.modWizard={step:'altered'};state.selected=null;render()};
$('cancelModulation').onclick=()=>{state.modWizard=null;render()};
$('modulationKeyMode').onchange=()=>{if(state.modWizard){state.modWizard.step='choice';state.modWizard.proposal=null}renderModulationWizard()};
$('wizardKey').onchange=()=>{if(state.modWizard&&$('modulationKeyMode').value==='manual'){state.modWizard.step='choice';state.modWizard.proposal=null;renderModulationWizard()}};
$('calculateModulation').onclick=()=>calculateWizard();
$('recalculateModulation').onclick=()=>calculateWizard(true);
$('chooseModulationKey').onclick=()=>{$('modulationKeyMode').value='manual';state.modWizard.step='choice';state.modWizard.proposal=null;render()};
$('confirmModulation').onclick=()=>{
 const w=state.modWizard;if(!w)return;if($('modulationKeyMode').value==='manual'&&['choice','confirm'].includes(w.step))calculateWizard();if(w.step!=='confirm'||!w.proposal)return;const notes=noteEvents();
 if(w.proposal.key===wizardSourceKey(w.index)){state.tonalEvents=state.tonalEvents.filter(e=>e.kind!=='modulation'||e.start!==notes[w.index].start);state.modWizard=null;rerun();setStatus(w.proposal.key+' è già la tonalità attiva: non serve una nuova modulazione.');return}
 const event={kind:'modulation',start:notes[w.index].start,confirmStart:notes[w.confirm].start,key:w.proposal.key,arrivalMode:w.proposal.arrivalMode||'cadence',reason:w.proposal.reason,manualChoice:true};
 state.tonalEvents=state.tonalEvents.filter(e=>e.start!==event.start);state.tonalEvents.push(event);state.tonalEvents.sort((a,b)=>a.start-b.start);state.modWizard=null;if(state.modulationMode!=='auto')state.modulationMode='manual';state.level=3;$('level').value='3';rerun();setStatus('Modulazione salvata: '+event.key+'. La validità armonica viene verificata separatamente.');
};
function eventsForEngine(){const notes=noteEvents();return state.tonalEvents.map(e=>({...e,index:notes.findIndex(n=>n.start===e.start),...(['modulation','extendedTonicization'].includes(e.kind)?{confirm:notes.findIndex(n=>n.start===e.confirmStart)}:{})}))}
function generateCurrentBass(){
 try{
  let changes=[...state.generatedModulations];const beats=Number(state.meter.split('/')[0]);
  if(!changes.length&&state.modulationMode!=='off'){
   const destination=state.tonalDestination||closeKeys(state.key)[state.variation%closeKeys(state.key).length];
   changes=[{bar:1,position:2,key:destination}];if(state.returnHome)changes.push({bar:Math.max(2,Math.ceil(state.generateBars/2)),position:1,key:state.key});
  }
  const r=generateMeteredBass({bars:state.generateBars,meter:state.meter,key:state.key,modulations:changes,variation:state.variation,level:state.level,seventhsEnabled:state.seventhsEnabled,allowedSevenths:state.allowedSevenths,secondaryEnabled:state.secondaryEnabled,secondaryTargets:state.secondaryTargets});
  state.deferHarmony=false;state.bass=r.bass;state.events=r.events;state.measureCount=r.measureCount;state.page=0;
  state.tonalEvents=r.tonalEvents.map(e=>({...e,start:r.events[e.index].start,...(e.kind==='modulation'?{confirmStart:r.events[e.confirm].start}:{})}));
  if(changes.length)state.modulationMode='manual';return true;
 }catch(error){setStatus(`Generazione del basso: ${error.message}`);return false}
}
function renderGeneration(){
 $('generatorControls').hidden=false;$('generateKey').value=state.key;$('generateMeter').value=state.meter;$('key').value=state.key;$('meter').value=state.meter;$('generateBars').value=state.generateBars;
 $('generatedModulations').replaceChildren(...state.generatedModulations.map((e,i)=>{const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');text.textContent=`Battuta ${e.bar}, posizione ${e.position} → ${e.key}`;remove.textContent='Elimina';remove.className='secondary';remove.onclick=()=>{state.generatedModulations.splice(i,1);renderGeneration();save()};linkNoteReferences(text);row.append(text,remove);return row}));
}
$('generateBars').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>128){setStatus('Scegli da 1 a 128 battute.');return}state.generateBars=n;save()};
$('addGeneratedModulation').onclick=()=>{const keys=generationKeys(state.generatedModulations.at(-1)?.key||state.key);$('generatedModulationKey').replaceChildren();for(const [label,list] of [['Tonalità vicine consigliate',keys.near],['Altre tonalità',keys.others]]){const group=document.createElement('optgroup');group.label=label;group.append(...list.map(k=>new Option(k,k)));$('generatedModulationKey').append(group)}$('generatedModulationKey').value=keys.near[0];$('generatedModulationBar').max=state.generateBars;$('generatedModulationPosition').max=Number(state.meter.split('/')[0]);$('generatedModulationForm').hidden=false};
$('cancelGeneratedModulation').onclick=()=>{$('generatedModulationForm').hidden=true};
$('saveGeneratedModulation').onclick=()=>{const e={bar:Number($('generatedModulationBar').value),position:Number($('generatedModulationPosition').value),key:$('generatedModulationKey').value},beats=Number(state.meter.split('/')[0]);if(!Number.isInteger(e.bar)||!Number.isInteger(e.position)||e.bar<1||e.bar>state.generateBars||e.position<1||e.position>beats||!KEYS[e.key]){setStatus('Scegli una battuta e una posizione comprese nel basso, e una tonalità.');return}state.generatedModulations.push(e);state.generatedModulations.sort((a,b)=>a.bar-b.bar||a.position-b.position);$('generatedModulationForm').hidden=true;renderGeneration();save();setStatus('Percorso aggiornato. Premi Genera un altro basso per applicarlo.')};
function renderTonalConfig(){
 $('secondaryEnabled').checked=state.secondaryEnabled;$('secondaryFilters').hidden=!state.secondaryEnabled;
 $('modulationMode').value=state.modulationMode;$('maxModulations').value=String(state.maxModulations);$('returnHome').checked=state.returnHome;
 $('secondaryDegrees').replaceChildren(...[1,2,3,4,5].map(d=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=state.secondaryTargets.includes(d);input.disabled=KEYS[state.key].minor&&d===1;input.onchange=()=>{state.secondaryTargets=input.checked?[...new Set([...state.secondaryTargets,d])]:state.secondaryTargets.filter(n=>n!==d);rerun()};label.append(input,document.createTextNode(['I','II','III','IV','V','VI','VII'][d]));return label}));
 const choices=closeKeys(state.key);$('tonalDestination').replaceChildren(new Option('Scegli automaticamente',''),...choices.map(k=>new Option(k,k)));$('tonalDestination').value=state.tonalDestination;
 const previous=$('manualDestination').value;$('manualDestination').replaceChildren(...Object.keys(KEYS).map(k=>new Option(k,k)));$('manualDestination').value=KEYS[previous]?previous:choices[0];
 $('destinationLabel').hidden=state.mode==='write'||state.modulationMode==='off';$('returnLabel').hidden=$('destinationLabel').hidden;
 const modulation=$('tonalKind').value==='modulation';$('manualDestination').disabled=!modulation;$('tonalConfirm').disabled=!modulation&&$('tonalKind').value!=='extendedTonicization';$('tonalDegree').disabled=modulation;$('tonalFigure').disabled=$('tonalKind').value==='extendedTonicization';
 $('tonalEvents').replaceChildren(...state.tonalEvents.map((e,i)=>{const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button'),notes=noteEvents(),start=notes.findIndex(n=>n.start===e.start),confirm=notes.findIndex(n=>n.start===e.confirmStart);text.textContent=e.kind==='modulation'?`Nota ${start+1}: → ${e.key}; conferma ${confirm+1}`:`Nota ${start+1}: ${e.kind==='extendedTonicization'?'Tonicizzazione estesa di':e.figure||'V/'} ${['I','II','III','IV','V','VI','VII'][e.degree]}${e.kind==='extendedTonicization'?'; fine '+(confirm+1):''}`;remove.textContent='Elimina';remove.className='secondary';remove.onclick=()=>{state.tonalEvents.splice(i,1);rerun()};linkNoteReferences(text);row.append(text,remove);return row}));
}
function renderTonalReading(){const sol=current();$('tonalReading').replaceChildren();if(!sol)return;const title=document.createElement('strong');title.textContent=readingLabel(sol,state.key);$('tonalReading').append(title);for(let i=0;i<sol.length;i++){const c=sol[i];if(c.secondaryDegree===undefined&&!c.tonalEvent&&!c.confirmedKey&&!c.pivot&&!c.tonicizationEvent&&!c.tonicizationEnd)continue;const p=document.createElement('div');p.className=c.secondaryDegree!==undefined?'secondaryReading':'modulationReading';p.textContent=`Nota ${i+1}: `+(c.tonicizationEvent?`Tonicizzazione estesa di ${c.key}, fino alla nota ${c.tonicizationEvent.confirm+1}; tonalità principale ${c.homeKey}`:c.tonicizationEnd?`Fine tonicizzazione di ${c.tonicizationEnd}`:c.secondaryDegree!==undefined?`${label(c)} → ${['I','II','III','IV','V','VI','VII'][c.secondaryDegree]}; tonicizzazione di ${c.key}`:c.tonalEvent?`${c.tonalEvent.from} → ${c.key}. ${c.tonalEvent.reason||'Percorso manuale'}. Conferma alla nota ${c.tonalEvent.confirm+1}.`:c.confirmedKey?c.tonalConfirmationMode==='manual'?`Tonalità confermata: ${c.confirmedKey}; accordo ${label(c)}`:`Risoluzione in ${c.confirmedKey}${c.inv===1?' su I6: conferma debole, lettura anche come tonicizzazione':''}`:`Accordo comune: ${label(c)} in ${c.key} = ${label(c.pivot)} in ${c.pivot.key}`);linkNoteReferences(p);$('tonalReading').append(p)}}
function drawTonalRegions(s,sol,notes,from,to,timeX){
 if(!sol?.some(c=>c.key))return;
 let start=from,home=state.key;for(let i=0;i<notes.length;i++)if(notes[i].start<=from)home=sol[i]?.homeKey||state.key;
 const boundaries=notes.map((e,i)=>({start:e.start,key:sol[i]?.homeKey||state.key})).filter((e,i,all)=>e.start>from&&e.start<to&&e.key!==all[i-1]?.key);boundaries.push({start:to,key:''});
 for(const b of boundaries){const x=timeX(start),end=timeX(b.start);s.append(node('line',{x1:x+4,x2:end-4,y1:42,y2:42,class:'tonalRegionLine'}));s.append(node('text',{x:x+8,y:32,class:'tonalKeyText'},home));start=b.start;home=b.key}
 notes.forEach((e,i)=>{if(e.start<from||e.start>=to)return;const c=sol[i],x=timeX(e.start);if(c?.tonicizationEvent){const end=notes[c.tonicizationEvent.confirm]?.start??e.start;s.append(node('line',{x1:x,x2:timeX(Math.min(end,to)),y1:55,y2:55,class:'tonicizationBracket'}));s.append(node('text',{x,y:19,class:'tonicizationText'},`Tonicizzazione di ${c.key}`))}if(c?.confirmedKey)s.append(node('text',{x,y:368,class:'tonalConfirmation'},c.tonalConfirmationMode==='manual'?'Tonalità confermata':c.inv===1?'I6 · conferma debole':'Cadenza di conferma'));if(c?.pivot)s.append(node('text',{x,y:351,class:'tonalPivot'},`= ${label(c.pivot)} (${c.pivot.key})`))});
}
function goToNote(i){const e=noteEvents()[i];if(!e)return;state.page=Math.floor(e.start/measureUnits()/PAGE_BARS);state.selected={i,voice:0,whole:true};render();const target=$('staff').querySelector?.(`[data-note-index="${i}"]`);(target||$('staff')).scrollIntoView?.({block:'center',inline:'center',behavior:'smooth'});if(state.playing)playFrom(e.start)}
function linkNoteReferences(el){const text=el.textContent,parts=[];let cursor=0;const re=/(?:not[ae]|posizion[ei]|conferma|fine)\s+(\d+)(?:\s*(?:e|→|–|-)\s*(\d+))?/gi;for(const m of text.matchAll(re)){for(const number of [m[1],m[2]].filter(Boolean)){const index=text.indexOf(number,Math.max(cursor,m.index));parts.push(document.createTextNode(text.slice(cursor,index)));const b=document.createElement('button');b.type='button';b.className='noteReference';b.textContent=number;b.setAttribute('aria-label',`Vai alla nota ${number}`);b.onclick=()=>goToNote(Number(number)-1);parts.push(b);cursor=index+number.length}}if(parts.length){parts.push(document.createTextNode(text.slice(cursor)));el.replaceChildren(...parts)}}
function setStatus(msg='',action){const box=$('status');box.textContent=msg;linkNoteReferences(box);if(action){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=action.label;button.onclick=action.run;box.append(button)}}
// Always close the busy state, including a stalled or malformed worker.
function createSolverWorker(onFailure=()=>{}){
 let worker;try{worker=new Worker(new URL('./solver-worker.mjs?v=20261007-cifrature-settime-1',import.meta.url),{type:'module'})}catch{const message='Il motore non può avviarsi in questo browser. Il basso è conservato: ricarica la pagina e riprova.';onFailure(message);setStatus(message);return null}
 const terminate=worker.terminate.bind(worker);
 const timer=setTimeout(()=>{
  if(state.solveWorker!==worker)return;
  state.solveWorker=null;worker.terminate();
  const message='Il calcolo ha superato 90 secondi ed è stato interrotto. Il basso è conservato. Questo non significa che sia impossibile armonizzarlo: prova meno percorsi tonali.';
  onFailure(message);setStatus(message);
  render();
 },90000);
 timer.unref?.();
 worker.terminate=()=>{clearTimeout(timer);return terminate()};
 worker.onmessageerror=()=>{
  if(state.solveWorker!==worker)return;
  state.solveWorker=null;worker.terminate();const message='Risposta del motore non leggibile. Il basso è conservato: riprova “Genera armonizzazioni”.';onFailure(message);setStatus(message);render();
 };
 return worker;
}
function cancelSolve({preserveHarmony=false,quiet=false}={}){if(state.solveWorker&&!quiet)setStatus('Calcolo interrotto. Premi “Genera armonizzazioni” per riprovare.');if(state.harmonyEdit&&!preserveHarmony){state.harmonyEdit=null;renderHarmonyEdit();}if(state.solveWorker){state.solveWorker.terminate();state.solveWorker=null}}
function appendFailureReport(result,args){
 const report=JSON.stringify({version:'2026.10.05-ux-1',input:args,diagnosis:result.diagnosis||result.assessment?.message,trace:result.trace},null,2);
 const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Scarica diagnosi del calcolo';
 button.onclick=()=>download('armonizza-diagnosi.json',new Blob([report],{type:'application/json'}));$('status').prepend(button);
}
function applySolution(tonalResult,args){
 const held=Object.entries(args.harmonicRequests||{}).filter(([,r])=>r.heldCadence==='plagal');if(held.length){tonalResult.solutions=tonalResult.solutions.flatMap(solution=>{let result=solution;for(const [index]of held){const proposal=proposeHeldPlagal({args,solution:result,index:Number(index)})?.proposals?.[0];if(!proposal)return [];result=proposal.solution}return [result]});if(!tonalResult.solutions.length)tonalResult.diagnosis='La cadenza sul basso tenuto non può essere mantenuta con i nuovi vincoli. Rimuovi il vincolo armonico o modifica le voci bloccate.'}
state.solutions=tonalResult.solutions;state.chosen=0;state.manual=false;
  if(!state.solutions.length&&tonalResult.recovery){
   const recovery=tonalResult.recovery;
   setStatus(tonalResult.assessment.message,{label:tonalResult.assessment.recoveryLabel,run:()=>{
    cancelSolve();if(recovery.clearVoiceConstraints){state.locks={};state.harmonicRequests={};state.rhythmLocks={};state.manualNotes={}}
    state.level=recovery.level;$('level').value=String(state.level);applySolution({solutions:recovery.solutions},args);render();save();
   }});appendFailureReport(tonalResult,args);return;
  }

  if(state.solutions.length)setStatus(`${state.solutions.length} ${state.solutions.length===1?'armonizzazione generata':'armonizzazioni generate'} in ${state.key}.`);
  else if(state.bass.length){
   const diagnosis=(state.secondaryEnabled||state.modulationMode!=='off'||state.tonalEvents.length||args.harmonicRequests)?{message:tonalResult.diagnosis||'Nessuna armonizzazione valida per il percorso tonale.'}:tonalResult.assessment||diagnoseNoSolution(args),alternative=diagnosis.alternativeKey,nextLevel=diagnosis.alternativeLevel;
   const action=nextLevel?{label:`Passa al livello ${nextLevel}`,run:()=>{state.level=nextLevel;$('level').value=String(nextLevel);rerun()}}:alternative?{label:`Prova in ${alternative}`,run:()=>{state.mode='write';state.manualMode=true;state.key=alternative;$('key').value=alternative;state.locks={};state.manualNotes={};state.selected=null;rerun()}}:null;
   setStatus(diagnosis.message,action);appendFailureReport(tonalResult,args);
  }else setStatus('Inserisci una o più note nel basso.');

}
function engineArgs(){
 syncBass(); const notes=noteEvents();return {bass:state.bass,key:state.key,level:state.level,locks:state.locks,limit:4,seventhsEnabled:state.seventhsEnabled,allowedSevenths:state.allowedSevenths,durations:notes.map(eventUnits),starts:notes.map(e=>e.start),rhythmLocks:state.rhythmLocks,meter:state.meter,bassSpellings:notes.map(e=>e.spelling||null),secondaryEnabled:state.secondaryEnabled,secondaryTargets:state.secondaryTargets,modulationMode:state.modulationMode,maxModulations:state.maxModulations,tonalEvents:eventsForEngine(),harmonicRequests:Object.keys(state.harmonicRequests).length?Object.fromEntries(notes.flatMap((e,i)=>state.harmonicRequests[e.start]?[[i,state.harmonicRequests[e.start]]]:[])):undefined};
}
function rerun(){
 cancelSolve();if(state.playing)stop();syncBass();
 if(state.deferHarmony){state.solutions=[];state.chosen=0;render();save();setStatus(state.bass.length?'Basso sullo spartito. Premi “Genera armonizzazioni” quando vuoi armonizzarlo.':'Inserisci una o più note nel basso.');return}
 try{
  validTies(state.events);
  if(state.events.some(e=>e.start+eventUnits(e)>(Math.floor(e.start/measureUnits())+1)*measureUnits()))throw Error('Una figura supera la battuta corrente: modifica la metrica o la durata.');
  const notes=noteEvents(),args=engineArgs();
  if(typeof Worker==='function'&&notes.length){
   state.solutions=[];setStatus('Analizzo le alterazioni e i percorsi tonali…');render();save();
   const worker=createSolverWorker();if(!worker){render();return}state.solveWorker=worker;
   worker.onmessage=({data})=>{if(state.solveWorker!==worker)return;if(data.progress){setStatus(data.progress.phase==='diagnosis'?'Controllo i vincoli e le alternative…':`Verifico le disposizioni: nota ${data.progress.note} di ${data.progress.total}…`);return}state.solveWorker=null;worker.terminate();if(data.error){setStatus(data.error);render();return}applySolution(data.result,args);render();save()};
   worker.onerror=()=>{if(state.solveWorker!==worker)return;state.solveWorker=null;worker.terminate();setStatus('Errore nel calcolo. Riprova “Genera armonizzazioni”.');render()};worker.postMessage(args);return;
  }
  applySolution(harmonizeTonal(args),args);
 }catch(e){state.solutions=[];const notes=noteEvents(),index=notes.findIndex(note=>degree(note.midi,state.key)<0);if(index>=0&&!state.secondaryEnabled&&state.modulationMode==='off'&&!state.tonalEvents.length){const ev=notes[index],spelling=noteSpelling(ev.baseMidi??ev.midi,state.key),name=eventName(ev),replacement=[ev.midi-2,ev.midi-1,ev.midi+1,ev.midi+2].find(n=>degree(n,state.key)>=0&&(!spelling||noteSpelling(n,state.key)?.letter===spelling.letter));setStatus(`Nota ${index+1}: ${name} non appartiene a ${state.key}. ${replacement!==undefined?`Per mantenerne il nome, prova ${pitchName(replacement,state.key)}; `:''}altrimenti cambia tonalità o modifica l'alterazione.`)}else setStatus(e.message)}
 render();save();
}
function render(){ mobileUI?.sync(state.manualMode);$('measureToDelete').max=state.measureCount;$('measureToDelete').value=String(Math.min(state.measureCount,state.selectedMeasure!=null?state.selectedMeasure+1:state.measureTarget||1));$('workspaceZoom').value=appearance.get().scoreZoom;renderGeneration();$('fullscreenBpm').value=state.bpm;$('bpm').value=state.bpm;syncPlayButtons(); $('scoreTitle').innerHTML=state.key+' <span>·</span> '+state.meter+' · 4 voci';$('bpmText').textContent=state.bpm+' BPM';$('bpmFoot').textContent=state.bpm;$('meterFoot').textContent=state.meter;$('levelInfo').textContent=levels[state.level];$('loop').textContent='Loop: '+(state.loop?'sì':'no');$('loop').className=state.loop?'active':'secondary';$('loop').setAttribute('aria-pressed',String(state.loop));$('loop').title=state.loop?'Ripetizione attiva':'Attiva ripetizione';$('manualMode').textContent='Scrittura: '+(state.manualMode?'sì':'no');$('manualMode').className=state.manualMode?'active':'secondary';$('generateMode').className=state.mode==='generate'?'active':'';$('writeMode').className=state.mode==='write'?'active':'';$('newBass').hidden=state.mode==='write';$('addNote').hidden=state.mode==='write';const first=state.page*PAGE_BARS+1,last=Math.min(state.measureCount,first+PAGE_BARS-1);$('measureRange').textContent=`Battute ${first}–${last} di ${state.measureCount}`;$('previousMeasures').disabled=state.page===0;$('nextMeasures').disabled=last>=state.measureCount;$('bassEditor').replaceChildren(...noteEvents().map((e,i)=>{let b=document.createElement('button');b.textContent=(i+1)+'. '+eventName(e)+' · '+(durations.find(d=>d[0]===e.duration)?.[2]||e.duration)+(e.dotted?' · puntata':'')+(e.tieNext?' ⌢':'');if(state.selected?.i===i)b.className='active';b.onclick=()=>select(i,0);return b}));renderToolbars();$('resultCount').textContent=state.solutions.length+' '+(state.solutions.length===1?'soluzione':'soluzioni');$('resultSub').textContent=state.manual?'Esercizio modificato · verifica le voci':state.solutions.length?'Scegli una versione e clicca sugli accordi':state.deferHarmony?'Basso importato · scegli quando armonizzare':'Nessun risultato per il basso corrente';$('alternatives').replaceChildren(...state.solutions.map((_,i)=>{let b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');if(i===state.chosen)b.className='active';b.onclick=()=>{if(state.playing)stop();cancelSolve();state.chosen=i;state.selected=null;state.manual=false;render()};return b}));renderStaff();renderHarmonyEdit();renderEditor();renderExplanation();renderTonalReading();renderModulationWizard();$('rules').replaceChildren(...RULES.map(r=>{let div=document.createElement('div');div.className='ruleItem';div.innerHTML=`<strong>${r.title}</strong> · Livello ${r.level}<br>${r.detail}<br>${r.source}, p. ${r.printed} (PDF p. ${r.page}), ${r.section}`;return div}));}
function renderToolbars(){
 const mk=(item,kind)=>{let b=document.createElement('button');b.type='button';b.className=(state.tool.kind===kind&&state.tool.duration===item[0])?'active':'';b.title=item[2];b.setAttribute('aria-label',item[2]);b.innerHTML=`<span class="toolGlyph">${item[1]}</span><span>${item[2]}</span>`;b.onclick=()=>{state.manualMode=true;state.tool.kind=kind;state.tool.duration=item[0];render()};return b};
 $('noteTools').replaceChildren(...durations.map(d=>mk(d,'note')));
 $('restTools').replaceChildren(...rests.map(d=>mk(d,'rest')));
 $('accidentalTools').replaceChildren(...accidentals.map(a=>{let b=document.createElement('button');b.type='button';b.className=state.tool.accidental===a[0]?'active':'';b.title=a[2];b.setAttribute('aria-label',a[2]);b.innerHTML=`<span class="toolGlyph">${a[1]}</span><span>${a[2]}</span>`;b.onclick=()=>{state.manualMode=true;state.tool.accidental=a[0];render()};return b}));
 $('dotTool').textContent='· Punto: '+(state.tool.dotted?'sì':'no');$('dotTool').className=state.tool.dotted?'active':'secondary';
 renderSeventhConfig();renderTonalConfig();
}
function renderSeventhConfig(){
 $('seventhEnabled').checked=state.seventhsEnabled;
 $('seventhFilters').hidden=!state.seventhsEnabled;
 const supported=supportedSevenths(state.key),roman=['I','II','III','IV','V','VI','VII'];
 $('seventhDegrees').replaceChildren(...roman.map((name,root)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=state.allowedSevenths.includes(root)&&supported.includes(root);input.disabled=!supported.includes(root);input.title=input.disabled?'Settima non prevista nel profilo attuale':`Settima di ${name}`;input.onchange=()=>{state.allowedSevenths=input.checked?[...new Set([...state.allowedSevenths,root])]:state.allowedSevenths.filter(n=>n!==root);rerun()};label.append(input,document.createTextNode(name));label.title=input.title;return label}));
}
const svgNS='http://www.w3.org/2000/svg';function node(tag,attrs={},txt=''){let e=document.createElementNS(svgNS,tag);for(let [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(txt)e.textContent=txt;return e}
const letterIndex={Do:0,Re:1,Mi:2,Fa:3,Sol:4,La:5,Si:6};function diatonic(n,spelling=chromaticSpelling(n,state.key)){if(spelling)return spelling.octave*7+letterIndex[spelling.letter];const name=['Do','Do','Re','Mi','Mi','Fa','Fa','Sol','La','La','Si','Si'][((n%12)+12)%12];return (Math.floor(n/12)-1)*7+letterIndex[name]}
function lowStaff(voice){return voice===0||(voice===1&&state.partSpacing==='strette')}
function noteY(n,voice,spelling){return staffY(diatonic(n,spelling),lowStaff(voice))}
function yToMidi(y,voice){const target=staffStep(y,lowStaff(voice));let best=43,bestDiff=99;for(let n=28;n<=96;n++){if(degree(n,state.key)<0)continue;const diff=Math.abs(diatonic(n)-target);if(diff<bestDiff){best=n;bestDiff=diff}}return best}
function drawClef(s,name){const c=CLEFS[name];s.append(node('path',{d:GLYPHS[name].path,transform:`translate(${c.x} ${c.y}) scale(${c.scale})`,class:'clefOutline','aria-label':name==='treble'?'Chiave di violino':'Chiave di basso'}))}
function eventName(e){if(e.spelling){const p=e.spelling;return p.letter+({0:e.accidental==='natural'?'♮':'',1:'♯',2:'𝄪','-1':'♭','-2':'𝄫'})[p.alter]+p.octave}const base=e.baseMidi??e.midi,spelling=noteSpelling(base,state.key);if(!spelling)return chromaticName(e.midi,state.key);if(!e.accidental||e.accidental==='key'||!spelling)return pitchName(base,state.key);return spelling.letter+accSymbol(e.accidental)+spelling.octave}
function manualKey(i,voice){return `${i}:${voice}`}
function clearBass(){resetChromaticReview();cancelSolve();if(state.playing)stop();state.modWizard=null;state.mode='write';state.manualMode=true;state.events=[];state.bass=[];state.measureCount=4;state.page=0;state.solutions=[];state.chosen=0;state.selected=null;state.locks={};state.manualNotes={};state.manual=false;state.tonalEvents=[];state.harmonicRequests={};state.rhythmLocks={};state.harmonyEdit=null;setStatus('Partitura svuotata.');render();save()}
function removeBassEvent(event){if(!event)return;cancelSolve();if(state.playing)stop();const notes=noteEvents(),sol=current(),byStart=new Map(notes.map((e,i)=>[e.start,sol?.[i]])),previous=notes[notes.indexOf(event)-1],oldLocks=state.locks,oldRhythm=state.rhythmLocks,oldManual=state.manualNotes;if(previous?.tieNext)previous.tieNext=false;delete state.harmonicRequests[event.start];state.events=state.events.filter(e=>e!==event);const survivors=noteEvents(),remaining=survivors.map(e=>byStart.get(e.start)),remap=obj=>Object.fromEntries(survivors.flatMap((e,i)=>{const old=notes.indexOf(e);return obj[old]!==undefined?[[i,obj[old]]]:[]}));state.locks=remap(oldLocks);state.rhythmLocks=remap(oldRhythm);state.manualNotes=Object.fromEntries(survivors.flatMap((e,i)=>[0,1,2,3].flatMap(v=>oldManual[manualKey(notes.indexOf(e),v)]?[[manualKey(i,v),oldManual[manualKey(notes.indexOf(e),v)]]]:[])));state.solutions=remaining.length&&remaining.every(Boolean)?[remaining]:[];state.chosen=0;state.selected=null;state.manual=!!state.solutions.length;syncBass();setStatus('Selezione eliminata. Le altre voci e i blocchi restano conservati: verifica i nuovi collegamenti.');render();save()}


function placed(i,voice,fallback){return state.manualNotes[manualKey(i,voice)]||{midi:fallback,duration:'quarter',accidental:'key',kind:'note'}}
function accSymbol(a){return ({sharp:'♯','double-sharp':'𝄪',flat:'♭','double-flat':'𝄫',natural:'♮'})[a]||''}
function durationGlyph(kind,duration){let list=kind==='rest'?rests:durations;return list.find(x=>x[0]===duration)?.[1]||''}
function placeManual(start,y,pitchOverride){
 cancelSolve(); const duration=state.tool.duration,length=eventUnits({duration,dotted:state.tool.dotted}),bar=measureUnits(),end=(Math.floor(start/bar)+1)*bar;
 if(!Number.isInteger(length)){setStatus('Il punto sulla semibiscroma richiede una suddivisione più fine: scegli un altro valore.');return}
 if(start+length>end){setStatus('La figura supera la battuta: scegli una durata più breve o un punto precedente.');return}
 if(state.events.some(e=>e.start<start+length&&e.start+eventUnits(e)>start&&e.start!==start)){setStatus('Spazio occupato: scegli un punto libero nella battuta.');return}
 const baseMidi=pitchOverride??yToMidi(y,0),spelling=noteSpelling(baseMidi,state.key),letter=spelling.letter;
 const alteration={natural:0,sharp:1,'double-sharp':2,flat:-1,'double-flat':-2}[state.tool.accidental];
 const midi=baseMidi+(state.tool.accidental==='key'?0:alteration-spelling.alter);
 const event={spelling:{...spelling,alter:state.tool.accidental==='key'?spelling.alter:alteration},start,duration,dotted:state.tool.dotted,kind:state.tool.kind,accidental:state.tool.accidental,midi,baseMidi,letter};
 delete state.harmonicRequests[start];state.events=state.events.filter(e=>e.start!==start);state.events.push(event);state.events.sort((a,b)=>a.start-b.start);
 state.mode='write';state.locks={};state.manualNotes={};state.solutions=[];state.selected=null;syncBass();ensureMeasures();setStatus(`${state.tool.kind==='rest'?'Pausa':'Nota'} inserita in battuta ${Math.floor(start/bar)+1}. Premi “Genera armonizzazioni” per aggiornare le voci.`);render();save();
}
function drawDurationMark(g,x,y,duration,stemUp){
 const flag=noteFlag(duration,stemUp);if(!flag)return;const yy=y+(stemUp?-1:1)*flagStemLength(duration)*10/7;
 g.append(node('path',{d:flag.path,transform:`translate(${x+(stemUp?HEAD.stem:-HEAD.stem)} ${yy}) scale(${flag.scale*10/7})`,fill:'#111',class:'flag'}));
}
function drawNote(g,x,y,i,voice,item){
 const isWhole=item.duration==='whole'||item.duration==='breve',isHalf=item.duration==='half',stemUp=current()?.[i]?.voices?.length>1?voice===1||voice===3:y>(lowStaff(voice)?STAFF.lower.top+20:STAFF.upper.top+20);
 const accidental=item.printedAccidental??(item.accidental&&item.accidental!=='key'?accSymbol(item.accidental):writtenAccidental(item.midi,item.spelling));
 if(accidental)g.append(node('text',{x:x-24,y:y+6,class:'accidental'},accidental));
 g.append(node('ellipse',{cx:x,cy:y,rx:isWhole?HEAD.wholeRx:HEAD.rx,ry:isWhole?HEAD.wholeRy:HEAD.ry,transform:`rotate(-20 ${x} ${y})`,class:'notehead '+(voice===0?'bass ':'')+(item.duration==='whole'||item.duration==='breve'||isHalf?'hollow ':'')+(state.selected?.i===i&&(state.selected.whole||state.selected.voice===voice)?'selected':'')}));
 if(item.duration!=='whole'&&item.duration!=='breve'){g.append(node('line',{x1:x+(stemUp?HEAD.stem:-HEAD.stem),y1:y,x2:x+(stemUp?HEAD.stem:-HEAD.stem),y2:y+(stemUp?-1:1)*flagStemLength(item.duration)*10/7,class:'stem'}));drawDurationMark(g,x,y,item.duration,stemUp)}
 if(item.dotted)g.append(node('circle',{cx:x+12,cy:dotY(y,lowStaff(voice)),r:1.8,class:'augmentationDot'}));
 if(item.duration==='breve'){g.append(node('line',{x1:x-15,x2:x-15,y1:y-8,y2:y+8,class:'stem'}));g.append(node('line',{x1:x+15,x2:x+15,y1:y-8,y2:y+8,class:'stem'}))}
}
function drawRest(g,x,y,item){
 const names={breve:'breveRest',whole:'wholeRest',half:'halfRest',quarter:'quarterRest',eighth:'eighthRest','16th':'16thRest','32nd':'32ndRest','64th':'64thRest'},glyph=GLYPHS[names[item.duration]],scale=.036;
 const baseline=item.duration==='whole'||item.duration==='breve'?y-10+488*scale:item.duration==='half'?y+268*scale:y+(glyph.bounds[1]+glyph.bounds[3])/2*scale;
 const cx=(glyph.bounds[0]+glyph.bounds[2])/2;
 g.append(node('path',{d:glyph.path,transform:`translate(${x-cx*scale} ${baseline}) scale(${scale})`,class:item.implicit?'restGlyph implicitRest':'restGlyph'}));
 if(item.dotted)g.append(node('circle',{cx:x+12,cy:y-5,r:1.8,class:'augmentationDot'}));
}
function rhythmicValue(value){if(!value)return '0';const gcd=(a,b)=>b?gcd(b,a%b):a,d=gcd(value,64);return `${value/d}/${64/d}`}
function renderSystem(first=state.page*PAGE_BARS,requestedBars=PAGE_BARS){
 $('cursorReadout').textContent='';
 const bar=measureUnits(),bars=Math.min(requestedBars,state.measureCount-first),from=first*bar,to=(first+bars)*bar,allNotes=noteEvents(),visibleRaw=allNotes.filter(e=>e.start>=from&&e.start<to),sol=current(),rawEvents=state.events.filter(e=>e.start>=from&&e.start<to).map(e=>({...e,start:e.start-from})),rawSolutions=sol?visibleRaw.map(e=>sol[allNotes.indexOf(e)]):null,expanded=expandHarmony(rawEvents,rawSolutions),events=expanded.events,solutions=expanded.solutions,visible=events.filter(e=>e.kind==='note');
 const view=engravedSvg({events,solutions,expanded:true,key:state.key,meter:state.meter,measureCount:bars,partSpacing:state.partSpacing,includeDegrees:state.includeFigures,tonalLabels:true,showMeter:first===0,includeFigures:state.includeFigures,continuous:state.scoreLayout==='scroll'},node,SCREEN_SCALE*appearance.get().scoreZoom/100,first),s=view.svg;
 const timeX=t=>{const e=view.events.find(e=>t>=e.start&&t<e.end);if(!e)return view.measures.at(-1).x+view.measures.at(-1).width;const m=view.measures.find(m=>t>=m.start&&t<m.end),next=view.events.find(n=>n.start===e.end&&n.start<m.end),end=next?.x??m.x+m.width-12*10/7;return e.x+(t-e.start)/(e.end-e.start)*(end-e.x);};
 for(const g of view.groups){const local=Number(g.getAttribute('data-index')),voice=Number(g.getAttribute('data-voice')),ev=visible[local],i=allNotes.indexOf(visibleRaw[ev._sourceIndex]);g.setAttribute('data-note-index',i);g.setAttribute('aria-label',`Nota ${i+1}, ${['basso','tenore','contralto','soprano'][voice]}, ${voice===0?eventName(ev):chromaticName(solutions[local].voices[voice],solutions[local].key||state.key)}`);if(state.selected?.i===i&&(state.selected.whole||state.selected.voice===voice)){for(const n of g.children)if(n.tagName==='ellipse'&&(state.selected.segment===undefined||local===visible.findIndex(e=>e._sourceIndex===ev._sourceIndex&&e._cadenceSegment===state.selected.segment)))n.setAttribute('class',n.getAttribute('class')+' selected');}g.onclick=()=>select(i,voice,from+ev.start);g.oncontextmenu=e=>{e.preventDefault();removeBassEvent(ev);};g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i,voice,from+ev.start);}};}
 for(const n of s.children){if(n.getAttribute?.('class')==='chordText'){const local=Number(n.getAttribute('data-index')),i=allNotes.indexOf(visibleRaw[visible[local]._sourceIndex]);n.onclick=()=>select(i,0,from+visible[local].start);n.setAttribute('role','button');n.setAttribute('tabindex','0');n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i,0,from+visible[local].start)}};}if(n.getAttribute?.('class')==='barLabel'){const number=Number(n.getAttribute('data-measure'));n.setAttribute('data-measure-index',first+number-1);const pick=()=>{if(state.harmonyEdit?.kind==='cadence'||state.modWizard){const i=allNotes.findLastIndex(e=>e.start>=from+(number-1)*bar&&e.start<from+number*bar);if(i>=0)select(i,0);else setStatus('Questa battuta non contiene note.');return}if(!state.manualMode)selectMeasure(first+number-1)};n.onclick=pick;n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}};}}
 if(sol?.some(c=>c.tonalEvent||c.tonicizationEvent||c.secondaryDegree!==undefined||c.pivot)){s.setAttribute('viewBox',s.getAttribute('viewBox').replace('0 50 ','0 0 '));drawTonalRegions(s,sol,allNotes,from,to,t=>timeX(t-from));}
 s.onclick=e=>{if((state.manualMode&&!state.harmonyEdit?.selecting)||state.modWizard||e.target?.closest?.('[data-note-index], .chordText, .barLabel'))return;const p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(s.getScreenCTM().inverse()),m=view.measures.find(m=>q.x>=m.x&&q.x<m.x+m.width&&q.y>=m.top-12&&q.y<=m.bottom+24);if(m)selectMeasure(first+Math.floor(m.start/bar));};
 const [beats,den]=state.meter.split('/').map(Number),sub=64/den;
 for(const m of view.measures){for(let beat=1;beat<beats;beat++)s.append(node('line',{x1:timeX(m.start+beat*sub),x2:timeX(m.start+beat*sub),y1:m.bottom+14,y2:m.bottom+24,class:den===8&&beat%3===0?'beatGuide grouped':'beatGuide'}));const written=events.filter(e=>e.start>=m.start&&e.start<m.end).reduce((n,e)=>n+eventUnits(e),0);if(written<bar)s.append(node('text',{x:m.x+m.width-10,y:m.top-19,class:'measureBalance','text-anchor':'end'},`${rhythmicValue(written)} scritti · ${rhythmicValue(bar-written)} in pausa`));}
 if(state.manualMode&&!state.modWizard&&!state.figuresOnly&&!state.harmonyEdit){for(const system of view.systems){const ms=view.measures.filter(m=>m.system===system.index),offset=system.index*180*10/7,hit=node('rect',{x:ms[0].x,y:STAFF.lower.top-57+offset,width:ms.at(-1).x+ms.at(-1).width-ms[0].x,height:137,class:'manualHit','aria-label':'Inserisci nota o pausa nel rigo del basso'});const point=e=>{const p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(s.getScreenCTM().inverse());};const position=p=>{const m=ms.find(m=>p.x>=m.x&&p.x<m.x+m.width)||ms.reduce((a,b)=>Math.abs(a.x-p.x)<Math.abs(b.x-p.x)?a:b),step=Math.min(units[state.tool.duration],8);let best=m.start,diff=Infinity;for(let t=m.start;t<m.end;t+=step){const d=Math.abs(timeX(t)-p.x);if(d<diff){diff=d;best=t;}}return best;};hit.onclick=e=>{const p=point(e);placeManual(from+position(p),p.y-offset);};hit.oncontextmenu=e=>{const p=point(e),nearest=visibleRaw.map(ev=>({ev,x:timeX(ev.start-from),y:noteY(ev.midi,0,ev.spelling)+offset})).filter(n=>Math.abs(n.x-p.x)<13&&Math.abs(n.y-p.y)<14).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(nearest){e.preventDefault();removeBassEvent(nearest.ev);}else{e.preventDefault();const kind=state.tool.kind;state.tool.kind='rest';placeManual(from+position(p),p.y-offset);state.tool.kind=kind;renderToolbars();}};s.append(hit);const preview=node('ellipse',{rx:HEAD.rx,ry:HEAD.ry,class:'cursorNote',visibility:'hidden'});s.append(preview);hit.onpointermove=e=>{const p=point(e),t=position(p),y=noteY(yToMidi(p.y-offset,0),0)+offset;preview.setAttribute('visibility','visible');preview.setAttribute('cx',timeX(t));preview.setAttribute('cy',y);$('cursorReadout').textContent=`Battuta ${first+Math.floor(t/bar)+1} · ${den===8?'croma':'tempo'} ${Math.floor((t%bar)/sub)+1}/${beats} · ${state.tool.kind==='rest'?'pausa':pitchName(yToMidi(p.y-offset,0),state.key)}`;};hit.onpointerleave=()=>{preview.setAttribute('visibility','hidden');$('cursorReadout').textContent='';};}}
 if(!state.manualMode&&!state.modWizard&&!state.harmonyEdit){for(const m of view.measures){const index=first+Math.floor(m.start/bar),hit=node('rect',{x:m.x,y:m.top-12,width:m.width,height:m.bottom-m.top+36,class:state.selectedMeasure===index?'measureHit selectedMeasure':'measureHit','data-measure-index':index});hit.onclick=e=>{e?.stopPropagation?.();selectMeasure(index)};s.insertBefore?s.insertBefore(hit,s.children[0]):s.prepend(hit);}}
 $('staff').replaceChildren(s);return s;
}
function select(i,voice,playStart){if(state.harmonyEdit?.busy)return;state.selectedMeasure=null;if(state.harmonyEdit?.kind==='cadence'&&!state.harmonyEdit.busy){state.selected={i,voice:0};state.harmonyEdit.selecting=false;render();calculateHarmony('cadence');return}if(state.modWizard){selectModulationNote(i,voice);return}const event=noteEvents()[i];if(event)state.page=Math.floor(event.start/measureUnits()/PAGE_BARS);const source=current()?.[i],segment=playStart===undefined?undefined:source?.segments?.findIndex(s=>s.offset===playStart-event?.start);state.selected={i,voice:state.manualMode?voice:0,whole:!state.manualMode,...(segment>=0?{segment}:{})};render();if(state.playing&&event)playFrom(playStart??event.start)}
function pitchSelection(value){
 const sel=state.selected,c=selectedChord(),ev=noteEvents()[sel?.i];if(!sel||!ev||!Number.isInteger(value)||value<0||value>127)return;
 cancelSolve();if(state.playing)stop();
 if(sel.voice===0){ev.midi=value;ev.baseMidi=value;ev.accidental='key';ev.spelling=chromaticSpelling(value,c?.key||state.key);state.locks={};state.rhythmLocks={};state.manualNotes={};rerun();state.selected={i:sel.i,voice:0};render();save();return}
 if(!c)return;c.voices[sel.voice]=value;c.spellings??=c.voices.map(n=>chromaticSpelling(n,c.key||state.key));c.spellings[sel.voice]=chromaticSpelling(value,c.key||state.key);
 const outer=current()[sel.i];if(outer.segments){const segment=sel.segment??0;state.rhythmLocks[sel.i]??={};state.rhythmLocks[sel.i][segment]??={};state.rhythmLocks[sel.i][segment][sel.voice]=value;if(segment===0){outer.voices=c.voices;outer.spellings=c.spellings}}else{state.locks[sel.i]??={};state.locks[sel.i][sel.voice]=value}
 state.manual=true;render();save();
}
function renderEditor(){
 const sel=state.selected,sol=current(),chosen=selectedChord(),evSelected=noteEvents()[sel?.i];if(sel)$('selectionPanel').open=true;
 $('addSeventh').disabled=!canAddSeventh();$('addSeventh').title=sol?.[sel?.i]?.segments?'La cadenza contiene più accordi; aggiungi la settima su un accordo non suddiviso.':'';
 $('addSeventh').textContent=chosen?`Aggiungi settima sulla selezione (${evSelected?eventName(evSelected):'nota'} · ${label(chosen)})`:'Aggiungi settima sulla selezione';
 if(!sel){$('selectionLabel').textContent='—';$('noteEditor').textContent='Seleziona una nota dalla partitura.';return}
 const {i,voice}=sel,ev=noteEvents()[i],n=voice===0?ev?.midi:chosen?.voices[voice];if(!ev){state.selected=null;return}
 $('selectionLabel').textContent=`${sel.whole?'Accordo '+(chosen?label(chosen):''):['Basso','Tenore','Contralto','Soprano'][voice]} · posizione ${i+1}${sol?.[i]?.segments?' · accordo '+((sel.segment??0)+1)+' della cadenza':''}`;
 const wrap=document.createElement('div');wrap.className='editRow';const selectEl=document.createElement('select'),lo=voice===0?28:voice===1?48:voice===2?55:60,hi=voice===0?72:voice===1?67:voice===2?74:81;
 for(let p=lo;p<=hi;p++)if(degree(p,chosen?.key||state.key)>=0||state.secondaryEnabled||state.modulationMode!=='off'||state.tonalEvents.length)selectEl.add(new Option(chromaticName(p,chosen?.key||state.key),String(p)));
 if(n!==undefined&&!Array.from(selectEl.options).some(o=>Number(o.value)===n))selectEl.add(new Option(chromaticName(n,chosen?.key||state.key),String(n)));
 if(n!==undefined)selectEl.value=String(n);selectEl.onchange=()=>pitchSelection(Number(selectEl.value));wrap.append(selectEl);
 if(voice===0){const dot=document.createElement('button');dot.textContent=ev.dotted?'· Togli punto':'· Aggiungi punto';dot.className='secondary';dot.onclick=()=>{const old=ev.dotted;ev.dotted=!old;try{fillMeasures(state.events,state.meter);rerun()}catch(error){ev.dotted=old;setStatus(error.message)}};wrap.append(dot)}
 if(voice>0&&sol){const rhythmic=!!sol[i].segments,segment=sel.segment??0,locks=rhythmic?state.rhythmLocks[i]?.[segment]:state.locks[i],locked=locks?.[voice]!==undefined,btn=document.createElement('button');btn.textContent=locked?'◈ Bloccata':'◇ Blocca';btn.className=locked?'active':'secondary';btn.onclick=()=>{cancelSolve();if(rhythmic){state.rhythmLocks[i]??={};state.rhythmLocks[i][segment]??={}}else state.locks[i]??={};const target=rhythmic?state.rhythmLocks[i][segment]:state.locks[i];if(locked)delete target[voice];else target[voice]=selectedChord().voices[voice];render();save()};wrap.append(btn)}
 else if(voice===0){const btn=document.createElement('button');btn.textContent='Elimina';btn.className='secondary';btn.onclick=()=>removeBassEvent(ev);wrap.append(btn)}
 $('noteEditor').replaceChildren(wrap);if(voice>0){const btn=document.createElement('button');btn.textContent='Ricalcola le altre voci';btn.className='secondary';btn.style.marginTop='12px';btn.onclick=rerun;$('noteEditor').append(btn)}
}
function renderExplanation(){
 const sel=state.selected,sol=current();if(!sel||!sol){$('chordLabel').textContent='—';$('explain').textContent='Seleziona un accordo per vedere le regole e i riferimenti.';return}
 const c=sel.segment===undefined?sol[sel.i]:selectedChord(),preceding=sel.segment>0?sol[sel.i].segments[sel.segment-1]:sol[sel.i-1],figure=c.seventh?['stato fondamentale','primo rivolto','secondo rivolto','terzo rivolto'][c.inv]:['stato fondamentale','primo rivolto','secondo rivolto'][c.inv];
 $('chordLabel').textContent=c.segments?.length?c.segments.map(label).join(' → '):label(c);
 const refs=[RULES.find(x=>x.id==='legame')];if(c.octaveRule)refs.push(RULES.find(x=>x.id==='ottava_discendente'));if(c.secondaryDegree!==undefined||c.tonicizedDegree!==undefined)refs.push(TONAL_RULES[0]);if(c.tonalEvent||c.confirmedKey||c.pivot)refs.push(TONAL_RULES[2]);
 if(c.seventh){refs.push(RULES.find(x=>x.id==='settima'));refs.push(RULES.find(x=>x.id=== (c.root===4?'rivolti_settima':'settime_artificiali')));if(c.root!==4)refs.push(RULES.find(x=>x.id==='settime_gradi'))}
 else if(c.inv===1)refs.push(RULES.find(x=>x.id==='primo_rivolto'));
 else if(c.inv===2)refs.push(RULES.find(x=>x.id==='quarta_sesta'));
 if(preceding?.root===1&&c.root===4)refs.push(RULES.find(x=>x.id==='ii_v'));
 if(preceding?.root===4&&c.root===5)refs.push(RULES.find(x=>x.id==='v_vi'));
 if((preceding?.root===4&&c.root===0)||(preceding?.root===3&&c.root===0)||((preceding?.root===1||preceding?.root===3)&&c.root===4))refs.push(RULES.find(x=>x.id==='cadenze'));
 if(c.root===4||preceding&&c.voices.some((_,v)=>bachResolution(preceding,c,v,preceding.key||state.key)))refs.push(RULES.find(x=>x.id==='sensibile'));
 if(c.voices.some((n,v)=>v>0&&n===c.voices[v-1]))refs.push(RULES.find(x=>x.id==='unisono'));
 const exceptional=preceding?c.voices.map((_,v)=>bachResolution(preceding,c,v,preceding.key||state.key)?['basso','tenore','contralto','soprano'][v]:null).filter(Boolean):[];
 const prior=sol[sel.i-2],cadence=preceding?.root===4&&c.root===0?` Collegamento ${prior?.root===1?'II–V–I':prior?.root===3?'IV–V–I':'V–I'}.`:preceding?.root===3&&c.root===0?' Collegamento IV–I.':'';
 const lead=document.createElement('span');lead.textContent=`${c.segments?.length?'Cadenza '+c.segments.map(label).join(' → ')+': basso tenuto, voci superiori con durate indipendenti. ':''}${label(c)}: ${c.seventh?'accordo di settima':'triade'} in ${figure} sopra ${chromaticName(c.voices[0],c.key||state.key)}.${cadence}${exceptional.length?` La sensibile nel ${exceptional.join(' e ')} scende di terza, compensata dalla sopratonica che raggiunge la tonica in una voce superiore (eccezione di Bach).`:''}${c.secondaryDegree!==undefined?` Dominante secondaria di ${['I','II','III','IV','V','VI','VII'][c.secondaryDegree]}: sensibile e settima risolvono rispetto a ${c.key}.`:''}${c.tonalEvent?` Passaggio da ${c.tonalEvent.from} a ${c.tonalEvent.key}; conferma richiesta alla nota ${c.tonalEvent.confirm+1}.`:''}${c.confirmedKey?` ${c.tonalConfirmationMode==='manual'?'Tonalità confermata':'Risoluzione nella regione'}: ${c.confirmedKey}.`:''}${c.pivot?` Accordo comune: ${label(c)} in ${c.key}, ${label(c.pivot)} in ${c.pivot.key}.`:''}`;linkNoteReferences(lead);$('explain').replaceChildren(lead,...refs.map(r=>{const d=document.createElement('div');d.className='ruleRef';d.textContent=`${r.title} · ${r.source}, p. ${r.printed} (PDF p. ${r.page}), ${r.section}`;return d}));
}
$('key').onchange=e=>{state.key=e.target.value;state.tonalEvents=[];state.harmonicRequests={};state.rhythmLocks={};state.tonalDestination='';state.locks={};state.manualNotes={};state.selected=null;if(state.mode==='generate'&&!generateCurrentBass()){state.solutions=[];render();save();return}rerun()};
$('secondaryEnabled').onchange=e=>{state.secondaryEnabled=e.target.checked;if(!state.secondaryEnabled)state.tonalEvents=state.tonalEvents.filter(e=>e.kind==='modulation');if(state.secondaryEnabled&&state.level<2){state.level=2;$('level').value='2'}rerun()};
$('modulationMode').onchange=e=>{state.modulationMode=e.target.value;if(state.modulationMode==='off')state.tonalEvents=state.tonalEvents.filter(e=>e.kind!=='modulation');if(state.modulationMode!=='off'&&state.level<3){state.level=3;$('level').value='3'}rerun();if(state.modulationMode==='auto')detectChromaticReview(false)};
$('tonalDestination').onchange=e=>{state.tonalDestination=e.target.value;save()};
$('maxModulations').onchange=e=>{state.maxModulations=Number(e.target.value);rerun()};
$('returnHome').onchange=e=>{state.returnHome=e.target.checked;save()};
$('tonalKind').value='tonicization';$('tonalKind').onchange=()=>renderTonalConfig();
$('tonalIndex').onchange=()=>goToNote(Number($('tonalIndex').value)-1);$('tonalConfirm').onchange=()=>goToNote(Number($('tonalConfirm').value)-1);
$('useSelectedTonal').onclick=()=>{if(!state.selected){setStatus('Seleziona prima una nota nel pentagramma.');return}$('tonalIndex').value=String(state.selected.i+1);$('tonalConfirm').value=String(Math.min(noteEvents().length,state.selected.i+3));renderTonalConfig()};
$('addTonalEvent').onclick=()=>{
 const notes=noteEvents(),index=Number($('tonalIndex').value)-1,kind=$('tonalKind').value;
 if(!Number.isInteger(index)||!notes[index]){setStatus('Scegli una nota di inizio presente nel basso.');return}
 let event={kind,start:notes[index].start};if(kind==='extendedTonicization'){const confirm=Number($('tonalConfirm').value)-1;if(!Number.isInteger(confirm)||confirm<=index||!notes[confirm]){setStatus('Scegli una nota finale successiva per la tonicizzazione estesa.');return}event.confirmStart=notes[confirm].start;}
 if(kind==='modulation'){
  const confirm=Number($('tonalConfirm').value)-1;if(!Number.isInteger(confirm)||confirm<=index||!notes[confirm]){setStatus('La conferma deve essere una nota successiva presente nel basso.');return}
  event={...event,key:$('manualDestination').value,confirmStart:notes[confirm].start,figure:$('tonalFigure').value};if(event.figure&&/[7342]|65/.test(event.figure)){state.seventhsEnabled=true;state.allowedSevenths=[...new Set([...state.allowedSevenths,4])]}
  const before=[...state.tonalEvents].filter(e=>e.kind==='modulation'&&e.start<event.start).sort((a,b)=>a.start-b.start).at(-1)?.key||state.key;
  if(!closeKeys(before).includes(event.key)){setStatus(`${event.key} non è un tono vicino di ${before}.`);return}
  state.modulationMode='manual';if(state.level<3){state.level=3;$('level').value='3'}
 }else{
  if(!notes[index+1]){setStatus('Serve una nota successiva sulla quale risolvere la dominante secondaria.');return}
  event.degree=Number($('tonalDegree').value);event.figure=kind==='extendedTonicization'?'':$('tonalFigure').value;if(kind==='extendedTonicization'&&state.level<3){state.level=3;$('level').value='3'}state.secondaryTargets=[...new Set([...state.secondaryTargets,event.degree])];if(event.figure&&/[7342]|65/.test(event.figure)){state.level=3;$('level').value='3';state.seventhsEnabled=true;state.allowedSevenths=[...new Set([...state.allowedSevenths,4])]}state.secondaryEnabled=true;if(state.level<2){state.level=2;$('level').value='2'}
 }
 state.tonalEvents=state.tonalEvents.filter(e=>e.start!==event.start);state.tonalEvents.push(event);state.tonalEvents.sort((a,b)=>a.start-b.start);rerun();
};
$('partSpacing').onchange=e=>{state.partSpacing=e.target.value==='late'?'late':'strette';render();save()};
$('meter').onchange=e=>{const before=state.meter,next=e.target.value;if(!validMeter(next)){setStatus('Metrica non valida.');$('meter').value=before;$('generateMeter').value=before;return}if(state.mode==='write'){try{fillMeasures(state.events,next,state.measureCount)}catch(error){$('meter').value=before;$('generateMeter').value=before;setStatus('Metrica non applicata: '+error.message+' Le note restano invariate.');return}}state.meter=next;state.selected=null;state.locks={};state.rhythmLocks={};state.manualNotes={};if(state.mode==='generate'){if(!generateCurrentBass()){state.meter=before;$('meter').value=before;$('generateMeter').value=before;return}}else ensureMeasures();rerun()};
$('generateMode').onclick=()=>{if(state.mode==='generate')return;const previousMode=state.mode;state.harmonicRequests={};state.rhythmLocks={};state.mode='generate';state.manualMode=false;if(!generateCurrentBass()){state.mode=previousMode;state.manualMode=previousMode==='write';render();return}state.locks={};state.manualNotes={};state.selected=null;rerun()};
$('writeMode').onclick=()=>{if(state.mode==='write')return;state.mode='write';state.manualMode=true;state.events=[];state.tonalEvents=[];state.harmonicRequests={};state.rhythmLocks={};state.measureCount=4;state.page=0;state.solutions=[];state.locks={};state.manualNotes={};state.selected=null;rerun()};
initImport({onStatus:setStatus,onInternalPaste:pasteSelection,hasInternalClipboard:()=>!!state.clipboard,onInsert:source=>{
 resetChromaticReview();cancelSolve();if(state.playing)stop();state.mode='write';state.manualMode=true;state.deferHarmony=true;state.key=source.key;state.meter=source.meter;state.tonalEvents=[];state.harmonicRequests={};state.rhythmLocks={};
 if(![...$('meter').options].some(option=>option.value===source.meter))$('meter').add(new Option(source.meter,source.meter));
 $('key').value=state.key;$('meter').value=state.meter;state.events=source.events.map(e=>({...e}));state.measureCount=Math.max(4,source.measureCount);state.page=0;state.selected=null;state.locks={};state.manualNotes={};state.solutions=[];state.chosen=0;state.manual=false;syncBass();render();save();
 setStatus(`Importato ${source.name}: ${noteEvents().length} note, ${state.meter}, ${state.key}. Il basso è sullo spartito: scegli tu se armonizzarlo o aggiungere modulazioni.`);
}});
document.addEventListener('copy',e=>{if(!state.selected||e.target?.closest?.('input,textarea,[contenteditable]')||!$('importPanel').hidden)return;copySelection();if(e.clipboardData){e.preventDefault();e.clipboardData.setData('application/x-armonizza','selection');e.clipboardData.setData('text/plain','Armonizza: selezione musicale')}});
$('level').onchange=e=>{state.level=Number(e.target.value);if(state.level<3)state.seventhsEnabled=false;state.locks={};rerun()};
$('seventhEnabled').onchange=e=>{state.seventhsEnabled=e.target.checked;if(state.seventhsEnabled&&state.level<3){state.level=3;$('level').value='3'}state.locks={};rerun()};
function changeBpm(e){const n=Number(e.target.value);if(!Number.isFinite(n)||n<48||n>160)return;state.bpm=n;render();save();if(state.playing)playFrom(state.playUnit||0)}
$('bpm').oninput=changeBpm;$('fullscreenBpm').onchange=changeBpm;
$('newBass').onclick=()=>{state.harmonicRequests={};state.rhythmLocks={};state.variation++;if(!generateCurrentBass())return;state.locks={};state.manualNotes={};state.selected=null;rerun()};
$('addNote').onclick=()=>{const bar=measureUnits(),duration=Object.keys(units).find(d=>units[d]<=Math.min(16,bar)),length=units[duration];let last=Math.max(0,...state.events.map(e=>e.start+eventUnits(e)));if(last%bar+length>bar)last=Math.ceil(last/bar)*bar;state.events.push({start:last,midi:state.bass.at(-1)??48,kind:'note',duration,accidental:'key'});state.locks={};ensureMeasures();state.page=Math.floor(last/measureUnits()/PAGE_BARS);rerun()};
$('solve').onclick=()=>{state.deferHarmony=false;rerun()};function toggleWriting(){state.selectedMeasure=null;state.manualMode=!state.manualMode;if(state.selected)state.selected.whole=!state.manualMode;render();setStatus(state.manualMode?'Scrittura attiva · N per disattivare.':'Selezione accordi · N per scrivere.')} $('manualMode').onclick=toggleWriting;
document.addEventListener('keydown',e=>{
 if(!$('importPanel').hidden||e.target?.closest?.('input,select,textarea,[contenteditable]'))return;
 const shortcut=e.ctrlKey||e.metaKey;
 if(!shortcut&&!e.altKey&&!e.repeat&&e.key.toLowerCase()==='n'){e.preventDefault();toggleWriting();return}
 if(shortcut&&!e.altKey&&e.key.toLowerCase()==='c'){if(state.selected){copySelection()}return}
 if(shortcut&&!e.altKey&&e.key.toLowerCase()==='v')return;
 if(!shortcut&&!e.altKey&&(e.key==='Backspace'||e.key==='Delete')&&!state.manualMode&&state.selectedMeasure!=null){e.preventDefault();removeSelectedMeasure();return}
 if(!shortcut&&!e.altKey&&(e.key==='Backspace'||e.key==='Delete')&&state.selected){e.preventDefault();removeBassEvent(noteEvents()[state.selected.i]);return}
 const numeric=numberDuration(e,appearance.get().numberShortcuts);if(numeric){e.preventDefault();state.tool.duration=numeric;state.tool.kind='note';state.manualMode=true;render();return}
 if(state.modWizard)return;
 if(!state.manualMode||e.ctrlKey||e.metaKey||e.altKey||e.repeat||!/[a-g]/i.test(e.key)||e.key.length!==1)return;
 if(e.target?.closest?.('input,select,textarea,[contenteditable]'))return;
 e.preventDefault();const letters={a:'La',b:'Si',c:'Do',d:'Re',e:'Mi',f:'Fa',g:'Sol'},letter=letters[e.key.toLowerCase()];
 const previous=noteEvents().at(-1),anchor=previous?.midi??48;
 const candidates=[];for(let n=35;n<=67;n++)if(noteSpelling(n,state.key)?.letter===letter)candidates.push(n);
 if(!candidates.length){setStatus(`La nota ${letter} non è disponibile nella tonalità selezionata.`);return}
 const midi=candidates.sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor)||a-b)[0];
 const bar=measureUnits(),length=eventUnits({duration:state.tool.duration,dotted:state.tool.dotted});
 if(!Number.isInteger(length)){setStatus('Questo valore puntato non è disponibile.');return}
 let start=Math.max(0,...state.events.map(ev=>ev.start+eventUnits(ev)));
 if(start+length>(Math.floor(start/bar)+1)*bar)start=(Math.floor(start/bar)+1)*bar;
 state.tool.kind='note';state.page=Math.floor(start/bar/PAGE_BARS);placeManual(start,noteY(midi,0),midi);
});
$('clearAll').onclick=clearBass;
$('dotTool').onclick=()=>{state.tool.dotted=!state.tool.dotted;render()};
$('tieTool').onclick=()=>{const notes=noteEvents(),i=state.selected?.i,ev=notes[i];if(!ev){setStatus('Seleziona prima la nota da legare.');return}if(!ev.tieNext){const next=notes[i+1];if(!next||next.start!==ev.start+eventUnits(ev)||next.midi!==ev.midi){setStatus('Per la legatura servono due note della stessa altezza e consecutive, anche attraverso la stanghetta.');return}}ev.tieNext=!ev.tieNext;rerun()};
$('addMeasure').onclick=()=>{state.measureCount++;state.measureTarget=state.measureCount;state.page=Math.floor((state.measureCount-1)/PAGE_BARS);render();save();setStatus('Battuta '+state.measureCount+' aggiunta.');$('staff').querySelector?.('[data-measure-index="'+(state.measureCount-1)+'"]')?.scrollIntoView?.({block:'nearest',inline:'nearest'})};
$('measureToDelete').oninput=e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=state.measureCount)state.measureTarget=n};
$('removeMeasure').onclick=()=>{const n=Number($('measureToDelete').value);if(!Number.isInteger(n)||n<1||n>state.measureCount){setStatus('Scegli una battuta da 1 a '+state.measureCount+'.');return}state.selectedMeasure=n-1;state.measureTarget=Math.max(1,n-1);removeSelectedMeasure()};
$('previousMeasures').onclick=()=>{state.page=Math.max(0,state.page-1);render();save()};
$('nextMeasures').onclick=()=>{state.page=Math.min(Math.floor((state.measureCount-1)/PAGE_BARS),state.page+1);render();save()};
function verify(){
 const sol=current();if(!sol){$('feedback').textContent='Genera prima una soluzione.';return}
 if(sol.some(c=>c.segments?.length)){const expanded=expandHarmony(state.events,sol),chords=expanded.solutions;const errors=[];chords.forEach((c,i)=>{const valid=candidateForVoices(c.voices,c.key||state.key,3,{pedalCadence:!!c.pedalCadence,seventhsEnabled:state.seventhsEnabled,allowedSevenths:state.allowedSevenths});if(!valid)errors.push(`Accordo ${i+1}: disposizione non valida.`);for(const id of tonalIssues(chords[i-1],c,state.key,3))errors.push(`Accordo ${i+1}: ${id}.`)});$('feedback').textContent=errors.length?errors.join('\n'):'Nessuna violazione rilevata dalle regole implementate. Verificati anche tutti gli accordi sul basso tenuto.';$('feedback').className=errors.length?'error':'ok';return}
 const errs=[],options={seventhsEnabled:state.seventhsEnabled,allowedSevenths:state.allowedSevenths};
 const [beats,denominator]=state.meter.split('/').map(Number),minimumPreparationUnits=denominator===8&&beats%3===0?24:64/denominator;
 const events=noteEvents();
 for(let i=0;i<sol.length;i++){
  const contextual=state.secondaryEnabled||state.modulationMode!=='off'||state.tonalEvents.length;const recandidate=j=>contextual?tonalCandidates(sol[j].voices[0],sol[j].tonicizedDegree!==undefined?sol[j].key:sol[j].homeKey||state.key,state.level,{}, {...options,secondaryEnabled:true,secondaryTargets:state.secondaryTargets},sol[j+1]?.voices[0]).find(c=>c.voices.every((n,v)=>n===sol[j].voices[v])&&c.root===sol[j].root&&c.inv===sol[j].inv&&c.seventh===sol[j].seventh&&c.key===sol[j].key):candidateForVoices(sol[j].voices,state.key,state.level,options);const c=recandidate(i);
  if(!c){errs.push(`Posizione ${i+1}: accordo, raddoppio o disposizione non validi per il livello.`);continue}
  const previous=i?recandidate(i-1):null;
  for(const id of (contextual?tonalIssues:issues)(previous,c,state.key,state.level,{preparationUnits:events[i-1]&&eventUnits(events[i-1]),minimumPreparationUnits}))
   errs.push(`Posizione ${i+1}: ${({'quinte_parallele':'quinte parallele','ottave_parallele':'ottave parallele','quinta_nascosta':'quinta nascosta','ottava_nascosta':'ottava nascosta','sensibile_irrisolta':'sensibile irrisolta','settima_irrisolta':'settima irrisolta','settima_non_preparata':'settima non preparata','settima_senza_risoluzione_armonica':'risoluzione armonica della settima','quarta_sesta_irrisolta':'quarta e sesta irrisolta','quarta_sesta_non_preparata':'quarta e sesta non preparata','ii_v':'collegamento II–V','v_vi_raddoppio':'raddoppio V–VI','dominante_sottodominante':'V–IV','dominante_secondaria_senza_bersaglio':'dominante secondaria senza risoluzione sul grado bersaglio','falsa_relazione':'alterazione cromatica tra voci diverse'}[id]||id)}.`);
 }
 const div=$('feedback');div.replaceChildren();
 if(!errs.length){div.textContent='Nessuna violazione rilevata dalle regole implementate.';div.className='ok';return}
 div.className='error';for(const msg of errs){const p=document.createElement('div');p.textContent=msg;linkNoteReferences(p);div.append(p)}
 const b=document.createElement('button');b.textContent='Proponi correzione';b.className='secondary';b.style.marginTop='12px';b.onclick=rerun;div.append(b)
}
$('verify').onclick=()=>{$('correctionPanel').open=true;verify()};
let playbackEpoch=0;
function syncPlayButtons(){for(const id of ['play','fullscreenPlay']){$(id).textContent=state.playing?'Ⅱ Pausa':'▶ Ascolta';$(id).setAttribute('data-playing',String(state.playing));$(id).title=state.playing?'Pausa':'Ascolta'}}
function stop(){playbackEpoch++;state.playing=false;if(playTimer)clearTimeout(playTimer);playTimer=null;piano.stop();syncPlayButtons()}
$('stop').onclick=stop;
$('loop').onclick=()=>{state.loop=!state.loop;render()};
async function playFrom(start=0){
 stop();const epoch=playbackEpoch;
 const sol=current(),notes=noteEvents(),effective=sol?.map((c,i)=>c.segments?c:{...c,voices:c.voices.map((n,v)=>{const p=placed(i,v,n);return p.kind==='rest'?undefined:p.midi})}),sounds=soundingNotes(state.events,effective).filter(s=>s.start+s.length>start).map(s=>({...s,length:s.length-Math.max(0,start-s.start),start:Math.max(start,s.start)})),end=Math.max(start,...state.events.map(e=>e.start+eventUnits(e))),times=[...new Set([start,...state.events.filter(e=>e.start>=start).map(e=>e.start),...sounds.map(s=>s.start)])].sort((a,b)=>a-b);
 if(!state.events.length||start>=end){setStatus('Scrivi prima una nota.');return}
 state.playing=true;syncPlayButtons();$('play').textContent='Carico il pianoforte…';setStatus('Caricamento dei campioni di pianoforte…');
 try{await piano.load();await piano.resume()}
 catch(error){if(epoch!==playbackEpoch)return;stop();setStatus('Impossibile caricare il pianoforte. Riprova aggiornando la pagina.');console.error(error);return}
 if(!state.playing||epoch!==playbackEpoch)return;
 setStatus('');syncPlayButtons();let i=0;
 const tick=()=>{if(!state.playing||epoch!==playbackEpoch)return;if(i===times.length){if(!state.loop){stop();return}i=0}const at=times[i];state.playUnit=at;for(const sound of sounds.filter(s=>s.start===at))piano.chord([sound.midi],sound.length/16*60/state.bpm);const next=times[i+1]??end;i++;playTimer=setTimeout(tick,(next-at)*60000/(state.bpm*16));};tick();
}
$('play').onclick=$('fullscreenPlay').onclick=()=>state.playing?stop():playFrom();
function download(name,blob){let a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function openExport(format){$('exportMenu').open=true;state.exportFormat=format;$('exportTitle').textContent=format==='pdf'?'Esporta spartito PDF':'Esporta per MuseScore (MusicXML)';$('exportDegrees').checked=state.exportDegrees??state.includeFigures;$('pdfDensityOptions').hidden=format!=='pdf';$('pdfSystemsPerPage').value=String(state.pdfSystemsPerPage||4);$('exportOptions').hidden=false}
$('musicxml').onclick=()=>openExport('musicxml');
$('midi').onclick=()=>download('armonizzazione.mid',new Blob([midiBytes({events:state.events,solutions:current(),bpm:state.bpm})],{type:'audio/midi'}));
$('pdf').onclick=()=>openExport('pdf');
$('cancelExport').onclick=()=>{$('exportOptions').hidden=true;state.exportFormat=null};
$('confirmExport').onclick=async()=>{const format=state.exportFormat;if(!format)return;const button=$('confirmExport');button.disabled=true;state.exportDegrees=$('exportDegrees').checked;state.pdfSystemsPerPage=Number($('pdfSystemsPerPage').value||4);save();setStatus('Preparazione dello spartito…');try{const options={events:state.events,solutions:current(),key:state.key,meter:state.meter,measureCount:state.measureCount,partSpacing:state.partSpacing,includeDegrees:state.exportDegrees,...(format==='pdf'?{systemsPerPage:state.pdfSystemsPerPage}:{})},bytes=format==='pdf'?await scorePdf(options):musicXML(options),blob=new Blob([bytes],{type:format==='pdf'?'application/pdf':'application/vnd.recordare.musicxml+xml'}),saved=await download(format==='pdf'?'armonizzazione-completa.pdf':'armonizzazione.musicxml',blob);if(saved!==false){setStatus(`${format==='pdf'?'PDF':'MusicXML'} esportato ${state.exportDegrees?'con':'senza'} gradi.`);$('exportOptions').hidden=true;state.exportFormat=null}}catch(error){setStatus(`Esportazione: ${error.message}`)}finally{button.disabled=false}};

const compactScreen=globalThis.matchMedia?.('(max-width:900px)');if(compactScreen){$('sidebarTools').open=!compactScreen.matches;compactScreen.addEventListener?.('change',e=>{$('sidebarTools').open=!e.matches})}
if(state.manual&&current())render();else rerun();

function renderStaff(first,requestedBars){
 if(first!==undefined)return renderSystem(first,requestedBars);
 $('clearHarmonyRequests').hidden=!Object.keys(state.harmonicRequests).length;$('scoreLayout').value=state.scoreLayout;$('figuresOnly').textContent='Cifratura: '+(state.includeFigures?'visibile':'nascosta');$('figuresOnly').setAttribute('aria-pressed',String(state.includeFigures));$('figuresOnly').className=state.includeFigures?'active':'secondary';
 $('previousMeasures').hidden=state.scoreLayout!=='paged';$('nextMeasures').hidden=state.scoreLayout!=='paged';
 $('scoreWrap').className='scoreWrap layout-'+state.scoreLayout;
 if(state.scoreLayout==='paged')return renderSystem();
 $('measureRange').textContent=`Tutte le ${state.measureCount} battute`;
 if(state.scoreLayout==='scroll')return renderSystem(0,state.measureCount);
 const pages=[];let page,systems=0;
 const groups=scoreLayout({events:state.events,solutions:current(),key:state.key,meter:state.meter,measureCount:state.measureCount,partSpacing:state.partSpacing}).systems;let m=0;
 for(const group of groups){if(systems%4===0){page=document.createElement('div');page.className='scorePage';const title=document.createElement('div');title.className='pageTitle';title.textContent=`${state.key} · ${state.meter} · Pagina ${pages.length+1}`;page.append(title);pages.push(page);}page.append(renderSystem(m,group.length));m+=group.length;systems++;}
 $('staff').replaceChildren(...pages);$('scoreWrap').style.setProperty?.('--page-scale',appearance.get().scoreZoom/100);if($('workspaceZoom'))$('workspaceZoom').value=appearance.get().scoreZoom;
}
$('scoreLayout').onchange=e=>{state.scoreLayout=e.target.value;render();save()};
$('figuresOnly').onclick=()=>{state.includeFigures=!state.includeFigures;render();save()};
function moveNotationToolbar(fullscreen){const toolbar=$('notationToolbar'),ops=$('operationsToolbar'),header=$('referenceHeader');if(fullscreen){const view=$('scoreView');view.prepend(toolbar);view.prepend(ops);view.prepend(header)}else{$('notationToolbarHome').append(toolbar);$('operationsHome').append(ops);$('app').prepend(header)}}
$('fullscreenScore').onclick=async()=>{const view=$('scoreView');if(document.fullscreenElement){await document.exitFullscreen();moveNotationToolbar(false);return}if(state.fullscreenFallback){state.fullscreenFallback=false;view.className='scoreView';moveNotationToolbar(false);$('fullscreenScore').setAttribute('aria-label','Schermo intero');return}state.scoreLayout='pages';render();save();moveNotationToolbar(true);try{if(!view.requestFullscreen)throw Error();await view.requestFullscreen()}catch{state.fullscreenFallback=true;view.className='scoreView fullscreenFallback'}$('fullscreenScore').setAttribute('aria-label','Esci da schermo intero')};
document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;moveNotationToolbar(full);$('fullscreenScore').setAttribute('aria-label',full?'Esci da schermo intero':'Schermo intero')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.fullscreenFallback){state.fullscreenFallback=false;$('scoreView').className='scoreView';moveNotationToolbar(false);$('fullscreenScore').setAttribute('aria-label','Schermo intero')}});
function renderHarmonyEdit(){
 const edit=state.harmonyEdit;$('harmonyAction').hidden=!edit;$('harmonyAction').setAttribute('aria-busy',String(!!edit?.busy));for(const id of ['calculateCadence','cadenceType','harmonyProposal','confirmHarmony','selectCadence'])$(id).disabled=!!edit?.busy;$('addSeventh').disabled=!canAddSeventh();if(!edit)return;
 $('cadenceChoice').hidden=edit.kind!=='cadence';$('calculateCadence').hidden=edit.kind!=='cadence';
 $('harmonyPrompt').textContent=edit.busy?'Cerco una proposta e verifico tutte le voci…':edit.selecting?'Clicca la nota di arrivo della cadenza, oppure il numero della battuta.':edit.message||`Proposta sulla nota ${(edit.index??state.selected?.i??0)+1}.`;
 linkNoteReferences($('harmonyPrompt'));
 const proposals=edit.proposals||[];$('proposalChoice').hidden=!proposals.length;$('confirmHarmony').hidden=!proposals.length||!!edit.busy;
 $('harmonyProposal').replaceChildren(...proposals.map((p,i)=>new Option(`${p.name}: ${p.figures}`,String(i))));$('harmonyProposal').value=String(edit.chosen||0);
 const p=proposals[edit.chosen||0];$('harmonyChanges').textContent=p?`${p.figures} in ${p.key}\n${p.kind==='seventh'?'La conferma abilita la settima di questo grado e il livello 3.\n':''}${p.summary}${p.warning?'\n'+p.warning:''}`:'';
}
function calculateHarmony(kind){
 if(state.harmonyEdit?.busy)return;
 if(kind==='seventh'&&current()?.[state.selected?.i]?.segments){setStatus('La selezione contiene una cadenza con più accordi. L’aggiunta della settima è disponibile sugli accordi non suddivisi.');return}
 if(kind!=='automaticSevenths'&&!state.selected){setStatus('Seleziona prima una nota o il numero di una battuta.');return}if(!current()){setStatus('Genera prima un’armonizzazione valida.');return}
 const wasVisible=!!state.harmonyEdit;cancelSolve({preserveHarmony:true,quiet:true});$('chordMenu').open=false;if(state.playing)stop();const notes=noteEvents(),action={args:engineArgs(),solution:structuredClone(current()),index:state.selected?.i??0,kind,degrees:state.automaticSeventhDegrees||[1,4],cadenceType:$('cadenceType').value||'auto',tiedIndexes:notes.flatMap((e,i)=>e.tieNext?[i,i+1]:[])};
 state.harmonyEdit={kind,index:action.index,busy:true,proposals:[]};renderHarmonyEdit();if(!wasVisible)$('harmonyAction').scrollIntoView?.({block:'nearest'});
 const complete=result=>{state.harmonyEdit={kind,index:action.index,...result,chosen:0};if(kind==='seventh'&&result.proposals?.[0]&&!result.proposals[0].warning){applyHarmonyProposal(result.proposals[0]);return}renderHarmonyEdit()};
 if(typeof Worker==='function'){
  const worker=createSolverWorker(message=>complete({proposals:[],message}));if(!worker)return;state.solveWorker=worker;worker.onmessage=({data})=>{if(state.solveWorker!==worker)return;if(data.progress){setStatus(`Verifico la proposta: nota ${data.progress.note} di ${data.progress.total}…`);return}state.solveWorker=null;worker.terminate();complete(data.error?{proposals:[],message:data.error}:data.result)};worker.onerror=()=>{if(state.solveWorker!==worker)return;state.solveWorker=null;worker.terminate();complete({proposals:[],message:'Il calcolo non è riuscito. Riprova su un’altra nota.'})};worker.postMessage({action});
 }else{try{complete((kind==='automaticSevenths'?proposeAutomaticSevenths:proposeHarmonyEdit)(action))}catch(error){complete({proposals:[],message:error.message})}}
}
$('selectCadence').onclick=()=>{if(state.harmonyEdit?.busy)return;$('chordMenu').open=false;if(!current()){setStatus('Armonizza prima il basso, poi seleziona l’accordo di arrivo della cadenza.');return}cancelSolve();state.modWizard=null;if(state.selectedMeasure!==null&&state.selectedMeasure!==undefined){const bar=measureUnits(),i=noteEvents().findLastIndex(e=>e.start>=state.selectedMeasure*bar&&e.start<(state.selectedMeasure+1)*bar);if(i>=0)state.selected={i,voice:0};}if(state.selected){calculateHarmony('cadence');return}state.harmonyEdit={kind:'cadence',selecting:true,proposals:[]};render();$('harmonyAction').scrollIntoView?.({block:'nearest'})};
$('calculateCadence').onclick=()=>calculateHarmony('cadence');
$('addSeventh').onclick=()=>calculateHarmony('seventh');
$('harmonyProposal').onchange=e=>{if(state.harmonyEdit){state.harmonyEdit.chosen=Number(e.target.value);renderHarmonyEdit()}};
$('cadenceType').onchange=()=>{if(state.harmonyEdit&&!state.harmonyEdit.selecting)calculateHarmony('cadence')};
$('cancelHarmony').onclick=()=>{cancelSolve();state.harmonyEdit=null;render()};
function applyHarmonyProposal(p){if(!p)return;state.deferHarmony=false;cancelSolve();const notes=noteEvents();p.bass.forEach((n,i)=>{if(notes[i].midi!==n){notes[i].midi=n;notes[i].baseMidi=n;notes[i].accidental='key';notes[i].spelling=chromaticSpelling(n,p.solution[i].key||state.key)}});Object.entries(p.requests).forEach(([i,r])=>state.harmonicRequests[notes[Number(i)].start]=r);state.level=p.level;state.seventhsEnabled=p.seventhsEnabled;state.allowedSevenths=p.allowedSevenths;$('level').value=String(state.level);state.solutions=[p.solution];state.chosen=0;state.manual=p.kind==='automaticSevenths';if(p.kind!=='automaticSevenths')state.manualNotes={};state.harmonyEdit=null;syncBass();setStatus(`${p.kind==='seventh'?'Settima aggiunta':p.kind==='automaticSevenths'?'Settime aggiunte':p.name+' confermata'}: ${p.figures}. ${p.held?'Basso mantenuto; tre accordi scritti nelle voci superiori.':p.changes.length+' note aggiornate.'}`);render();save()}
$('confirmHarmony').onclick=()=>applyHarmonyProposal(state.harmonyEdit?.proposals?.[state.harmonyEdit.chosen||0]);

$('clearHarmonyRequests').onclick=()=>{state.harmonicRequests={};state.rhythmLocks={};rerun()};

function copySelection(){const sel=state.selected,ev=noteEvents()[sel?.i],c=sel?.whole?current()?.[sel.i]:selectedChord();if(!ev)return;const copiedEvent=structuredClone(ev);if(c&&!sel.whole){copiedEvent.midi=c.voices[sel.voice];copiedEvent.baseMidi=copiedEvent.midi;copiedEvent.accidental='key';copiedEvent.spelling=c.spellings?.[sel.voice]||chromaticSpelling(copiedEvent.midi,c.key||state.key)}state.clipboard={event:copiedEvent,chord:sel.whole&&c?structuredClone(c):null,midi:c&&!sel.whole?c.voices[sel.voice]:ev.midi,whole:!!sel.whole};setStatus(sel.whole?'Accordo copiato. Seleziona la destinazione e premi Ctrl+V.':'Nota copiata. Seleziona la destinazione e premi Ctrl+V.')}
function pasteSelection(){
 const clip=state.clipboard;if(!clip)return;cancelSolve();if(state.playing)stop();const sel=state.selected,oldNotes=noteEvents(),selected=oldNotes[sel?.i],sol=current();
 if(!clip.whole&&sel&&sel.voice>0&&sol){pitchSelection(clip.midi);setStatus('Nota incollata. Usa “Verifica le voci”.');return}
 const start=selected?.start??Math.max(0,...state.events.map(e=>e.start+eventUnits(e))),event={...structuredClone(clip.event),start,midi:clip.midi,tieNext:false};delete event.implicit;
 const candidate=[...state.events.filter(e=>e!==selected&&!(e.kind==='rest'&&e.start===start)),event].sort((a,b)=>a.start-b.start);try{fillMeasures(candidate,state.meter)}catch(error){setStatus(`Impossibile incollare qui: ${error.message}`);return}
 const chordByStart=new Map(oldNotes.map((e,i)=>[e.start,sol?.[i]])),locksByStart=new Map(oldNotes.map((e,i)=>[e.start,state.locks[i]])),rhythmByStart=new Map(oldNotes.map((e,i)=>[e.start,state.rhythmLocks[i]]));state.events=candidate;delete state.harmonicRequests[start];if(clip.chord?.segments)state.harmonicRequests[start]={root:0,inv:0,key:clip.chord.key||state.key,heldCadence:'plagal'};state.manualNotes={};syncBass();ensureMeasures();const updated=noteEvents(),i=updated.indexOf(event);state.locks=Object.fromEntries(updated.flatMap((e,j)=>e.start!==start&&locksByStart.get(e.start)?[[j,locksByStart.get(e.start)]]:[]));state.rhythmLocks=Object.fromEntries(updated.flatMap((e,j)=>e.start!==start&&rhythmByStart.get(e.start)?[[j,rhythmByStart.get(e.start)]]:[]));
 const all=updated.map(e=>e===event?(clip.chord?structuredClone(clip.chord):null):chordByStart.get(e.start));if(all.every(Boolean)){all[i].voices[0]=event.midi;delete all[i].tonalEvent;delete all[i].confirmedKey;delete all[i].tonicizationEvent;delete all[i].pivot;state.solutions=[all];state.chosen=0;state.manual=true}else{state.solutions=[];state.chosen=0}state.selected={i,voice:0,whole:!state.manualMode};state.page=Math.floor(start/measureUnits()/PAGE_BARS);render();setStatus(clip.whole&&clip.chord?'Accordo incollato con tutte le voci. Usa “Verifica le voci”.':'Nota incollata. Genera le armonizzazioni per aggiornare le voci.');save();
}

let chromaticReview=[],chromaticBassSnapshot='',chromaticScoreSnapshot='',chromaticDismissed=new Set();
function resetChromaticReview(){chromaticDismissed.clear();chromaticScoreSnapshot='';chromaticReview=[];$('chromaticReview').hidden=true}
const chromaticScoreIdentity=()=>JSON.stringify([state.key,noteEvents().map(e=>[e.start,e.midi,e.spelling])]);
const bassSnapshot=()=>JSON.stringify([state.key,noteEvents().map(e=>[e.start,e.midi,e.spelling]),state.tonalEvents]);
function renderChromaticReview(){
 $('modulationsPanel').open=true;$('sidebarTools').open=true;
 $('chromaticReview').hidden=false;$('chromaticReviewRows').replaceChildren();
 $('chromaticReviewSummary').textContent=chromaticReview.length?`${chromaticReview.length} alterazioni fuori armatura. Scegli una proposta o la tua tonalità: nessun cambio è applicato prima della conferma.`:'Nessuna alterazione fuori armatura rilevata.';
 for(const p of chromaticReview){
  const row=document.createElement('div');row.className='note';
  const title=document.createElement('strong');title.textContent=`Nota ${p.index+1}: ${eventName(noteEvents()[p.index])} · ${p.direction} rispetto a ${p.localKey}`;
  linkNoteReferences(title);const reason=document.createElement('p');reason.textContent=p.reason;linkNoteReferences(reason);
  const options=document.createElement('div');options.className='toolGroup';
  const key=document.createElement('select');key.setAttribute('aria-label',`La scelgo io: tonalità alla nota ${p.index+1}`);key.replaceChildren(new Option('La scelgo io: scegli tonalità',''),...Object.keys(KEYS).map(k=>new Option(k,k)));key.value=p.key;
  const arrival=document.createElement('select');arrival.setAttribute('aria-label',`Nota di arrivo, nota ${p.index+1}`);arrival.replaceChildren(new Option('Scegli nota di arrivo',''),...noteEvents().flatMap((e,i)=>i>p.index?[new Option(`Nota ${i+1} · ${eventName(e)}`,String(i))]:[]));arrival.value=p.confirm===null?'':String(p.confirm);
  const kind=document.createElement('select');kind.setAttribute('aria-label',`Tipo di evento, nota ${p.index+1}`);kind.replaceChildren(new Option('Modulazione','modulation'),new Option('Tonicizzazione temporanea','extendedTonicization'),new Option('Alterazione locale: mantieni tonalità','local'));kind.value=p.key===p.localKey?'local':'modulation';
  for(const candidate of p.candidates){const button=document.createElement('button');button.className=candidate.key===p.key?'active':'secondary';button.textContent=candidate.key;button.onclick=()=>{p.key=candidate.key;p.confirm=candidate.confirm;p.reason=candidate.reason;key.value=p.key;arrival.value=p.confirm===null?'':String(p.confirm);reason.textContent=p.reason;linkNoteReferences(reason);kind.value=p.key===p.localKey?'local':'modulation';for(const b of options.children)b.className=b===button?'active':'secondary'};options.append(button)}
  key.onchange=()=>{p.key=key.value;kind.value=p.key===p.localKey?'local':'modulation';const candidate=p.candidates.find(c=>c.key===p.key);if(candidate){p.confirm=candidate.confirm;arrival.value=p.confirm===null?'':String(p.confirm);reason.textContent=candidate.reason;linkNoteReferences(reason);}for(const b of options.children)b.className='secondary';};
  arrival.onchange=()=>{p.confirm=arrival.value===''?null:Number(arrival.value);if(p.confirm!==null)goToNote(p.confirm)};
  const save=document.createElement('button');save.textContent='Conferma';save.onclick=()=>{
   const notes=noteEvents();if(chromaticBassSnapshot!==bassSnapshot()){setStatus('Il basso o la tonalità sono cambiati: premi Rileva alterazioni per aggiornare le proposte.');return}
   if(kind.value==='local'||p.key===p.localKey){chromaticDismissed.add(p.index);chromaticReview=chromaticReview.filter(x=>x!==p);renderChromaticReview();setStatus('Tonalità mantenuta. L’alterazione resta sullo spartito.');return}
   if(!KEYS[p.key]||!Number.isInteger(p.confirm)||p.confirm<=p.index||!notes[p.confirm]){setStatus('Scegli una tonalità e una nota di arrivo successiva.');return}
   const start=notes[p.index].start,end=notes[p.confirm].start;
   if(state.tonalEvents.some(e=>e.start!==start&&['modulation','extendedTonicization'].includes(e.kind)&&e.start<=end&&e.confirmStart>=start)){setStatus('La transizione si sovrappone a un evento confermato. Modifica la nota di arrivo o elimina l’evento precedente.');return}
   const degreeIndex=[1,2,3,4,5,6].find(d=>tonicizedDegree(p.localKey,p.key)===d);
   if(kind.value==='extendedTonicization'&&degreeIndex===undefined){setStatus('Questa tonalità non è un grado tonicizzabile del tono corrente. Scegli modulazione o un altro tono.');return}
   const event={kind:kind.value,start,confirmStart:end,manualChoice:true,...(kind.value==='modulation'?{key:p.key,arrivalMode:'manual',arrivalConstraint:'context'}:{degree:degreeIndex}),reason:'Tonalità scelta e confermata dall’utente'};
   state.tonalEvents=state.tonalEvents.filter(e=>e.start!==start);state.tonalEvents.push(event);state.tonalEvents.sort((a,b)=>a.start-b.start);if(state.modulationMode!=='auto')state.modulationMode='manual';state.level=3;$('level').value='3';
   rerun();const harmonyStatus=$('status').textContent;detectChromaticReview(false);setStatus(`Evento salvato: ${p.key}. Le altre alterazioni sono state ricalcolate rispetto alla nuova tonalità; ${harmonyStatus}`);
  };
  const ignore=document.createElement('button');ignore.textContent='Ignora';ignore.className='secondary';ignore.onclick=()=>{chromaticDismissed.add(p.index);chromaticReview=chromaticReview.filter(x=>x!==p);renderChromaticReview()};
  row.append(title,options,reason,key,arrival,kind,save,ignore);$('chromaticReviewRows').append(row);
 }
}
function detectChromaticReview(cancel=true){if(cancel===true)cancelSolve();state.modWizard=null;const notes=noteEvents(),identity=chromaticScoreIdentity();if(identity!==chromaticScoreSnapshot){chromaticDismissed.clear();chromaticScoreSnapshot=identity}chromaticBassSnapshot=bassSnapshot();chromaticReview=reviewChromaticModulations({bass:notes.map(e=>e.midi),bassSpellings:notes.map(e=>e.spelling||null),key:state.key,tonalEvents:eventsForEngine()}).filter(p=>!chromaticDismissed.has(p.index));renderChromaticReview()}
$('detectChromaticModulations').onclick=()=>detectChromaticReview();
$('closeChromaticReview').onclick=()=>{$('chromaticReview').hidden=true;chromaticReview=[]};

function selectMeasure(index){if(state.harmonyEdit?.busy)return;if(state.harmonyEdit?.selecting){const bar=measureUnits(),i=noteEvents().findLastIndex(e=>e.start>=index*bar&&e.start<(index+1)*bar);if(i>=0)select(i,0);else setStatus('La battuta selezionata non contiene note.');return}state.selected=null;state.selectedMeasure=index;render();$('selectionLabel').textContent='Battuta '+(index+1);setStatus('Battuta '+(index+1)+' selezionata · Backspace per eliminarla.');}
function removeSelectedMeasure(){const index=state.selectedMeasure;if(index==null)return;cancelSolve();if(state.playing)stop();const old=current(),result=deleteMeasure({...state,length:eventUnits},index,measureUnits());state.events=result.events;state.measureCount=result.measureCount;state.tonalEvents=result.tonalEvents;state.harmonicRequests=result.harmonicRequests;const remap=obj=>Object.fromEntries([...result.indexMap].filter(([i])=>obj[i]!==undefined).map(([i,n])=>[n,obj[i]]));state.locks=remap(state.locks);state.rhythmLocks=remap(state.rhythmLocks);state.manualNotes=Object.fromEntries(Object.entries(state.manualNotes).flatMap(([key,value])=>{const [i,v]=key.split(':').map(Number),next=result.indexMap.get(i);return next===undefined?[]:[[manualKey(next,v),value]]}));state.solutions=old?[...result.indexMap.keys()].map(i=>old[i]):[];state.solutions=state.solutions.length?[state.solutions]:[];state.chosen=0;state.manual=!!state.solutions.length;state.selected=null;state.selectedMeasure=null;state.modWizard=null;state.harmonyEdit=null;state.page=Math.min(state.page,Math.floor((state.measureCount-1)/PAGE_BARS));syncBass();render();save();setStatus('Battuta '+(index+1)+' eliminata. Le battute successive sono state avvicinate; verifica i nuovi collegamenti.');}
initScoreWorkspace({viewport:$('scoreWrap'),onRightClick:e=>{const target=e.target?.closest?.('.noteTarget,.manualHit');target?.oncontextmenu?.(e)},getZoom:()=>appearance.get().scoreZoom,setZoom:value=>appearance.update({scoreZoom:value})});
$('zoomOut').onclick=()=>appearance.update({scoreZoom:appearance.get().scoreZoom-10});
$('zoomIn').onclick=()=>appearance.update({scoreZoom:appearance.get().scoreZoom+10});
$('workspaceZoom').onchange=e=>appearance.update({scoreZoom:Number(e.target.value)});

initReferenceUI(document);

$('generateKey').replaceChildren(...Object.keys(KEYS).map(k=>new Option(k,k)));
$('generateMeter').replaceChildren(...Array.from($('meter').options).map(o=>new Option(o.textContent,o.value)));
$('generateKey').value=state.key;$('generateMeter').value=state.meter;
$('generateKey').onchange=e=>$('key').onchange(e);
$('generateMeter').onchange=e=>$('meter').onchange(e);

mobileUI=initMobileUI(document,{getEditing:()=>state.manualMode,toggleWriting,removeSelection:()=>{if(state.selected)removeBassEvent(noteEvents()[state.selected.i]);else setStatus('Seleziona prima la nota da eliminare.')}});
mobileUI.sync(state.manualMode);

$('automaticSevenths').onclick=()=>{
 if(state.harmonyEdit?.busy)return;
 if(!current()){setStatus('Armonizza prima tutto il basso.');return}
 state.automaticSeventhDegrees??=[1,4];
 $('automaticSeventhDegrees').replaceChildren(...['I','II','III','IV','V','VI','VII'].map((name,degree)=>{const row=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=state.automaticSeventhDegrees.includes(degree);box.disabled=!current().some(c=>!c.segments&&c.root===degree&&supportedSevenths(c.key||state.key).includes(degree));box.onchange=()=>{state.automaticSeventhDegrees=box.checked?[...new Set([...state.automaticSeventhDegrees,degree])]:state.automaticSeventhDegrees.filter(n=>n!==degree)};row.append(box,document.createTextNode(name+'7'));return row}));
 $('automaticSeventhsOptions').hidden=false;$('chordMenu').open=true;
};
$('cancelAutomaticSevenths').onclick=()=>{$('automaticSeventhsOptions').hidden=true};
$('scanSevenths').onclick=()=>{if(state.harmonyEdit?.busy)return;calculateHarmony('automaticSevenths');$('automaticSeventhsOptions').hidden=true};
// Se si arriva dall'editor che era a schermo intero, l'armonizzatore resta a schermo intero.
try{if(localStorage.getItem('ar-carry-fullscreen')==='1'){localStorage.setItem('ar-carry-fullscreen','0');$('fullscreenScore')?.click()}}catch{}
