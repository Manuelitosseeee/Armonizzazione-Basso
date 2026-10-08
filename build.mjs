import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);let build;try{({build}=require('esbuild'))}catch{({build}=require('../armonizza-current/node_modules/esbuild'))}
const root=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(root,'sito/public');
for(const dir of ['sito','pannello']){await fs.mkdir(path.join(root,dir,'public'),{recursive:true});await fs.copyFile(path.join(root,'server/worker.mjs'),path.join(root,dir,'public/_worker.js'));await fs.writeFile(path.join(root,dir,'public/_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]}));await fs.copyFile(path.join(root,'schema.sql'),path.join(root,dir,'schema.sql'));if(!await fs.access(path.join(root,dir,'wrangler.toml')).then(()=>true,()=>false))await fs.writeFile(path.join(root,dir,'wrangler.toml'),`name = "armonizza-${dir}"
pages_build_output_dir = "./public"
compatibility_date = "2026-10-01"
[vars]
APP_MODE = "${dir==='sito'?'music':'admin'}"
${dir==='pannello'?'ADMIN_EMAIL = "INSERISCI_LA_TUA_EMAIL"\n':''}
[[d1_databases]]
binding = "DB"
database_name = "armonizza-accessi"
database_id = "INSERISCI_ID_DATABASE"
`);}
await fs.rm(path.join(root,'sito/public/_headers'),{force:true});
let html=await fs.readFile(path.join(source,'harmony.html'),'utf8');
const gate=`<script data-access-gate>const exit=document.createElement('button');exit.textContent='Esci';exit.dataset.accessExit='true';exit.type='button';exit.onclick=async()=>{await fetch('/api/auth/logout',{method:'POST'});location.replace('/login')};document.querySelector('.appToolbar').append(exit);setInterval(async()=>{try{const r=await fetch('/api/auth/session',{cache:'no-store'});if(!r.ok)location.replace('/login')}catch{location.replace('/login')}},30000);</script>`;
html=html.replace(/<script(?: data-access-gate)?>[^<]*fetch\('\/api\/auth\/session'[\s\S]*?<\/script>/g,'');
await fs.writeFile(path.join(root,'sito/public/harmony.html'),html.replace('</body>',()=>gate+'</body>'));
await fs.writeFile(path.join(root,'pannello/public/index.html'),await fs.readFile(path.join(root,'server/admin.html')));
const worker=(await build({entryPoints:[path.join(source,'app/solver-worker.mjs')],bundle:true,format:'iife',write:false,minify:true})).outputFiles[0].text;
const samples={};for(const name of await fs.readdir(path.join(source,'samples')))if(name.endsWith('.mp3'))samples[name.slice(0,-4)]='data:audio/mpeg;base64,'+(await fs.readFile(path.join(source,'samples',name))).toString('base64');
const bundle=(await build({entryPoints:[path.join(source,'app/main.mjs')],bundle:true,format:'iife',write:false,minify:true,plugins:[{name:'offline',setup(b){b.onLoad({filter:/main\.mjs$/},async a=>({loader:'js',contents:(await fs.readFile(a.path,'utf8')).replace("new URL('./solver-worker.mjs?v=20261007-cifrature-settime-1',import.meta.url)",'globalThis.AR_OFFLINE_WORKER')}));b.onLoad({filter:/piano\.mjs$/},async a=>({loader:'js',contents:'const embeddedSamples='+JSON.stringify(samples)+';\n'+(await fs.readFile(a.path,'utf8')).replace('fetch(`./samples/${name}.mp3`)','fetch(embeddedSamples[name])')}));b.onLoad({filter:/omr-client\.mjs$/},async a=>({loader:'js',contents:(await fs.readFile(a.path,'utf8')).replace("if(inputKind(file)!=='scan')", "throw Error('Edizione offline: per PDF e immagini serve un motore OMR locale. Importa MuseScore/MusicXML oppure usa il sito online con OMR collegato.');\n if(inputKind(file)!=='scan')").replace('try{return await answer(await (options.fetchImpl',"try{throw Error('Il riconoscimento delle scansioni richiede un motore OMR.');return await answer(await (options.fetchImpl")}));}}]})).outputFiles[0].text;
const font='data:font/ttf;base64,'+(await fs.readFile(path.join(source,'fonts/NotoMusic-Regular.ttf'))).toString('base64');
html=html.replace(/<link rel="stylesheet" href="([^"]+)"\s*>/g,(_,href)=>`<style data-offline="${href.split('?')[0]}"></style>`);
for(const name of ['style','studio','personalization','reference-layout']){const css=(await fs.readFile(path.join(source,`app/${name}.css`),'utf8')).replace('../fonts/NotoMusic-Regular.ttf',font);html=html.replace(`<style data-offline="app/${name}.css"></style>`,`<style>${css}</style>`);}
const safe=s=>s.replace(/<\/script/gi,'<\\/script');const zipCode=await fs.readFile(path.join(source,'vendor/jszip.min.js'),'utf8');
html=html.replace('<script defer src="vendor/jszip.min.js"></script>',()=>`<script>${safe(zipCode)}</script>`).replace(/<script type="module" src="app\/main.mjs[^\"]*"><\/script>/,()=>`<script>${safe(`globalThis.AR_OFFLINE_WORKER=URL.createObjectURL(new Blob([${JSON.stringify(worker)}],{type:'text/javascript'}));`+bundle)}</script>`);
html=html.replace(/<a class="editor-return"[\s\S]*?<\/a><style>\.editor-return[\s\S]*?<\/style>/,'');
html=html.replace('<div class="referenceTitle">Armonizza basso</div>','<div class="referenceTitle">Armonizza basso · offline</div>');await fs.writeFile(path.join(root,'offline/index.html'),html);await fs.cp(path.join(source,'fonts/OFL.txt'),path.join(root,'offline/LICENZA-FONT.txt'));await fs.cp(path.join(source,'samples'),path.join(root,'offline/licenze-campioni'),{recursive:true,filter:p=>!p.endsWith('.mp3')});
console.log('Creati sito, pannello e offline/index.html');
