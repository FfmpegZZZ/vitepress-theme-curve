'use strict';
/* Rankings use battle outcomes. Mechanism weights only generate descriptive tags. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./full-effects.js'));else root.AtlasRankingCore=factory(root.KamikoiFullEffects);})(typeof globalThis!=='undefined'?globalThis:this,function(F){
 const dimensions=['single','mob','support','survival'];
 const policy={groupBy:'jobAndRarity',visibleRarities:['SSR','SR'],rarityTiers:{SSR:['T0','T1'],SR:['T2','T3']},srUpperPercentile:50,t0MaxPerJob:2,clearThreshold:.9,survivalThreshold:.8,overallNearTie:.1,overallLeadWindow:.25,relativeLeadWindow:.005,t1TopRanks:3,description:'培养优先级按稀有度分档：SSR为T0–T1，SR为T2–T3；同职业同稀有度内比较实战，T0最多两张且需稳定，R不展示'};
 function rarityOf(row){return row.rarity||row.id?.match(/_(SSR|SR|R)_/)?.[1]||'';}
 function rankable(row){return policy.visibleRarities.includes(rarityOf(row));}
 function eligible(c){const s=c.skills.filter(s=>!s.hidden);return !!(c.named&&c.stats.length&&s.filter(x=>x.type!=='Passive').length>=2&&s.every(x=>!x.missing&&x.description&&!x.description.includes('缺失')));}
 function capabilities(card,stars){
  let support=0,protection=0;const tags=new Set(),evidence=[],cautions=new Set();
  const active=card.skills.filter(s=>!s.hidden&&s.type!=='Passive'),ult=active[1],cd=Math.max(1,Number(ult?.cooldown)||1);
  function add(label,a,b,w,skill){if(w<=0)return;tags.add(label);support+=a*w;protection+=b*w;evidence.push({label,skillId:skill.id,support:a*w,protection:b*w});}
  for(const s of card.skills.filter(s=>!s.hidden)){
   const passive=s.type==='Passive';if(passive&&stars<(s.unlocksAtStarLevel??3))continue;
   const frequency=passive?1/Math.max(1,Number(s.cooldown)||1):s===ult?1/cd:Math.max(.25,1-1/cd);
   if(passive)cautions.add('已计入解锁被动；触发条件与独立冷却仍影响实战收益。');
   if(/若|以下|丧失|消灭|拥有|每有|受到/.test(s.description))cautions.add('含血线、状态或受击条件，换队伍与敌人后表现会变化。');
   function walk(o,parentWeight=1){
    const self=o.Target==='Self',all=o.Target==='All'||o.Target==='AllWithDead',two=['RandomTwo','TwoLessHPRate'].includes(o.Target),count=all?4:two?2:1;
    const chance=Math.min(1,Math.max(0,Number(o.Rate??o.RateConvert?.Base??1))),conditional=o.Condition||o.Conditions?.length;
    const w=parentWeight*chance*(conditional?.65:1),tick=frequency*w,uptime=Math.min(1,frequency*Math.max(1,Number(o.StatusRound)||1))*w;
    const value=Number(o.Value??o.ValueConvert?.Rate??o.ValueConvert?.Base??0),tag=(team,solo)=>all?team:solo;
    if(o.Fun==='AddHP'||o.Fun==='AddHPWithInjury')add(tag('群体治疗','单体治疗'),self?0:12*count,15*count,tick,s);
    if(o.Fun==='RemoveDeBuf'||o.Fun==='TransferDeBuff')add(tag('群体净化','净化'),self?0:8*count,9*count,tick,s);
    if(o.Fun==='RemoveBuf'||o.Fun==='TransferBuffFrom')add(tag('群体驱散','驱散'),12*count,0,tick,s);
    if(o.Fun==='AddTime'){
     if(o.TargetCamp==='My'&&value>0)add(tag('全队拉条',self?'自身拉条':'队友拉条'),self?0:100*value*count,0,tick,s);
     if(o.TargetCamp!=='My'&&value<0)add(tag('群体推条','推条'),90*Math.abs(value)*count,0,tick,s);
    }
    if(['AddAllSkillCoolDown','AddSkillCoolDown'].includes(o.Fun)&&o.TargetCamp!=='My'&&value>0)add('延长敌方CD',10*count,0,tick,s);
    if(o.Fun==='AddPinchSkill')add('夹击',20,0,tick,s);
    if(['Revive','DirectRevive','ImmortalAddHP'].includes(o.Fun))add(o.Target==='Self'?'自身保命':'复活',self?0:8,24*count,tick,s);
    if(o.Fun==='SplitDamage')add('伤害分担',8,20,tick,s);
    if(o.HurtReduction)add('伤害减免',o.IsAura?12:0,30*Math.max(.1,Number(o.HurtReduction.Rate)||.1)*(o.IsAura?4:1),w,s);
    if(o.Fun==='AddStatus'){
     const status=o.FID,group=tag('全队增攻',self?'自身增攻':'队友增攻');
     const buff={AddAttack:[group,self?0:24*count,0],IncreaseCriticalHitChance:[tag('全队暴击','暴击提升'),self?0:16*count,0],IncreaseSpeed:[tag('全队加速',self?'自身加速':'队友加速'),self?0:24*count,0],ReduceDef:[tag('群体减防','减防'),22*count,0],ReduceAttack:[tag('群体降攻','降攻'),9*count,12*count],ReduceSpeed:[tag('群体减速','减速'),18*count,0],Stun:['眩晕',22*count,8*count],Sleep:['睡眠',14*count,5*count],Silence:['沉默',14*count,0],Taunt:['嘲弄',8*count,5*count],Unhealable:['禁疗',9*count,0],CannotBuff:['禁强化',10*count,0],Restrict:['禁拉条',12*count,0],Shield:[tag('全队护罩','护罩'),self?0:6*count,18*count],Immune:[tag('全队免疫','免疫'),self?0:12*count,16*count],AddDefence:[tag('全队防御','防御提升'),self?0:7*count,12*count],Invincible:['无敌',self?0:10*count,26*count],SkillNullifier:['伤害无效',self?0:8*count,22*count],Immortal:['坚忍',0,20*count],Stealth:['潜影',0,10],ContinuousHeal:['持续治疗',self?0:8*count,12*count],DecreaseHitChance:[tag('群体降命中','降命中'),8*count,10*count]};
     if(buff[status]){const [label,a,b]=buff[status];add(label,a,b,uptime,s);}
     if(['Poison','Burn','Bleed'].includes(status)&&w>0)tags.add({Poison:'中毒',Burn:'炽燃',Bleed:'血绽'}[status]);
    }
    if(o.Fun==='AdditionSkill'&&w>0)tags.add('追加攻击');if(o.Fun==='CounterSkill'&&w>0)tags.add('反击');if(o.Fun==='AddRound'&&w>0)tags.add('追加回合');
    for(const child of o.SubFuns||[])walk(child,w);
   }
   for(const f of [...F.fields(s.raw),...F.fields(s.raw,true)])walk(f);
  }
  const byLabel=new Map();for(const e of evidence){const key=e.label+'|'+e.skillId,old=byLabel.get(key);if(old){old.support+=e.support;old.protection+=e.protection;}else byLabel.set(key,{...e});}
  return {support,protection,tags:[...tags],evidence:[...byLabel.values()].sort((a,b)=>b.support+b.protection-a.support-a.protection),cautions:[...cautions]};
 }
 function output(events,actorId,enemyIds,horizon){return events.filter(e=>e.time<=horizon+1e-9).reduce((n,e)=>n+e.targets.filter(t=>t.sourceId===actorId&&enemyIds.has(t.id)).reduce((v,t)=>v+t.damage,0),0);}
 function percentiles(values){const sorted=[...values].sort((a,b)=>a-b);return values.map(v=>{if(v<=0)return 0;if(sorted.length===1)return 100;const lo=sorted.indexOf(v),hi=sorted.lastIndexOf(v);return (lo+hi)/2/(sorted.length-1)*100;});}
 function tier(score){return score>=90?'T0':score>=70?'T1':score>=40?'T2':'T3';}
 function baseRate(rows){const result=rows.map(r=>({...r,scores:{},tiers:{}}));for(const d of dimensions){const scores=percentiles(rows.map(r=>r[d]));result.forEach((r,i)=>r.scores[d]=Math.round(scores[i]*10)/10);}
  const overall=result.map(r=>Number.isFinite(r.overallRaw)?r.overallRaw:Object.values(r.scores).sort((a,b)=>b-a).reduce((sum,v,i)=>sum+v*[.45,.3,.15,.1][i],0)),p=percentiles(overall);
  result.forEach((r,i)=>{r.scores.overall=Math.round(p[i]*10)/10;for(const d of [...dimensions,'overall'])r.tiers[d]=tier(r.scores[d]);});return result;
 }
 function rate(rows){
  if(!rows.length||!rows.every(r=>r.job))return baseRate(rows);
  const rated=new Map();
  const groupKey=r=>r.job+'|'+rarityOf(r);
  for(const key of new Set(rows.map(groupKey))){
   const members=rows.filter(r=>groupKey(r)===key),rarity=rarityOf(members[0]),group=baseRate(members);
   for(const d of [...dimensions,'overall']){
    const value=r=>d==='overall'?r.overallRaw:r[d],sorted=[...group].sort((a,b)=>value(b)-value(a)||a.id.localeCompare(b.id)),top=value(sorted[0]),tolerance=d==='overall'?policy.overallNearTie:Math.max(1e-9,Math.abs(top)*.001),leadWindow=d==='overall'?policy.overallLeadWindow:Math.abs(top)*policy.relativeLeadWindow;
    const limit=policy.t0MaxPerJob,boundaryTie=sorted.length>limit&&Math.abs(value(sorted[limit-1])-value(sorted[limit]))<1e-9;
    const candidates=new Set(sorted.slice(0,limit).filter(r=>top-value(r)<=leadWindow+1e-9&&(!boundaryTie||value(r)>value(sorted[limit-1])+1e-9)).map(r=>r.id));
    for(const r of group){const rank=1+group.filter(other=>value(other)>value(r)+tolerance).length,stable=(r.performance?.clearRate??0)>=policy.clearThreshold&&(r.performance?.survived??0)>=policy.survivalThreshold;
     const topCandidate=value(r)>0&&candidates.has(r.id)&&stable;
     r.tiers[d]=rarity==='SSR'?(topCandidate?'T0':'T1'):rarity==='SR'?(value(r)>0&&stable&&r.scores[d]>=policy.srUpperPercentile?'T2':'T3'):rarity==='R'?'T3':value(r)<=0||(d==='overall'&&r.performance?.clearRate===0)?'T3':candidates.has(r.id)&&stable?'T0':rank<=policy.t1TopRanks?'T1':r.scores[d]>=40?'T2':'T3';
     if(d==='overall')r.professionRank=rank;
    }
   }
   for(const r of group)rated.set(r.id,r);
  }
  return rows.map(r=>rated.get(r.id));
 }
 function scope(rows,scenes,references,ids){
  const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:0,selected=new Set(ids),byId=new Map(rows.map(r=>[r.id,r]));
  return rate(rows.map(row=>{const tests=row.stageResults.filter(s=>selected.has(s.sceneId)),baseline=byId.get(references[row.id])||row,base=new Map(baseline.stageResults.map(s=>[s.sceneId,s])),one=tests.filter(t=>scenes.find(s=>s.id===t.sceneId)?.single),many=tests.filter(t=>!one.includes(t));
   const performance={};for(const k of ['clearRate','unresolved','survived','teamAlive','hpRatio'])performance[k]=mean(tests.map(t=>t[k]||0));
   performance.utility=mean(tests.map(t=>t.utility));performance.baselineDelta=mean(tests.map(t=>t.utility-base.get(t.sceneId).utility));
   return {...row,single:mean(one.map(t=>t.damageRate)),mob:mean(many.map(t=>t.damageRate)),support:Math.max(0,50+performance.baselineDelta),survival:70*performance.survived+20*performance.hpRatio+10*performance.teamAlive,overallRaw:performance.utility,performance,stageResults:tests};
  }));
 }
 return {eligible,rankable,capabilities,output,percentiles,tier,rate,scope,policy};
});
