// Deterministic contact checks and actual UI handlers; no browser/device emulation.
const assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const {host,pointer,C,copy}=require('./check-display-input.cjs');
const old={};vm.createContext(old);vm.runInContext(cp.execFileSync('git',['show','f0048311f658d21b1a70e825ea8dd0ec9d6170ea:dist/index.html'],{cwd:__dirname,encoding:'utf8'}).match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],old);const O=old.Cricket;
let checks=0;async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
function until(h,predicate,limit=2400){for(let i=0;i<limit;i++){if(predicate(h.u.get()))return;h.step();}throw Error('Clock did not finish');}
async function begin(){const h=host('TEST');await h.n('resumeBtn').click();await h.n('bowlBtn').click();until(h,s=>!s.fieldBrief);h.u.drawField(0);return h;}
async function running(){const h=await begin(),s=h.u.get();let shot;for(const angle of [132,-145,44,-44,87,-95,0]){const input={angle,mode:'ground',effort:.55,error:0},r=C.Shot.resolve(s.pending,input,s.match.batters[s.match.striker],C.Innings.field(s.match,s.pending),s.match.rngState);if(r.play.running&&r.decisionTime>6){shot=input;break;}}assert.ok(shot);s.shot=shot;until(h,s=>s.phase==='inPlay');h.u.drawField(0);return h;}
(async()=>{
await check('A deliberate backswing works in every direction; long drives, curved thumbs and small corrections stay grounded',()=>{
 for(const width of [320,390,600])for(let angle=-180;angle<=180;angle+=15){const a=angle*Math.PI/180,x=Math.sin(a),y=-Math.cos(a);for(const loft of [false,true]){let g=C.Gesture.begin(1,200,220,width,17);if(loft)g=C.Gesture.move(g,1,200-x*28,220-y*28);g=C.Gesture.move(g,1,200+x*120,220+y*120);const shot=C.Gesture.release(g,1,g.x,g.y,2300,2300,17);assert.equal(shot.mode,loft?'loft':'ground');assert.ok(Math.abs(Math.sin((shot.angle-angle)*Math.PI/180))<1e-8);assert.equal(shot.error,0);}}
 for(const points of [[[0,0],[35,-30],[76,-60],[130,-80]],[[0,0],[40,0],[32,3],[110,0]],[[0,0],[0,140],[0,115],[0,180]],[[0,0],[-9,9],[100,-100]]]){let g=C.Gesture.begin(1,...points[0],390,17);for(const p of points.slice(1))g=C.Gesture.move(g,1,...p);assert.equal(g.mode,'ground');}
 let tap=C.Gesture.begin(1,100,100,390,17);tap=C.Gesture.move(tap,1,110,89);assert.equal(tap.mode,'defend');assert.equal(C.Gesture.move(tap,2,200,20),tap);
});
await check('Spin retains its physical line, turn, speed and timing window, with more reading time after the bounce and fewer marginal edges',()=>{
 let beforeEdges=0,afterEdges=0,beforeCaught=0,afterCaught=0,count=0,low=Infinity,high=0;
 for(const format of ['TEST','T20'])for(const type of ['legspin','offspin'])for(let seed=1;seed<=24;seed++){
  const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0),over=m.order.findIndex(i=>m.bowlers[i].archetype===type);assert.ok(over>=0);m.balls=over*6;const d=O.Innings.delivery(m),n=C.Innings.delivery(copy(m)),b=m.batters[m.striker];
  assert.equal(d.rngState,n.rngState);for(const key of ['speed','line','kick','swing','preTime','postTime','contactH','length','variation'])assert.equal(d.ball[key],n.ball[key]);assert.ok(n.ball.duration>d.ball.duration);assert.ok(Math.abs(n.ball.duration*n.ball.bounceT-d.ball.duration*d.ball.bounceT)<1e-8);const extra=n.ball.duration-d.ball.duration;low=Math.min(low,extra);high=Math.max(high,extra);
  for(const fraction of [0,.5,1]){const a=O.Delivery.at(d.ball,d.ball.bounceT+(1-d.ball.bounceT)*fraction),b=C.Delivery.at(n.ball,n.ball.bounceT+(1-n.ball.bounceT)*fraction);for(const key of ['x','z','h'])assert.ok(Math.abs(a[key]-b[key])<1e-8);}
  const x=C.Delivery.at(n.ball,1).x,sign=C.Hand.sign(n.ball),angle=(x*sign<-.10?-36:44)*sign;
  for(const error of [70,130,190]){const input={angle,mode:'ground',effort:.65,error},a=O.Shot.resolve(d.ball,input,b,O.Innings.field(m,d.ball),d.rngState),z=C.Shot.resolve(n.ball,input,b,C.Innings.field(m,n.ball),n.rngState);assert.equal(C.Contact.window(n.ball,b,input),O.Contact.window(d.ball,b,input));beforeEdges+=!!a.edge;afterEdges+=!!z.edge;beforeCaught+=a.wicket&&a.play.event.id==='keeper';afterCaught+=z.wicket&&z.play.event.id==='keeper';count++;}
 }
 assert.ok(afterEdges<beforeEdges*.8);assert.ok(afterCaught<beforeCaught);assert.ok(afterEdges>0);console.log('Controlled spin inputs:',{count,beforeEdges,afterEdges,beforeCaught,afterCaught,extraReadingMs:[Math.round(low),Math.round(high)]});
});
await check('V16 pending deliveries and their scored outcomes retain exact deterministic behaviour',()=>{
 for(const format of ['TEST','T20'])for(let seed=1;seed<=6;seed++){const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0);for(const over of [0,1,11]){m.balls=over*6;const d=O.Innings.delivery(m);for(const input of [null,{angle:44,mode:'ground',effort:.7,error:90},{angle:-95,mode:'loft',effort:.8,error:50}])assert.equal(JSON.stringify(C.Shot.resolve(d.ball,input,m.batters[0],C.Innings.field(m,d.ball),d.rngState)),JSON.stringify(O.Shot.resolve(d.ball,input,m.batters[0],O.Innings.field(m,d.ball),d.rngState)));}}
});
await check('A steady fielding camera includes behind-square balls, the collection and both wickets',()=>{
 const m=C.Innings.create(3,C.Squad.team('TEST','eng'),C.Squad.team('TEST','ind'),'TEST',0),d=C.Innings.delivery(m);
 for(const angle of [-150,-95,-44,0,44,90,132,170])for(const mode of ['ground','loft']){const r=C.Shot.resolve(d.ball,{angle,mode,effort:.8,error:20},m.batters[0],C.Innings.field(m,d.ball),d.rngState);for(const [w,h]of [[320,360],[390,500],[844,160]]){const v=C.Presentation.fieldCamera(r.play,w,h);for(const t of [0,r.play.event.time/2,r.play.event.time]){const p=C.Fielding.freeBall(r.play,t),q=C.View.project(p.x,p.z,p.h,v,w,h);assert.ok(q.depth>.6&&q.x>0&&q.x<w&&q.y>0&&q.y<h);}}}
});
await check('Fast-forward advances fielding fourfold while camera motion and paused presentation keep real time',async()=>{
 const a=await running(),b=await running();await b.n('fastForwardBtn').click();for(let i=0;i<8;i++){a.step();b.step();a.u.drawField(i);b.u.drawField(i);assert.deepEqual(copy(a.u.presentation().camera),copy(b.u.presentation().camera));}assert.equal(b.u.get().resultAge,4*a.u.get().resultAge);
 await b.n('menuBtn').click();const view=copy(b.u.presentation());for(let i=0;i<10;i++)b.step();assert.deepEqual(copy(b.u.presentation()),view);await b.n('settingsBtn').click();b.n('reducedMotionToggle').checked=true;await b.n('reducedMotionToggle').dispatch('change');assert.equal(b.storage.get('cricket.motion'),'reduced');assert.equal(b.u.presentation().reducedMotion,true);
});
await check('Boundary, individual and team milestones queue without overlap, survive pause and complete before the next delivery',async()=>{
 const result={title:'Four',celebrations:[{kind:'four',label:'Four'},{kind:'hundred',label:'Joe Root 100',value:100},{kind:'team',label:'England 200',value:200}]},sequence=C.Presentation.sequence(result);assert.deepEqual(sequence.map(e=>e.title),['FOUR','100','200 UP']);assert.equal(C.Presentation.celebration(result,1900).kind,'hundred');assert.equal(C.Presentation.celebration(result,C.Presentation.duration(result)),null);
 const h=await begin(),s=h.u.get();until(h,s=>s.phase==='result');const r=s.match.history.at(-1);r.celebrations=copy(result.celebrations);r.presentationVersion=17;s.celebrationAge=0;s.betweenAge=0;const ball=s.pending;h.u.renderUI();h.step(100);assert.equal(h.n('celebration').hidden,false);assert.equal(h.n('celebrationTitle').textContent,'FOUR');for(let i=0;i<18;i++)h.step();assert.equal(h.n('celebrationTitle').textContent,'CENTURY');assert.equal(s.pending,ball);await h.n('menuBtn').click();const saved=JSON.parse(h.storage.get('cricket.career.v5'));assert.equal(C.CareerSave.validate(copy(saved)).sessions.TEST.celebrationAge,1900);const resumed=host('TEST',saved),resumedBall=resumed.u.get().pending;await resumed.n('resumeBtn').click();assert.equal(resumed.n('celebrationTitle').textContent,'CENTURY');for(let i=0;i<45;i++)resumed.step();assert.equal(resumed.u.get().pending,resumedBall);until(resumed,s=>s.pending!==resumedBall&&s.match.balls>=2);assert.ok(resumed.u.get().match.balls>=2);
 const bad=copy(saved);bad.sessions.TEST.celebrationAge=-1;assert.throws(()=>C.CareerSave.validate(bad),/celebration/);
});
await check('Umpire signals and a batter acknowledgement remain finite with joined wrists and bat',()=>{
 for(const hand of ['right','left'])for(let age=0;age<=2600;age+=50){const k=C.BatterRig.smooth(age/320)*C.BatterRig.smooth((2600-age)/450),p=C.BatterRig.salute(C.BatterRig.pose({hand,scoringVersion:17,age:1500}),k,hand);for(const value of Object.values(p))if(value&&typeof value==='object'&&'x'in value)assert.ok(['x','y','z'].every(key=>Number.isFinite(value[key])));assert.ok(C.BatterRig.length(C.BatterRig.sub(p.grip,p.rightWrist))<.09);}
 for(const signal of ['four','six'])for(let t=0;t<2;t+=.05){const p=C.FielderRig.pose({id:'umpire',x:.65,z:21.15,umpire:true,signal,signalAge:t,signalBlend:C.BatterRig.smooth(t/.32)},t);for(const v of p.wrists)assert.ok(Number.isFinite(v.y));}
});
console.log(checks+' backswing, spin and presentation checks passed.');
})();
