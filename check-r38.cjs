// R38: the frozen revision 37 engine against this one, the new input paths, and presentation that reads the match.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {C,host,pointer,copy}=require('./check-display-input.cjs');
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v37.js','utf8'),box);const O=box.Cricket;
let groups=0;async function check(name,fn){await fn();groups++;console.log('PASS '+name);}
function fixture(bowl=false,format='T20',wallet=C.Economy.create(),E=C){for(let seed=1;seed<100;seed++){const league=E.Season.create(seed,format,'eng'),contest=E.Season.begin(league);if(E.Contest.ownTurn(contest)===bowl)continue;return E.CareerSave.pack({schema:5,active:format,wallet,sessions:{[format]:{league,contest,match:E.Contest.current(contest),recorded:false,...E.Restart.view()}}});}}
// A ball with running and a throw, as check-ux-v35 finds one. `chance` asks for a live run-out chance at the pickup.
function sample(m,manual=false,chance=false,from=1){for(let seed=from;seed<from+300;seed++){const d=manual?C.BowlingControl.prepare({...m,rngState:seed*571},{line:.14}):C.Innings.delivery({...m,rngState:seed*571}),ball=manual?C.BowlingControl.release(d.ball,890):d.ball,input={angle:44,mode:'ground',effort:.65,error:30,callRuns:manual};let r=C.Shot.resolve(ball,input,m.batters[m.striker],C.Innings.field(m,ball),d.rngState);if(chance&&r.play.event.time>1.6&&r.play.running&&r.play.throw)r=C.Running.finish(r,[C.Running.leg(r.play.event.time-.3,0)],r.play.throw);const t=r.play.event.time,leg=r.play.running?.legs.find(l=>t>l.start&&t<l.end);if(chance&&(!leg||![0,1].some(end=>{const c=C.ReturnControl.choose(r,end,t);return c.dismissalKind==='runOut'||c.play.throw?.breakTime<=leg.end+.25;})))continue;if(r.play.running&&r.play.throw&&(!r.wicket||chance)&&r.play.event.type==='pickup'&&r.play.event.time>.6)return{ball,input,r,seed};}throw Error('No pickup');}
function mount(h,a,t=0){const s=h.u.get();Object.assign(s,{pending:a.ball,live:{...a.r,batter:s.match.striker,nonStriker:s.match.nonStriker},phase:'inPlay',resultAge:t*1000,elapsed:a.ball.duration,shot:a.input,fieldBrief:false,motionVersion:29});h.u.renderUI();return s;}
const surname=name=>name.trim().split(/\s+/).slice(1).join(' ')||name;
(async()=>{
await check('Balls prepared under revision 37 are released, read, struck and fielded exactly as revision 37 did',async()=>{
 let compared=0;
 for(const format of ['T20','TEST'])for(let k=1;k<=10;k++){const teams=O.Squad.teams(format),m=O.Innings.create(k*211,teams[k%8],teams[(k+3)%8],format,0);
  for(const manual of [false,true]){const d=manual?O.BowlingControl.prepare(m,{line:.14}):O.Innings.delivery(m),ball=manual?O.BowlingControl.release(d.ball,890):d.ball;assert.equal(ball.scoringVersion,37);
   if(manual)assert.deepEqual(copy(C.BowlingControl.release(copy(d.ball),890)),copy(ball));
   assert.deepEqual(copy(C.Opposition.input(copy(m),copy(ball))),copy(O.Opposition.input(m,ball)));
   for(const input of [{angle:44,mode:'ground',effort:.7,error:45,callRuns:true},{angle:-95,mode:'loft',effort:.9,error:-70},{angle:0,mode:'defend',effort:.3,error:10},{angle:-95,mode:'ground',effort:.8,error:125},null]){const old=O.Shot.resolve(ball,input,m.batters[m.striker],O.Innings.field(m,ball),d.rngState),now=C.Shot.resolve(copy(ball),input,copy(m.batters[m.striker]),C.Innings.field(copy(m),copy(ball)),d.rngState);assert.deepEqual(copy(now),copy(old));assert.ok(!['Top edge','Leading edge'].includes(now.edgeType)&&!now.mishit);compared++;}}}
 assert.equal(compared,200);
});
await check('A revision 37 save validates as it stands; a revision 38 release keeps its execution record and a damaged one is refused',async()=>{
 for(const format of ['T20','TEST'])for(const bowl of [false,true]){const app=fixture(bowl,format,O.Economy.create(),O),s=app.sessions[format],m=O.Contest.current(s.contest),d=bowl?O.BowlingControl.prepare(m,{line:.14}):O.Innings.delivery(m),b=bowl?O.BowlingControl.release(d.ball,890):d.ball,input={angle:44,mode:'ground',effort:.7,error:40,callRuns:true},r=O.Shot.resolve(b,input,m.batters[m.striker],O.Innings.field(m,b),d.rngState);
  Object.assign(s,{pending:b,phase:'inPlay',live:{...r,batter:m.striker,nonStriker:m.nonStriker}});const old=copy(app),kept=C.CareerSave.validate(copy(app));assert.equal(kept.schema,5);assert.equal(kept.sessions[format].pending.scoringVersion,37);assert.deepEqual(copy(kept.sessions[format].pending),old.sessions[format].pending);assert.deepEqual(copy(O.CareerSave.validate(copy(app))),copy(kept));}
 const app=fixture(true),s=app.sessions.T20,m=C.Contest.current(s.contest),d=C.BowlingControl.prepare(m,{line:.14}),b=C.BowlingControl.release(d.ball,890),input={angle:44,mode:'ground',effort:.7,error:40,callRuns:true},r=C.Shot.resolve(b,input,m.batters[m.striker],C.Innings.field(m,b),d.rngState);
 assert.equal(b.scoringVersion,38);assert.equal(b.manualBowling.version,38);Object.assign(s,{pending:b,phase:'inPlay',live:{...r,batter:m.striker,nonStriker:m.nonStriker}});
 const saved=C.CareerSave.validate(copy(app)).sessions.T20.pending.manualBowling;assert.deepEqual(copy(saved.execution),copy(b.manualBowling.execution));assert.equal(saved.intendedLabel,b.manualBowling.intendedLabel);
 for(const damage of [x=>{x.execution.slip='beamer';},x=>{x.execution.length=40;},x=>{x.execution.line=NaN;},x=>{x.intendedLabel='x'.repeat(21);}]){const bad=copy(app);damage(bad.sessions.T20.pending.manualBowling);assert.throws(()=>C.CareerSave.validate(bad),/Invalid/);}
});
await check('The bowler’s error is a derived stream: the match RNG is neither read nor advanced, and a ball keeps the error it was given',async()=>{
 const slips=new Set();let moved=0;
 for(let k=1;k<=40;k++){const format=k%2?'T20':'TEST',teams=C.Squad.teams(format),m=C.Innings.create(k*313,teams[k%8],teams[(k+2)%8],format,0),old=O.Innings.delivery(copy(m)),now=C.Innings.delivery(m);
  assert.equal(now.rngState,old.rngState);assert.equal(now.ball.scoringVersion,38);assert.deepEqual(copy(C.Innings.delivery(m)),copy(now));if(Math.abs(now.ball.length-old.ball.length)>1e-9||Math.abs(now.ball.line-old.ball.line)>1e-9)moved++;
  const d=C.BowlingControl.prepare(m,{line:.14}),before=copy(d),a=C.BowlingControl.release(d.ball,890),b=C.BowlingControl.release(d.ball,890);assert.deepEqual(copy(a),copy(b));assert.deepEqual(copy(d),before);assert.equal(d.rngState,O.BowlingControl.prepare(copy(m),{line:.14}).rngState);
  const e=a.manualBowling.execution;assert.ok(Number.isFinite(e.length)&&Number.isFinite(e.line));assert.ok([null,'fullToss','halfVolley','longHop','leg','wide'].includes(e.slip));slips.add(e.slip);assert.equal(typeof a.manualBowling.intendedLabel,'string');
  // The aim is the timing alone; where it lands is the aim plus the recorded error.
  assert.equal(a.manualBowling.intendedLength,C.BowlingControl.lengthAt(890,38));if(!e.slip&&a.length>.18)assert.ok(Math.abs(a.length-a.manualBowling.intendedLength-e.length)<.002);}
 assert.ok(moved>=30,'The AI ball should usually be moved by its bowler’s error: '+moved);
});
await check('A top edge goes behind square, and only a badly mistimed ground stroke pops up or takes the leading edge',async()=>{
 const t={top:0,behind:0,up:0,leading:0,clean:0,cleanUp:0,drives:0,driven:0,high:0};
 for(let k=1;k<=60;k++){const teams=C.Squad.teams('T20');let m=C.Innings.create(k*97+11,teams[k%8],teams[(k+4)%8],'T20',0);
  for(let n=0;n<40;n++){const d=C.Innings.delivery({...m,rngState:(m.rngState+n*7919)>>>0}),ball=d.ball,sign=C.Hand.sign(ball),spin=C.Strokes.spin(ball);
   if(!spin&&ball.lengthName==='short'&&ball.contactH>1.62){for(const error of [-60,-20,25,70]){const r=C.Shot.resolve(ball,{angle:-95*sign,mode:'ground',effort:.9,error},m.batters[m.striker],C.Innings.field(m,ball),d.rngState+error);if(!r.contact)continue;t.high++;if(r.edgeType==='Top edge'){t.top++;if(Math.abs(r.angle)>=90)t.behind++;}}
    for(const [angle,mode]of [[0,'ground'],[0,'loft'],[44*sign,'ground'],[-44*sign,'loft']]){const r=C.Shot.resolve(ball,{angle,mode,effort:.8,error:10},m.batters[m.striker],C.Innings.field(m,ball),d.rngState+angle);t.drives++;if(r.contact&&!r.edge&&Math.abs(r.angle)<80)t.driven++;}}
   if(['full','good'].includes(ball.lengthName)){const x=C.Delivery.at(ball,1).x*sign,angle=(x>.35?65:x>.1?44:x<-.15?-44:0)*sign;for(const error of [-130,-118,118,130]){const r=C.Shot.resolve(ball,{angle,mode:'ground',effort:.7,error},m.batters[m.striker],C.Innings.field(m,ball),d.rngState+error);if(r.mishit){t.up++;assert.ok(r.loft||r.mishit==='leading');if(r.mishit==='leading'){t.leading++;assert.equal(r.edgeType,'Leading edge');}}}
    for(const error of [-35,0,35]){const r=C.Shot.resolve(ball,{angle,mode:'ground',effort:.7,error},m.batters[m.striker],C.Innings.field(m,ball),d.rngState+error);if(r.contact){t.clean++;if(r.mishit)t.cleanUp++;}}}}}
 assert.ok(t.top>=8,'Top edges found: '+t.top);assert.equal(t.behind,t.top);assert.ok(t.drives>=200);assert.equal(t.driven,0);assert.ok(t.up>=12,'Pop-ups found: '+t.up);assert.ok(t.leading>=3,'Leading edges found: '+t.leading);assert.ok(t.clean>1500);assert.equal(t.cleanUp,0);
 console.log('  '+t.high+' pulls at balls above 1.62 m: '+t.top+' top edges, all behind square. '+t.drives+' drives at the same balls: '+t.driven+' struck in front of square. '+t.up+' pop-ups ('+t.leading+' leading edges) from strokes 118-130 ms out; none from '+t.clean+' within 35 ms.');
});
await check('The run button names the call: a tight run is offered in amber terms, a hopeless one is refused, and neither spends match RNG',async()=>{
 const h=host('T20',fixture());await h.n('resumeBtn').click();const s=h.u.get(),rng=s.match.rngState,seen={};
 for(let from=1;from<900&&!(seen.tight&&seen.late&&seen.available);from+=1){let a;try{a=sample(s.match,false,false,from);}catch{break;}from=a.seed;const play=a.r.play;
  for(let t=.05;t<play.event.time+2.5;t+=.05){const offer=C.Running.offer(a.r,t);if(!['tight','late','available'].includes(offer.status)||seen[offer.status]||offer.queued)continue;mount(h,a,t);const b=h.n('runBtn');assert.equal(h.n('runningPanel').hidden,false);assert.equal(b.dataset.call,offer.status);
   if(offer.status==='tight'){assert.equal(b.textContent,'Run '+offer.number+' · tight');assert.equal(b.disabled,false);assert.equal(offer.allowed,true);}
   if(offer.status==='late'){assert.equal(b.textContent,'No run');assert.equal(b.disabled,true);assert.equal(offer.allowed,false);const before=JSON.stringify(s.live);await b.dispatch('click');assert.equal(JSON.stringify(s.live),before);}
   if(offer.status==='available'){assert.equal(b.textContent,'Run '+offer.number);assert.equal(b.disabled,false);}
   assert.ok(!/risky/.test(b.textContent));seen[offer.status]=true;}}
 assert.deepEqual(Object.keys(seen).sort(),['available','late','tight']);assert.equal(s.match.rngState,rng);
});
await check('The broadcast strip names both batters and the bowler’s figures, and does not count a ball before the replay shows it',async()=>{
 for(const bowl of [false,true]){const h=host('T20',fixture(bowl));await h.n('resumeBtn').click();const s=h.u.get(),m=s.match,read=()=>['stripStrikerName','stripStrikerScore','stripPartnerName','stripPartnerScore','stripBowlerName','stripFigures'].map(id=>h.n(id).textContent);
  assert.equal(h.n('game').dataset.strip,'live');const owner=h.u.activeOwner(),before=read();assert.deepEqual(before,[surname(m.batters[m.striker].name),'0 (0)',surname(m.batters[m.nonStriker].name),'0 (0)',surname(owner.name),'0-0 (0.0)']);
  // A scoring ball goes into the book at contact. The strip keeps the old figures until the replay reaches the decision.
  let a=null;for(let from=1;from<600&&!a;from++){const c=sample(m,bowl,false,from);from=c.seed;if(c.r.runs>0&&!c.r.wicket&&c.r.legal!==false&&!c.r.wide&&!c.r.noBall)a=c;}
  const next=C.Contest.apply(s.contest,a.ball,a.r);Object.assign(s,{contest:next,match:C.Contest.current(next),pending:a.ball,live:null,phase:'result',resultAge:0,elapsed:a.ball.duration,shot:a.input,fieldBrief:false,motionVersion:29});h.u.renderUI();
  assert.deepEqual(read(),before);assert.equal(String(h.n('runs').textContent),'0');
  s.resultAge=60000;h.u.renderUI();const bowler=s.match.bowlers[a.ball.bowler],after=read();assert.equal(after[5],bowler.wickets+'-'+bowler.runs+' (0.1)');assert.equal(bowler.runs,a.r.bowlerRuns);assert.equal(String(h.n('runs').textContent),String(a.r.runs));
  const striker=s.match.batters[s.match.striker],partner=s.match.batters[s.match.nonStriker];assert.deepEqual(after.slice(0,4),[surname(striker.name),striker.runs+' ('+striker.balls+')',surname(partner.name),partner.runs+' ('+partner.balls+')']);assert.equal(striker.runs+partner.runs,a.r.batRuns);}
});
await check('On the field a vertical swipe changes the ball and a sideways swipe the line; a tap on a wheel button acts once; only a still hold starts the run-up',async()=>{
 const h=host('T20',fixture(true));await h.n('resumeBtn').click();const s=h.u.get(),field=h.n('fieldCanvas'),wheel=h.n('bowlingGallery'),rng=s.match.rngState,options=C.BowlingControl.options(h.u.activeOwner()).map(o=>o.name),lines=h.u.galleryLines();
 assert.equal(wheel.hidden,false);assert.equal(wheel.closest('.arena')?.id,'fieldArena');assert.equal(s.bowlingPlan.variation,options[0]);
 const swipe=(dx,dy)=>{h.u.pointerDown(pointer(field,180,300));h.step(30);h.u.pointerMove(pointer(field,180+dx*.5,300+dy*.5));h.step(30);h.u.pointerMove(pointer(field,180+dx,300+dy));h.step(30);h.u.pointerUp(pointer(field,180+dx,300+dy));assert.equal(h.u.gesture(),null);assert.equal(s.phase,'ready');assert.equal(s.pending,null);};
 swipe(0,-90);assert.equal(s.bowlingPlan.variation,options[1]);assert.equal(h.n('galleryDeliveryName').textContent,options[1]);swipe(0,90);assert.equal(s.bowlingPlan.variation,options[0]);swipe(0,90);assert.equal(s.bowlingPlan.variation,options[0]);
 const at=lines.findIndex(l=>l.value===s.bowlingPlan.line);swipe(90,0);assert.equal(s.bowlingPlan.line,lines[at+1].value);swipe(-90,0);assert.equal(s.bowlingPlan.line,lines[at].value);
 // A short drag is neither a swipe nor a hold.
 swipe(0,-24);assert.equal(s.bowlingPlan.variation,options[0]);swipe(24,0);assert.equal(s.bowlingPlan.line,lines[at].value);
 // The wheel's buttons: a tap is acted on at pointer-up, and the click that follows it is ignored.
 const tap=async id=>{await wheel.dispatch('pointerdown',pointer(wheel,200,300,{target:h.n(id)}));await wheel.dispatch('pointerup',pointer(wheel,202,301,{target:h.n(id)}));await h.n(id).dispatch('click');};
 await tap('deliveryDownBtn');assert.equal(s.bowlingPlan.variation,options[1]);await tap('previousVariation');assert.equal(s.bowlingPlan.variation,options[0]);await tap('lineRightBtn');assert.equal(s.bowlingPlan.line,lines[at+1].value);await tap('lineLeftBtn');assert.equal(s.bowlingPlan.line,lines[at].value);
 h.advance(500);await h.n('nextVariation').click();assert.equal(s.bowlingPlan.variation,options[1]);await h.n('deliveryUpBtn').click();assert.equal(s.bowlingPlan.variation,options[0]);
 // A swipe that starts on a button is still a swipe.
 await wheel.dispatch('pointerdown',pointer(wheel,200,300,{target:h.n('nextVariation')}));await wheel.dispatch('pointermove',pointer(wheel,200,250,{target:wheel}));await wheel.dispatch('pointerup',pointer(wheel,200,220,{target:wheel}));await h.n('nextVariation').dispatch('click');assert.equal(s.bowlingPlan.variation,options[1]);h.advance(500);await h.n('deliveryUpBtn').click();
 // A finger that keeps moving never becomes a hold; one that rests for 180 ms does.
 h.u.pointerDown(pointer(field,180,300));for(let i=1;i<=6;i++){h.step(100);h.u.pointerMove(pointer(field,180+i*9,300+i*9));}assert.equal(s.phase,'ready');assert.equal(s.pending,null);h.u.pointerUp(pointer(field,234,354));assert.equal(s.phase,'ready');
 assert.equal(s.match.rngState,rng);assert.deepEqual(copy(s.bowlingPlan),{line:lines[at].value,variation:options[0],field:'balanced'});
 h.u.pointerDown(pointer(field,180,300));h.step(100);h.u.pointerMove(pointer(field,183,302));assert.equal(s.phase,'ready');h.step(100);assert.equal(s.phase,'flight');assert.equal(s.pending.manualBowling.variation,options[0]);assert.equal(wheel.hidden,true);
});
await check('The aim arrow, the stump map and the waiting bowler are drawn from the plan alone; a slip is named after the release',async()=>{
 const h=host('T20',fixture(true));await h.n('resumeBtn').click();const s=h.u.get(),rng=s.match.rngState,field=h.n('fieldCanvas'),map=h.n('aimMap'),side=h.u.activeOwner().arm==='left'?-1:1;
 // The bowler waits at the top of the run, out of the picture, so the pitch and the arrow are in view.
 assert.deepEqual(copy(h.u.bowlerWorld()),{x:side*1.5,z:24});
 const lit=map.drawCalls;h.u.shiftBowlingGallery('line',1);assert.ok(map.drawCalls>lit);const before=field.drawCalls;h.u.drawBowlingGuide();const arrow=field.drawCalls-before;assert.ok(arrow>=20,'Arrow draw calls: '+arrow);
 for(const name of C.BowlingControl.options(h.u.activeOwner()).map(o=>o.name)){s.bowlingPlan.variation=name;for(const line of h.u.galleryLines()){s.bowlingPlan.line=line.value;h.u.renderUI();h.u.drawField(0);h.u.drawPad();}}
 assert.equal(s.match.rngState,rng);assert.equal(s.pending,null);assert.equal(s.phase,'ready');
 // After the release the title says where the ball went against where it was aimed.
 const title=(execution,intendedLabel,releaseLabel)=>{const m=C.Contest.current(s.contest),d=C.BowlingControl.prepare(m,{line:.14}),b=C.BowlingControl.release(d.ball,890);Object.assign(b.manualBowling,{execution,intendedLabel,releaseLabel});Object.assign(s,{pending:b,phase:'flight',elapsed:40,shot:null,fieldBrief:false,bowlingAction:{age:890,running:false,released:true}});h.u.drawField(0);return h.n('feedbackTitle').textContent;};
 assert.equal(title({length:0,line:0,slip:null},'good','good'),'Good length');assert.equal(title({length:-1.4,line:0,slip:null},'good','full'),'Full · aimed good length');
 assert.equal(title({length:-2,line:0,slip:'fullToss'},'Yorker','Full toss'),'Slipped · full toss');assert.equal(title({length:0,line:-.5,slip:'leg'},'good','good'),'Slipped · down leg');assert.equal(title({length:0,line:.9,slip:'wide'},'full','full'),'Slipped · wide of off');
});
await check('Fast-forward is remembered from ball to ball in the field and never while batting',async()=>{
 const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-6,x+' is not '+y);
 for(const bowl of [true,false]){const h=host('T20',fixture(bowl));await h.n('resumeBtn').click();const a=sample(h.u.get().match,bowl),s=mount(h,a,.1),at=()=>C.Fielding.playback(s.live.play,s.resultAge);
  assert.equal(h.n('fastForwardBtn').hidden,false);await h.n('fastForwardBtn').click();const t0=at();h.step();near(at(),t0+.4);
  h.u.clearDelivery();const b=sample(h.u.get().match,bowl,false,a.seed+1);mount(h,b,.1);const t1=at();h.step();near(at(),t1+(bowl?.4:.1));assert.equal(h.n('fastForwardBtn').textContent,bowl?'Normal speed':'Fast-forward 4×');
  if(bowl){await h.n('fastForwardBtn').click();h.u.clearDelivery();mount(h,sample(h.u.get().match,true,false,b.seed+1),.1);const t2=at();h.step();near(at(),t2+.1);}}
});
await check('Every vibration pulse is long enough for an Android motor; edges have their own pattern and a changed plan is felt once',async()=>{
 const pulses=[],h=host('T20',fixture(true),{navigator:{vibrate:p=>{pulses.push(p);return true;}}});await h.n('resumeBtn').click();const s=h.u.get(),patterns={};
 for(const kind of ['light','medium','heavy','edge','catch','boundary','wicket','test']){pulses.length=0;assert.equal(h.u.Platform.haptics.pulse(kind),true);patterns[kind]=pulses[0];assert.ok(Array.isArray(pulses[0]));for(let i=0;i<pulses[0].length;i+=2)assert.ok(pulses[0][i]>=45,kind+' pulse is too short for a phone motor');}
 assert.ok(patterns.edge.length===3&&patterns.wicket.length===5&&patterns.test[0]>=200);assert.notDeepEqual(patterns.edge,patterns.light);
 const count=C.BowlingControl.options(h.u.activeOwner()).length;pulses.length=0;for(let i=0;i<count+2;i++)h.u.shiftBowlingGallery('variation',1);assert.equal(pulses.length,count-1);assert.deepEqual(pulses[0],patterns.light);
 h.n('hapticsToggle').checked=false;await h.n('hapticsToggle').dispatch('change');pulses.length=0;h.u.shiftBowlingGallery('variation',-1);assert.deepEqual(pulses,[]);
});
await check('The light follows the clock: shadows lengthen towards evening, only a floodlit ground plays at night, and the match is untouched',async()=>{
 const reach=L=>Math.hypot(L.sx,L.sz),h=host('T20',fixture());await h.n('resumeBtn').click();const s=h.u.get(),rng=s.match.rngState,app=h.u.app(),club=s.contest.seed;
 // The club ground has no lights: every Twenty20 there is an afternoon game, whatever the fixture.
 for(const seed of [32,0]){s.contest.seed=seed;s.match.pitchBalls=0;assert.equal(h.u.dayTime(),14.25);s.match.pitchBalls=180;assert.equal(h.u.dayTime(),16.25);const L=h.u.lighting();assert.equal(L.night,0);assert.equal(L.lamps,0);}
 // A ground with floodlights stages day-night games on alternate fixtures: low sun, then dusk, then lights.
 app.wallet.stadium='lords';s.contest.seed=0;s.match.pitchBalls=0;assert.equal(h.u.dayTime(),14.25);s.contest.seed=32;assert.equal(h.u.dayTime(),17.75);
 const early=copy(h.u.lighting());assert.ok(early.gold>.5&&early.night===0);h.u.renderUI();assert.match(h.n('skyTag').textContent,/low sun$|^(Overcast|Damp)$/);
 s.match.pitchBalls=100;const dusk=copy(h.u.lighting());assert.ok(dusk.dusk>.5&&dusk.lamps>.2,'dusk '+dusk.dusk);h.u.renderUI();assert.match(h.n('skyTag').textContent,/ · dusk$/);
 s.match.pitchBalls=200;const night=copy(h.u.lighting());assert.equal(night.night,1);assert.equal(night.lamps,1);h.u.renderUI();assert.match(h.n('skyTag').textContent,/ · floodlit$/);assert.match(h.n('windIndicator').attrs['aria-label'],/floodlit\. Wind approximately/);
 assert.ok(night.sky[0].every((n,i)=>n<early.sky[0][i]));assert.ok(reach(night)<.35&&night.shade<early.shade);
 // The sun: no sideways shadow at 12:45, longer as it drops, never longer than a 30 degree sun allows, and the ball's stays near the ball.
 app.wallet.stadium='club';s.contest.seed=club;let last=0;for(const balls of [0,60,120,180,240,300]){s.match.pitchBalls=balls;const L=h.u.lighting(),length=reach(L);assert.ok(length>=last-1e-9,'Shadows shorten after noon');assert.ok(length<=1/Math.tan(Math.PI/6)+1e-9);assert.ok(length*L.ballShadow<=.83+1e-9);assert.ok(L.sx>0&&L.sz>0);last=length;}
 const test=host('TEST',fixture(false,'TEST'));await test.n('resumeBtn').click();const t=test.u.get();t.contest.clockSeconds=0;assert.equal(test.u.dayTime(),11);const morning=copy(test.u.lighting());assert.ok(morning.sx<0&&morning.night===0&&morning.gold===0);
 t.contest.clockSeconds=6300;assert.ok(Math.abs(test.u.dayTime()-12.75)<.011);assert.ok(Math.abs(test.u.lighting().sx)<.01);t.contest.clockSeconds=21500;assert.ok(test.u.dayTime()>17.9&&test.u.dayTime()<=18);const stumps=copy(test.u.lighting());assert.ok(stumps.gold>.4&&stumps.night===0&&stumps.dusk===0&&reach(stumps)>reach(morning));
 assert.equal(s.match.rngState,rng);assert.equal(C.CareerSave.validate(JSON.parse(h.storage.get('cricket.career.v5'))).schema,5);
});
await check('Sky, cloud shadow, drizzle and floodlights draw in every camera with finite coordinates and no match RNG',async()=>{
 const profiles=C.Weather.profiles,h=host('T20',fixture());await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),rng=s.match.rngState,field=h.n('fieldCanvas'),app=h.u.app(),cost={};
 app.wallet.stadium='mcg';s.elapsed=s.pending.duration*.5;h.u.drawField(0);h.u.drawField(0);
 for(const [seed,balls]of [[0,0],[32,0],[32,100],[32,220]])for(const p of profiles){s.contest.seed=seed;s.match.pitchBalls=balls;s.pending={...s.pending,conditions:{...s.pending.conditions,weather:{version:13,step:0,progress:0,...p,windX:.6,windZ:-.8}}};s.elapsed=s.pending.duration*.5;const before=field.drawCalls;h.u.drawField(balls);cost[p.name+seed+':'+balls]=field.drawCalls-before;}
 // A clear afternoon is left alone. Drizzle is extra strokes when the strip is damp; cloud, dusk and night are a wash over the frame.
 assert.equal(h.u.lighting().night,1);assert.ok(cost['Damp0:0']>cost['Overcast0:0']+60,'Drizzle: '+cost['Damp0:0']+' against '+cost['Overcast0:0']);assert.ok(cost['Overcast0:0']>cost['Sunny0:0'],'Overcast wash');assert.ok(cost['Sunny32:220']>cost['Sunny0:0'],'Night wash: '+cost['Sunny32:220']+' against '+cost['Sunny0:0']);
 // The same states from the outfield cameras, mid-replay, where broken cloud throws shadows on the grass.
 const a=sample(s.match);mount(h,a,a.r.play.event.time*.5);app.wallet.stadium='club';
 for(const p of profiles){s.match.pitchBalls=60;s.pending={...s.pending,conditions:{...s.pending.conditions,weather:{version:13,step:0,progress:0,...p,windX:-.3,windZ:.95}}};const before=field.drawCalls;for(let i=0;i<4;i++){h.step(60);h.u.drawField(i);}cost['replay'+p.name]=field.drawCalls-before;}
 assert.ok(cost.replayBreezy>cost.replaySunny,'Cloud shadows: '+cost.replayBreezy+' against '+cost.replaySunny);
 assert.equal(s.match.rngState,rng);
});
console.log(groups+' revision 38 groups passed.');
})().catch(e=>{console.error(e.stack);process.exit(1);});
