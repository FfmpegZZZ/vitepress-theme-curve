'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat.js'),require('./battle-rules.js'),require('./full-effects.js'));else root.KamikoiTeamCombat=factory(root.KamikoiCombat,root.KamikoiBattleRules,root.KamikoiFullEffects);})(typeof globalThis!=='undefined'?globalThis:this,function(C,B,F){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const statusRules={AddAttack:['attackBonus',.2],AddAttackBig:['attackBonus',.3],ReduceAttack:['attackBonus',-.2],AddDefence:['defenceBonus',.2],ReduceDef:['defenceBonus',-.2],IncreaseCriticalHitDamage:['criticalDamageBonus',.5],DecreaseHitChance:['hitBonus',-.35],Target:['vulnerability',.1],Stealth:['stealth',1],Invincible:['invincible',1],Unhealable:['unhealable',1],Stun:['stun',1],Silence:['silence',1],Immune:['immune',1]};
  const statusNames={AddAttack:'攻击提升',AddAttackBig:'攻击大幅提升',ReduceAttack:'攻击下降',AddDefence:'防御提升',ReduceDef:'防御下降',IncreaseCriticalHitDamage:'暴击伤害提升',DecreaseHitChance:'命中下降',Target:'锁定',Stealth:'潜影',Invincible:'无敌',Unhealable:'封愈',Stun:'眩晕',Silence:'沉默',Immune:'免疫'};
  function parse(value){return JSON.parse(value.replace(/^Fun#/,'').replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,'$1"$2":'));}
  function compile(skill,index=0){return F.compile(skill,index);}
  function validate(config){
    if(config.seed!=null&&(!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295))throw new Error('随机种子需为0—4294967295之间的整数');
    if(!Number.isInteger(config.steps)||config.steps<1||config.steps>500)throw new Error('模拟回合数需为1—500之间的整数');
    if(!Array.isArray(config.actors))throw new Error('请先配置双方成员');
    for(const side of ['ally','enemy']){const count=config.actors.filter(a=>a.side===side).length;if(count<1||count>(side==='ally'?4:5))throw new Error('我方需要1—4名成员，敌方每波需要1—5名成员');}
    if(config.enemyWaves!=null&&(!Array.isArray(config.enemyWaves)||config.enemyWaves.length>2||config.enemyWaves.some(w=>!Array.isArray(w)||w.length<1||w.length>5||w.some(a=>a.side!=='enemy'))))throw new Error('后续波次必须为1—5名敌方，整关最多3波');
    const allActors=[...config.actors,...(config.enemyWaves||[]).flat()];
    if(new Set(allActors.map(a=>a.id)).size!==allActors.length)throw new Error('成员编号不可重复');
    for(const a of allActors){
      if(!['ally','enemy'].includes(a.side)||typeof a.id!=='string'||!a.id)throw new Error('成员阵营或编号无效');
      for(const k of ['maxHP','hp','attack','defence','speed','gauge','criticalRate','criticalDamage'])if(!Number.isFinite(a[k]))throw new Error(a.name+' 的属性输入无效：'+k);
      if(a.maxHP<=0||a.hp<0||a.hp>a.maxHP||a.attack<0||a.defence<0||a.speed<=0||a.gauge<0||a.gauge>1)throw new Error(a.name+' 的生命、攻防、速度或行动条超出范围');
      if(a.criticalRate<0||a.criticalDamage<0)throw new Error(a.name+' 的暴击属性不能为负');
      if(!a.skills?.length)throw new Error(a.name+' 缺少技能');
      for(const s of a.skills)if(!Number.isFinite(s.attackRate)||s.attackRate<0||!Number.isFinite(s.power)||s.power<0||!Number.isInteger(s.cooldown)||s.cooldown<0||!Number.isInteger(s.initialCooldown||0)||(s.initialCooldown||0)<0)throw new Error(a.name+' 的技能倍率或CD无效');
      for(const k of ['shield','attackBonus','defenceBonus','damageBonus','reduction','vulnerability','penetration','dodgeRate','criticalResistance'])if(a[k]!=null&&!Number.isFinite(a[k]))throw new Error(a.name+' 的战斗条件无效');
      for(const [k,min,max]of [['shield',0,1e9],['attackBonus',-1,10],['defenceBonus',-1,10],['damageBonus',-1,10],['reduction',0,1],['vulnerability',0,10],['penetration',0,1],['dodgeRate',-1,10],['criticalResistance',-1,10]])if(a[k]!=null&&(a[k]<min||a[k]>max))throw new Error(a.name+' 的战斗条件超出范围：'+k);
      if(a.debuffs!=null&&(!Number.isInteger(a.debuffs)||a.debuffs<0||a.debuffs>99))throw new Error(a.name+' 的减益数量需为0—99的整数');
    }
  }
  function simulate(config){validate(config);return F.simulate(config);}
  function verify(config){
    const limit=config.verificationLimit??500,battle=simulate({...config,steps:limit});
    const living=side=>battle.actors.filter(a=>a.side===side&&a.hp>1e-8).length;
    const defeats=battle.events.flatMap(e=>e.targets.filter(t=>t.hpBefore>1e-8&&t.hpAfter<=1e-8).map(t=>({step:e.step,id:t.id,name:t.name,side:battle.actors.find(a=>a.id===t.id).side})));
    return {...battle,assessment:{status:battle.winner==='ally'?'cleared':battle.winner==='enemy'?'defeated':'unresolved',limit,alliesAlive:living('ally'),enemiesAlive:living('enemy'),defeats}};
  }
  return {compile,simulate,verify,validate,statusRules,traits:F.traits,audit:F.audit};
});
