// Pure game rules and controller checks. No browser or external dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const {Squad,Innings,Contest,Opposition,Season,CareerSave,Delivery,Shot,Fielding,BatterRig}=Cricket;
let checks=0;
function check(name,fn){if(process.env.CRICKET_CHECK_FILTER&&!new RegExp(process.env.CRICKET_CHECK_FILTER).test(name))return;fn();checks++;console.log('PASS '+name);}
function match(format='TEST'){let c;for(let seed=1;seed<100;seed++){c=Contest.create(seed,format,Squad.team(format,'eng'),Squad.team(format,'ind'),'eng');if(c.first===0)return c;}}
function ball(c,runs=0,wicket=false,wide=false){const d=Innings.delivery(Contest.current(c));return Contest.apply(Contest.withPrepared(c,d.rngState),d.ball,{runs,wicket,wide,contact:!wicket,loft:false,angle:0,distance:1,quality:1,title:wicket?'Bowled':runs?'Runs':'Dot ball',timing:'Good timing',detail:'Test result',rngState:d.rngState});}
function score(c,runs){while(runs&&c.phase==='play'){const n=Math.min(6,runs);c=ball(c,n);runs-=n;}return c;}
function allOut(c,runs=0){c=score(c,runs);while(c.phase==='play')c=ball(c,0,true);return c;}
function play(c){while(c.phase!=='complete'){if(c.phase==='interval')c=Contest.advance(c);else if(c.phase==='followOn')c=Contest.chooseFollowOn(c,true);else c=Opposition.ball(c).contest;}return c;}
function view(c){return{league:Season.create(53,c.format,c.playerId),contest:c,match:Contest.current(c),recorded:false,phase:'ready',pending:null,elapsed:0,shot:null,botInput:null,resultAge:0,watchUntil:0};}
check('T20 is a two-team 20-over match and ends immediately at a chase target',()=>{
 let c=match('T20');for(let i=0;i<120;i++)c=ball(c,1);assert.equal(c.phase,'interval');assert.equal(Contest.current(c).balls,120);
 c=Contest.advance(c);assert.equal(Contest.current(c).target,121);for(let i=0;i<120;i++)c=ball(c,1);assert.equal(c.phase,'complete');assert.equal(c.result.kind,'tie');
 c=allOut(match('T20'),18);c=Contest.advance(c);c=score(c,18);c=ball(c,1,false,true);assert.equal(c.result.winnerId,'ind');assert.equal(Contest.current(c).endReason,'target');assert.equal(Contest.current(c).balls,3);assert.match(c.result.detail,/10 wickets/);
});
check('T20 introduces early spin with four-over limits; Tests open with pace spells',()=>{
 for(const format of ['T20','TEST'])for(const batting of Squad.teams(format))for(const bowling of Squad.teams(format)){
  const m=Innings.create(13,batting,bowling,format,0),order=m.order;assert.equal(m.batters.length,11);assert.equal(new Set(batting.xi.map(p=>p.name)).size,11);assert.ok(m.bowlers[order[format==='T20'?1:11]].family.includes('spin'));
  if(format==='T20')for(let b=0;b<5;b++)assert.equal(order.filter(x=>x===b).length,4);
  for(let over=0;over<20;over++){if(over)assert.notEqual(Innings.bowler(m,over),Innings.bowler(m,over-1));const d=Innings.delivery({...m,balls:over*6});assert.equal(d.ball.archetype,m.bowlers[Innings.bowler(m,over)].archetype);assert.equal(d.ball.scoringVersion,17);}
 }
});
check('Tests have uncapped player innings, four-innings chases, runs and innings wins',()=>{
 let c=match();for(let i=0;i<121;i++)c=ball(c);assert.equal(c.phase,'play');assert.equal(Contest.current(c).limitBalls,null);
 c=allOut(match(),300);c=allOut(Contest.advance(c),200);c=allOut(Contest.advance(c),100);c=Contest.advance(c);assert.equal(Contest.current(c).target,201);c=allOut(c,150);assert.match(c.result.detail,/England won by 50 runs/);
 c=allOut(match(),100);c=allOut(Contest.advance(c),400);c=allOut(Contest.advance(c),200);assert.match(c.result.detail,/India won an innings and 100 runs/);assert.equal(c.innings.length,3);
});
check('The 200-run follow-on threshold supports both batting orders and ties',()=>{
 let c=allOut(match(),399);c=allOut(Contest.advance(c),200);assert.equal(c.phase,'interval');
 c=allOut(match(),400);c=allOut(Contest.advance(c),150);assert.equal(c.phase,'followOn');const choice=c;
 c=Contest.advance(Contest.chooseFollowOn(choice,true));assert.equal(Contest.current(c).side,1);c=allOut(c,200);assert.match(c.result.detail,/an innings and 50 runs/);
 c=Contest.advance(Contest.chooseFollowOn(choice,false));assert.equal(Contest.current(c).side,0);c=Contest.declare(c);assert.equal(Contest.current(c).endReason,'declared');assert.equal(Contest.current(c).wickets,0);c=Contest.advance(c);assert.equal(Contest.current(c).target,251);c=allOut(c,250);assert.equal(c.result.kind,'tie');assert.deepEqual(c.innings.map(m=>m.side),[0,1,0,1]);
 c=Contest.advance(Contest.chooseFollowOn(choice,true));c=allOut(c,300);c=Contest.advance(c);assert.deepEqual(c.innings.map(m=>m.side),[0,1,1,0]);assert.equal(Contest.current(c).target,51);c=score(c,51);assert.equal(c.result.winnerId,'eng');assert.match(c.result.detail,/10 wickets/);
});
check('Five-day time limit draws a Test, with a last-ball win taking priority',()=>{
 let c={...match(),clockSeconds:Contest.LIMIT-40};c=ball(c);assert.equal(c.result.kind,'draw');assert.equal(Contest.clock(c).day,5);
 c=allOut(match(),300);c=allOut(Contest.advance(c),200);c=allOut(Contest.advance(c),100);c=Contest.advance(c);c=score(c,200);c={...c,clockSeconds:Contest.LIMIT-40};c=ball(c,1);assert.equal(c.result.kind,'win');assert.equal(c.result.winnerId,'ind');assert.equal(Contest.current(c).balls,35);
});
check('A season has six fixtures per team, complete tables and promotion into the next year',()=>{
 for(const format of ['T20','TEST']){let s=Season.create(773,format,'eng');for(const team of s.teams){const fixtures=s.fixtures.filter(f=>f.home===team.id||f.away===team.id);assert.equal(fixtures.length,6);assert.equal(fixtures.filter(f=>f.home===team.id).length,3);}
  let last;for(let round=0;round<6;round++){const c=Season.begin(s);last=play(c);s=Season.record(s,last);assert.equal(s.round,round+1);for(const d of [0,1])assert.ok(Season.table(s,d).every(r=>r.played===round+1));}
  assert.equal(s.complete,true);assert.throws(()=>Season.record(s,last));const movement=s.movement,n=Season.next(s);assert.ok(n.divisions[0].includes(movement.promoted));assert.ok(n.divisions[1].includes(movement.relegated));assert.equal(n.year,2);assert.equal(n.round,0);assert.ok(n.fixtures.every(f=>f.result===null));
 }
});
check('Both careers and a pending simulated shot survive exact deterministic save/resume',()=>{
 const c=match('T20'),v=view(c),d=Innings.delivery(v.match),prepared=Contest.withPrepared(c,d.rngState),bot=Opposition.input(Contest.current(prepared),d.ball);v.contest=Contest.withPrepared(prepared,bot.rngState);v.match=Contest.current(v.contest);Object.assign(v,{phase:'flight',pending:d.ball,elapsed:42,botInput:bot});const app={schema:5,active:'T20',sessions:{T20:v,TEST:view(match())},legacy:null},packed=CareerSave.pack(app),restored=CareerSave.validate(JSON.parse(JSON.stringify(packed)));
 assert.deepEqual(restored.sessions.T20.pending,d.ball);assert.deepEqual(restored.sessions.T20.botInput,bot);assert.equal(restored.sessions.TEST.match.format,'TEST');const a=Shot.resolve(d.ball,bot.shot,v.match.batters[0],Innings.field(v.match,d.ball),v.match.rngState),w=restored.sessions.T20,b=Shot.resolve(w.pending,w.botInput.shot,w.match.batters[0],Innings.field(w.match,w.pending),w.match.rngState);assert.deepEqual(a,b);assert.deepEqual(Contest.apply(v.contest,d.ball,a),Contest.apply(w.contest,w.pending,b));
 const invalid=JSON.parse(JSON.stringify(packed));invalid.sessions.T20.contest.innings[0].runs=999;assert.throws(()=>CareerSave.validate(invalid));
});
check('Pace edges can pass the keeper and slip, with real reachable catches retained',()=>{
 const m=Innings.create(1,Squad.team('T20','eng'),Squad.team('T20','ind'),'T20',0);let past=0,catches=0,boundaries=0;
 for(let i=1;i<=250;i++){const b={...Delivery.create(i*107,0,5).ball,scoringVersion:5},p=Delivery.at(b,1),input={angle:p.x<0?45:-60,mode:'loft',error:165},r=Shot.resolve(b,input,m.batters[0],Cricket.FIELDS[0],i*17);if(r.play&&r.quality<.36){if(r.play.event.z< -15&&!r.wicket)past++;if(r.wicket)catches++;if(r.runs===4)boundaries++;assert.equal(r.play.keeper.z,-12.5);}
 }
 assert.ok(past>10,'Edges must travel beyond close catchers');assert.ok(catches>0,'Edges into reach must still be caught');console.log({edgesPastCatchers:past,reachableCatches:catches,edgeFours:boundaries});
});
check('Camera keeps the ground and shared stadium projection finite for shots in every direction',()=>{
 for(let angle=-180;angle<180;angle+=30){const a=angle*Math.PI/180,p={origin:{x:0,z:0,h:1},dx:Math.sin(a),dz:Math.cos(a),airTime:2,airSpeed:24,vy:9,groundSpeed:5,drag:1,rollRange:12,event:{type:'pickup',time:3,x:Math.sin(a)*54,z:Math.cos(a)*54,h:.035},returnTime:6};for(const t of [.4,1,2.5,4]){const camera=Cricket.View.camera(p,t,1600);let visible=0;for(let i=0;i<64;i++){const q=Cricket.View.project(Math.sin(i*Math.PI/32)*78,Math.cos(i*Math.PI/32)*78,6,camera,390,350);assert.ok([q.x,q.y,q.depth].every(Number.isFinite));if(q.depth>.6&&q.x>=0&&q.x<=390&&q.y>=0&&q.y<=350)visible++;}assert.ok(visible>0,'At least part of the stands is in view');}}
});
check('Saved whole matches, completed leagues and the fifth-day limit remain within a local save',()=>{
 let s=Season.create(773,'TEST','eng'),c=play(Season.begin(s));s=Season.record(s,c);const v={...view(c),league:s,recorded:true,phase:'finished',pending:Contest.current(c).history.at(-1).delivery,resultAge:30000};const root={schema:5,active:'TEST',sessions:{TEST:v,T20:view(match('T20'))},legacy:null};assert.equal(CareerSave.validate(CareerSave.pack(root)).sessions.TEST.league.round,1);
 let long=match();for(let i=0;i<2700;i++)long=ball(long);const full={schema:5,active:'TEST',sessions:{TEST:{...view(long),phase:'finished',pending:Contest.current(long).history.at(-1).delivery,resultAge:30000}},legacy:null};CareerSave.validate(CareerSave.pack(full));assert.ok(JSON.stringify(CareerSave.pack(full)).length<2100000);console.log({fiveDaySaveCharacters:JSON.stringify(CareerSave.pack(full)).length});
});
check('The controller keeps a bowled innings, its prepared shot and the next-innings action in sync',()=>{
 // Run only state orchestration, replacing display/storage effects with stubs.
 // This exercises no DOM, browser, rendering or visual inspection.
 let ui=html.match(/<script id="cricket-ui">([\s\S]*?)<\/script>/)[1];ui=ui.slice(ui.indexOf(' const {Delivery'),ui.indexOf(' // Perspective camera'));
 ui=ui.replace(/^ const \$=.*$/m,'').replace(/^ const backdrop=.*$/m,'');
 const from=ui.indexOf(' let firstVisit=false;'),to=ui.indexOf(' const lastResult=',from);ui=ui.slice(0,from)+ui.slice(to);
 for(const [name,body]of [['persist','saved=JSON.stringify(pack());'],['renderUI',''],['openDialog','lastDialog=id;paused=true;'],['closeDialogs','paused=false;']]){const marker=' function '+name+'(',a=ui.indexOf(marker),brace=ui.indexOf('{',a);let b=brace,depth=0;do{if(ui[b]==='{')depth++;if(ui[b]==='}')depth--;b++;}while(depth>0&&b<ui.length);assert.ok(a>=0&&b>a);const signature=ui.slice(a,brace);ui=ui.slice(0,a)+signature+'{'+body+'}\n'+ui.slice(b);}
 const box={Cricket,window:{},Sound:{play(){},unlock(){},suspend(){}},performance,crypto:require('node:crypto').webcrypto};vm.createContext(box);vm.runInContext('let saved,lastDialog;'+ui+';globalThis.controller={set(s){state=s;app={schema:5,active:s.contest.format,legacy:null,sessions:{[s.contest.format]:s}};paused=false;},get(){return state;},nextBall,releasePrepared,finishBall,commitLive,clock,clearDelivery,dialog(){return lastDialog;}};',box);
 const u=box.controller;let c=match('T20');c=allOut(c,70);c=Contest.advance(c);const v=view(c);u.set(v);u.nextBall();u.releasePrepared();const pending=u.get();assert.equal(pending.phase,'flight');assert.ok(pending.botInput);const expected=Shot.resolve(pending.pending,pending.botInput.shot,pending.match.batters[pending.match.striker],Innings.field(pending.match,pending.pending),pending.match.rngState);pending.shot=pending.botInput.shot;u.finishBall();assert.equal(u.get().phase,'inPlay');u.commitLive();assert.equal(u.get().match.runs,expected.runs);assert.equal(u.get().match.balls,expected.legal?1:0);assert.equal(u.get().match,Contest.current(u.get().contest));
 c=allOut(match('T20'),16);u.set({...view(c),phase:'finished',pending:Contest.current(c).history.at(-1).delivery,resultAge:30000});u.nextBall();assert.equal(u.get().contest.innings.length,2);assert.equal(u.get().phase,'ready');assert.equal(u.get().pending,null);assert.equal(u.get().match.target,17);
});
console.log(checks+' competition checks passed.');
