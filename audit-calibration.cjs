// Fixed independent population, separate from the unchanged acceptance harness.
// Optional source argument accepts a frozen core or the self-contained HTML.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/index.html','utf8');vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const C=Cricket,rng=C.RNG.stream(0x7214a05b),rows=[];
for(const format of ['T20','TEST']){
 const teams=C.Squad.teams(format),sample=[];
 for(let i=0;sample.length<240&&i<2000;i++){
  const m=C.Innings.create(Math.floor(rng.next()*4294967296),teams[i%8],teams[(i+3)%8],format,0);m.balls=(i%15)*6;
  const d=C.Innings.delivery(m),ball=d.ball;if(C.Strokes.spin(ball)||!['full','good'].includes(ball.lengthName))continue;
  const x=C.Delivery.at(C.Hand.canonical(ball),1).x;if(Math.abs(x)>1.1)continue;
  const angle=(x>.35?65:x>.1?44:x<-.15?-44:0)*C.Hand.sign(ball);
  sample.push({m,ball,angle,seed:d.rngState});
 }
 for(const mode of ['ground','loft'])for(const error of [0,30,60,90,120]){
  let q=0,contact=0,runs=0,six=0,four=0,caught=0,out=0;
  for(const {m,ball,angle,seed}of sample){const r=C.Shot.resolve(ball,{angle,mode,error,effort:mode==='loft'?1:.75,callRuns:true},m.batters[m.striker],C.Innings.field(m,ball),seed);q+=r.quality;contact+=r.contact;runs+=r.runs;six+=r.batRuns===6;four+=r.batRuns===4;caught+=r.dismissalKind==='caught';out+=r.wicket;}
  const n=sample.length;rows.push({format,mode,error,n,quality:+(q/n).toFixed(3),contactPct:+(100*contact/n).toFixed(1),runsPerOver:+(6*runs/n).toFixed(2),sixPct:+(100*six/n).toFixed(1),fourPct:+(100*four/n).toFixed(1),caughtPct:+(100*caught/n).toFixed(1),outPct:+(100*out/n).toFixed(1)});
 }
}
console.log(JSON.stringify(rows,null,2));
