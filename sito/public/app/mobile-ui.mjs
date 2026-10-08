// Reuse the desktop controls: moving nodes preserves their handlers and values.
export function initMobileUI(document,{media=globalThis.matchMedia?.('(max-width: 760px)'),toggleWriting,removeSelection,getEditing=()=>false}={}){
 const $=id=>document.getElementById(id),app=$('app');
 if(!media||!$('mobileControls')?.parentNode)return {sync(){}};
 const menu=$('mobileMenu'),options=$('mobileOptions'),measures=$('mobileMeasures'),writing=$('mobileWritingOptions'),edit=$('mobileEdit'),del=$('mobileDelete');
 const placements=[];let active=false,editing=getEditing();
 const move=(id,target)=>{const node=$(id);if(!node?.parentNode)return;const marker=document.createComment('mobile:'+id);node.parentNode.insertBefore(marker,node);placements.push({node,marker});target.append(node)};
 function close(){menu.open=false;measures.open=false}
 function sync(value=getEditing()){
  const changed=editing!==!!value;editing=!!value;app.setAttribute('data-mobile-edit',String(editing));
  edit.textContent=editing?'✓ Modifica':'✎ Modifica';edit.setAttribute('aria-pressed',String(editing));edit.title=editing?'Termina la scrittura e accedi alle funzioni':'Scrivi note e pause sul basso';
  menu.hidden=editing;measures.hidden=!editing;del.hidden=!editing;
  if(changed)close();
 }
 function layout(){
  close();if(media.matches&&!active){active=true;
   for(const id of ['generateMenu','harmonizeMenu','modulationsPanel','tonicizationsPanel','chordMenu','featuresMenu','customizationMenu','importMenu','exportMenu','voiceSettings','viewLayoutSettings','figuresOnly','valueShortcutSettings'])move(id,options);
   for(const id of ['bassSettings','meterSettings','measureSettings'])move(id,writing);
   // Keep logout accessible in the read-mode menu, if present (online only).
   const exit=$('referenceHeader')?.querySelector?.('button[data-access-exit]');
   if(exit){const marker=document.createComment('mobile:logout');exit.parentNode.insertBefore(marker,exit);placements.push({node:exit,marker});options.append(exit)}
   app.setAttribute('data-mobile-workspace','true');
  }else if(!media.matches&&active){active=false;for(const {node,marker}of placements.reverse()){marker.parentNode?.insertBefore(node,marker);marker.remove()}placements.length=0;app.removeAttribute('data-mobile-workspace')}
  sync();
 }
 edit.onclick=()=>{close();toggleWriting?.();sync()};del.onclick=()=>removeSelection?.();
 menu.addEventListener('toggle',()=>{if(menu.open)measures.open=false});measures.addEventListener('toggle',()=>{if(measures.open)menu.open=false});
 document.addEventListener('pointerdown',e=>{if(!e.target?.closest?.('.toolDrawer,.importPanel,.harmonyAction'))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 options.addEventListener('click',e=>{if(e.target?.closest?.('#selectModulation,#selectCadence,#importScore,#solve,#newBass,#confirmExport'))menu.open=false});
 $('restTools')?.addEventListener?.('click',()=>{if(active)$('restsMenu').open=false});
 media.addEventListener?.('change',layout);if(!media.addEventListener)media.addListener?.(layout);
 layout();return {sync,layout};
}
