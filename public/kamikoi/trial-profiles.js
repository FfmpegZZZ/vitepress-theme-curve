'use strict';
(function(root){
  function activeSkills(enemy){return enemy.skills.filter(s=>!s.hidden&&s.type!=='Passive'&&!s.missing).slice(0,2);}
  function apply(actor,enemy,compile){
    if(!enemy||actor.side!=='enemy')throw new Error('关卡配置只能应用到敌方');
    const v=enemy.values,skills=activeSkills(enemy).map(compile);
    Object.assign(actor,{cardId:'manual',trialKey:enemy.key,name:enemy.name,level:enemy.level,stars:0,rewards:0,maxHP:v.HP,hp:v.HP,attack:v.Attack,defence:v.Defence,speed:v.Speed,criticalRate:v.CriticalRate*100,criticalDamage:v.CriticalDamageRate*100,element:enemy.element,shield:0,gauge:0,defaultSkill:0,cd:skills[1]?.cooldown||0,initialCooldown:skills[1]?.initialCooldown||0});
    for(const key of ['attackBonus','defenceBonus','damageBonus','reduction','vulnerability','penetration','dodgeRate','criticalResistance','debuffs'])actor[key]=0;
    skills.forEach((skill,i)=>{actor['rate'+(i+1)]=skill.attackRate*100;actor['power'+(i+1)]=skill.power;actor['all'+(i+1)]=skill.all;});
    return actor;
  }
  function validateTeam(actors,scenes){
    const enemies=actors.filter(a=>a.side==='enemy'),first=enemies.find(a=>a.trialKey);
    if(!first)return;
    const wave=scenes.flatMap(s=>s.waves).find(w=>w.enemies.some(e=>e.key===first.trialKey));
    if(!wave||enemies.length!==wave.enemies.length||enemies.some((a,i)=>a.trialKey!==wave.enemies[i].key))throw new Error('关卡敌方必须为同波完整阵容，请重新选择对应关卡。');
  }
  function followingWaves(actors,scenes,create){
    validateTeam(actors,scenes);
    const first=actors.find(a=>a.side==='enemy'&&a.trialKey);
    if(!first)return [];
    const scene=scenes.find(s=>s.waves.some(w=>w.enemies.some(e=>e.key===first.trialKey)));
    if(!scene.waves[0].enemies.some(e=>e.key===first.trialKey))throw new Error('整关验证必须从第一波开始，请重新选择关卡。');
    return scene.waves.slice(1).map(w=>w.enemies.map(e=>create(e,'stage:'+e.key)));
  }
  const api={apply,activeSkills,validateTeam,followingWaves};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasTrialProfiles=api;
})(typeof window!=='undefined'?window:globalThis);
