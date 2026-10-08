export function initReferenceUI(document){
 const topMenus=[...(document.querySelectorAll?.('.operationsToolbar > details, .referenceHeader details')||[])].filter(menu=>!['mobileMenu','mobileMeasures'].includes(menu.id));
 for(const menu of topMenus)menu.addEventListener?.('toggle',()=>{if(menu.open)for(const other of topMenus)if(other!==menu)other.open=false});
 for(const button of document.querySelectorAll?.('[data-open-menu]')||[]){button.onclick=()=>{for(const menu of topMenus)menu.open=false;const menu=document.getElementById(button.dataset.openMenu),section=document.getElementById(button.dataset.openSection);if(menu)menu.open=true;if(section)section.open=true;section?.scrollIntoView?.({block:'nearest'})};}
 document.addEventListener?.('pointerdown',event=>{if(event.target?.closest?.('.toolDrawer, .harmonyAction, .importPanel'))return;for(const menu of topMenus)menu.open=false});
 document.addEventListener?.('keydown',event=>{if(event.key==='Escape')for(const menu of topMenus)menu.open=false});
}
