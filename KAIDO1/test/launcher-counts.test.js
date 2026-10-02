const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('NOVA archive launchers derive their counts from changed or empty effective catalogues',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../source/pages/nova.html'),'utf8'),start=source.indexOf('function novaSyncLauncherCounts(){'),end=source.indexOf('\nnovaSyncLauncherCounts();',start);assert.ok(start>=0&&end>start,'launcher counts need a catalogue-driven updater');
 for(const [visual,audio] of [[0,2],[3,0],[1,1]]){
  const labels={visuals:{textContent:'15 WORKS'},audio:{textContent:'06 WORKS'}};
  const context={NOVA_LIBRARIES:{visuals:{ids:Array(visual)},audio:{ids:Array(audio)}},document:{querySelectorAll:()=>Object.keys(labels).map(name=>({dataset:{libraryOpen:name},querySelector:()=>labels[name]}))}};
  vm.runInNewContext(source.slice(start,end)+';novaSyncLauncherCounts();',context);
  for(const [name,size] of [['visuals',visual],['audio',audio]])assert.equal(labels[name].textContent,String(size).padStart(2,'0')+(size===1?' WORK':' WORKS'));
 }
});
