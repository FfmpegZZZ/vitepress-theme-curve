'use strict';
/* Formula verified against Game.BattleCalculator in the exported ARM64 client.
   Evidence and scope: reports/combat_rules.md. No game scripts are executed. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KamikoiCombat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const constants = Object.freeze({attackPower:1.871, defence:2000, strong:1.15, miss:0.75, strongChance:0.25, advantage:1.1, advantageCrit:0.15, disadvantageDodge:0.5});
  const conquers = {Ice:'Fire', Fire:'Earth', Earth:'Ground', Ground:'Ice', Light:'Dark', Dark:'Light'};
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo,n));
  function relation(source, target) {
    if (source && target && conquers[source] === target) return 'advantage';
    if (source && target && conquers[target] === source) return 'disadvantage';
    return 'neutral';
  }
  function calculate(input) {
    const p = Object.assign({attack:0,attackRate:0,power:1,flatAttack:0,condition:1,defence:0,attackBonus:0,defenceBonus:0,penetration:0,antiPenetration:0,damageBonus:0,reduction:0,vulnerability:0,criticalRate:0.15,criticalResistance:0,criticalDamage:1.3,dodgeRate:0,hitRate:0,strongChance:0.25,shield:0,targetMaxHP:0,targetHP:100},input);
    const numeric = ['attack','attackRate','power','flatAttack','condition','defence','attackBonus','defenceBonus','penetration','antiPenetration','damageBonus','reduction','vulnerability','criticalRate','criticalResistance','criticalDamage','dodgeRate','hitRate','strongChance','shield','targetMaxHP','targetHP'];
    for (const k of numeric) if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) throw new Error('请输入有效数字：'+k);
    for (const k of ['attack','attackRate','power','flatAttack','condition','defence','penetration','criticalDamage','shield','targetMaxHP']) if (p[k]<0) throw new Error('数值不能小于 0：'+k);
    if (p.attackBonus < -1 || p.defenceBonus < -1 || p.reduction<0 || p.reduction>1 || p.vulnerability<0 || p.targetHP<0 || p.targetHP>100) throw new Error('战斗条件超出有效范围');
    const rel=relation(p.sourceElement,p.targetElement);
    const advantage=rel==='advantage';
    const disadvantage=rel==='disadvantage' && !['Light','Dark'].includes(p.targetElement);
    let dodge=clamp(p.dodgeRate+(disadvantage?constants.disadvantageDodge:0)-p.hitRate,0,1);
    if(p.forceHit)dodge=0;
    if(p.forceMiss)dodge=1;
    let crit=clamp(p.criticalRate+(advantage?constants.advantageCrit:0)-p.criticalResistance,0,1);
    if(p.noCritical)crit=0;
    if(p.forceCritical)crit=1;
    let strong=clamp(p.strongChance,0,1); // ConquerBigHitRate replaces BigHitRate; both are 0.25 in this snapshot.
    if(p.noStrong)strong=0;
    if(p.forceStrong)strong=1;
    const probability={miss:dodge,critical:(1-dodge)*crit,strong:(1-dodge)*(1-crit)*strong,normal:(1-dodge)*(1-crit)*(1-strong)};
    const attack=p.attack*Math.max(0,1+p.attackBonus);
    const penetrationFactor=Math.max(0,1-p.penetration*Math.max(0,1-p.antiPenetration)); // Special P2/P3 branches are outside this calculator's scope.
    const effectiveDefence=p.defence*Math.max(0,1+p.defenceBonus)*penetrationFactor;
    const defenceFactor=1/(1+effectiveDefence/constants.defence);
    const elementFactor=advantage?constants.advantage:1;
    const sourceFactor=Math.max(0,1+p.damageBonus);
    const targetFactor=1-p.reduction+p.vulnerability;
    const raw=(attack*p.attackRate+p.flatAttack)*constants.attackPower*p.power*p.condition*elementFactor*defenceFactor*sourceFactor*targetFactor;
    const normal=p.invincible?0:Math.max(0,raw);
    const damage={normal,critical:normal*p.criticalDamage,strong:normal*constants.strong,miss:normal*constants.miss};
    const loss={};
    const remaining=p.targetMaxHP*p.targetHP/100;
    for(const k of Object.keys(damage))loss[k]=Math.min(p.targetMaxHP>0?remaining:Infinity,Math.max(0,damage[k]-p.shield));
    const expected=Object.keys(damage).reduce((sum,k)=>sum+damage[k]*probability[k],0);
    const expectedLoss=Object.keys(loss).reduce((sum,k)=>sum+loss[k]*probability[k],0);
    return {damage,probability,loss,expected,expectedLoss,attack,effectiveDefence,defenceFactor,elementFactor,sourceFactor,targetFactor,relation:rel,raw};
  }
  function profile(card, level, stars, rewards, perReward={HP:25,Attack:4,Defence:3}) {
    const row=card.stats.find(s=>s.level===Number(level));
    if(!row)throw new Error('该等级的数值资料暂未收录');
    const rates=card.starMultipliers[stars];
    if(!rates)throw new Error('该星级的成长资料暂未收录');
    return Object.fromEntries(Object.entries(row.values).map(([k,v])=>[k,Number((v*(rates[k]||1)+(perReward[k]||0)*rewards).toFixed(9))]));
  }
  function skillModel(skill) {
    const model={attackRate:Number(skill.attackRate)||0,power:skill.raw?.Pow===''||skill.raw?.Pow==null?1:Number(skill.raw.Pow),conditions:[],penetrations:[],warnings:[],extra:[]};
    for(const [key,value] of Object.entries(skill.raw||{})) {
      if(!key.startsWith('DynamicField')||!value)continue;
      let obj;
      try { obj=JSON.parse(value.replace(/^Fun#/,'').replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,'$1"$2":')); }
      catch { if(/ConditionAttack|Penetrate|ConstantAttack|DefenceRate|AttRate/.test(value))model.warnings.push('部分动态伤害条件无法解析，请手动设置'); continue; }
      for(const [field,dest] of [['ConditionAttack','conditions'],['PenetrateRate','penetrations']]) {
        const v=obj[field];if(!v)continue;
        const allowed=['Who','Rate','Property','Base','Group'];
        const who=v.Who||'Source';
        if(obj.Condition||obj.Conditions||Object.keys(v).some(k=>!allowed.includes(k))||!['Source','SelectTarget','Target'].includes(who)||!['LastHPRate','ValueOne','DebuffCount'].includes(v.Property)||!Number.isFinite(Number(v.Rate))) {
          model.warnings.push('有未自动应用的条件增伤或穿透，请按技能条件手动设置');
        }else model[dest].push({who,rate:Number(v.Rate),base:Number(v.Base)||0,property:v.Property,group:v.Group||''});
      }
      if(/ConstantAttack|DefenceRate|AttackRate|AttRate|DamageRate|MustCritical|NoCritical|MustHit|MustDodge|MustBigHit|NoBigHit/.test(value))model.warnings.push('有特殊伤害或命中规则未自动应用，请手动设置');
      if(/AdditionSkill|Counterattack|Cooperate/.test(value))model.extra.push('含追加攻击或协同事件，本结果只计算所选技能主段');
    }
    if(skill.raw?.ReferanceSkillID||skill.raw?.TwinSkill||skill.raw?.LevelSkillID)model.warnings.push('该技能包含关联效果，请结合组队模拟查看完整表现');
    model.warnings=[...new Set(model.warnings)];model.extra=[...new Set(model.extra)];
    return model;
  }
  function skillModifiers(model, context) {
    const value=c=>c.base+c.rate*(c.property==='ValueOne'?1:c.property==='DebuffCount'?(context.debuffs||0):100-clamp(c.who==='Source'?(context.sourceHP??100):(context.targetHP??100),0,100));
    const groups={};
    for(const c of model.conditions)groups[c.group]=(groups[c.group]||0)+value(c);
    return {condition:Object.values(groups).reduce((a,v)=>a*(1+v),1),penetration:model.penetrations.reduce((a,c)=>a+value(c),0)};
  }
  return {constants,relation,calculate,profile,skillModel,skillModifiers};
});
