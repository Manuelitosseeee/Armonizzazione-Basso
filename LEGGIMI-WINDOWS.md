# Armonizza su Cloudflare: sito, pannello privato e copia offline

Il pacchetto è già costruito. Non devi eseguire npm install o una build per pubblicare.
Il sito su GPT Sites non è stato modificato e non riceve la protezione con key.

Contenuto:
- sito/: applicazione musicale, accesso con key e verifica server di tutti i file.
- pannello/: amministrazione riservata alla tua email, protetta da email e password privata.
- offline/index.html: edizione autonoma con font, pianoforte, librerie e motore incorporati.
- server/, schema.sql, tests/, music-tests/: sorgenti del controllo accessi e test.
- omr-netlify-opzionale/: backend Audiveris opzionale per riconoscere PDF e immagini.

## 1. Preparazione, una volta sola

Installa Node.js 24 da https://nodejs.org/ e riapri il CMD.
Estrai la cartella armonizza-cloudflare, per esempio in C:\Armonizza.
In questa guida C:\Armonizza contiene CONFIGURA.cmd, sito e pannello: se c'è una cartella aggiuntiva entra in quella.

Apri CMD e scrivi:

```bat
cd /d C:\Armonizza
npx wrangler@4 login
npx wrangler@4 d1 create armonizza-accessi
```

Il primo comando Wrangler apre il browser: accedi al tuo account Cloudflare.
Il secondo crea il database. Copia il suo database_id, un identificatore con trattini.
Se esiste già un database omonimo, usa il suo ID (npx wrangler@4 d1 list).

Avvia:

```bat
node configura.mjs
```

Inserisci l'ID del database e la tua email. Non viene chiesto nessun Team Access o AUD.
Il configuratore genera nomi unici per i due progetti e i due comandi PUBBLICA-SITO.cmd e PUBBLICA-PANNELLO.cmd.
Non inserire password o API token nel configuratore. Autorizza Wrangler solo sul tuo PC.

## 2. Creazione delle tabelle e pubblicazione

Dal CMD:

```bat
cd /d C:\Armonizza\sito
npx wrangler@4 d1 execute armonizza-accessi --remote --file schema.sql
cd ..
PUBBLICA-SITO.cmd
PUBBLICA-PANNELLO.cmd
```

Wrangler potrebbe chiedere di creare il progetto: scegli la creazione e usa main come ramo di produzione.
Tabelle e dati delle key sono condivisi da entrambi i progetti tramite lo stesso database D1.
Gli indirizzi saranno https://armonizza-sito-XXXXXX.pages.dev e https://armonizza-pannello-XXXXXX.pages.dev.
Wrangler li mostra dopo il caricamento. XXXXXX è il suffisso scelto automaticamente.
Il sito musicale ora mostra il login. Il pannello resta chiuso finché completi il prossimo passo: è previsto.
Usa esclusivamente le cartelle public dei due progetti per i contenuti pubblicati; non caricare offline o l'intero pacchetto sul sito musicale.

## 3. Login del pannello, senza Zero Trust

Nella cartella principale esegui ATTIVA-LOGIN.cmd con doppio clic, oppure dal CMD:

```bat
cd /d C:\Armonizza
ATTIVA-LOGIN.cmd
```

Il comando genera una password casuale forte, la invia al progetto del pannello come secret ADMIN_PASSWORD tramite Wrangler e ripubblica il pannello.
Mostra email e password nella finestra del CMD: copiale e conservale nel tuo gestore password prima di chiudere la finestra.
La password non è salvata in file locali e non viene incorporata in HTML/JavaScript pubblici. Non devi creare un account Zero Trust o inserire dati di pagamento per attivare questo login.
Accedi all'indirizzo principale del pannello, con l'email già configurata e la password mostrata dal comando.
La tabella delle sessioni amministratore viene creata automaticamente al primo accesso riuscito: non serve rifare le tabelle o il database esistente.

Le sessioni del pannello durano 8 ore e sono conservate sul server come hash di token casuali. Il cookie è HttpOnly, Secure e SameSite=Strict; le richieste di scrittura controllano l'origine e i tentativi di login sono limitati per IP.
La password generata ha 192 bit casuali; è una credenziale segreta ad alta entropia, non una password debole scelta da un utente. Non sostituirla con una parola o una frase comune.
Il codice confronta i digest della password in tempo costante. Non è previsto alcun endpoint pubblico di registrazione o di creazione amministratori.
“Esci dal pannello” revoca la sessione sul database e cancella il cookie. Eseguire di nuovo ATTIVA-LOGIN.cmd crea una nuova password e invalida tutte le sessioni precedenti.
Se avevi già attivato una policy Cloudflare Access sul dominio del pannello, disabilitala nel dashboard per usare direttamente questo login.

### Aggiornamento dalla versione precedente

Estrai armonizza-aggiornamento-login.zip nella cartella che contiene armonizza-cloudflare, sovrascrivendo i file richiesti.
Il pacchetto aggiornamento non contiene wrangler.toml o config-locale.json: conserva nomi dei progetti, database ed email già impostati.
Esegui ATTIVA-LOGIN.cmd dalla cartella armonizza-cloudflare. Non rifare il database, il configuratore o il sito musicale.

## 4. Uso delle key

“Crea e autorizza una key” offre:
- nome, scadenza facoltativa, stato autorizzata/sospesa;
- massimo dispositivi e massimo sessioni;
- qualsiasi IP, primo IP usato oppure IP esatto;
- qualsiasi dispositivo oppure primo dispositivo usato.

La key completa appare una sola volta. Copiala e consegnala all'utilizzatore.
Il database conserva solamente il suo hash: se perdi la key creane un'altra e sospendi la vecchia.
Per associare un dispositivo preciso: accedi dal browser desiderato con la key, apri il pannello e premi “Vincola key a questo” sul dispositivo registrato.
Un dispositivo revocato può essere riautorizzato dal pannello, entro il limite impostato.
Una key creata sospesa non permette alcun accesso fino alla tua autorizzazione.

Nelle sessioni puoi vedere attività, dispositivo, IP attuale e storico degli IP, revocare una sessione o mantenere solo quella scelta.
Nei dispositivi puoi revocare, riautorizzare o mantenere solo quello scelto.
“Vincola key a questo IP” impone l'IP selezionato a tutte le richieste successive.
“Sospendi key” blocca l'intera key. “Revoca tutte le sessioni” richiede un nuovo login, mantenendo valida la key.
Il registro elenca le operazioni amministrative. Le sessioni vengono mostrate fino alle 2.000 più recenti, lo storico IP fino a 4.000 righe.
Le impostazioni possono essere modificate aprendo la key e premendo “Salva impostazioni”.
I limiti impediscono nuovi accessi oltre il tetto. Se abbassi un limite sotto il numero già autorizzato, usa anche i comandi di revoca per ridurre gli accessi esistenti.

Le sessioni scadono dopo 7 giorni. Le schede dello stesso profilo browser condividono cookie/sessione; un nuovo login nello stesso browser sostituisce la sessione precedente.
“Online” significa attività negli ultimi 90 secondi; non prova che una persona stia guardando lo schermo.
Ogni richiesta di file/API verifica la licenza. Una pagina già aperta ricontrolla ogni 30 secondi e torna al login se la sessione è revocata o la rete non è raggiungibile.
Il calcolo musicale avviene nel browser: revocare l'accesso non può cancellare codice già scaricato né impedire a qualcuno di averne conservato una copia.

Un dispositivo è un profilo browser identificato da un cookie segreto, non un'identità hardware certificata.
Cambiare browser, modalità privata o cancellare i cookie crea un nuovo dispositivo. Copiare deliberatamente entrambi i cookie può clonare una sessione; non è una protezione DRM.
Un IP può cambiare con rete mobile, VPN o router; più persone possono condividere lo stesso IP pubblico. Il vincolo IP è esatto, IPv4 o IPv6, e non usa l'IP dichiarato dal client.
Per un solo utilizzatore è pratico impostare massimo 1 dispositivo e 1 sessione, con primo dispositivo. Aggiungi il vincolo IP solo se la sua rete è stabile.

## 5. PDF e immagini: collegamento OMR opzionale

Armonizzazione, generazione, scrittura, modulazioni, playback, esportazioni e import MuseScore/MusicXML girano nell'applicazione.
Il riconoscimento delle scansioni dell'app attuale usa Audiveris/Java: quel runtime non viene eseguito da Cloudflare Pages.
Il sito Cloudflare contiene un proxy autenticato, ma serve un backend OMR esterno. Senza backend, le scansioni mostrano un messaggio chiaro e gli altri import restano disponibili.

Puoi continuare a usare il tuo backend Netlify già funzionante. Sul progetto Cloudflare del sito, imposta un secret OMR_URL con il suo endpoint HTTPS completo, per esempio https://motore.netlify.app/api/omr.
Se vuoi un servizio OMR separato e protetto, pubblica la cartella omr-netlify-opzionale tramite build Netlify (npm run build, publish dist; le configurazioni sono incluse).
Imposta sul backend Netlify OMR_PROXY_TOKEN con una stringa lunga casuale. Imposta lo stesso valore come secret OMR_TOKEN sul sito Cloudflare.
Questo backend opzionale controlla il token prima di avviare l'OMR; il token non viene inviato al browser.
Esegui dal CMD dentro sito, sostituendo NOME-PROGETTO con il nome effettivo:

```bat
npx wrangler@4 pages secret put OMR_URL --project-name NOME-PROGETTO
npx wrangler@4 pages secret put OMR_TOKEN --project-name NOME-PROGETTO
```

I comandi chiedono i valori senza scriverli nei file del progetto. Dopo averli aggiunti ripubblica il sito.
Non impostare il token sul vecchio servizio usato da GPT Sites se vuoi che quel collegamento continui a funzionare senza modifiche; usa un backend separato per Cloudflare.
Il motore parte quando importi una scansione. Il proxy associa ciascun job alla key che l'ha creato e impedisce alle altre key di leggerlo o annullarlo.
Il pacchetto non include un account Netlify, un backend OMR già avviato o un runtime Java eseguibile su Cloudflare. Il backend opzionale richiede una build Netlify e ha i suoi consumi.

## 6. Offline

Apri offline\index.html con doppio clic in Chrome o Edge aggiornato. Non serve un server, CMD, una key o una connessione.
Sono incorporati font musicali, librerie per ZIP/PDF, campioni del pianoforte e worker del motore armonico.
Sono disponibili le funzioni musicali del sito e gli import MuseScore/MusicXML, incluso MSCZ/MXL, con esportazione PDF/MIDI/MusicXML locale.
Le impostazioni e gli esercizi vengono conservati nel browser: esporta anche i tuoi spartiti per conservarli come file.

Due eccezioni reali:
1. PDF e immagini non vengono trasformati automaticamente in note offline: serve un motore OMR locale, non incluso in un solo HTML. L'app segnala questa limitazione; non produce note inventate.
2. Monitoraggio IP, autorizzazioni e revoche a distanza richiedono internet e non valgono per questa copia offline.

La cartella offline è una copia privata da distribuire solo a chi vuoi dare uso indipendente dal controllo online. Non caricarla nella cartella public del sito protetto.
Per avere anche OMR offline bisogna preparare un pacchetto desktop con Java/Audiveris e relativo collegamento locale; non è implementato in questa consegna.

## 7. Test e controlli dopo il deploy

In locale, con Node 24:

```bat
cd /d C:\Armonizza
npm test
```

I test non richiedono dipendenze npm. Verificano il backend con SQLite, sessioni private dell’amministratore, limiti, revoche, IP, CSRF, isolamento OMR e documento offline incorporato, oltre ai test musicali del progetto.
Il database SQLite del test è in memoria e non tocca il database Cloudflare.

Controllo sul tuo account:
1. In incognito apri il sito e anche /app/main.mjs: entrambi devono rimandare al login.
2. Accedi con una key nuova, scrivi/armonizza/ascolta ed esporta uno spartito.
3. Con massimo 1 dispositivo, un secondo browser deve essere rifiutato; nel primo puoi riaccedere.
4. Sospendi o revoca la sessione dal pannello: la pagina aperta deve tornare al login entro circa 30 secondi, salvo throttling delle schede in background.
5. Prova un IP fisso dalla rete autorizzata e da una rete diversa: la seconda deve essere bloccata.
6. Prova ad accedere al pannello con un'altra email: non deve funzionare.
7. Apri offline/index.html con la rete disconnessa e prova armonizzazione, audio e tutti e tre gli export.
8. Se hai collegato OMR, prova una scansione sul sito e verifica che un'altra key non possa accedere al job.

Il deploy reale, le configurazione del tuo account e l'apertura file:// nel tuo browser Windows non sono stati verificati da qui. I test automatici eseguiti sono nel file risultati-test.txt.

## Sorgenti e ricostruzione

Tutti i sorgenti dell'app musicale sono in sito/public/app; il backend comune è server/worker.mjs e il pannello è server/admin.html.
Per rigenerare i worker dei due siti e il documento offline:

```bat
npm install
npm run build
npm test
```

La build conserva wrangler.toml esistenti. Usa Node 24. Non usare file _routes.json che escludono asset: tutti i percorsi devono passare dalla verifica sul server.
Per aggiornare i siti, riesegui PUBBLICA-SITO.cmd e PUBBLICA-PANNELLO.cmd. Per cambiare account/DB/email, usa CONFIGURA.cmd e ripubblica.
Non pubblicare i sorgenti offline o i file di configurazione contenenti eventuali credenziali in cartelle accessibili dal sito.

Documentazione ufficiale verificata:
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/workers/wrangler/commands/pages/
