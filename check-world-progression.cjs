// End-to-end state/input checks plus deterministic presentation geometry.
const assert=require('node:assert/strict');
const {host,pointer,C,copy}=require('./check-display-input.cjs');
let checks=0;async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
const saved=h=>JSON.parse(h.storage.get('cricket.career.v5'));
function until(h,p){for(let i=0;i<1500;i++){if(p(h.u.get()))return;h.step();}throw Error('Clock stalled');}
function sample(format='TEST',type='offspin',seed=41){const m=C.Innings.create(seed,C.Squad.team(format,'eng'),C.Squad.team(format,'ind'),format,0);m.order.fill(Math.max(0,m.bowlers.findIndex(b=>b.archetype===type)));return{m,...C.Innings.delivery(m)};}
const buttons=node=>node.children.flatMap(c=>c.tag==='button'?[c]:c.children?buttons(c):[]);
(async()=>{
await check('The distance cue reaches the bat consistently and spin has no speed jump or frozen ball at the crease',()=>{
 for(const format of ['TEST','T20'])for(const type of ['offspin','legspin','seam'])for(let seed=1;seed<=12;seed++){
  const {ball}=sample(format,type,seed);let last=-1;
  for(let i=0;i<=100;i++){const cue=C.BallView.cue(ball,ball.duration*i/100);assert.ok(cue.progress>=last);last=cue.progress;}assert.equal(C.BallView.cue(ball,ball.duration).atBat,true);assert.ok(C.BallView.cue(ball,ball.duration).distance<1e-8);
  const left=C.BallView.incoming(ball,ball.duration-1),mid=C.BallView.incoming(ball,ball.duration),right=C.BallView.incoming(ball,ball.duration+1);for(const k of ['x','z','h'])assert.ok(Math.abs((mid[k]-left[k])-(right[k]-mid[k]))<.0001);assert.ok(C.BallView.incoming(ball,ball.duration+180).z<C.BallView.incoming(ball,ball.duration+60).z);
 }
});
await check('Contact-to-fielding joins continuously and nearby ball/body drawing stays finite in both views',async()=>{
 for(const full of [false,true])for(const error of [-180,0,200]){
  const h=host('TEST');if(full){await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();}else await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),b=sample().ball;s.pending={...b,bowler:s.pending.bowler};s.elapsed=b.duration+error;h.u.renderArrival();assert.equal(h.n('arrivalCue').hidden,false);h.u.drawField(0);const surface=h.n(full?'fieldCanvas':'swipePad');h.u.pointerDown(pointer(surface,150,350));h.u.pointerUp(pointer(surface,220,278));until(h,s=>s.phase==='inPlay');
  const start=C.BallView.replay(s.live.play,0,s.ballBridge),end=C.BallView.incoming(s.pending,s.elapsed);for(const k of ['x','z','h'])assert.ok(Math.abs(start[k]-end[k])<1e-8);const duration=s.ballBridge.duration;assert.deepEqual(C.BallView.replay(s.live.play,duration,s.ballBridge),C.Fielding.ballAt(s.live.play,duration));
  for(let i=0;i<16;i++){s.resultAge=i*16;h.u.drawField(i);}assert.ok(h.n('fieldCanvas').drawCalls>100);h.u.renderArrival();assert.equal(h.n('arrivalCue').hidden,true);await h.n('menuBtn').click();assert.ok(C.CareerSave.validate(saved(h)).sessions.TEST.ballBridge);
 }
});
await check('Coins are paid only for a player win, once per fixture across reloads and restarts',()=>{
 for(const format of ['TEST','T20']){const league=C.Season.create(71,format,'eng'),contest=C.Season.begin(league),s={league,contest};let wallet=C.Economy.create();assert.equal(C.Economy.reward(wallet,s).amount,0);for(const kind of ['tie','draw'])assert.equal(C.Economy.reward(wallet,{...s,contest:{...contest,phase:'complete',result:{kind}}}).amount,0);
  assert.equal(C.Economy.reward(wallet,{...s,contest:{...contest,phase:'complete',result:{kind:'win',winnerId:contest.teams.find(t=>t.id!=='eng').id}}}).amount,0);
  const won={...s,contest:{...contest,phase:'complete',result:{kind:'win',winnerId:'eng'}}},r=C.Economy.reward(wallet,won);assert.equal(r.amount,format==='TEST'?500:300);wallet=r.wallet;assert.equal(C.Economy.reward(copy(wallet),copy(won)).amount,0);const restarted=C.Restart.match({...won,match:C.Contest.current(contest),recorded:false});assert.equal(C.Economy.key(restarted),C.Economy.key(won));assert.equal(C.Economy.reward(wallet,{...restarted,contest:won.contest}).amount,0);
 }
 assert.throws(()=>C.Economy.buy(C.Economy.create(),'stadium','lords'),/Not enough/);assert.throws(()=>C.Economy.buy(C.Economy.create(),'kit','fake'),/Unknown/);assert.equal(C.Economy.valid({...C.Economy.create(),coins:-1}),false);assert.equal(C.Economy.valid({...C.Economy.create(),stadium:'lords'}),false);
});
await check('The actual shop buys and equips permanently, applies both team roles and exports the shared wallet',async()=>{
 const base=saved(host('T20'));base.wallet={...C.Economy.create(),coins:1800};const h=host('T20',base),before=h.u.get().match.rngState;await h.n('shopBtn').click();assert.equal(h.u.isPaused(),true);assert.equal(h.n('stadiumShop').children.length,5);assert.equal(h.n('kitShop').children.length,5);
 const find=(kind,id)=>buttons(h.n(kind==='kit'?'kitShop':'stadiumShop')).find(b=>b.dataset.item===id);assert.equal(find('stadium','lords').disabled,true);const buy=find('stadium','newlands');await buy.click();assert.equal(saved(h).wallet.coins,900);await buy.dispatch('click');assert.equal(saved(h).wallet.coins,900);await find('kit','blue').click();assert.equal(saved(h).wallet.coins,300);
 const ours=h.u.get().contest.teams.findIndex(t=>t.id===h.u.get().contest.playerId);assert.equal(h.u.teamKit(ours).shirt,C.Economy.item('kit','blue').shirt);assert.notEqual(h.u.teamKit(1-ours).pattern,'chevron');assert.equal(C.Economy.colours(saved(h).wallet,'TEST').shirt,'#ecebdd');assert.equal(h.u.get().match.rngState,before);
 const restored=host('T20',saved(h));await restored.n('shopBtn').click();assert.equal(restored.n('shopCoins').textContent,'300 coins');assert.deepEqual(saved(restored).wallet.kits,['basic','blue']);assert.equal(saved(restored).wallet.stadium,'newlands');
 const bad=saved(h);bad.wallet.coins=-20;assert.throws(()=>C.CareerSave.validate(bad),/coins/);const old=saved(h);delete old.wallet;assert.deepEqual(C.CareerSave.validate(old).wallet,C.Economy.create());
});
await check('All grounds have distinct world geometry, render in play, and full reset restores the starter items',async()=>{
 const counts=new Set();for(const item of C.Economy.stadiums){const scene=C.Stadium.build(item);counts.add(scene.faces.length);assert.ok(scene.people.length>50);assert.ok(scene.faces.every(f=>f.points.every(p=>[p.x,p.z,p.h].every(Number.isFinite))));const base=saved(host());base.wallet={...C.Economy.create(),stadiums:['club',...C.Economy.stadiums.filter(x=>x.id!=='club').map(x=>x.id)],stadium:item.id};const h=host('T20',base),seed=h.u.get().match.rngState;h.u.drawField(0);assert.equal(h.u.get().match.rngState,seed);assert.equal(h.u.groundModel().faces.length,scene.faces.length);}assert.equal(counts.size,5);
 const base=saved(host());base.wallet={...C.Economy.create(),coins:700,stadiums:['club','newlands'],stadium:'newlands'};const h=host('T20',base);await h.n('settingsBtn').click();await h.n('restartGameBtn').click();assert.match(h.n('restartDescription').textContent,/coins, stadiums, kits/);await h.n('confirmRestartBtn').click();assert.deepEqual(saved(h).wallet,C.Economy.create());
});
await check('Player graphs and changed conditions appear before bowling, resume mid-card and clear before the run-up',async()=>{
 const h=host('TEST');await h.n('resumeBtn').click();await h.n('bowlBtn').click();const s=h.u.get(),cards=s.briefCards;assert.ok(cards.some(c=>c.kind==='batter')&&cards.some(c=>c.kind==='bowler'));assert.equal(h.n('broadcastChart').children.length,3);assert.equal(h.n('broadcast').hidden,false);const before=s.match.rngState,ball=copy(s.pending);for(let i=0;i<8;i++)h.step();assert.equal(s.elapsed,-850);assert.equal(s.match.rngState,before);await h.n('menuBtn').click();const pack=saved(h),restored=host('TEST',pack);assert.equal(restored.u.get().briefAge,s.briefAge);await restored.n('resumeBtn').click();until(restored,s=>!s.fieldBrief);assert.equal(restored.n('broadcast').hidden,true);assert.equal(restored.n('deliveryBrief').hidden,true);assert.deepEqual(copy(restored.u.get().pending),ball);
 const next={...ball,weather:{...ball.weather,name:'Damp',damp:.6,cloud:.95}},changed=C.Broadcast.cards(s.match,ball,next);assert.equal(changed.find(c=>c.kind==='weather').title,'Conditions changed');const already={...s.match,history:[...s.match.history,{batter:s.match.striker}]};assert.equal(C.Broadcast.cards(already,ball,ball).length,0);
 const incoming={...s.match,striker:0,nonStriker:2,nextBatter:3,history:[{batter:1,wicket:true}]},intro=C.Broadcast.cards(incoming,ball,ball,[0,1]).find(c=>c.kind==='batter');assert.equal(intro.name,incoming.batters[2].name);assert.equal(intro.player,2);assert.equal(C.Broadcast.cards(incoming,ball,ball,[0,1,2]).length,0);
});
await check('A completed real T20 fixture credits the UI wallet once, including after reloading',()=>{
 const league=C.Season.create(917,'T20','eng');let c=C.Season.begin(league),last,guard=0;while(c.phase!=='complete'){assert.ok(++guard<400);if(c.phase==='interval')c=C.Contest.advance(c);else{last=C.Opposition.ball(c);c=last.contest;}}assert.equal(c.result.kind,'win');league.playerId=c.playerId=c.result.winnerId;
 const state={league,contest:c,match:C.Contest.current(c),recorded:false,...C.Restart.view(),phase:'finished',pending:last.ball,shot:last.shot,resultAge:30000,celebrationAge:20000},raw=C.CareerSave.pack({schema:5,active:'T20',sessions:{T20:state},wallet:C.Economy.create()}),h=host('T20',raw);assert.equal(saved(h).wallet.coins,300);assert.equal(h.n('menuCoins').textContent,'300 coins');const again=host('T20',saved(h));assert.equal(saved(again).wallet.coins,300);assert.equal(saved(again).wallet.rewarded.length,1);
});
console.log(checks+' world, presentation and progression checks passed.');
})();
