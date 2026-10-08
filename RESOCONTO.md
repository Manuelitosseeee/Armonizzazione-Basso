# Aggiornamento del login amministratore

Sostituito Cloudflare Access con login privato email/password. Non è richiesto Zero Trust per questo login.
La password è generata sul PC con 192 bit casuali, inviata a Cloudflare come secret ADMIN_PASSWORD e mostrata all'utente per conservarla; non è inserita nei file frontend né nei file locali.
ATTIVA-LOGIN.cmd imposta il secret e ripubblica il pannello esistente, usando il suo wrangler.toml. Non ricrea il database e non cambia le key.
Le sessioni amministratore hanno token casuali di 256 bit conservati come hash sul database, cookie HttpOnly/Secure/SameSite, scadenza di 8 ore, controllo dell'origine delle scritture, tentativi di login limitati e revoca al logout.
Cambiare la password invalida le sessioni precedenti. La tabella delle sessioni viene creata automaticamente al primo login valido, anche sul database della prima versione.
Il pannello mantiene tutte le funzioni di gestione delle key, dispositivi, sessioni, IP e registro.
Le sessioni/key del sito musicale restano separate da quelle dell'amministratore.

Verifica: 208 test automatici passati, nessun fallimento. Comprende 25 test di accesso, confezionamento offline e attivazione e 183 test musicali/import/esportazione.
Il comando di attivazione è verificato con un runner simulato: controlla ordine delle operazioni, passaggio del secret separato dagli argomenti, password casuale e assenza di file password locali. Non è stata eseguita una pubblicazione sul tuo account.
Dettaglio in risultati-test.txt e risultati-login-test.txt.
La pubblicazione reale con Wrangler e il CMD Windows dell'utente non sono stati verificati qui. Il codice musicale e la versione offline non sono stati modificati per questo aggiornamento.
Il sito GPT Sites non è stato modificato o ripubblicato.

Limiti invariati: OMR per immagini/PDF richiede un backend esterno; le revoche online non valgono per copie offline e non cancellano codice già scaricato. I dispositivi sono profili browser, non identità hardware certificate.
