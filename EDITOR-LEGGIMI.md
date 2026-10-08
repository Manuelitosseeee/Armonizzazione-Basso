# Editor partiture — aggiornamento di sviluppo

Il sito ora apre l’editor dopo l’accesso con la key. L’armonizzatore precedente è in `sito/public/harmony.html`: i suoi controlli e la loro disposizione sono conservati. Un collegamento consente di tornare alla partitura salvata nell’editor.

## Funzioni già costruite

- Archivio locale: nuove partiture, apertura, duplicazione, salvataggio automatico, eliminazione, esportazione del progetto JSON.
- Due pentagrammi iniziali e aggiunta di altri; quattro voci per pentagramma, note, accordi, pause, durate, punto, terzine, alterazioni, legature, annulla/ripristina, copia/incolla e proprietà.
- Barra delle note e menu Pause con gli stessi simboli Unicode, font Noto Music e ordine dei valori dell’armonizzatore.
- Le 18 categorie delle foto, con 262 comandi mappati. Le icone delle tavolozze provengono dalle immagini di riferimento. L’incisione della partitura usa Verovio e il font musicale Leland; non viene simulata ritagliando note dalla foto.
- Abbellimenti prima/dopo la nota con altezze modificabili, trilli, mordenti, arpeggi, glissandi, tremoli semplici e fra due figure adiacenti, respiri, articolazioni, dinamiche, ottave, pedale, testi, chiavi, armature, metri, stanghette e interruzioni di sistema/pagina.
- Spaziatori verso l’alto e verso il basso fra pentagrammi adiacenti: distanza minima in millimetri, applicata al sistema della battuta selezionata, proprietà modificabili, eliminazione e annulla/ripristina. I sistemi successivi tornano alla distanza normale.
- Cornici verticali e di testo prima della battuta selezionata: altezza minima, testo su più righe, dimensione e allineamento, eliminazione e annulla/ripristina. I sistemi musicali sono incisi dal motore originale e spostati interi; se lo spazio non basta iniziano un nuovo foglio A4. Le guide delle cornici non appaiono in stampa.
- Ascolto al pianoforte con variazioni di volume, tempo, pedale, abbellimenti e ripetizioni. Alcune interpretazioni sono approssimate; non è ancora il motore di esecuzione di MuseScore.
- Importazione di progetti JSON, MusicXML/MXL e una prima importazione MuseScore MSCX/MSCZ. Esportazione MusicXML e stampa/PDF tramite il browser.
- «Passa ad armonizzazione automatica» trasferisce il basso del pentagramma e della voce scelti, usando la nota più grave degli accordi. Conserva pause, durate, tonalità e cambi di armatura; mantiene una copia dello stato precedente dell’armonizzatore. Il ritorno all’editor riapre la partitura originale, senza sincronizzare le modifiche fatte nell’armonizzatore.

## Verifiche e limiti attuali

L’ultima verifica ha superato 654 test (289 dell’armonizzatore/accesso e 365 dell’editor). I test automatici comprendono incisione con il motore reale, comandi delle palette, abbellimenti su varie durate e tonalità, MusicXML di andata/ritorno, archivio, operazioni DOM dell’editor e regressioni dell’armonizzatore. I test che verificano il rifiuto di operazioni non supportate non dimostrano che queste siano implementate.

Questa versione non ha ancora la parità completa con MuseScore 4 e non è certificata come copia visiva identica delle foto. Restano bloccati lo spaziatore fisso, la cornice orizzontale e la cornice di misura; «Proprietà della partitura» apre il suo pannello. Alcune varianti grafiche di pedali, arpeggi, respiri, ornamenti e stanghette condividono per ora la stessa rappresentazione. «Altro» elenca gli elementi mappati, non l’intero catalogo aggiuntivo di MuseScore.

Accelerando/rallentando, swing, equivalenze metriche e cambi di strumento non hanno ancora l’esecuzione completa. Le volte estese, coda e salti complessi richiedono altri confronti. L’importazione MuseScore avvisa del suo stato sperimentale: alcune linee e impostazioni non sono conservate. Punti multipli e gruppi irregolari diversi dalle terzine vengono rifiutati per evitare alterazioni silenziose del ritmo. Per i gruppi irregolari di MuseScore, usare intanto un’esportazione MusicXML.

Il layout manuale usa sistemi deterministici di quattro battute, con interruzioni e giunzioni modificabili; una cornice avvia un sistema prima della sua battuta. Lo spazio massimo complessivo delle cornici di una battuta è 150 mm. Il testo molto lungo viene rifiutato se supera tale limite. Gli spaziatori verticali richiedono due pentagrammi adiacenti: non sono ancora implementati quelli esterni al primo o all’ultimo pentagramma. Il MusicXML conserva tutte le proprietà delle cornici in metadati dell’editor e include la distanza verticale standard; la ricostruzione delle cornici in MuseScore o altri programmi non è ancora equivalente alla stampa del nostro editor.

L’armonizzatore mantiene i limiti ritmici precedenti: rifiuta il trasferimento di terzine, frammenti inferiori a 1/64 e cambi di metrica. Una voce priva di note apre invece l’armonizzatore vuoto. Il PDF scaricabile conserva i simboli nativi tramite immagini ad alta risoluzione delle pagine; non è un PDF vettoriale. Le partiture dell’archivio restano nel browser: esportare il progetto JSON per conservarlo o spostarlo.

Le regole responsive sono presenti, ma le verifiche visuali e le interazioni in un browser reale su desktop/mobile sono ancora da completare: il browser di verifica non ha potuto collegarsi al server locale. Non usare questa versione come aggiornamento definitivo del sito di produzione prima di tale verifica.

Il file MuseScore di riferimento servirà per identificare ogni variante di simbolo e creare casi di confronto, senza inventarne la forma. Gli esempi in `esempi-editor/` sono generati dal nuovo motore, non sono screenshot dell’interfaccia.

## Prova locale e aggiornamento

1. Per aprire l’editor in locale: `python -m http.server 5179 --directory sito/public`, quindi visitare `http://localhost:5179`.
2. Per sviluppare e verificare: `npm ci`, `npm test`, `npm run build`.
3. Per un aggiornamento Cloudflare, conservare le configurazioni `wrangler.toml` dei due progetti già esistenti. Il pacchetto non contiene configurazioni personali. Usare la procedura di aggiornamento già fornita solo dopo le verifiche di questa versione.
4. La versione `offline/index.html` continua ad essere l’armonizzatore precedente. L’editor richiede un server locale o il sito; non è incluso nell’HTML offline autonomo.

## Componenti originali e licenze

Verovio 6.3.0, commit 425dd7b, è caricato come libreria separata. Le licenze originali e il README sono in `sito/public/editor/vendor/`. I suoi sorgenti corrispondenti sono inclusi in `third-party/verovio-source-425dd7b.tar.gz` e disponibili anche in https://github.com/rism-digital/verovio/tree/425dd7b.

Leland e i metadati del font provengono da https://github.com/MuseScoreFonts/Leland, con licenza originale in `sito/public/editor/fonts/OFL.txt`. Il dizionario SMuFL proviene da https://github.com/w3c-cg/smufl; il riferimento della specifica e della sua licenza è https://www.w3.org/2021/03/smufl14/preamble/license.html.

Restano incluse le attribuzioni originali dei campioni Salamander e degli altri componenti del sito. Questa è una nuova implementazione web: il motore desktop di MuseScore 4 non è incorporato.
