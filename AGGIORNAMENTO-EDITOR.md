# Aggiornamento: inserimento, voci, trasferimento ed esportazione

Questo pacchetto contiene il codice aggiornato e costruito. Non è ancora la versione completa richiesta di MuseScore 4 e non è stato pubblicato sul sito di produzione.

Nuove correzioni: inserimento delle note con coordinate native del pentagramma e posizioni ritmiche incise; sostituzione nota–pausa–nota con clic durante la scrittura; divisione automatica delle figure tra battute, con legature per tutti i suoni dell’accordo e creazione delle battute necessarie. La scansione ritmica copre 7.168 combinazioni di metrica, valore, punto e posizione, sia per note sia per pause.

Il passaggio all’armonizzatore apre uno stato vuoto quando pentagramma e voce scelti non contengono note; il vecchio stato viene conservato come copia di sicurezza. L’importazione distingue le voci 5–8 del secondo pentagramma di MuseScore e conserva le pause invisibili; l’incisione non aggiunge una voce 1 vuota o pause visibili per riempire gli altri livelli.

**File → Esporta…** offre MusicXML per MuseScore, MIDI, PDF completo scaricabile e progetto JSON. Per il PDF si può scegliere l’altezza dei righi: i righi più piccoli lasciano spazio a più sistemi per pagina. Il PDF usa le pagine incise dal motore originale, senza ridisegnare simboli, a circa 240 dpi; la densità effettiva dipende anche da numero di pentagrammi, cornici e distanze. Le metriche testuali sono escluse dal PDF. La stampa resta separata. **File → Apri** importa MSCZ/MSCX/MusicXML/MXL e mostra informazioni e avvisi prima di confermare l’apertura completa.

`esempi-editor/Note-legate.json` mostra una breve divisa in due semibrevi legate. Sono inclusi MusicXML, SVG, PNG e PDF prodotti dalla stessa incisione. Il controllo del PDF ha verificato la pagina A4 e il documento effettivo; la rasterizzazione SVG nel browser resta da verificare in un browser reale.

Correzioni precedenti: le tavolozze caricano le immagini originali con URL espliciti, senza dipendere da sfondi CSS; sono stati corretti anche coordinate, altezza e numero delle colonne dei ritagli delle 18 categorie; la barra note e il menu delle otto pause usano gli stessi simboli, font e ordine dell’armonizzatore. I riquadri SVG trasparenti non impediscono più di selezionare note o elementi e completare glissandi e altre linee. Aggiungere o eliminare una battuta non inserisce più un’indicazione di metrica superflua. Anche le duplicazioni salvate dalle vecchie aggiunte di battuta vengono ignorate in visualizzazione/esportazione. Il controllo prima dell’aggiornamento comprende anche tutte le immagini delle tavolozze e Noto Music.

Le aggiunte rispetto alla prima versione sono gli spaziatori verticali tra pentagrammi e le cornici verticali/di testo. Entrambi hanno proprietà modificabili e annulla/ripristina; le cornici gestiscono il testo e la paginazione A4. È stato corretto anche l’offset delle interruzioni di pagina nell’esportazione MusicXML. I sorgenti originali di Verovio inclusi nel pacchetto sono stati verificati e ripristinati integralmente.

Per provare:

1. Aprire un terminale nella cartella `armonizza-cloudflare` del pacchetto.
2. Eseguire `python3 -m http.server 5179 --directory sito/public`.
3. Aprire `http://localhost:5179` nel browser.
4. Usare **File → Apri** per caricare `esempi-editor/Cornici-spaziatori.json`.
5. Selezionare una nota del pentagramma inferiore e scegliere **Layout → Spaziatore verso l’alto**. La scheda Proprietà permette di modificare la distanza.
6. Scegliere **Layout → Cornice di testo** e modificarne testo, altezza, dimensione e allineamento nelle Proprietà.

Il progetto di esempio include due cornici, una distanza maggiore nel primo sistema, un abbellimento, una legatura e un glissando. Il PNG e lo SVG allegati mostrano l’incisione effettiva generata dal motore; non sono screenshot dell’interfaccia.

Verifica: 654 test superati, nessuno fallito. `TEST-EDITOR-RISULTATI.txt` contiene il risultato completo. Sono stati controllati coordinate degli spaziatori, paginazione, conservazione dei gruppi di note, apertura/salvataggio, MusicXML e comandi DOM. La verifica visuale desktop/mobile in browser reale resta bloccata: il browser disponibile non raggiunge il server locale e la sua policy rifiuta l’apertura dei file locali.

I limiti e le funzioni ancora mancanti sono elencati in `EDITOR-LEGGIMI.md` e `STATO-EDITOR.json`.
