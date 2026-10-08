import test from 'node:test';import assert from 'node:assert/strict';import {Worker} from 'node:worker_threads';
import {tonalIssues} from '../sito/public/app/tonal.mjs';
async function run(args){
 const url=new URL('../sito/public/app/solver-worker.mjs',import.meta.url).href;
 const worker=new Worker(`const{parentPort}=require('node:worker_threads');globalThis.self={postMessage:data=>parentPort.postMessage(data)};(async()=>{await import(${JSON.stringify(url)});parentPort.on('message',data=>self.onmessage({data}))})();`,{eval:true});
 const messages=[];
 try{return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Il worker non ha terminato entro 30 secondi')),30000);worker.on('error',e=>{clearTimeout(timer);reject(e)});worker.on('message',m=>{messages.push(m);if(m.error){clearTimeout(timer);reject(Error(m.error))}else if(m.result){clearTimeout(timer);resolve({result:m.result,messages})}});worker.postMessage(args)})}finally{await worker.terminate()}
}
test('worker reale: avanzamento e risultato completo sul basso lungo in Si minore',async()=>{
 const bass=[47,49,50,52,54,55,52,50,49,47,52,52,52,50,47,55,54,59,59,52,54,47,52,54,47],args={bass,key:'Si minore',level:3,seventhsEnabled:true,allowedSevenths:[1,4],modulationMode:'manual',harmonicRequests:{23:{root:4,inv:0},24:{root:0,inv:0}}};
 const{result,messages}=await run(args);assert.ok(messages.some(m=>m.progress));assert.ok(result.solutions.length);for(const s of result.solutions){assert.equal(s.length,bass.length);for(let i=0;i<s.length;i++)assert.deepEqual(tonalIssues(s[i-1],s[i],args.key,3),[])}assert.ok(messages.at(-1).result);
});
test('diagnosi eseguita nel worker e restituita quando i blocchi sono incompatibili',async()=>{
 const{result,messages}=await run({bass:[48,53,55,48],key:'Do maggiore',level:1,modulationMode:'off',locks:{2:{3:61}}});assert.equal(result.solutions.length,0);assert.match(result.assessment.message,/bloccate/);assert.ok(messages.some(m=>m.progress?.phase==='diagnosis'));
});

test('worker reale: il rapporto utente di 73 note produce quattro soluzioni complete',async()=>{
 const fs=await import('node:fs'),args=JSON.parse(fs.readFileSync(new URL('./fixtures/basso-73-modulazioni.json',import.meta.url))),before=structuredClone(args),{result,messages}=await run(args);
 assert.equal(result.solutions.length,4);assert.deepEqual(args,before);assert.ok(messages.some(m=>m.progress?.note===73));
 for(const s of result.solutions){assert.deepEqual(s.map(c=>c.voices[0]),args.bass);assert.deepEqual(s.slice(23,25).map(c=>[c.root,c.inv]),[[4,0],[0,0]]);s.forEach((c,i)=>assert.deepEqual(tonalIssues(s[i-1],c,args.key,3,{preparationUnits:args.durations[i-1],minimumPreparationUnits:16}),[]));}
});

test('worker reale: scansione settime globale, anteprima IV II7 V7 I e avanzamento',async()=>{
 const {harmonizeTonal}=await import('../sito/public/app/tonal.mjs');const args={bass:[53,50,55,48],key:'Do maggiore',level:1,meter:'4/4',durations:[16,16,16,16]},solution=harmonizeTonal(args).solutions[0],{result,messages}=await run({action:{kind:'automaticSevenths',args,solution,degrees:[1,4]}});
 assert.ok(result.proposals.length);const p=result.proposals[0];assert.deepEqual(p.solution.map(c=>[c.root,c.seventh]),[[3,false],[1,true],[4,true],[0,false]]);assert.ok(messages.some(m=>m.progress));assert.deepEqual(p.bass,args.bass);
});
