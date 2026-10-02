// Run with: node check-core.cjs. No dependencies or browser required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/dist/index.html', 'utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const {Delivery, Shot, Match, Save, Gesture, Rotation, FIELDS} = Cricket;
let checks = 0;
function check(name, fn) { if(process.env.CRICKET_CHECK_FILTER&&!new RegExp(process.env.CRICKET_CHECK_FILTER).test(name))return;fn(); checks++; process.stdout.write('PASS ' + name + '\n'); }
function next(m) { const d = Delivery.create(m.rngState, Math.floor(m.balls / 6), m.maxOvers); return [ {...m, rngState: d.rngState}, d.ball]; }
function fixed(m, result) { const [n, ball] = next(m); return Match.apply(n, ball, {runs:0,wicket:false,wide:false,contact:false,title:'Dot ball',detail:'Defended',timing:'Good timing',rngState:n.rngState,...result}); }
function saved(m, pending=null, phase='ready', shot=null, elapsed=0) { return {schema:4,engine:4,match:m,pending,phase,shot,elapsed,resultAge:0}; }
check('Delivery generation is deterministic; seam and spin kick after the bounce', () => {
 for (let over = 0; over < 3; over++) {
  const a = Delivery.create(731, over), b = Delivery.create(731, over);
  assert.deepEqual(a,b);
  const before=Delivery.at(a.ball,a.ball.bounceT-1e-7), after=Delivery.at(a.ball,a.ball.bounceT+1e-7);
  assert.ok(Math.abs(before.x-after.x)<1e-5);
  assert.ok(Math.abs(before.h-after.h)<1e-5);
  assert.ok(a.ball.duration>1000 && a.ball.duration<2600);
 }
});
check('A single swaps strike; a wide preserves it and does not consume a ball', () => {
 let m = Match.create(42); m=fixed(m,{runs:1}); assert.equal(m.striker,1); assert.equal(m.balls,1);
 m=fixed(m,{runs:1,wide:true}); assert.equal(m.striker,1); assert.equal(m.balls,1); assert.equal(m.runs,2); assert.equal(m.extras,1); assert.equal(m.batters[1].balls,0);
});
check('End of over changes ends, including a single off the last ball', () => {
 let m=Match.create(1);for(let i=0;i<5;i++)m=fixed(m,{});m=fixed(m,{runs:1});assert.equal(m.striker,0);assert.equal(m.nonStriker,1);assert.equal(m.balls,6);
});
check('A wicket brings in the next batsman; ten wickets end the innings', () => {
 let m=fixed(Match.create(1),{wicket:true,title:'Bowled'});assert.equal(m.striker,2);assert.equal(m.nextBatter,3);
 for(let i=1;i<10;i++)m=fixed(m,{wicket:true,title:'Bowled'});
 assert.equal(m.wickets,10);assert.equal(m.complete,true);assert.equal(m.nextBatter,11);assert.throws(()=>fixed(m,{}));
});
check('Eighteen legal balls finish with exactly six balls from each bowler', () => {
 let m=Match.create(1,undefined,undefined,3);for(let i=0;i<18;i++)m=fixed(m,{});assert.equal(m.complete,true);assert.deepEqual(m.bowlers.map(b=>b.balls),[6,6,6]);assert.equal(Match.overs(m.balls),'3.0');
});
check('Leaving a ball on the stumps is bowled; a wide adds one extra', () => {
 const m=Match.create(1), ball=Delivery.create(1,0).ball;
 const straight={...ball,line:0,releaseX:0,swing:0,kick:0,contactH:.2};
 assert.equal(Shot.resolve(straight,null,m.batters[0],FIELDS[0],1).title,'Bowled');
 const wide={...straight,line:1.2};const r=Shot.resolve(wide,null,m.batters[0],FIELDS[0],1);assert.equal(r.wide,true);assert.equal(r.runs,1);assert.equal(r.wicket,false);
});
check('Shot choice and release timing independently affect contact quality', () => {
 const m=Match.create(1),ball={...Delivery.create(4,0).ball,lengthName:'full',line:.1,swing:0,kick:0};
 const good=Shot.resolve(ball,{angle:45,mode:'ground',error:0},m.batters[0],FIELDS[0],8);
 const wrong=Shot.resolve(ball,{angle:100,mode:'ground',error:0},m.batters[0],FIELDS[0],8);
 const late=Shot.resolve(ball,{angle:45,mode:'ground',error:400},m.batters[0],FIELDS[0],8);
 assert.ok(good.quality>wrong.quality);assert.equal(late.contact,false);assert.equal(late.timing,'Late');
});
check('Mid-flight save restores the identical delivery, queued shot and RNG outcome', () => {
 const [m,ball]=next(Match.create(8675309)), input={angle:46,mode:'ground',error:-37};
 const data=saved(m,ball,'flight',input,ball.duration-37), restored=Save.validate(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(restored,data);
 const a=Shot.resolve(ball,input,m.batters[m.striker],FIELDS[0],m.rngState);
 const b=Shot.resolve(restored.pending,restored.shot,restored.match.batters[restored.match.striker],FIELDS[0],restored.match.rngState);
 assert.deepEqual(a,b);assert.deepEqual(Match.apply(m,ball,a),Match.apply(restored.match,restored.pending,b));
});
check('Invalid imports cannot replace a valid innings', () => {
 const bad=saved(Match.create(9));bad.match.runs=100;assert.throws(()=>Save.validate(bad));
 const flight=saved(Match.create(9),null,'flight');assert.throws(()=>Save.validate(flight));
 assert.throws(()=>Save.validate({schema:8}));
});
check('300 seeded innings preserve scoring, bowling totals, saves and deterministic replay', () => {
 const totals=[];let wickets=0,wides=0;
 function play(seed) {let m=Match.create(seed),pending;
  while(!m.complete){let ball;[m,ball]=next(m);pending=ball;
   const p=Delivery.at(ball,1);const angle=ball.lengthName==='short'?(p.x>.15?87:-83):(p.x<-.12?-32:54);
   const error=((m.history.length*139+seed*73)%321)-160;
   const input={angle,mode:m.history.length%5===0?'loft':'ground',error};
   const result=Shot.resolve(ball,input,m.batters[m.striker],FIELDS[ball.bowler],m.rngState);
   m=Match.apply(m,ball,result);
   Save.validate(saved(m,pending,m.complete?'finished':'result',input,ball.duration));
   assert.equal(m.bowlers.reduce((s,b)=>s+b.runs,0),m.runs);
   assert.ok(m.history.length<1000);
  }return m;
 }
 for(let seed=1;seed<=300;seed++){const m=play(seed);if(seed<=10)assert.deepEqual(m,play(seed));totals.push(m.runs);wickets+=m.wickets;wides+=m.extras;}
 totals.sort((a,b)=>a-b);process.stdout.write(JSON.stringify({innings:300,medianRuns:totals[150],range:[totals[0],totals[299]],meanWickets:+(wickets/300).toFixed(2),wides})+'\n');
});


check('5, 10 and 20-over schedules respect bowler limits and prevent consecutive overs', () => {
 for(const overs of [5,10,20]) {
  const order=Rotation.schedule(overs);assert.equal(order.length,overs);
  for(let i=1;i<order.length;i++)assert.notEqual(order[i],order[i-1]);
  const counts=Array.from({length:5},(_,id)=>order.filter(x=>x===id).length);
  assert.deepEqual(counts,Array(5).fill(overs/5));
  let m=Match.create(41,undefined,undefined,overs);
  for(let i=0;i<overs*6;i++)m=fixed(m,{});
  assert.equal(m.balls,overs*6);assert.equal(m.complete,true);
  assert.deepEqual(m.bowlers.map(b=>b.balls),Array(5).fill(overs/5*6));
 }
});
check('Swipe geometry recognises every direction and defensive, ground and loft lengths', () => {
 const start=Gesture.begin(7,180,550,390);
 assert.equal(Gesture.move(start,7,182,545).mode,'defend');
 assert.equal(Gesture.move(start,7,220,515).mode,'ground');
 assert.equal(Gesture.move(start,7,300,430).mode,'loft');
 assert.equal(Gesture.move(start,7,230,550).angle,90);
 assert.equal(Gesture.move(start,7,130,550).angle,-90);
 assert.equal(Gesture.move(start,7,180,500).angle,0);
 assert.equal(Gesture.move(start,9,300,400),start);
 assert.equal(Gesture.release(start,9,300,400,1300,1300),null);
});
check('Release outside the original pad is retained, including at the contact deadline', () => {
 const g=Gesture.begin(7,180,650,390);
 const shot=Gesture.release(g,7,245,585,1300,1300);
 assert.equal(shot.error,0);assert.equal(shot.mode,'ground');assert.equal(shot.angle,45);
 const m=Match.create(17),b={...Delivery.create(17,0,20).ball,line:.1,swing:0,kick:0,lengthName:'full'};
 const result=Shot.resolve(b,shot,m.batters[0],FIELDS[0],7);
 assert.equal(result.contact,true);assert.equal(result.timing,'Perfect timing');
});
check('Existing three-over save preserves a pending delivery and its original outcome', () => {
 const source=require('node:child_process').execFileSync('git',['show','2867d5ad8779a268bdb18b6ca6f22de6d4ab2964:dist/index.html'],{cwd:__dirname,encoding:'utf8'});
 const old={};vm.runInNewContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],old);
 let m=old.Cricket.Match.create(7331);const d=old.Cricket.Delivery.create(m.rngState,0);m.rngState=d.rngState;
 const shot={angle:-133,mode:'ground',error:43};
 const raw={schema:1,engine:1,match:m,pending:d.ball,phase:'flight',elapsed:d.ball.duration-100,shot,resultAge:0};
 const converted=Save.validate(JSON.parse(JSON.stringify(raw)));
 assert.equal(converted.match.maxOvers,3);assert.equal(converted.engine,4);assert.deepEqual(converted.pending,JSON.parse(JSON.stringify(d.ball)));
 const before=old.Cricket.Shot.resolve(d.ball,shot,m.batters[0],old.Cricket.FIELDS[0],m.rngState);
 const after=Shot.resolve(converted.pending,shot,converted.match.batters[0],FIELDS[0],converted.match.rngState);
 assert.deepEqual(after,JSON.parse(JSON.stringify(before)));
 Save.validate(converted);
});


check('The bat and all eight limb segments keep fixed lengths throughout every stroke', () => {
 const R=Cricket.BatterRig,d=(a,b)=>R.length(R.sub(a,b));let checked=0;
 for(const angle of [-140,-90,-40,0,40,90,135])for(const mode of ['defend','ground','loft'])for(const archetype of ['swing','legspin'])for(const age of [-1,0,20,50,70,130,280,490,950,1200,1470]){
  const p=R.pose({angle,mode,archetype,height:Math.abs(angle)>65?1.10:.32,line:angle<0?-.20:.23,ballT:.9,releaseT:.9,age,aiming:true});
  for(const [a,b,len]of [['leftShoulder','leftElbow',R.UPPER_ARM],['leftElbow','leftWrist',R.FOREARM],['rightShoulder','rightElbow',R.UPPER_ARM],['rightElbow','rightWrist',R.FOREARM],['leftHip','leftKnee',R.THIGH],['leftKnee','leftAnkle',R.SHIN],['rightHip','rightKnee',R.THIGH],['rightKnee','rightAnkle',R.SHIN],['knob','toe',R.BAT_LENGTH]])assert.ok(Math.abs(d(p[a],p[b])-len)<1e-7,angle+' '+mode+' '+age+' '+a);
  assert.ok(d(p.leftWrist,R.add(p.grip,R.mul(p.direction,-.025)))<.003);
  assert.ok(d(p.rightWrist,R.add(p.grip,R.mul(p.direction,.07)))<.003);
  for(const point of Object.values(p))if(point&&typeof point==='object'&&'x'in point)assert.ok(Object.values(point).every(Number.isFinite));
  checked++;
 }
 process.stdout.write(checked+' stroke poses checked.\n');
});
check('The downswing and follow-through join continuously at contact', () => {
 const R=Cricket.BatterRig;
 for(const angle of [-135,-90,0,45,90]){
  const a=R.pose({angle,mode:'ground',archetype:'legspin',age:R.CONTACT_MS-.01,releaseT:1,aiming:true});
  const b=R.pose({angle,mode:'ground',archetype:'legspin',age:R.CONTACT_MS+.01,releaseT:1,aiming:true});
  assert.ok(R.length(R.sub(a.toe,b.toe))<.001);
  assert.ok(R.length(R.sub(a.grip,b.grip))<.001);
 }
});
check('Ground strokes produce twos, threes and fours; spin boundaries allow good timing', () => {
 const C=Cricket,counts={0:0,1:0,2:0,3:0,4:0};let spinBoundary=false;
 for(let seed=1;seed<=20;seed++)for(let over=0;over<5;over++){
  const b=C.Delivery.create(seed*77,over,5).ball,m=C.Match.create(seed);
  for(const error of [-100,-60,0,60,100])for(const angle of [-145,-90,-40,0,20,40,60,90,130]){
   const r=C.Shot.resolve(b,{angle,mode:'ground',error},m.batters[0],C.FIELDS[b.bowler],seed);
   if(!r.wicket)counts[r.runs]++;
   if(['legspin','offspin'].includes(b.archetype)&&Math.abs(error)===60&&r.runs===4)spinBoundary=true;
   if(r.retrieval){assert.ok(r.returnTime>r.ballTravelTime);assert.ok(r.distance<=r.maxRange+.0001);}
  }
 }
 assert.ok(counts[2]>100);assert.ok(counts[3]>15);assert.ok(counts[4]>150);assert.equal(spinBoundary,true);
 process.stdout.write(JSON.stringify({groundShotOutcomes:counts})+'\n');
});


check('Batter joints do not jump between adjacent animation frames', () => {
 const R=Cricket.BatterRig;
 for(const angle of [-140,-90,-40,0,40,90,135])for(const archetype of ['swing','legspin']){
  let before=R.pose({angle,mode:'ground',archetype,age:0,releaseT:.95,aiming:true});
  for(let age=16;age<1500;age+=16){const next=R.pose({angle,mode:'ground',archetype,age,releaseT:.95,aiming:true});
   for(const joint of ['leftElbow','rightElbow','leftKnee','rightKnee'])assert.ok(R.length(R.sub(next[joint],before[joint]))<.19,angle+' '+age+' '+joint);
   before=next;
  }
 }
});
check('Every bowler retains one family, including all variations and wides', () => {
 const {BOWLERS}=Cricket;
 for(let over=0;over<20;over++)for(let seed=1;seed<=80;seed++){
  const b=Delivery.create(seed*43,over,20).ball,owner=BOWLERS[Rotation.bowler(over,20)];
  assert.equal(b.archetype,owner.id);assert.equal(b.family,owner.family);
  if(b.family==='swing'){assert.equal(b.kick,0);assert.ok(['Inswinger','Outswinger'].includes(b.variation));}
  else assert.equal(b.swing,0);
  if(b.family==='pace')assert.ok(['Slower ball','Seam-up','Angled seam-up'].includes(b.variation));
  if(b.family==='wrist-spin')assert.ok(['Leg-break','Googly','Top-spinner'].includes(b.variation));
  if(b.family==='finger-spin')assert.ok(['Off-break','Arm ball'].includes(b.variation));
 }
});
check('Lengths have separate bounce positions, contact heights and suitable strokes', () => {
 const samples={yorker:[],full:[],good:[],short:[]};
 for(let seed=1;seed<1500;seed++){const b=Delivery.create(seed,0,5).ball;samples[b.lengthName].push(b);const bounce=Delivery.at(b,b.bounceT);assert.ok(Math.abs(bounce.z-b.length)<1e-8);assert.ok(Math.abs(bounce.h-.035)<1e-8);assert.ok(Math.abs(Delivery.at(b,1).h-b.contactH)<1e-8);}
 const bands=['yorker','full','good','short'];for(let i=1;i<4;i++){assert.ok(Math.min(...samples[bands[i]].map(b=>b.length))-Math.max(...samples[bands[i-1]].map(b=>b.length))>1);assert.ok(Math.min(...samples[bands[i]].map(b=>b.contactH))>Math.max(...samples[bands[i-1]].map(b=>b.contactH)));}
 for(const name of bands){const b={...samples[name][0],line:0,swing:0,kick:0};const drive=Shot.suitability(b,0,'ground').value,pull=Shot.suitability(b,-90,'ground').value;if(name==='short')assert.ok(pull-drive>.5);if(name==='full')assert.ok(drive-pull>.5);if(name==='yorker')assert.ok(Shot.suitability(b,0,'defend').value>drive);}
});
check('Field positions, catches, pickups and the replay camera agree in world space', () => {
 const F=Cricket.Fielding,V=Cricket.View,counters={catch:0,pickup:0,four:0,six:0,behind:0},m=Match.create(7);
 for(let seed=1;seed<=50;seed++)for(let over=0;over<5;over++)for(const mode of ['ground','loft']){
  const b=Delivery.create(seed*89,over,5).ball,input={angle:((seed*47)%350)-175,mode,error:(seed%3-1)*70},r=Shot.resolve(b,input,m.batters[0],FIELDS[b.bowler],seed);if(!r.play)continue;
  const p=r.play,e=p.event,frame=F.frame(r,e.time,FIELDS[b.bowler]),before=F.ballAt(p,e.time-1e-5),at=F.ballAt(p,e.time);counters[e.type]++;if(e.z<0)counters.behind++;
  assert.ok(Math.hypot(before.x-at.x,before.z-at.z,before.h-at.h)<.002);
  assert.equal(r.wicket,e.type==='catch');
  for(const f of F.positions(FIELDS[b.bowler])){const saved=p.starts.find(x=>x.id===f.id);assert.deepEqual(saved,f);}
  if(['catch','pickup'].includes(e.type)){const f=frame.fielders.find(f=>f.id===e.id);assert.ok(f);assert.ok(Math.hypot(f.x-e.x,f.z-e.z)<.56);assert.ok(Math.hypot(f.hands.x-at.x,f.hands.z-at.z)<.001);if(e.type==='catch'){assert.ok(e.time<p.airTime);assert.ok(at.h>.2&&at.h<2.05);assert.ok(Math.abs(f.hands.h-at.h)<1e-8);}}
  // Once the camera has followed the shot, its actual ball/event remains visible,
  // including catches and pickups behind the original keeper-view camera.
  const camera=V.camera(p,e.time,1800),point=V.project(at.x,at.z,at.h,camera,390,300);assert.ok(point.depth>.5&&point.x>0&&point.x<390&&point.y>0&&point.y<300);
 }
 for(const k of ['catch','pickup','four','six','behind'])assert.ok(counters[k]>0,k+' missing');process.stdout.write(JSON.stringify({fieldingEvents:counters})+'\n');
});
check('Full stroke motion stays continuous for all four lengths, from stance to recovery', () => {
 const R=Cricket.BatterRig;let maximum=0;
 for(const [lengthName,height]of [['yorker',.08],['full',.32],['good',.85],['short',1.7]])for(const angle of [-140,-90,-40,0,40,90,135]){
  let previous;for(let age=-900;age<=1500;age+=16){const p=R.pose({angle,mode:'ground',archetype:'legspin',age,height,line:.05,lengthName,aiming:true});assert.ok(p.toe.y>=.015);if(previous)for(const j of ['leftElbow','rightElbow','leftKnee','rightKnee']){const d=R.length(R.sub(p[j],previous[j]));maximum=Math.max(maximum,d);assert.ok(d<.19,lengthName+' '+angle+' '+age+' '+j);}previous=p;}
 }
 process.stdout.write('Largest joint movement per 16 ms: '+maximum.toFixed(3)+' m.\n');
 const drive=R.pose({angle:0,mode:'ground',lengthName:'full',height:.32,age:0}),back=R.pose({angle:0,mode:'ground',lengthName:'good',height:.85,age:0});assert.ok(drive.leftAnkle.z-back.leftAnkle.z>.4);assert.ok(drive.pelvis.z-back.pelvis.z>.25);
});
check('Pending V3 deliveries retain the exact previous scoring and trajectory', () => {
 const source=require('node:child_process').execFileSync('git',['show','1551f6cebe3ff9ff2222b969bf8c1cdd68b54228:dist/index.html'],{cwd:__dirname,encoding:'utf8'}),old={};vm.runInNewContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],old);
 for(let over=0;over<5;over++)for(const mode of ['ground','loft'])for(const error of [-160,0,60]){
  const d=old.Cricket.Delivery.create(817,over,5),b=JSON.parse(JSON.stringify(d.ball)),m=Match.create(817),input={angle:over%2?90:-40,mode,error};
  const before=old.Cricket.Shot.resolve(d.ball,input,m.batters[0],old.Cricket.FIELDS[over],d.rngState),after=Shot.resolve(b,input,m.batters[0],FIELDS[over],d.rngState);assert.deepEqual(after,JSON.parse(JSON.stringify(before)));
  for(const t of [.3,.8,1,1.035])assert.deepEqual(Delivery.at(b,t),JSON.parse(JSON.stringify(old.Cricket.Delivery.at(d.ball,t))));
 }
});

process.stdout.write(checks+' checks passed.\n');
