import {GLYPHS} from './music-glyphs.mjs';
import {engraveScore} from './pdf.mjs';
const R=10/7;
const font={fontName:'Times-Roman',widthOfTextAtSize(s,size){return [...String(s)].reduce((n,c)=>n+({I:333,V:722,X:722,' ':250,'1':500,'2':500,'3':500,'4':500,'5':500,'6':500,'7':500,'8':500,'9':500}[c]??500)/1000*size,0);}};
const bold={...font,fontName:'Times-Bold'};
export function scoreScene(options){
 const pages=[];
 const doc={addPage([width,height]){const records=[];const p={width,height,records};for(const method of ['drawText','drawLine','drawSvgPath','drawEllipse','drawCircle'])p[method]=(...args)=>{records.push({method,args,tag:p.drawTag,system:p.systemContext&&{...p.systemContext},note:p.noteContext&&{...p.noteContext},event:p.eventContext&&{...p.eventContext},measure:p.measureContext&&{...p.measureContext},figure:p.figureContext&&{...p.figureContext}});};pages.push(p);return p;},getPageCount(){return pages.length;},save(){return {pages};}};
 return engraveScore(options,doc,font,bold);
}
export function engravedSvg(options,node,scale=1.65,first=0){
 const scene=scoreScene({...options,tonalLabels:options.tonalLabels??false}),records=scene.pages.flatMap(p=>p.records).filter(r=>r.system),systems=[...new Map(records.map(r=>[r.system.index,r.system])).values()],firstSystem=systems[0],width=(firstSystem.right-firstSystem.left)*R+28,height=systems.length*180*R,svg=node('svg',{viewBox:`0 50 ${width} ${height}`,role:'img',class:options.figuresOnly?'figuresSvg pdfEngraving':'pdfEngraving','aria-label':`Battute ${first+1}–${first+(options.measureCount||1)} in ${options.key}, ${options.meter}`,'data-renderer':'pdf-shared-v3','data-staff-space':String(7*R*scale)});
 svg.style.width=`${width*scale}px`;svg.style.minWidth=svg.style.width;
 const groupMap=new Map(),events=new Map(),measures=new Map();
 const coords=(x,y,system)=>({x:14+(x-system.left)*R,y:92+(system.height-y-(system.height-system.top))*R+system.index*180*R});
 for(const r of records){
  const [a,b]=r.args,system=r.system;let shape;
  // The PDF's page coordinate system is inverted once, with no new engraving decisions.
  const xy=(x,y)=>coords(x,y,system);
  if(r.measure){const k=`${system.index}:${r.measure.number}`;const p=xy(r.measure.x,system.top);measures.set(k,{...r.measure,x:p.x,width:r.measure.width*R,system:system.index,top:p.y,bottom:p.y+(67+28)*R});}
  if(r.event){const p=xy(r.event.x,system.top);events.set(r.event.start,{...r.event,x:p.x,system:system.index});}
  if(options.figuresOnly&&!['chordText','barLabel','barline'].includes(r.tag))continue;
  if(r.method==='drawText'){const p=xy(b.x,b.y),text=r.tag==='barLabel'?String(Number(a)+first):String(a);shape=node('text',{x:p.x,y:p.y,'font-size':b.size*R,'font-family':'Times New Roman, Times, serif','font-weight':b.font.fontName==='Times-Bold'?'bold':'normal',fill:'#111',class:r.tag||'scoreText'},text);}
  if(r.method==='drawLine'){const p=xy(a.start.x,a.start.y),q=xy(a.end.x,a.end.y);shape=node('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'#111','stroke-width':a.thickness*R,class:r.tag||'scoreLine'});}
  if(r.method==='drawSvgPath'){const p=xy(b.x,b.y);shape=node('path',{d:a,transform:`translate(${p.x} ${p.y}) scale(${(b.scale??1)*R})`,x:p.x,y:p.y,fill:b.color?'#111':'none',stroke:b.borderColor?'#111':'none','stroke-width':b.borderWidth??0,class:r.tag||'scoreGlyph'});}
  if(r.method==='drawEllipse'){const p=xy(a.x,a.y);shape=node('ellipse',{cx:p.x,cy:p.y,rx:a.xScale*R,ry:a.yScale*R,transform:`rotate(-${a.rotate?.angle||0} ${p.x} ${p.y})`,fill:a.color?'#111':'none',stroke:a.borderColor?'#111':'none','stroke-width':(a.borderWidth||0)*R,class:'notehead '+(!a.color?'hollow ':'')+(r.note?.voice===0?'bass ':'')});}
  if(r.method==='drawCircle'){const p=xy(a.x,a.y);shape=node('circle',{cx:p.x,cy:p.y,r:a.size*R,fill:'#111',class:'augmentationDot'});}
  if(!shape)continue;if(r.method==='drawLine')shape.style.strokeWidth=`${a.thickness*R}`;shape.setAttribute('data-system',system.index);if(r.tag==='keySignature'){shape.setAttribute('aria-label',a===GLYPHS.sharp.path?'♯':'♭');}if(r.method==='drawText'){shape.style.fontSize=`${b.size*R}px`;shape.style.fontFamily='Times New Roman, Times, serif';shape.style.fontWeight=b.font.fontName==='Times-Bold'?'bold':'normal';}
  if(r.note){const k=`${system.index}:${r.note.index}:${r.note.voice}`;let g=groupMap.get(k);if(!g){g=node('g',{class:'noteTarget',role:'button',tabindex:'0','data-index':r.note.index,'data-voice':r.note.voice,'data-system':system.index});groupMap.set(k,g);svg.append(g);}if(r.method==='drawEllipse'){const p=xy(a.x,a.y);g.append(node('rect',{x:p.x-a.xScale*R-3,y:p.y-a.yScale*R-3,width:2*a.xScale*R+6,height:2*a.yScale*R+6,fill:'transparent',stroke:'none','pointer-events':'all',class:'noteHit'}));}g.append(shape);}else{if(r.figure)shape.setAttribute('data-index',r.figure.index);if(r.tag==='barLabel')shape.setAttribute('data-measure',r.measure.number);svg.append(shape);}
 }
 if(!options.solutions?.length){const ys=[...groupMap.values()].flatMap(g=>[...g.children].flatMap(n=>['cy','y','y1','y2'].map(a=>Number(n.getAttribute?.(a)??n.attributes?.[a])).filter(v=>Number.isFinite(v)&&v!==0))),crop=Math.min(145,...ys.map(y=>y-20)),bottom=Math.max(height+50,...ys.map(y=>y+20));svg.setAttribute('viewBox',`0 ${crop} ${width} ${bottom-crop}`);}
 return {svg,groups:[...groupMap.values()],events:[...events.values()].sort((a,b)=>a.start-b.start),measures:[...measures.values()],systems};
}
