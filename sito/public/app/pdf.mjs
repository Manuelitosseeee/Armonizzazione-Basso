import {expandHarmony,voicePresent,voiceRhythm,tieLinks} from './harmonic-rhythm.mjs';
import {harmonyFigure,tonalFigure,upperStemUp} from './harmony-figures.mjs';
import {noteFlag,flagStemLength} from './note-flags.mjs';
import {PDFDocument,StandardFonts,rgb,degrees} from '../vendor/pdf-lib.mjs';
import {KEYS,chromaticSpelling,label} from './engine.mjs';
import {fillMeasures,eventUnits} from './notation.mjs';
import {GLYPHS} from './music-glyphs.mjs';
export const PDF_ENGRAVING={staffSpace:7,staffDistance:67,headRx:4,headRy:2.7,wholeRx:4.8,stemX:3.5,stemLength:23,rotation:20};
const black=rgb(0,0,0),gray=rgb(.35,.35,.35),letters=['Do','Re','Mi','Fa','Sol','La','Si'];
const safe=s=>String(s).replaceAll('♭','b').replaceAll('♯','#').replaceAll('→','-').replaceAll('𝄪','x');
const rests={breve:'breveRest',whole:'wholeRest',half:'halfRest',quarter:'quarterRest',eighth:'eighthRest','16th':'16thRest','32nd':'32ndRest','64th':'64thRest'};
const sig=(letter,key)=>{const f=KEYS[key].fifths;return f>0&&['Fa','Do','Sol','Re','La','Mi','Si'].slice(0,f).includes(letter)?1:f<0&&['Si','Mi','La','Re','Sol','Do','Fa'].slice(0,-f).includes(letter)?-1:0};
export function scoreLayout(options){const {key,meter,measureCount=0,partSpacing='strette',includeDegrees=true}=options;const {events,solutions}=options.expanded?options:expandHarmony(options.events,options.solutions);
 const notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start);
 const [beats,den]=meter.split('/').map(Number),bar=beats*64/den,filled=fillMeasures(events,meter,measureCount),bars=Math.round((filled.at(-1).start+eventUnits(filled.at(-1)))/bar);
 const measures=Array.from({length:bars},(_,m)=>{const items=filled.filter(e=>e.start>=m*bar&&e.start<(m+1)*bar),weights=items.map(e=>{const i=notes.indexOf(e),c=solutions?.[i];return Math.max(14,22*Math.sqrt(eventUnits(e)/16),includeDegrees&&c?((harmonyFigure(c,solutions?.[i-1],key).length+(solutions?.[i+1]?harmonyFigure(solutions[i+1],c,key).length:0))*2.25+10):0)});return {number:m+1,items,weights,minWidth:Math.max(100,weights.reduce((a,b)=>a+b,0)+24)}});
 const density=pdfDensity(options),available=499/density.scale-72-Math.abs(KEYS[key].fifths)*7,systems=[];let cursor=0;
 while(cursor<measures.length){const group=[];let width=0;while(cursor<measures.length&&(group.length===0||width+measures[cursor].minWidth<=available)){const m=measures[cursor++];group.push(m);width+=m.minWidth;if(group.length>=4)break}systems.push(group)}
 return {systems,bar,beats,den,bars,includeDegrees,partSpacing,harmonized:!!solutions?.length};
}
export function pdfDensity(options={}){
 const rows=options.systemsPerPage===undefined?4:Number(options.systemsPerPage);
 if(!Number.isInteger(rows)||rows<2||rows>20)throw Error('Scegli da 2 a 20 sistemi per pagina.');
 return {rows,scale:options.systemsPerPage===undefined?1:Math.min(1.7,735/(rows*180))};
}
export async function scorePdf(options){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.TimesRoman),bold=await pdf.embedFont(StandardFonts.TimesRomanBold);return engraveScore(options,pdf,font,bold);}
export function engraveScore(options,pdf,font,bold){
 const expanded=options.expanded?options:expandHarmony(options.events,options.solutions);const {events,solutions}=expanded;const {key,meter,includeDegrees=true}=options,layout=scoreLayout({...options,...expanded,expanded:true}),notes=events.filter(e=>e.kind==='note').sort((a,b)=>a.start-b.start);
 if(options.continuous)layout.systems=[layout.systems.flat()];
 const density=pdfDensity(options);let page,systemInPage=0;const width=options.continuous?Math.max(595.28,96+80+layout.systems[0].reduce((n,m)=>n+m.minWidth,0)):595.28,height=841.89,left=48,right=48+(width-96)/density.scale;
 const text=(s,x,y,size=9,f=font,color=black)=>page.drawText(safe(s),{x,y,size,font:f,color});
 const line=(x1,y1,x2,y2,th=.55)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:th,color:black});
 const glyph=(name,x,y,size)=>{const g=GLYPHS[name];if(g)page.drawSvgPath(g.path,{x,y,scale:size/g.units,color:black})};
 const yNote=(n,spelling,lower,top)=>{const p=spelling||chromaticSpelling(n,key),diatonic=p.octave*7+letters.indexOf(p.letter),bottom=lower?2*7+4:4*7+2;return top-28+(diatonic-bottom)*3.5};
 const yPositions=new Map();
 for(let systemIndex=0;systemIndex<layout.systems.length;systemIndex++){
  if(systemInPage===0){page=pdf.addPage([width,height]);
   if(density.scale!==1){const sx=x=>48+(x-48)*density.scale,sy=y=>height-40+(y-(height-40))*density.scale;
    for(const method of ['drawText','drawLine','drawSvgPath','drawEllipse','drawCircle']){const original=page[method].bind(page);page[method]=(...args)=>{const a={...args[method==='drawText'||method==='drawSvgPath'?1:0]};
     if(method==='drawLine'){a.start={x:sx(a.start.x),y:sy(a.start.y)};a.end={x:sx(a.end.x),y:sy(a.end.y)};a.thickness*=density.scale;}else{a.x=sx(a.x);a.y=sy(a.y);for(const k of ['size','scale','xScale','yScale','borderWidth'])if(a[k]!==undefined)a[k]*=density.scale;}
     return method==='drawText'||method==='drawSvgPath'?original(args[0],a):original(a);};}
   }}
  const top=height-105-systemInPage*180,lowerTop=top-PDF_ENGRAVING.staffDistance;
  page.systemContext={index:systemIndex,top,lowerTop,height,left,right};page.drawTag='staffLine';page.noteContext=null;page.measureContext=null;page.eventContext=null;page.figureContext=null;
  for(const st of layout.harmonized?[top,lowerTop]:[lowerTop])for(let l=0;l<5;l++)line(left,st-l*PDF_ENGRAVING.staffSpace,right,st-l*PDF_ENGRAVING.staffSpace);
  page.drawTag='systemStart';if(layout.harmonized){line(left,top,left,lowerTop-28,1);line(left-4,top,left-4,lowerTop-28,.9);page.drawTag='clefOutline';glyph('treble',left+4,top-28,29)}
  page.drawTag='clefOutline';glyph('bass',left+5,lowerTop-25,24);
  page.drawTag='keySignature';const fifths=KEYS[key].fifths,sharps=[0,3,-1,2,5,1,4],flats=[4,1,5,2,6,3,7];
  for(let j=0;j<Math.abs(fifths);j++)for(const st of layout.harmonized?[top,lowerTop]:[lowerTop]){const offsets=fifths>0?sharps:flats;glyph(fifths>0?'sharp':'flat',left+28+j*7,st-offsets[j]*3.5+(st===lowerTop?-7:0),21)}
  let origin=left+44+Math.abs(fifths)*7;
  page.drawTag='timeSignature';if(systemIndex===0&&options.showMeter!==false){for(const st of layout.harmonized?[top,lowerTop]:[lowerTop]){text(layout.beats,origin,st-9,15,bold);text(layout.den,origin,st-24,15,bold)}origin+=21}
  const group=layout.systems[systemIndex],minWidth=group.reduce((s,m)=>s+m.minWidth,0),room=right-origin;let mx=origin;
  for(const measure of group){const mw=room*measure.minWidth/minWidth;page.measureContext={number:measure.number,x:mx,width:mw,start:(measure.number-1)*layout.bar,end:measure.number*layout.bar};page.noteContext=null;page.drawTag='barline';line(mx,layout.harmonized?top:lowerTop,mx,lowerTop-28,.6);page.drawTag='barLabel';text(measure.number,mx+2,(layout.harmonized?top:lowerTop)+10,8,font,gray);let x=mx+12;const sum=measure.weights.reduce((a,b)=>a+b,0),unit=(mw-24)/sum,memory=new Map();
   measure.items.forEach((e,j)=>{const cx=x; x+=measure.weights[j]*unit;const i=notes.indexOf(e),c=solutions?.[i];page.eventContext={start:e.start,end:e.start+eventUnits(e),x:cx};page.noteContext=null;
    if(e.kind==='rest'){page.drawTag=e.implicit?'restGlyph implicitRest':'restGlyph';for(const st of layout.harmonized?[top,lowerTop]:[lowerTop])glyph(rests[e.duration],cx-3,st-(e.duration==='whole'?9:e.duration==='half'?12:e.duration==='breve'?10.5:14)-(GLYPHS[rests[e.duration]].bounds[1]+GLYPHS[rests[e.duration]].bounds[3])/2*26/1000,26);return}
    const voices=c?.voices||[e.midi],shared=layout.harmonized&&layout.partSpacing==='late'&&c;
    const upper=shared?[1,2,3].filter(v=>voices[v]!==undefined).map(v=>({v,y:yNote(voices[v],c.spellings?.[v]||chromaticSpelling(voices[v],c.key||key),false,top)})).sort((a,b)=>a.y-b.y):[],sharedUp=shared?upperStemUp(c,key):false,upperX=new Map();let shifted=false;
    upper.forEach((n,j)=>{shifted=j>0&&Math.abs(n.y-upper[j-1].y)<5?!shifted:false;upperX.set(n.v,cx+(shifted?(sharedUp?7:-7):0))});
    voices.forEach((n,v)=>{if(n===undefined||!voicePresent(e,v))return;const rhythm=voiceRhythm(e,v);const lower=!layout.harmonized||v===0||v===1&&layout.partSpacing==='strette',st=lower?lowerTop:top,p=v===0?e.spelling||c?.spellings?.[0]||chromaticSpelling(n,c?.key||key):c?.spellings?.[v]||chromaticSpelling(n,c?.key||key),ny=yNote(n,p,lower,st),up=shared&&v>0?sharedUp:layout.harmonized?(v===1||v===3):ny<st-14,headX=shared&&v>0?upperX.get(v):cx+((v===2&&voices[3]!==undefined&&Math.abs(yNote(voices[3],c?.spellings?.[3],false,top)-ny)<5)||(v===0&&layout.partSpacing==='strette'&&voices[1]!==undefined&&Math.abs(yNote(voices[1],c?.spellings?.[1],true,lowerTop)-ny)<5)?7:0);
     page.noteContext={index:i,voice:v,start:e.start,pitch:n};page.drawTag='ledger';
     for(let ly=st+7;ly<=ny+.1;ly+=7)line(headX-6,ly,headX+6,ly,.55);for(let ly=st-35;ly>=ny-.1;ly-=7)line(headX-6,ly,headX+6,ly,.55);
     page.drawTag='accidental';const mem=`${v}:${p.letter}:${p.octave}`,old=memory.get(mem)??sig(p.letter,key),explicit=v===0&&e.accidental&&e.accidental!=='key';if(explicit||p.alter!==old)glyph(({0:'natural',1:'sharp',2:'doubleSharp','-1':'flat','-2':'doubleFlat'})[p.alter],headX-11,ny,19);memory.set(mem,p.alter);
     page.drawTag='notehead';const hollow=['half','whole','breve'].includes(rhythm.duration);page.drawEllipse({x:headX,y:ny,xScale:rhythm.duration==='whole'?PDF_ENGRAVING.wholeRx:PDF_ENGRAVING.headRx,yScale:PDF_ENGRAVING.headRy,rotate:degrees(PDF_ENGRAVING.rotation),...(hollow?{borderColor:black,borderWidth:.8}:{color:black})});
     page.drawTag='stem';if(!['whole','breve'].includes(rhythm.duration)&&(!shared||v===0||v===upper.at(-1).v)){const chordStem=shared&&v>0,sx=(chordStem?cx:headX)+(up?3.5:-3.5),start=chordStem?(up?upper[0].y:upper.at(-1).y):ny,end=(chordStem?(up?upper.at(-1).y:upper[0].y):ny)+(up?1:-1)*flagStemLength(rhythm.duration);line(sx,start,sx,end,.8);const flag=noteFlag(rhythm.duration,up);if(flag){page.drawTag='flag';page.drawSvgPath(flag.path,{x:sx,y:end,scale:flag.scale,color:black});}}
     if(rhythm.duration==='breve'){page.drawTag='breveSide';line(headX-7,ny-4,headX-7,ny+4,.8);line(headX+7,ny-4,headX+7,ny+4,.8)}if(rhythm.dotted){page.drawTag='augmentationDot';page.drawCircle({x:headX+7,y:ny+2,size:1,color:black});}
     yPositions.set(`${i}:${v}`,{x:headX,y:ny,page,system:systemIndex,mx,right:mx+mw});
    });
    page.noteContext=null;if(includeDegrees&&c){page.drawTag='chordText';page.figureContext={index:i,start:e.start};const figure=harmonyFigure(c),size=9; text(figure,cx-font.widthOfTextAtSize(safe(figure),size)/2,lowerTop-70,size);const tone=options.tonalLabels===false?'':tonalFigure(c,solutions?.[i-1],key,j===0&&measure===group[0]);if(tone){page.drawTag='tonalText';text(tone,cx-font.widthOfTextAtSize(safe(tone),8)/2,lowerTop-54,8)}}
   page.figureContext=null;});page.eventContext=null;mx+=mw;
  }
  page.drawTag='barline';page.noteContext=null;line(right,layout.harmonized?top:lowerTop,right,lowerTop-28,systemIndex===layout.systems.length-1?1.8:.7);systemInPage++;if(systemInPage===density.rows)systemInPage=0;
 }
 // Value ties follow each part, including line breaks; never connect different pitches.
 tieLinks(events,solutions).forEach(({from:i,to:j,voice:v})=>{const a=yPositions.get(`${i}:${v}`),b=yPositions.get(`${j}:${v}`);if(!a||!b)return;const arc=(pos,start,end)=>{if(end-start<4)return;pos.page.systemContext={index:pos.system,top:height-105-(pos.system%density.rows)*180,height,left,right};pos.page.eventContext=null;pos.page.measureContext=null;pos.page.drawTag='tieArc';pos.page.noteContext=null;pos.page.drawSvgPath(`M 0 0 Q ${(end-start)/2} 9 ${end-start} 0`,{x:start,y:pos.y-7,borderColor:black,borderWidth:.65})};if(a.system===b.system)arc(a,a.x+3,b.x-3);else{arc(a,a.x+3,a.right-3);arc(b,b.mx+3,b.x-3)}});
 return pdf.save();
}
// Kept for existing consumers; clean white A4 with five systems per page.
export async function pdfFromSystems(jpegs){const pdf=await PDFDocument.create();for(let i=0;i<jpegs.length;i++){const page=i%5===0?pdf.addPage([595.28,841.89]):pdf.getPages().at(-1),jpg=await pdf.embedJpg(jpegs[i]),scale=Math.min(499/jpg.width,130/jpg.height);page.drawImage(jpg,{x:48,y:700-(i%5)*140,width:jpg.width*scale,height:jpg.height*scale})}return pdf.save()}
