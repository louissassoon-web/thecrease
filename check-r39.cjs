// R39: the frozen revision 38 engine against this one, then ends, the pitch, the ball, round the wicket and the new presentation.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {C,host,pointer,copy}=require('./check-display-input.cjs');
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v38.js','utf8'),box);const O=box.Cricket;
let groups=0;async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
const near=(x,y,e=1e-9)=>assert.ok(Math.abs(x-y)<=e,x+' is not '+y),sd=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);};
function fixture(bowl=false,format='T20',wallet=C.Economy.create(),E=C){for(let seed=1;seed<100;seed++){const league=E.Season.create(seed,format,'eng'),contest=E.Season.begin(league);if(E.Contest.ownTurn(contest)===bowl)continue;return E.CareerSave.pack({schema:5,active:format,wallet,sessions:{[format]:{league,contest,match:E.Contest.current(contest),recorded:false,...E.Restart.view()}}});}}
function contest(format,k,E=C){const teams=E.Squad.teams(format);return E.Contest.create(900+k*31,format,teams[k%8],teams[(k+3)%8],teams[k%8].id);}
function mount(h,a,t=0){const s=h.u.get();Object.assign(s,{pending:a.ball,live:{...a.r,batter:s.match.striker,nonStriker:s.match.nonStriker},phase:'inPlay',resultAge:t*1000,elapsed:a.ball.duration,shot:a.input,fieldBrief:false,motionVersion:29,ballBridge:null});h.u.renderUI();return s;}
// A released manual ball and its result for the given stroke, searched until `want` accepts it.
function play(m,input,want,from=1){for(let seed=from;seed<from+400;seed++){const d=C.BowlingControl.prepare({...m,rngState:seed*571},{line:.14}),ball=C.BowlingControl.release(d.ball,890),r=C.Shot.resolve(ball,input,m.batters[m.striker],C.Innings.field(m,ball),d.rngState);if(want(r,ball))return{ball,input,r,seed};}throw Error('No such ball');}
const hand=(m,side)=>({...m,batters:m.batters.map((b,i)=>i===m.striker?{...b,attributes:{...b.attributes,hand:side}}:b)});
const inputs=[{angle:44,mode:'ground',effort:.7,error:45,callRuns:true},{angle:-95,mode:'loft',effort:.9,error:-70},{angle:0,mode:'defend',effort:.3,error:10},{angle:-95,mode:'ground',effort:.8,error:125},null];
(async()=>{
await check('A match begun under revision 38 keeps its pitch, ball and wind, and its prepared balls are released, read, struck and fielded exactly as before',async()=>{
 let compared=0;
 for(const format of ['T20','TEST'])for(let k=1;k<=10;k++){const m=O.Contest.current(contest(format,k,O));assert.equal(m.pitchModel,undefined);
  assert.deepEqual(copy(C.Conditions.at(copy(m))),copy(O.Conditions.at(m)));assert.deepEqual(copy(C.Weather.at({...copy(m),balls:6})),copy(O.Weather.at({...m,balls:6})));
  // A ball prepared now in that match carries the new version and nothing else that is new.
  const old=O.Innings.delivery(m),now=C.Innings.delivery(copy(m));assert.equal(old.ball.scoringVersion,38);assert.equal(now.ball.scoringVersion,39);assert.equal(now.ball.end,undefined);assert.equal(now.rngState,old.rngState);assert.deepEqual(copy({...now.ball,scoringVersion:38}),copy(old.ball));
  for(const manual of [false,true]){const d=manual?O.BowlingControl.prepare(m,{line:.14}):old,ball=manual?O.BowlingControl.release(d.ball,890):d.ball;
   if(manual){assert.equal(ball.manualBowling.version,38);assert.deepEqual(copy(C.BowlingControl.release(copy(d.ball),890)),copy(ball));}
   assert.deepEqual(copy(C.Opposition.input(copy(m),copy(ball))),copy(O.Opposition.input(m,ball)));
   for(const input of inputs){assert.deepEqual(copy(C.Shot.resolve(copy(ball),input,copy(m.batters[m.striker]),C.Innings.field(copy(m),copy(ball)),d.rngState)),copy(O.Shot.resolve(ball,input,m.batters[m.striker],O.Innings.field(m,ball),d.rngState)));compared++;}}}
 assert.equal(compared,200);
});
await check('A revision 38 save validates as it stands; a revision 39 save keeps its end, side, plan and banner record, and a damaged one is refused',async()=>{
 for(const format of ['T20','TEST'])for(const bowl of [false,true]){const app=fixture(bowl,format,O.Economy.create(),O),s=app.sessions[format],m=O.Contest.current(s.contest),d=bowl?O.BowlingControl.prepare(m,{line:.14}):O.Innings.delivery(m),b=bowl?O.BowlingControl.release(d.ball,890):d.ball,r=O.Shot.resolve(b,inputs[0],m.batters[m.striker],O.Innings.field(m,b),d.rngState);
  Object.assign(s,{pending:b,phase:'inPlay',live:{...r,batter:m.striker,nonStriker:m.nonStriker}});const before=copy(app),kept=C.CareerSave.validate(copy(app));assert.equal(kept.sessions[format].pending.scoringVersion,38);assert.equal(kept.sessions[format].contest.pitchModel,undefined);assert.deepEqual(copy(kept.sessions[format].pending),before.sessions[format].pending);assert.deepEqual(copy(O.CareerSave.validate(copy(app))),copy(kept));}
 const app=fixture(true),s=app.sessions.T20,m=C.Contest.current(s.contest),d=C.BowlingControl.prepare(m,{line:.14,side:'round'}),b=C.BowlingControl.release(d.ball,890),r=C.Shot.resolve(b,inputs[0],m.batters[m.striker],C.Innings.field(m,b),d.rngState);
 Object.assign(s,{pending:b,phase:'inPlay',live:{...r,batter:m.striker,nonStriker:m.nonStriker},bowlingPlan:{line:.14,variation:b.manualBowling.variation,field:'balanced',side:'round'},banners:{seed:s.contest.seed,pitch:true,day:1,ball:'1:0'}});
 const kept=C.CareerSave.validate(copy(app)).sessions.T20;assert.equal(kept.contest.pitchModel,39);assert.equal(kept.pending.scoringVersion,39);assert.equal(kept.pending.end,0);assert.equal(kept.pending.manualBowling.version,39);assert.equal(kept.pending.manualBowling.side,'round');assert.equal(kept.bowlingPlan.side,'round');assert.deepEqual(copy(kept.banners),{seed:s.contest.seed,pitch:true,day:1,ball:'1:0'});
 for(const damage of [x=>{x.contest.pitchModel=40;},x=>{x.contest.innings[0].pitchModel=38;},x=>{x.pending.end=2;},x=>{x.pending.manualBowling.side='under';},x=>{x.bowlingPlan.side='wide';},x=>{x.banners.day=9;},x=>{x.banners.seed=-1;},x=>{x.banners.ball='x'.repeat(13);},x=>{x.banners.pitch='yes';}]){const bad=copy(app);damage(bad.sessions.T20);assert.throws(()=>C.CareerSave.validate(bad),/Invalid/);}
 const end={kind:'end',title:'Pavilion End',name:'1',detail:'Into the wind · 20 km/h',stats:[],duration:1800},field={kind:'field',title:'Field set',name:'',detail:'balanced',stats:[],duration:1800};
 assert.equal(C.Broadcast.valid([field,end]),true);assert.equal(C.Broadcast.valid([end,end]),false);assert.equal(C.Broadcast.valid([{...end,name:'2'}]),false);assert.equal(C.Broadcast.valid([{...end,duration:9000}]),false);assert.equal(C.Broadcast.valid([field,field,field,field,field,end]),false);
});
await check('Overs come from alternate ends: the wind turns round with the end, swing follows it, and the over’s first ball names the end',async()=>{
 let windy=0,reworded=0;
 for(let k=1;k<=60;k++){const c=contest('T20',k),m=C.Contest.current(c),far={...m,balls:6};assert.equal(m.pitchModel,39);assert.equal(C.Ends.of(m),0);assert.equal(C.Ends.of(far),1);assert.equal(C.Ends.of({...m,balls:11}),1);assert.equal(C.Ends.of({...m,balls:12}),0);
  const a=C.Weather.at(m),b=C.Weather.at(far);near(b.windX,-a.windX,1e-12);near(b.windZ,-a.windZ,1e-12);assert.equal(b.wind,a.wind);assert.equal(b.name,a.name);assert.ok(C.Weather.valid(a)&&C.Weather.valid(b));
  const ball=C.Innings.delivery(m).ball,next=C.Innings.delivery(far).ball;assert.equal(ball.end,0);assert.equal(next.end,1);assert.deepEqual(copy(ball.weather),copy(ball.conditions.weather));assert.equal(ball.conditions.end,0);
  if(a.wind>=12&&Math.abs(a.windZ)>.5){windy++;const into=a.windZ>0?C.Conditions.at(m):C.Conditions.at(far),behind=a.windZ>0?C.Conditions.at(far):C.Conditions.at(m);assert.ok(into.swing>behind.swing,'Into the wind swings more');}
  // The first ball of the innings names the opening end; a ball later in the over does not name it again.
  const cards=C.Broadcast.cards(m,null,ball,[]),ends=cards.filter(x=>x.kind==='end');assert.equal(ends.length,1);assert.equal(ends[0].name,'0');assert.equal(ends[0].title,'Opening end');assert.equal(C.Broadcast.valid(cards),true);
  let live=c,first=null;while(C.Contest.current(live).balls<6&&live.phase==='play'){const turn=C.Opposition.ball(live);first??=turn.ball;live=turn.contest;if(C.Contest.current(live).balls===1&&live.phase==='play')assert.equal(C.Broadcast.cards(C.Contest.current(live),first,C.Innings.delivery(C.Contest.current(live)).ball,[]).some(x=>x.kind==='end'),false);}
  if(live.phase!=='play')continue;const over=C.Contest.current(live),change=C.Innings.delivery(over).ball,after=C.Broadcast.cards(over,first,change,[]),named=after.find(x=>x.kind==='end');assert.equal(change.end,1);assert.equal(named.name,'1');assert.equal(named.title,'Change of ends');assert.match(named.detail,/^(Still air|Crosswind|Into the wind|Wind behind)/);
  // Swing wording that changed only because the wind turned round is not a change in the weather.
  if(first.weather.name===change.weather.name&&C.Weather.brief(first.weather)!==C.Weather.brief(change.weather)&&Math.abs(first.weather.damp-change.weather.damp)<.02){reworded++;assert.equal(after.some(x=>x.kind==='weather'),false);}}
 assert.ok(windy>=3,'Windy matches: '+windy);assert.ok(reworded>=1,'Matches where the wording turned with the end: '+reworded);
});
await check('Every match has its own pitch: bounce, pace and variable bounce are drawn once per match, vary more than before, and never read match RNG',async()=>{
 const now=[],then=[],lift=[];
 for(let k=1;k<=300;k++){const c=contest('T20',k),m=C.Contest.current(c),rng=m.rngState,p=C.Conditions.at(m),o=O.Conditions.at(O.Contest.current(contest('T20',k,O)));assert.deepEqual(copy(C.Conditions.at(copy(m))),copy(p));assert.equal(m.rngState,rng);
  assert.equal(p.version,39);assert.ok(Math.abs(p.character.lift)<=1&&Math.abs(p.character.quick)<=1&&p.character.uneven>=.55&&p.character.uneven<=1.9);now.push(p.bounce);then.push(o.bounce);lift.push(p.character.lift);
  // The surface is the same all match: only the ball's share changes with its age.
  const old=C.Conditions.at({...m,balls:96});assert.deepEqual(copy(old.character),copy(p.character));assert.equal(p.hard,1);assert.equal(old.hard,0);near(p.bounce/old.bounce,1.027/.967,1e-9);near(p.pace/old.pace,1.0135/.9835,1e-9);assert.ok(p.seam>old.seam&&p.swing>old.swing);
  const report=C.Conditions.report(m),later=C.Conditions.report({...m,balls:96});assert.equal(report.lines.length,4);assert.ok(report.lines.every(t=>typeof t==='string'&&t.length>8&&t.length<60));assert.equal(report.stats.length,4);assert.ok(report.stats.every(([name,value])=>typeof name==='string'&&Number.isInteger(value)&&value>=0&&value<=100));
  assert.equal(report.ball,'New white ball');assert.equal(later.ball,'White ball, 16 overs old');assert.deepEqual(later.stats.slice(0,2),report.stats.slice(0,2));assert.equal(later.surface,report.surface);}
 assert.ok(sd(now)>sd(then)*1.25,'Bounce spread '+sd(now).toFixed(4)+' against '+sd(then).toFixed(4));assert.ok(Math.abs(lift.reduce((a,b)=>a+b,0)/lift.length)<.12);assert.ok(Math.max(...lift)>.8&&Math.min(...lift)<-.8);
 // A Test ball softens over 55 overs and is replaced after 80.
 const t=C.Contest.current(contest('TEST',3)),fresh=C.Conditions.at(t),worn=C.Conditions.at({...t,balls:479}),second=C.Conditions.at({...t,balls:480});assert.equal(fresh.hard,1);assert.equal(worn.hard,0);assert.equal(second.hard,1);assert.equal(second.newBall,true);near(fresh.bounce/worn.bounce,1.07/.97,1e-9);assert.ok(second.swing>worn.swing*3);assert.equal(C.Conditions.report(t).ball,'New red ball');assert.equal(C.Conditions.report({...t,balls:300}).ball,'Red ball, 50 overs old');
});
await check('The player’s swing belongs to the bowler: a left-hander meets the same ball under the other name, and round the wicket moves only the release',async()=>{
 let swingers=0;
 for(let k=1;k<=80&&swingers<12;k++){const base=C.Contest.current(contest('T20',k)),owner=base.bowlers[C.Innings.bowler(base)],name=C.BowlingControl.options(owner).map(o=>o.name).find(n=>/swinger/.test(n));if(!name)continue;swingers++;
  const other=name==='Outswinger'?'Inswinger':'Outswinger',r=C.BowlingControl.release(C.BowlingControl.prepare(hand(base,'right'),{line:.14,variation:name}).ball,930),l=C.BowlingControl.release(C.BowlingControl.prepare(hand(base,'left'),{line:.14,variation:name}).ball,930);
  assert.equal(r.battingHand,'right');assert.equal(l.battingHand,'left');assert.equal(r.manualBowling.version,39);assert.equal(r.manualBowling.variation,name);assert.equal(l.manualBowling.variation,name);assert.equal(r.variation,name);assert.equal(l.variation,other);
  // The same swing in the world, the same aim against each batter's own stumps.
  assert.equal(l.swing,r.swing);assert.equal(Math.sign(r.swing),name==='Outswinger'?1:-1);assert.equal(l.line,-r.line);assert.equal(l.length,r.length);assert.equal(l.speed,r.speed);
  assert.equal(C.BowlingControl.display(name,'right'),name);assert.equal(C.BowlingControl.display(name,'left'),other);assert.equal(C.BowlingControl.display('Slower ball','left'),'Slower ball');
  assert.deepEqual(copy(C.BowlingControl.symbol(owner,l.variation,'left')),copy(C.BowlingControl.symbol(owner,r.variation,'right')));
  const over=C.BowlingControl.prepare(base,{line:.14,variation:name}),round=C.BowlingControl.prepare(base,{line:.14,variation:name,side:'round'}),a=C.BowlingControl.release(over.ball,930),b=C.BowlingControl.release(round.ball,930);
  assert.equal(over.ball.manualBowling.side,'over');assert.equal(round.ball.manualBowling.side,'round');assert.equal(round.rngState,over.rngState);assert.equal(Math.sign(round.ball.releaseX),-Math.sign(over.ball.releaseX));assert.ok(Math.abs(round.ball.releaseX)>=.9&&Math.abs(round.ball.releaseX)<=1.05&&Math.abs(round.ball.releaseX)>Math.abs(over.ball.releaseX)+.3);
  assert.equal(b.line,a.line);assert.equal(b.length,a.length);assert.equal(b.swing,a.swing);assert.equal(b.speed,a.speed);assert.ok(Math.abs(C.Delivery.at(b,.2).x-C.Delivery.at(a,.2).x)>.8);near(C.Delivery.at(b,1).x-C.Delivery.at(a,1).x,0,.02);}
 assert.equal(swingers,12);
 for(const [arm,spin,x]of [['right',false,.43],['right',true,.54],['left',false,-.60],['left',true,-.54]]){assert.equal(C.BowlingControl.releaseX(arm,spin),x);const r=C.BowlingControl.releaseX(arm,spin,'round');assert.equal(Math.sign(r),-Math.sign(x));assert.ok(Math.abs(r)>=.9&&Math.abs(r)<=1.05);}
});
await check('Fast-forward applies only to the ball it was pressed on, in the field and at the crease',async()=>{
 for(const bowl of [true,false]){const h=host('T20',fixture(bowl));await h.n('resumeBtn').click();const m=h.u.get().match,a=play(m,inputs[0],r=>r.play.running&&r.play.throw&&!r.wicket&&r.play.event.type==='pickup'&&r.play.event.time>.6),s=mount(h,a,.1),at=()=>C.Fielding.playback(s.live.play,s.resultAge);
  assert.equal(h.n('fastForwardBtn').hidden,false);const t=at();h.step();near(at(),t+.1,1e-6);await h.n('fastForwardBtn').click();assert.equal(h.n('fastForwardBtn').attrs['aria-pressed'],'true');const t0=at();h.step();near(at(),t0+.4,1e-6);
  h.u.clearDelivery();mount(h,play(h.u.get().match,inputs[0],r=>r.play.running&&r.play.throw&&!r.wicket&&r.play.event.type==='pickup'&&r.play.event.time>.6,a.seed+1),.1);const t1=at();h.step();near(at(),t1+.1,1e-6);assert.equal(h.n('fastForwardBtn').textContent,'Fast-forward 4×');assert.equal(h.n('fastForwardBtn').attrs['aria-pressed'],'false');}
});
await check('The camera keeps the main view while the ball stays in it, lifts when the ball leaves it, and with motion reduced cuts only after the stroke is shown',async()=>{
 const same=(a,b)=>Object.keys(a).every(k=>Math.abs(a[k]-b[k])<1e-6),cam=h=>h.u.presentation().camera;
 const h=host('T20',fixture(true));await h.n('resumeBtn').click();const m=h.u.get().match;h.u.drawField(0);const base=copy(cam(h));
 // Through to the keeper, in front of the bowler's camera: nothing moves for the whole replay.
 const taken=play(m,null,(r,b)=>r.play.kind==='through'&&!r.wicket&&!r.wide&&!b.fullToss);mount(h,taken,0);assert.equal(h.u.staysInView(taken.r.play,base),true);for(let i=0;i<25;i++){h.step(100);h.u.drawField(i);assert.ok(same(cam(h),base),'Camera moved at '+i);}
 // Hit a long way: the ball leaves the frame, so the camera lifts as it always did.
 h.u.clearDelivery();const far=play(h.u.get().match,{angle:0,mode:'loft',effort:1,error:0},r=>r.contact&&Math.hypot(r.play.event.x,r.play.event.z)>45,taken.seed+1);mount(h,far,0);assert.equal(h.u.staysInView(far.r.play,base),false);h.u.drawField(0);for(let i=0;i<16;i++){h.step(100);h.u.drawField(i);}assert.ok(cam(h).y>base.y+2,'Camera height '+cam(h).y);
 // Reduced motion: the same hit is watched from the main view for the stroke, then cut to the field view.
 const q=host('T20',fixture(true));await q.n('resumeBtn').click();q.n('reducedMotionToggle').checked=true;await q.n('reducedMotionToggle').dispatch('change',{target:q.n('reducedMotionToggle')});assert.equal(q.u.presentation().reducedMotion,true);q.u.drawField(0);const still=copy(cam(q)),hit=play(q.u.get().match,{angle:0,mode:'loft',effort:1,error:0},r=>r.contact&&Math.hypot(r.play.event.x,r.play.event.z)>45&&r.play.event.time>1.5);mount(q,hit,0);
 for(let i=0;i<5;i++){q.step(100);q.u.drawField(i);assert.ok(same(cam(q),still),'Cut before the stroke was shown, at '+i);}q.step(100);q.u.drawField(6);assert.ok(same(cam(q),q.u.fieldCamera(hit.r.play)),'No cut after the stroke');
 // A held view is not dissolved at all with motion reduced.
 q.u.clearDelivery();q.u.drawField(7);const quiet=play(q.u.get().match,null,(r,b)=>r.play.kind==='through'&&!r.wicket&&!r.wide&&!b.fullToss,hit.seed+1);mount(q,quiet,0);const view=copy(cam(q));for(let i=0;i<12;i++){q.step(100);q.u.drawField(i);assert.ok(same(cam(q),view));}
});
await check('The wheel names the ball for the batter on strike, and the white arrow sends the bowler round the wicket and back',async()=>{
 const h=host('T20',fixture(true));await h.n('resumeBtn').click();const s=h.u.get(),wheel=h.n('bowlingGallery'),rng=s.match.rngState;let index=-1,name=null;
 for(const b of C.BowlingControl.eligible(s.match)){const found=C.BowlingControl.options({...s.match.bowlers[b.index],...C.Players.bowler(s.match,b.index),archetype:C.Players.bowler(s.match,b.index).type}).map(o=>o.name).find(n=>/swinger/.test(n));if(b.allowed&&found){index=b.index;name=found;break;}}
 assert.ok(index>=0,'A bowler who swings it');h.n('bowlerSelect').value=String(index);await h.n('bowlerSelect').dispatch('change',{target:h.n('bowlerSelect')});assert.ok(C.BowlingControl.options(h.u.activeOwner()).some(o=>o.name===name));s.bowlingPlan.variation=name;
 const other=name==='Outswinger'?'Inswinger':'Outswinger',striker=s.match.batters[s.match.striker];
 striker.attributes.hand='right';h.u.renderUI();h.u.renderBowling();assert.equal(h.n('galleryDeliveryName').textContent,name);assert.match(h.n('feedbackDetail').textContent,new RegExp('^'+name+' · '));
 striker.attributes.hand='left';h.u.renderUI();h.u.renderBowling();assert.equal(h.n('galleryDeliveryName').textContent,other);assert.match(h.n('feedbackDetail').textContent,new RegExp('^'+other+' · '));assert.equal(s.bowlingPlan.variation,name);assert.equal(h.u.ballName(name),other);
 striker.attributes.hand='right';h.u.renderUI();h.u.renderBowling();
 // Over the wicket to begin with. The arrow is on the side the bowler would move to.
 const arm=h.u.activeOwner().arm==='left'?-1:1;assert.equal(h.u.runSide(),arm);assert.equal(h.u.bowlerWorld().x,arm*1.5);assert.equal(h.u.bowlingCamera().x,arm*1.05);assert.equal(wheel.dataset.switch,arm>0?'right':'left');assert.equal(h.n('sideLabel').textContent,'Round the wicket');assert.equal(h.n('sideBtn').attrs['aria-pressed'],'false');
 const tap=async id=>{await wheel.dispatch('pointerdown',pointer(wheel,200,300,{target:h.n(id)}));await wheel.dispatch('pointerup',pointer(wheel,202,301,{target:h.n(id)}));await h.n(id).dispatch('click');};
 await tap('sideBtn');assert.equal(s.bowlingPlan.side,'round');assert.equal(h.u.runSide(),-arm);assert.equal(h.u.bowlerWorld().x,-arm*1.5);assert.equal(h.u.bowlingCamera().x,-arm*1.05);assert.equal(wheel.dataset.switch,arm>0?'left':'right');assert.equal(h.n('sideLabel').textContent,'Over the wicket');assert.equal(h.n('sideBtn').attrs['aria-pressed'],'true');assert.match(h.n('feedbackDetail').textContent,/ · round the wicket$/);
 h.u.drawField(0);h.u.drawPad();assert.equal(s.match.rngState,rng);assert.equal(s.phase,'ready');
 // The run-up starts on that side and the ball is released from it.
 const field=h.n('fieldCanvas');h.u.pointerDown(pointer(field,180,300));h.step(100);h.step(100);if(s.fieldBrief){h.u.pointerUp(pointer(field,180,300));h.u.pointerDown(pointer(field,180,300));h.u.pointerUp(pointer(field,180,300));h.u.pointerDown(pointer(field,180,300));}
 assert.equal(s.phase,'flight');assert.equal(s.pending.manualBowling.side,'round');assert.equal(Math.sign(s.pending.releaseX),-arm);assert.equal(h.u.runSide(),-arm);for(let i=0;i<9;i++){h.step(100);h.u.drawField(i);}assert.equal(Math.sign(h.u.bowlerWorld().x),-arm);
 h.u.pointerMove(pointer(field,180,200));h.u.pointerUp(pointer(field,180,200));assert.notEqual(s.pending.manualBowling.releaseAge,null);assert.equal(Math.sign(s.pending.releaseX),-arm);assert.ok(Math.abs(s.pending.releaseX)>.6);
 await h.n('menuBtn').click();await h.n('resumeBtn').click();const saved=C.CareerSave.validate(JSON.parse(h.storage.get('cricket.career.v5'))).sessions.T20;assert.equal(saved.bowlingPlan.side,'round');assert.equal(saved.pending.manualBowling.side,'round');
});
await check('Wind arrow, radar and scenery share the picture’s frame: they turn round in the field, and the ground is seen from the other end on alternate overs',async()=>{
 const angle=n=>+n.style.transform.match(/rotate\((-?\d+)deg\)/)[1],turn=(a,b)=>((a-b)%360+360)%360;
 const bat=host('T20',fixture(false));await bat.n('resumeBtn').click();const sb=bat.u.get(),wb=C.Weather.wind(C.Weather.at(sb.match));assert.equal(angle(bat.n('windArrow')),wb.angle);assert.equal(bat.n('radarCanvas').attrs['aria-label'],'Field positions. Bowler at the top.');assert.match(bat.n('windIndicator').attrs['aria-label'],/matches the picture and the field radar/);
 const bowl=host('T20',fixture(true));await bowl.n('resumeBtn').click();const s=bowl.u.get(),w=C.Weather.wind(C.Weather.at(s.match));assert.equal(turn(angle(bowl.n('windArrow')),w.angle),180);assert.equal(bowl.n('radarCanvas').attrs['aria-label'],'Field positions. Bowler at the bottom.');
 // Ends: the stands, the sun and the named end turn with the over; pitch-relative things do not.
 for(const h of [bat,bowl]){const t=h.u.get(),rng=t.match.rngState,near0=h.u.groundModel(0),far=h.u.groundModel(1),end0=h.u.endName(0),end1=h.u.endName(1);assert.equal(h.u.activeEnd(),0);assert.notEqual(end0,end1);assert.match(h.n('bowlerStyle').textContent,new RegExp(' · '+end0+'$'));
  assert.equal(far.faces.length,near0.faces.length);for(const i of [0,7,far.faces.length-1])far.faces[i].points.forEach((p,j)=>{const q=near0.faces[i].points[j];assert.equal(p.x,-q.x);assert.equal(p.z,-q.z);assert.equal(p.h,q.h);});assert.equal(far.people[3].point.x,-near0.people[3].point.x);assert.equal(h.u.groundModel(1),far);
  const sun=copy(h.u.lighting());h.u.drawField(0);const calls=h.n('fieldCanvas').drawCalls;t.match.balls=6;assert.equal(h.u.activeEnd(),1);const turned=copy(h.u.lighting());near(turned.sx,-sun.sx,1e-9);near(turned.sz,-sun.sz,1e-9);assert.notEqual(turned.key,sun.key);h.u.renderUI();assert.match(h.n('bowlerStyle').textContent,new RegExp(' · '+end1+'$'));
  h.u.drawField(1);assert.ok(h.n('fieldCanvas').drawCalls>calls);t.match.balls=12;assert.equal(h.u.activeEnd(),0);t.match.balls=0;assert.equal(t.match.rngState,rng);}
 // The over's first ball is introduced by its end.
 await bat.n('bowlBtn').click();const cards=sb.briefCards;assert.equal(cards.filter(c=>c.kind==='end').length,1);assert.equal(cards.find(c=>c.kind==='end').title,bat.u.endName(0));assert.equal(C.Broadcast.valid(cards),true);bat.u.renderBrief();assert.ok((bat.n('briefTitle').textContent+bat.n('briefConditions').textContent+bat.n('broadcastTitle').textContent).includes(bat.u.endName(0))||cards.some(c=>['batter','bowler'].includes(c.kind)));
 for(const id of ['club','newlands','eden','mcg','lords']){bat.u.app().wallet.stadium=id;assert.notEqual(bat.u.endName(0),bat.u.endName(1));assert.match(bat.u.endName(0),/ End$/);assert.match(bat.u.endName(1),/ End$/);}
});
await check('Banners: the pitch report before the first ball, stumps and the next morning in a Test, the new ball after 80 overs, each shown once',async()=>{
 const h=host('T20',fixture(false));await h.n('resumeBtn').click();const s=h.u.get(),rng=s.match.rngState,box=h.n('matchBanner'),field=h.n('fieldCanvas');assert.equal(box.hidden,true);assert.equal(h.u.banner(),null);
 assert.equal(h.u.maybeBanner(),true);assert.equal(box.hidden,false);assert.equal(h.n('fieldArena').dataset.banner,'true');assert.equal(h.n('bannerTitle').textContent,'PITCH REPORT');assert.equal(h.n('bannerLines').children.length,5);assert.equal(h.n('bannerChart').children.length,4);assert.equal(h.n('bannerDetail').textContent,C.Conditions.report(s.match).surface);
 // It holds the clock, and a tap on the field dismisses it without becoming a stroke.
 h.step(500);assert.equal(s.phase,'ready');const tap=pointer(field,200,300);h.u.pointerDown(tap);assert.equal(tap.prevented,true);assert.equal(h.u.banner(),null);assert.equal(box.hidden,true);assert.equal(h.u.gesture(),null);assert.deepEqual(copy(s.banners),{seed:s.contest.seed,pitch:true,day:1,ball:'1:0'});assert.equal(h.u.maybeBanner(),false);assert.equal(s.match.rngState,rng);
 // Left alone, a banner closes itself.
 delete s.banners;assert.equal(h.u.maybeBanner(),true);for(let i=0;i<101&&h.u.banner();i++)h.step(100);assert.equal(h.u.banner(),null);assert.equal(s.banners.pitch,true);
 // A match already under way when this revision arrives shows nothing.
 const m=s.match,d=C.Innings.delivery(m),r=C.Shot.resolve(d.ball,inputs[2],m.batters[m.striker],C.Innings.field(m,d.ball),d.rngState),next=C.Contest.apply(C.Contest.withPrepared(s.contest,d.rngState),d.ball,r);Object.assign(s,{contest:next,match:C.Contest.current(next)});delete s.banners;assert.equal(h.u.maybeBanner(),false);assert.equal(s.banners.pitch,true);
 // A Test: stumps, then the morning's report, at the first quiet moment of the new day.
 const t=host('TEST',fixture(false,'TEST'));await t.n('resumeBtn').click();const ts=t.u.get();assert.equal(t.u.maybeBanner(),true);assert.match(t.n('bannerKicker').textContent,/Day 1$/);t.u.advanceBanner();assert.equal(t.u.banner(),null);
 ts.contest.clockSeconds=C.Contest.DAY;assert.equal(C.Contest.clock(ts.contest).day,2);assert.equal(t.u.maybeBanner(),true);assert.equal(t.u.banner().cards.length,2);assert.equal(t.n('bannerTitle').textContent,'END OF DAY 1');assert.equal(t.n('bannerKicker').textContent,'Stumps');assert.match(t.n('bannerDetail').textContent,/ 0\/0 · 0\.0 overs$/);
 t.u.pointerDown(pointer(t.n('fieldCanvas'),200,300));assert.equal(t.n('bannerTitle').textContent,'DAY 2');assert.equal(t.n('bannerKicker').textContent,'Pitch report');assert.equal(t.n('bannerChart').children.length,4);t.u.advanceBanner();assert.equal(t.u.banner(),null);assert.equal(ts.banners.day,2);assert.equal(t.u.maybeBanner(),false);
 // Asked for the next ball at once, the day's banners still come first, and the ball follows them.
 ts.contest.clockSeconds=C.Contest.DAY*2;await t.n('bowlBtn').click();assert.equal(ts.phase,'ready');assert.equal(t.n('bannerTitle').textContent,'END OF DAY 2');await t.n('bowlBtn').click();assert.equal(t.n('bannerTitle').textContent,'DAY 3');await t.n('bowlBtn').click();assert.equal(t.u.banner(),null);assert.equal(ts.phase,'flight');assert.equal(ts.banners.day,3);
 // The second new ball.
 const b=host('TEST',fixture(true,'TEST'));await b.n('resumeBtn').click();const bs=b.u.get();b.u.maybeBanner();b.u.advanceBanner();bs.match.balls=474;assert.equal(b.u.maybeBanner(),false);bs.match.balls=480;assert.equal(b.u.maybeBanner(),true);assert.equal(b.n('bannerTitle').textContent,'NEW BALL');assert.equal(b.n('bannerKicker').textContent,'80.0 overs bowled');assert.equal(b.n('bannerLines').children.length,3);b.u.advanceBanner();assert.equal(bs.banners.ball,'1:1');assert.equal(b.u.maybeBanner(),false);bs.match.balls=0;
 assert.equal(C.CareerSave.validate(JSON.parse(t.storage.get('cricket.career.v5'))).sessions.TEST.banners.day,3);
});
await check('The ball carries its seam: angled the way it will swing, canted the way it will turn, across the line for a slower ball, and tumbling once struck',async()=>{
 const h=host('T20',fixture(false));await h.n('resumeBtn').click();await h.n('bowlBtn').click();if(h.u.get().fieldBrief)await h.n('readyBallBtn').click();const s=h.u.get(),field=h.n('fieldCanvas'),rng=s.match.rngState,unit=v=>near(Math.hypot(v.x,v.y,v.z),1,1e-9);
 assert.equal(s.phase,'flight');const base=s.pending,shape=(more)=>{s.pending={...base,...more};s.elapsed=s.pending.duration*.5;return h.u.seamRing();};
 for(const swing of [.2,-.2,.05,-.05]){const ring=shape({family:'pace',archetype:'seam',variation:'Seam-up',swing,kick:0});unit(ring.u);unit(ring.v);near(ring.u.x*ring.v.x+ring.u.y*ring.v.y+ring.u.z*ring.v.z,0,1e-9);assert.equal(Math.sign(ring.u.x),Math.sign(swing));assert.ok(ring.u.z<0);assert.equal(ring.v.y,1);assert.ok(Math.abs(ring.u.x)<=Math.sin(26.01*Math.PI/180));}
 assert.equal(shape({family:'pace',archetype:'seam',variation:'Seam-up',swing:0,kick:.01}).u.x,0);
 for(const kick of [.05,-.05]){const ring=shape({family:'wrist-spin',archetype:'legspin',variation:'Leg-break',swing:0,kick});unit(ring.u);unit(ring.v);near(ring.u.x*ring.v.x+ring.u.y*ring.v.y+ring.u.z*ring.v.z,0,1e-9);assert.equal(Math.sign(ring.u.x),Math.sign(kick));assert.ok(Math.abs(ring.u.x)>.7);assert.ok(ring.v.y<1&&ring.v.y>.9);}
 const slow=shape({family:'pace',archetype:'seam',variation:'Slower ball',swing:0,kick:0});assert.equal(slow.u.x,1);assert.ok(slow.rate<9);
 // Drawn in flight with the close-up, in both formats and both roles, with finite coordinates.
 for(const swing of [.2,-.2]){shape({family:'pace',archetype:'seam',variation:'Seam-up',swing,kick:0});const before=field.drawCalls;h.u.drawField(0);const balls=h.u.takePaintedBalls();assert.ok(balls.length>=1);assert.ok(field.drawCalls-before>40);}
 // Struck, the ball has no ring. Through to the keeper, it keeps the bowler's.
 s.pending=base;const m=s.match,hit=C.Shot.resolve(base,inputs[0],m.batters[m.striker],C.Innings.field(m,base),rng);if(hit.play&&hit.play.kind!=='through'){mount(h,{ball:base,r:hit,input:inputs[0]},.2);assert.equal(h.u.seamRing(),null);h.u.drawField(0);}
 const left=C.Shot.resolve(base,null,m.batters[m.striker],C.Innings.field(m,base),rng);if(left.play?.kind==='through'){mount(h,{ball:base,r:left,input:null},.05);assert.notEqual(h.u.seamRing(),null);h.u.drawField(0);}
 const t=host('TEST',fixture(true,'TEST'));await t.n('resumeBtn').click();const ts=t.u.get(),a=play(ts.match,null,(r,b)=>r.play.kind==='through'&&!r.wicket&&!r.wide&&!b.fullToss);mount(t,a,.05);const before=t.n('fieldCanvas').drawCalls;t.u.drawField(0);assert.ok(t.n('fieldCanvas').drawCalls>before);assert.notEqual(t.u.seamRing(),null);
 assert.equal(s.match.rngState,rng);
});
console.log(groups+' revision 39 groups passed.');
})().catch(e=>{console.error('FAIL\n'+String(e.stack).slice(0,2600));process.exit(1);});
