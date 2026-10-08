// Campioni Salamander Grand Piano V3, Alexander Holm, CC BY 3.0.
// Copie locali: nessuna richiesta a servizi audio durante l'ascolto.
export const SAMPLE_PITCHES = [
 [39,'Ds2'],[42,'Fs2'],[45,'A2'],[48,'C3'],[51,'Ds3'],[54,'Fs3'],
 [57,'A3'],[60,'C4'],[63,'Ds4'],[66,'Fs4'],[69,'A4'],[72,'C5'],
 [75,'Ds5'],[78,'Fs5'],[81,'A5']
];

export function nearestSample(note){
 return SAMPLE_PITCHES.reduce((best,sample)=>
  Math.abs(sample[0]-note)<Math.abs(best[0]-note)?sample:best
 );
}

export class PianoSampler{
 constructor(){this.context=null;this.buffers=new Map();this.loading=null;this.active=new Set();this.master=null;}
 async load(){
  if(this.loading)return this.loading;
  const context=this.context??new AudioContext();this.context=context;
  const compressor=context.createDynamicsCompressor();compressor.threshold.value=-15;
  compressor.knee.value=12;compressor.ratio.value=3;
  const master=context.createGain();master.gain.value=.78;
  master.connect(compressor).connect(context.destination);this.master=master;
  this.loading=Promise.all(SAMPLE_PITCHES.map(async([pitch,name])=>{
   const response=await fetch(`./samples/${name}.mp3`);
   if(!response.ok)throw Error(`Campione ${name}: HTTP ${response.status}`);
   const buffer=await context.decodeAudioData(await response.arrayBuffer());
   this.buffers.set(pitch,buffer);
  })).catch(error=>{this.loading=null;throw error});
  return this.loading;
 }
 async resume(){if(this.context?.state==='suspended')await this.context.resume()}
 note(pitch,duration,when=this.context.currentTime+.01,velocity=1){
  const [samplePitch]=nearestSample(pitch),buffer=this.buffers.get(samplePitch);
  if(!buffer)throw Error('Campione di pianoforte mancante');
  const source=this.context.createBufferSource();source.buffer=buffer;
  source.playbackRate.value=2**((pitch-samplePitch)/12);
  const gain=this.context.createGain();const now=when;
  const audible=Math.min(Math.max(.12,duration),buffer.duration/source.playbackRate.value-.12);
  const hold=Math.max(.08,audible-.04),end=now+Math.min(audible+.18,buffer.duration/source.playbackRate.value);
  const peak=(pitch<52?.20:.17)*Math.max(.05,Math.min(1,velocity));
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(peak,now+.008);
  // Il campione del pianoforte decade naturalmente: una compensazione moderata
  // mantiene udibile la nota per tutta la figura prima del rilascio.
  gain.gain.linearRampToValueAtTime(peak*Math.min(2.2,1+duration*.25),now+hold);
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  source.connect(gain).connect(this.master);
  source.onended=()=>{source.disconnect();gain.disconnect();this.active.delete(source)};
  this.active.add(source);source.start(now);source.stop(end+.02);
 }
 chord(voices,beatSeconds){const at=this.context.currentTime+.015;for(const pitch of voices)this.note(pitch,beatSeconds,at)}
 stop(){for(const source of this.active){try{source.stop()}catch{}}this.active.clear()}
}
