'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat.js'),require('./data/battle-rules.js'));else root.KamikoiBattleRules=factory(root.KamikoiCombat,root.ATLAS_BATTLE_RULES);})(typeof globalThis!=='undefined'?globalThis:this,function(C,D){
  function parse(s){return JSON.parse(s.replace(/^Fun#/,'').replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g,'$1"$2":'));}
  const truth=v=>/^(true|1)$/i.test(v||'');
  function traits(card,stars=0,trial=false){
    const out={ai:trial?card?.source?.ai:card?.raw?.AIs,immunities:[],roundStacks:[],reactions:[],warnings:[]};
    if(!card)return out;
    for(const value of Object.values(trial?card.source?.roleDynamicFields||{}:card.raw||{})){
      if(typeof value==='string'&&value.startsWith('AntiList#'))out.immunities.push(...value.slice(9).split('~').map(s=>s.replace(/^Anti/,'')));
    }
    for(const skill of card.skills||[]){
      if(skill.type!=='Passive'||skill.hidden||(!trial&&stars<(skill.unlocksAtStarLevel??3)))continue;
      const values=Object.entries(skill.raw||{}).filter(([k,v])=>k.startsWith('DynamicField')&&v).map(([,v])=>v);
      if(skill.id==='C04_SSR_002S4'){
        out.reactions.push({kind:'smoke',id:skill.id,cooldown:Number(skill.cooldown)||2});continue;
      }
      let supported=0;
      for(const value of values){
        let o;try{o=parse(value);}catch{continue;}
        const status=D.statuses[o.FID],prop=status?.DynamicField1;
        if(o.Trigger==='BeforeRound'&&o.Fun==='AddStatus'&&o.Target==='Self'&&o.TargetCamp==='My'&&/^AttackFinalRate#/.test(prop||'')&&!o.Condition&&!o.Conditions){
          out.roundStacks.push({id:o.FID,value:Number(prop.split('#')[1]),max:Number(status.MaxStack)||1});supported++;
        }
      }
      if(supported<values.length||!values.length)out.warnings.push(`${card.name} · ${skill.id}：被动「${skill.description||skill.name}」未完整执行`);
    }
    for(const s of card.skills||[])if(s.missing)out.warnings.push(`${card.name} · ${s.id}：源技能缺失`);
    return out;
  }
  function rng(seed=1){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
  const supportedAI=new Set(['M_S1Att_S2Att','M_S1Att_S2Buf','M_S1Att_S2Hea','M_C04_R_007','M_S1Att_S2Att_HaveDebuff','S1Att_S2Att','M_S1Att_S2Att_BuffCount','M_S1Att_S2Att_MostTime','M_S1Att_S2Att_HightestAtkOne']);
  const aiRows=new Map();
  for(const row of D.ai){
    if(!supportedAI.has(row.ID))continue;
    const parsed={index:Number(row.SkillIndex),priority:Number(row.Priority),conditions:[],targets:[]};
    for(let i=1;i<=3;i++)if(row['Condition'+i])parsed.conditions.push(parse(row['Condition'+i]));
    for(let i=1;i<=5;i++)if(row['TargetSetting'+i])parsed.targets.push(parse(row['TargetSetting'+i]));
    if(!aiRows.has(row.ID))aiRows.set(row.ID,[]);aiRows.get(row.ID).push(parsed);
  }
  for(const rows of aiRows.values())rows.sort((a,b)=>b.priority-a.priority);
  function select({actor,actors,stat,random,skillIndex}){
    const alive=side=>actors.filter(a=>a.side===side&&a.hp>1e-8);
    const debuffs=a=>(a.debuffs||0)+a.statuses.filter(s=>s.isDebuff??s.camp==='Enemy').length;
    function condition(c,target){
      if(c.CheckFun==='AnyAllyHaveCoolDown')return alive(actor.side).some(a=>a.cooldowns.some(n=>n>0));
      // The client's Lt / Gt include equality; Ltn / Gtn are strict (ValueCompare 0x2375EFC).
      if(c.Property==='DeBuffCount'&&c.TargetInfo?.TargetType==='All')return alive(actor.side==='ally'?'enemy':'ally').some(a=>debuffs(a)>=Number(c.Value));
      if(c.Property==='NowHPRate'&&c.Comparer==='Lt')return !!target&&target.hp/target.maxHP<=Number(c.Value);
      return false;
    }
    function targetFor(skill,settings){
      let pool=alive(skill.friendly?actor.side:actor.side==='ally'?'enemy':'ally');
      if(!skill.friendly&&!skill.all){const visible=pool.filter(a=>!stat(a,'stealth'));if(visible.length)pool=visible;}
      for(const s of settings){
        if(s.Rate!=null&&random()>s.Rate)continue;
        let candidates=pool.filter(a=>(!s.NoSelf||a.id!==actor.id)&&(!s.Condition||condition(s.Condition,a)));
        if(s.Type==='FrontRow')candidates=candidates.filter(a=>a.position===0);
        else if(s.Type==='Boss')candidates=candidates.filter(a=>a.boss);
        else if(s.Type==='ConquerOKTarget'){
          const advantage=candidates.filter(a=>C.relation(actor.element,a.element)==='advantage');
          candidates=advantage.length?advantage:candidates.filter(a=>C.relation(actor.element,a.element)!=='disadvantage');
        }
        else if(s.Type==='LessHPRate'){
          const min=Math.min(...candidates.map(a=>a.hp/a.maxHP));candidates=candidates.filter(a=>a.hp/a.maxHP===min);
        }else if(['MostTime','HightestAtkOne'].includes(s.Type)||(s.Type==='MaxProperty'&&s.Property==='BuffCount')){
          const value=a=>s.Type==='MostTime'?a.gauge:s.Type==='HightestAtkOne'?a.attack*(1+stat(a,'attackBonus')):a.statuses.filter(x=>!x.isDebuff).length;
          const max=Math.max(...candidates.map(value));candidates=candidates.filter(a=>Math.abs(value(a)-max)<1e-10);
        }else if(s.Type==='HaveCoolDown')candidates=candidates.filter(a=>a.cooldowns.some(n=>n>0));
        else if(s.Type==='HightestSkillCD'){
          const max=Math.max(0,...candidates.map(a=>Math.max(...a.cooldowns)));candidates=max?candidates.filter(a=>Math.max(...a.cooldowns)===max):[];
        }else continue;
        // Source AITargetSetting picks lowest HP%, and monsters randomize equal-HP ties.
        const min=Math.min(...candidates.map(a=>a.hp/a.maxHP));candidates=candidates.filter(a=>a.hp/a.maxHP===min);
        if(candidates.length)return candidates[actor.side==='enemy'?Math.floor(random()*candidates.length):0];
      }
    }
    const rows=aiRows.get(actor.traits?.ai);
    if(!rows)return null;
    for(const row of rows){
      const index=skillIndex??row.index,skill=actor.skills[index];
      if(skillIndex!=null&&row.index!==skillIndex)continue;
      if(!skill||actor.cooldowns[index]>0||(index===1&&stat(actor,'silence'))||!row.conditions.every(c=>condition(c)))continue;
      const target=targetFor(skill,row.targets);
      if(target)return {index,target,reason:`配置AI ${actor.traits.ai}`};
    }
    return null;
  }
  return {parse,traits,rng,select,statuses:D.statuses,initialGaugeMax:D.initialGaugeMax,truth,supportedAI};
});
