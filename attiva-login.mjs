import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomBytes} from 'node:crypto';import {spawn} from 'node:child_process';
const defaultRoot=path.dirname(fileURLToPath(import.meta.url));
export function runWrangler(dir,args,input){return new Promise((resolve,reject)=>{const argv=['--yes','wrangler@4',...args],windows=process.platform==='win32';const child=spawn(windows?'cmd.exe':'npx',windows?['/d','/s','/c','npx '+argv.join(' ')]:argv,{cwd:dir,stdio:[input?'pipe':'inherit','inherit','inherit']});if(input){child.stdin.on('error',reject);child.stdin.end(input+'\n')}child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Wrangler non è riuscito. Correggi l’errore mostrato sopra e riesegui ATTIVA-LOGIN.cmd.')))});}
export async function activate({root=defaultRoot,runner,log=console.log}={}){
 const dir=path.join(root,'pannello'),text=await fs.readFile(path.join(dir,'wrangler.toml'),'utf8'),project=text.match(/^name\s*=\s*"([a-z0-9-]+)"/m)?.[1],email=text.match(/^ADMIN_EMAIL\s*=\s*"([^"\r\n]+)"/m)?.[1];
 if(!project||!email||email.includes('INSERISCI'))throw Error('Configura prima database ed email con CONFIGURA.cmd.');
 const password='AR-admin-'+randomBytes(24).toString('base64url'),run=runner||((args,input)=>runWrangler(dir,args,input));
 log('Imposto la password privata sul progetto '+project+'.');
 await run(['pages','secret','put','ADMIN_PASSWORD','--project-name',project],password);
 log('\nSALVA QUESTE CREDENZIALI PRIMA DI CHIUDERE QUESTA FINESTRA:');
 log('Email: '+email);log('Password: '+password);log('La password non viene salvata nei file locali. Se ripeti questo comando, cambia e invalida le sessioni precedenti.\n');
 await run(['pages','deploy','public','--project-name',project,'--branch','main']);
 log('\nApri https://'+project+'.pages.dev e accedi con le credenziali appena mostrate.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await activate();
