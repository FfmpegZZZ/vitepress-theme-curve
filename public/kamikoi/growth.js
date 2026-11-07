(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AtlasGrowth=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error(label+'必须为 '+min+'–'+max+' 的整数');return value;}
  function requiredBreak(level){integer(level,1,80,'等级');return Math.ceil(level/10)-1;}
  function calculate(data,input){
    const p=data.profiles[input.profileId];if(!p)throw new Error('该羁绊的养成资料暂未收录');
    const current=integer(input.currentLevel,1,80,'当前等级'),target=integer(input.targetLevel,current,80,'目标等级');
    const from=integer(input.currentBreak,0,7,'当前突破'),to=integer(input.targetBreak,from,7,'目标突破');
    if(current>(from+1)*10||target>(to+1)*10)throw new Error('等级超过所选突破阶段的等级上限');
    if(current<from*10||target<to*10)throw new Error('突破阶段需要先达到对应的突破等级');
    const progress=integer(input.currentExp??0,0,Number.MAX_SAFE_INTEGER,'本级已有经验'),curve=data.levels[p.rarity];
    if((current===(from+1)*10&&progress>0)||(current<80&&progress>=curve[current])||(current===80&&progress>0))throw new Error('本级已有经验超过可填写范围；达到等级上限时应为 0');
    const inventory=input.inventory||{};
    for(const [id,value] of Object.entries(inventory))integer(value,0,Number.MAX_SAFE_INTEGER,'库存 '+(data.items[id]?.name||id));
    const owned=id=>inventory[id]||0,missing=(need,have)=>Math.max(0,need-have);
    const levelSteps=[];let required=0;
    for(let level=current;level<target;level++){const amount=curve[level]-(level===current?progress:0);required+=amount;levelSteps.push({from:level,to:level+1,exp:amount});}
    const expOwned=data.expItems.reduce((sum,id)=>sum+owned(id)*data.items[id].value,0);
    if(!Number.isSafeInteger(expOwned))throw new Error('经验库存数值过大');
    const exp={required,owned:expOwned,deficit:missing(required,expOwned),levelSteps};
    const steps=p.steps.filter(s=>s.from>=from&&s.to<=to),costs={};let moneyRequired=0;
    for(const step of steps){moneyRequired+=step.money;for(const m of step.materials)costs[m.id]=(costs[m.id]||0)+m.count;}
    const money={required:moneyRequired,owned:owned(data.moneyId),deficit:missing(moneyRequired,owned(data.moneyId))};
    const crystal=data.stages[p.element];
    const materialIds=crystal.rewards.map(m=>m.id);
    const materials=materialIds.filter(id=>costs[id]).map(id=>({id,required:costs[id],owned:owned(id),deficit:missing(costs[id],owned(id))}));
    const farms=[];
    for(const [kind,stage,need] of [['exp',data.stages.Exp,exp.deficit],['money',data.stages.Coin,money.deficit]]){
      const yieldValue=stage.rewards.reduce((sum,m)=>sum+m.count*(kind==='exp'?data.items[m.id].value:1),0);
      if(!yieldValue)throw new Error('该资源关的奖励资料暂未收录');
      const runs=Math.ceil(need/yieldValue);farms.push({kind,stage,yield:yieldValue,runs,energy:runs*stage.energy,surplus:runs*yieldValue-need,loot:stage.rewards.map(m=>({...m,count:m.count*runs}))});
    }
    const runs=Math.max(0,...crystal.rewards.map(m=>Math.ceil(missing(costs[m.id]||0,owned(m.id))/m.count)));
    farms.push({kind:'crystal',stage:crystal,runs,energy:runs*crystal.energy,loot:crystal.rewards.map(m=>({id:m.id,count:m.count*runs,surplus:owned(m.id)+m.count*runs-(costs[m.id]||0)}))});
    return {profile:p,exp,money,materials,steps,farms,totalRuns:farms.reduce((s,f)=>s+f.runs,0),totalEnergy:farms.reduce((s,f)=>s+f.energy,0)};
  }
  return {calculate,requiredBreak};
});
