import {PALETTES} from './sito/public/editor/palettes.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runWrangler} from './attiva-login.mjs';
export const MUSIC_REQUIRED_ASSETS=['app/main.mjs','harmony.html','editor/editor.mjs','editor/model.mjs','editor/note-position.mjs','editor/export-score.mjs','editor/layout.mjs','editor/frame-render.mjs','editor/encoding.mjs','editor/import-score.mjs','editor/playback.mjs','editor/palettes.mjs','editor/editor.css','editor/vendor/verovio-toolkit-wasm.js','editor/fonts/Leland.otf','editor/fonts/glyphnames.json','vendor/jszip.min.js','fonts/NotoMusic-Regular.ttf',...new Set(PALETTES.map(p=>'editor/'+p.image))];
const defaultRoot=path.dirname(fileURLToPath(import.meta.url));
export async function update({root=defaultRoot,runner=runWrangler,log=console.log}={}){
 const projects=[];
 for(const folder of ['sito','pannello']){
  const dir=path.join(root,folder),config=await fs.readFile(path.join(dir,'wrangler.toml'),'utf8');
  const name=config.match(/^name\s*=\s*"([a-z0-9-]+)"/m)?.[1];
  if(!name||config.includes('INSERISCI'))throw Error('Configurazione incompleta: '+folder);
  for(const file of ['index.html','_worker.js',...(folder==='sito'?MUSIC_REQUIRED_ASSETS:[])])await fs.access(path.join(dir,'public',file));
  projects.push({dir,name});
 }
 for(const {dir,name} of projects){log('Aggiorno '+name);await runner(dir,['pages','deploy','public','--project-name',name,'--branch','main']);log('https://'+name+'.pages.dev');}
 log('Aggiornamento completato. Password del pannello e key esistenti conservate.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))update().catch(e=>{console.error(e.message);process.exitCode=1});
