import {proposeAutomaticSevenths} from './automatic-sevenths.mjs';
import {proposeHarmonyEdit} from './actions.mjs';
import {diagnoseNoSolution} from './engine.mjs';
import {harmonizeTonal} from './tonal.mjs';
self.onmessage=({data})=>{
 let lastProgress=0;
 const onProgress=p=>{const now=Date.now();if(p.phase||now-lastProgress>100||p.note===p.total){lastProgress=now;self.postMessage({progress:p})}};
 self.postMessage({progress:{note:1,total:data.bass?.length||data.action?.args?.bass?.length||1}});
 try{
  const result=data.action?(data.action.kind==='automaticSevenths'?proposeAutomaticSevenths:proposeHarmonyEdit)({...data.action,args:{...data.action.args,onProgress}}):harmonizeTonal({...data,onProgress});
  if(!data.action&&!result.solutions.length&&!result.diagnosis&&!data.secondaryEnabled&&(!data.modulationMode||data.modulationMode==='off')&&!data.tonalEvents?.length&&!data.harmonicRequests){self.postMessage({progress:{phase:'diagnosis'}});result.assessment=diagnoseNoSolution(data)}
  self.postMessage({result});
 }
 catch(error){self.postMessage({error:error.message})}
};
