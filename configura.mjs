import {createInterface} from 'node:readline/promises';import {stdin,stdout} from 'node:process';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';import {randomBytes} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),rl=createInterface({input:stdin,output:stdout});let old={};try{old=JSON.parse(await fs.readFile(path.join(root,'config-locale.json'),'utf8'))}catch{}
async function ask(label,value,valid){while(true){const answer=(await rl.question(label+(value?' ['+value+']':'')+': ')).trim()||value||'';if(valid(answer))return answer;console.log('Valore non valido, riprova.')}}
try{const database=await ask('ID database D1 (database_id)',old.database,s=>/^[a-f0-9-]{36}$/.test(s));const email=await ask('La tua email amministratore',old.email,s=>/^[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+$/.test(s));const suffix=old.suffix||randomBytes(3).toString('hex');for(const [dir,mode]of [['sito','music'],['pannello','admin']]){await fs.writeFile(path.join(root,dir,'wrangler.toml'),`name = "armonizza-${dir}-${suffix}"
pages_build_output_dir = "./public"
compatibility_date = "2026-10-01"
[vars]
APP_MODE = "${mode}"
${mode==='admin'?`ADMIN_EMAIL = ${JSON.stringify(email)}\n`:''}
[[d1_databases]]
binding = "DB"
database_name = "armonizza-accessi"
database_id = "${database}"
`);const name=`armonizza-${dir}-${suffix}`;await fs.writeFile(path.join(root,`PUBBLICA-${dir.toUpperCase()}.cmd`),`@echo off\r\nsetlocal\r\ncd /d "%~dp0${dir}"\r\ncall npx --yes wrangler@4 pages deploy public --project-name ${name} --branch main\r\npause\r\nendlocal\r\n`);}await fs.writeFile(path.join(root,'config-locale.json'),JSON.stringify({database,email,suffix},null,2));console.log('\nConfigurazione salvata. Nomi progetti: armonizza-sito-'+suffix+' e armonizza-pannello-'+suffix+'.');console.log('Se richiesto da Wrangler scegli Create a new project e ramo main.');console.log('Per attivare il login del pannello esegui ATTIVA-LOGIN.cmd.');}finally{rl.close()}
