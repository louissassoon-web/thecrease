// Test survival and clock diagnostic, including the active save-the-Test policy.
// Default population matches the contract; --independent uses the existing holdout.
const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(process.argv.slice(2).find(a=>!a.startsWith('--'))||__dirname+'/dist/index.html','utf8');vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const C=Cricket,teams=C.Squad.teams('TEST'),held=process.argv.includes('--independent'),rng=C.RNG.stream(0x6257ca91),games=[],survival={balls:0,runs:0,wickets:0,defended:0},firstTwo={balls:0,runs:0,wickets:0},topSeven={balls:0,runs:0,wickets:0};
for(let i=0;i<40;i++){
 const seed=i+1,a=teams[held?i%8:seed%8],b=teams[held?(i+3)%8:(seed*3+1)%8];if(a.id===b.id)continue;let c=C.Contest.create(held?Math.floor(rng.next()*4294967296):seed*7919,'TEST',a,b,'spectator'),guard=0;
 while(c.phase!=='complete'){
  if(++guard>9000)throw Error('Match did not finish');if(c.phase==='interval')c=C.Contest.advance(c);else if(c.phase==='followOn')c=C.Contest.chooseFollowOn(c,true);else{
   const m=C.Contest.current(c),needed=m.target==null?null:Math.max(0,m.target-m.runs),left=Math.max(1,(C.Contest.LIMIT-(m.pitchClock||0))/40),save=C.Opposition.testPlan?C.Opposition.testPlan(m,c).survive:needed!==null&&(needed/left*6>3.5-m.wickets*.10||needed>(10-m.wickets)*35&&left<540),top=m.striker<7,early=c.innings.length<=2,r=C.Opposition.ball(c);
   for(const g of [...(save?[survival]:[]),...(early?[firstTwo]:[]),...(early&&top?[topSeven]:[])]){g.balls+=!!r.result.legal;g.runs+=r.result.runs;g.wickets+=!!r.result.wicket;if(g===survival)g.defended+=!r.shot||r.shot.mode==='defend';}
   c=r.contest;
  }
 }
 games.push({seed:c.seed,days:c.clockSeconds/C.Contest.DAY,result:c.result.kind,lastBatWin:c.result.kind==='win'&&c.result.winner===c.innings.at(-1).side,innings:c.innings.map(m=>({runs:m.runs,balls:m.balls,wickets:m.wickets,end:m.endReason}))});
}
for(const g of [survival,firstTwo,topSeven])Object.assign(g,{runsPerOver:6*g.runs/g.balls,ballsPerWicket:g.balls/g.wickets});
console.log(JSON.stringify({population:held?'independent':'contract',n:games.length,draws:games.filter(g=>g.result==='draw').length,meanDays:games.reduce((a,g)=>a+g.days,0)/games.length,survival,firstTwo,topSeven,games},null,2));
