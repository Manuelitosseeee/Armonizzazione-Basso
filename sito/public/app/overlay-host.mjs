export function modalHost(panel,app){
 let home=null,next=null,background=[];
 return {
 open(target){background=[];home=panel.parentNode;next=panel.nextSibling;if(target&&target!==home){target.append(panel);let child=panel,parent=target;while(parent){for(const sibling of Array.from(parent.children||[]))if(sibling!==child){background.push([sibling,!!sibling.inert]);sibling.inert=true}if(parent===app)break;child=parent;parent=parent.parentNode}}else{background.push([app,!!app.inert]);app.inert=true}},
 close(){for(const [node,inert]of background)node.inert=inert;background=[];if(home&&panel.parentNode!==home){if(next&&next.parentNode===home)home.insertBefore(panel,next);else home.append(panel)}home=null;next=null}
 };
}
