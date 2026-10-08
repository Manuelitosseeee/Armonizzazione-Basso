export function deleteMeasure(model,index,bar){
 if(!Number.isInteger(index)||index<0||index>=model.measureCount)throw Error('Battuta non valida.');
 const from=index*bar,to=from+bar,kept=[],indexMap=new Map();let oldNote=0,newNote=0;
 for(const e of model.events){const removed=e.start>=from&&e.start<to;if(e.kind==='note'){if(!removed)indexMap.set(oldNote,newNote++);oldNote++}if(!removed){const n={...e,start:e.start>=to?e.start-bar:e.start};if(e.tieNext&&e.start<from&&e.start+model.length(e)>=from)n.tieNext=false;kept.push(n)}}
 const shift=n=>n>=to?n-bar:n;
 return {events:kept,measureCount:Math.max(1,model.measureCount-1),indexMap,
 tonalEvents:(model.tonalEvents||[]).filter(e=>!(e.start>=from&&e.start<to)&&!(e.confirmStart>=from&&e.confirmStart<to)).map(e=>({...e,start:shift(e.start),...(e.confirmStart!==undefined?{confirmStart:shift(e.confirmStart)}:{})})),
 harmonicRequests:Object.fromEntries(Object.entries(model.harmonicRequests||{}).filter(([n])=>!(Number(n)>=from&&Number(n)<to)).map(([n,v])=>[shift(Number(n)),v]))};
}
export function initScoreWorkspace({viewport,getZoom,setZoom,onRightClick=()=>{}}){
 let drag=null;
 viewport.addEventListener?.('pointerdown',e=>{if(e.button!==2)return;e.preventDefault();e.stopPropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,target:e.target,moved:false};viewport.setPointerCapture?.(e.pointerId)},true);
 viewport.addEventListener?.('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){drag.moved=true;viewport.classList?.add('dragging')}if(drag.moved){viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY}});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const clicked=drag;drag=null;viewport.releasePointerCapture?.(e.pointerId);viewport.classList?.remove('dragging');if(e.type!=='pointercancel'&&!clicked.moved)onRightClick({target:clicked.target,clientX:clicked.x,clientY:clicked.y,preventDefault(){},stopPropagation(){}})};
 viewport.addEventListener?.('pointerup',end);viewport.addEventListener?.('pointercancel',end);
 viewport.addEventListener?.('contextmenu',e=>{e.preventDefault();e.stopPropagation()},true);
 viewport.addEventListener?.('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=viewport.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,old=getZoom(),next=Math.min(300,Math.max(40,old*(e.deltaY<0?1.1:1/1.1)));setZoom(Math.round(next));const ratio=getZoom()/old;viewport.scrollLeft=(viewport.scrollLeft+x)*ratio-x;viewport.scrollTop=(viewport.scrollTop+y)*ratio-y},{passive:false});
}
