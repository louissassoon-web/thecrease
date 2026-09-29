// Optional reference exporter. The game itself needs no build or generated files.
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),box={};vm.createContext(box);vm.runInContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],box);const C=box.Cricket,profiles=[];
for(const format of ['TEST','T20'])for(const team of C.Squad.teams(format))for(let index=0;index<team.xi.length;index++){
 const p=team.xi[index],key=p.playerId;profiles.push({format,team:team.name,slot:index+1,name:p.name,playerId:key,hand:C.Hand.of(p),batting:C.Players.batting(key,format),bowling:C.Players.data[key].bowling||null,inBowlingAttack:team.attack.some(b=>b.player===index)});
}
fs.writeFileSync(__dirname+'/player-profiles.json',JSON.stringify({revision:19,basis:'Career-inspired game estimates. Reference export only; edit the inline Players data to change the game.',profiles},null,2)+'\n');console.log('Exported '+profiles.length+' roster profiles.');
