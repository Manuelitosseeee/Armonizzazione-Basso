// Complete reachability: no beam or candidate cap can discard a valid path.
// Keep bounded alternatives per terminal voicing, with shared predecessor links.
export function solveVoicingLayers({pools,initialValid,edge,edgeContext=()=>'',cost,finalValid=()=>true,limit=4,onProgress,pathClass=(p,c)=>Number(c.seventh||p?.category===1)}){
 const width=Math.max(1,limit),edgeCache=new Map();let evaluatedEdges=0;
 const id=c=>JSON.stringify([c.key,c.homeKey,c.root,c.inv,c.seventh,c.secondaryDegree,c.tonicizedDegree,c.voices,c.pcs,c.incompleteTonic,c.incompleteDominant,c.octaveRule,c.spellings]);
 const ids=new WeakMap();const identify=c=>{if(!ids.has(c))ids.set(c,id(c));return ids.get(c)};
 const accepts=(a,b,i)=>{const k=identify(a)+'>'+identify(b)+'|'+edgeContext(i);if(!edgeCache.has(k)){edgeCache.set(k,!!edge(a,b,i));evaluatedEdges++}return edgeCache.get(k)};
 const empty=pools.findIndex(p=>!p.length);if(empty>=0)return {paths:[],failure:empty,reason:'empty',evaluatedEdges};
 let layer=pools[0].filter(initialValid).map(c=>({c,paths:[{c,prev:null,cost:cost(null,c,0),category:pathClass(null,c)}]}));
 if(!layer.length)return {paths:[],failure:0,reason:'initial',evaluatedEdges};
 for(let i=1;i<pools.length;i++){
  const next=[];
  for(const c of pools[i]){
   const groups=new Map();
   for(const previous of layer){if(!accepts(previous.c,c,i))continue;
    for(const path of previous.paths){const category=pathClass(path,c,i),best=groups.get(category)||[];groups.set(category,best);const score=cost(path,c,i);if(best.length===width&&score>=best.at(-1).cost)continue;
     best.push({c,prev:path,cost:score,category});best.sort((a,b)=>a.cost-b.cost);if(best.length>width)best.pop();
    }
   }
   if(groups.size)next.push({c,paths:[...groups.values()].flat()});
  }
  const failedPredecessors=next.length?undefined:layer.map(x=>x.c);
  layer=next;onProgress?.({note:i+1,total:pools.length,reachable:layer.length});
  if(!layer.length)return {paths:[],failure:i,reason:'edge',evaluatedEdges,failedPredecessors};
 }
 const totals=new Map();const paths=layer.filter(x=>finalValid(x.c)).flatMap(x=>x.paths).sort((a,b)=>a.cost-b.cost).filter(p=>{const n=totals.get(p.category)||0;totals.set(p.category,n+1);return n<width*12}).map(path=>{
  const items=[];for(let p=path;p;p=p.prev)items.push(p.c);items.reverse();return {items,cost:path.cost};
 });
 return {paths,failure:pools.length-1,reason:paths.length?'':'final',evaluatedEdges};
}
