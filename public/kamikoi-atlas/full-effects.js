'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./combat.js'),require('./battle-rules.js'),require('./data/battle-rules.js'));else root.KamikoiFullEffects=factory(root.KamikoiCombat,root.KamikoiBattleRules,root.ATLAS_BATTLE_RULES);})(typeof globalThis!=='undefined'?globalThis:this,function(C,B,D){
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),yes=v=>v===true||v===1||/^(true|1)$/i.test(String(v));
  const propMap={AttackFinalRate:'attackBonus',DefenceFinalRate:'defenceBonus',SpeedFinalRate:'speedBonus',HPFinalRate:'hpBonus',CriticalRate:'criticalRateBonus',CriticalDamageRate:'criticalDamageBonus',DeCriticalRate:'criticalResistance',DodgeRate:'dodgeRate',HitRate:'hitBonus',ResistanceRate:'resistanceBonus',ResistRate:'resistanceBonus',EffectHitRate:'effectHitBonus',PinchRate:'pinchRate',NoPinch:'noPinch',NoCounter:'noCounter',Dizzy:'stun',Silence:'silence',SealHeal:'unhealable',SealBuff:'cannotBuff',Stealth:'stealth',Invincible:'invincible',Immune:'immune',Immortal:'immortal',Sleep:'sleep',NoDamage:'noDamage',CounterRate:'counterRate',AntiAddTime:'antiAddTime',AddTimeRate:'addTimeRate',InjuryRate:'injuryRate',IgnoreBuildinResist:'ignoreBuiltinResist',Shield:'shieldFlag',Poison:'poison',Burn:'burn',Bleed:'bleed',Restrict:'restrict',Brand:'brand',Taunt:'taunt',TargetTaunt:'targetTaunt',IsSourceDeadRemove:'sourceDeadRemove',AI:'statusAI',TauntAI:'statusAI',HPValue:'hpValue',HPRate:'hpBonus',AttackValue:'attackValue',DefenceValue:'defenceValue',Speed:'speedValue',ReduceSpeed:'reduceSpeed',ForFilter:'forFilter',SpeedValue:'speedValue',DefenceRate:'defenceBonus',DePenetrateRate:'antiPenetration'};
  const funs=new Set(['No','AddStatus','RandomAddStatus','AddTime','AddHP','AddHPWithInjury','RemoveDeBuf','RemoveBuf','RemoveBufsByID','AddAllBuffRound','AddAllDeBuffRound','ReSetSkillCoolDown','AddSkillCoolDown','AddAllSkillCoolDown','AdditionSkill','CounterSkill','AddPinchSkill','ReplaceSkill','AddRound','ImmortalAddHP','Revive','DirectRevive','TransferDeBuff','TransferBuff','TransferBuffFrom','SplitDamage','ForceConquer','BuffAttack','DirectHPValueHit','BlastBuff','AddEventHPDiff','AddInjuryRate']);
  const checks=new Set(['AnyAllyHaveBuff','CheckSkillCooldown','CheckSkillNoUse','FunID','HaveBuff','IsCriticalHit','IsDamageSkill','IsDiffCamp','IsMainRound','IsNoDamageSkill','IsNoSelf','IsNormalSkill','IsPinch','IsSameCamp','IsSkillNoPinch','MainActionType','Position','SkillID','TargetIsAll','TargetIsOne','AnyAllyHaveCoolDown','RoleElement']);
  const properties=new Set(['AllDamage','Attack','AttackFinalRate','BlastBuffRoundValue','BuffCount','BuffCountByID','BuffGroupStack','BuffMinRoundByID','BuffStack','BuffValue','CampDebuffCount','CanRemoveBuffCount','CriticalRate','DeBuffCount','DebuffCount','DefenceFinalRate','DodgeRate','EnemyCount','EventHPDiff','FewEnemyCount','LastHPRate','LastRemoveDebuffCount','MaxHP','NowHP','NowHPRate','NowTime','OldBuffCount','ResistanceRate','RoleNoPinch','SkillDamage','SpeedFinalRate','ValueOne','WhoSkillDamage','SkillDamageHPRate']);
  const targets=new Set(['All','AllWithDead','AuraSource','BackRow','DeadOne','HightestAtkOne','HightestSkillCD','LessHPRate','MostTime','RandomTwo','RandomOne','Self','SkillDirectTargets','SkillSelect','SkillSetting','SkillSource','TwoLessHPRate','ParamTarget','Selected','SelectTarget','Target','HaveCoolDown','HaveDeBuffAll','MaxProperty','TriggerTarget','HaveDeBuffOne']);
  const triggers=new Set(['AfterSkill','BeforeSkill','BeforeRound','AfterRound','SelfDead','OtherDead','AnyEnemyAfterSkill','AnyAllyAfterSkill','AnyEnemyAfterMainSkill','AnyAllyAfterMainSkill','AnyEnemyAfterRound','AnyAllyAfterRound','BuffRound','StartBattle','TargetAfterSkill','AfterEvent','Property','BeforeEvent','AnyOneAfterSkillHit','AfterRevive','ForceConquer','AnyOneAfterRound','AnyOneBeforeRound','SkillProperty','PreSelfDead']);
  const fieldCache=new Map();
  function field(value){
    if(fieldCache.has(value))return fieldCache.get(value);
    let parsed;if(value.startsWith('Fun#'))parsed=B.parse(value);else {const i=value.indexOf('#');if(i<0)throw Error('无法解析动态字段：'+value);const property=value.slice(0,i),v=value.slice(i+1);parsed={Trigger:'Property',Property:property,Value:Number.isFinite(Number(v))?Number(v):v,plain:true};}
    function check(o){if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){
      if(k==='Fun'&&!funs.has(v)||k==='CheckFun'&&!checks.has(v)||k==='Trigger'&&!triggers.has(v)||['Target','TargetType'].includes(k)&&!targets.has(v)||k==='Property'&&!properties.has(v)&&!Object.hasOwn(propMap,v)&&!['AntiList','ForceConquer'].includes(v))throw Error('未支持的动态规则：'+k+'='+v);
      if(v&&typeof v==='object')check(v);
    }}check(parsed);fieldCache.set(value,parsed);return parsed;
  }
  function fields(raw,passive=false){return Object.entries(raw||{}).filter(([k,v])=>v&&(passive?k.startsWith('PassiveProp.DynamicField'):k.startsWith('DynamicField'))).map(([k,v])=>({...field(v),key:k,skillId:raw.ID}));}
  const book=new Map();
  function compile(skill,index=0){
    const raw=skill.raw||{},id=skill.id||raw.ID,model=C.skillModel(skill);
    return {id,name:index===0?'战技':'终结技',attackRate:Number(skill.attackRate??raw.AttRate)||0,power:raw.Pow===''||raw.Pow==null?1:Number(raw.Pow),cooldown:index===0?0:Math.max(0,Number(skill.cooldown??raw.CoolDown)||0),initialCooldown:index>0&&yes(raw.IsInitCoolDown)?Number(skill.cooldown??raw.CoolDown)||0:0,all:raw.TargetType==='All',friendly:raw.TargetCamp==='My',targetType:raw.TargetType,noSelf:yes(raw.NoSelf),model,functions:fields(raw),effects:[],warnings:[],raw};
  }
  function lookup(id){if(!book.has(id)){const raw=D.skills[id];if(!raw)throw Error('源技能不存在：'+id);book.set(id,compile({id,raw,attackRate:raw.AttRate,cooldown:raw.CoolDown},1));}return book.get(id);}
  function traits(card,stars=0,trial=false){
    const out={ai:trial?card?.source?.ai:card?.raw?.AIs,immunities:[],roundStacks:[],reactions:[],warnings:[],functions:[],skillCooldowns:{}};if(!card)return out;
    for(const v of Object.values(trial?card.source?.roleDynamicFields||{}:card.raw||{}))if(typeof v==='string'&&v.startsWith('AntiList#'))out.immunities.push(...v.slice(9).split('~').map(s=>s.replace(/^Anti/,'')));
    for(const skill of card.skills||[]){
      if(skill.missing){out.warnings.push(`${card.name} · ${skill.id}：源技能缺失`);continue;}
      if(skill.type==='Passive'&&!skill.hidden&&(trial||stars>=(skill.unlocksAtStarLevel??3))){
        out.functions.push(...fields(skill.raw));out.skillCooldowns[skill.id]=Number(skill.cooldown)||0;
        if(skill.id==='C04_SSR_002S4')out.reactions.push({kind:'smoke',id:skill.id,cooldown:Number(skill.cooldown)||2});
        for(const f of fields(skill.raw))if(f.plain&&f.Property==='AntiList')out.immunities.push(...String(f.Value).split('~').map(s=>s.replace(/^Anti/,'')));
      }
      if(!skill.hidden&&skill.type!=='Passive')out.functions.push(...fields(skill.raw,true));
    }
    return out;
  }
  function audit(atlas){let count=0;const unsupported=[];
    function walk(o,path){if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){
      if(k==='Fun'&&!funs.has(v))unsupported.push(path+' Fun '+v);
      if(k==='CheckFun'&&!checks.has(v))unsupported.push(path+' CheckFun '+v);
      if(k==='Property'&&!properties.has(v)&&!Object.hasOwn(propMap,v)&&v!=='AntiList'&&v!=='ForceConquer')unsupported.push(path+' Property '+v);
      if((k==='Target'||k==='TargetType')&&!targets.has(v))unsupported.push(path+' Target '+v);
      if(k==='Trigger'&&!triggers.has(v))unsupported.push(path+' Trigger '+v);
      if(v&&typeof v==='object')walk(v,path+'.'+k);
    }}
    for(const [id,raw]of [...Object.entries(D.skills),...Object.entries(D.statuses)])for(const [k,v]of Object.entries(raw))if(k.includes('DynamicField')&&v){count++;try{walk(field(v),id+'.'+k);}catch(e){unsupported.push(id+'.'+k+':'+e.message);}}
    return {fields:count,skills:Object.keys(D.skills).length,statuses:Object.keys(D.statuses).length,unsupported:[...new Set(unsupported)]};
  }
  function simulate(config){
    const random=B.rng(config.seed??1),future=config.enemyWaves||[],waveCount=future.length+1;let wave=1,time=0,event,mainActor,queue=[],extraRounds=[],serial=0;
    const warnings=new Set(),events=[],transitions=[],map=new Map(),actors=[];
    const alive=side=>actors.filter(a=>a.hp>1e-8&&(!side||a.side===side)&&(!a.wave||a.wave===wave));
    const note=s=>event?.effects.push(s),warn=s=>{warnings.add(s);event?.warnings.push(s);};
    function init(a,position,roll=true){const x={...a,position,wave:a.side==='enemy'?wave:0,hp:a.hp,baseMaxHP:a.maxHP,shield:a.shield||0,manualShield:a.shield||0,gauge:roll&&config.openingGauge==='game'?random()*B.initialGaugeMax:a.gauge,ownTurn:0,statuses:[],reactionCooldowns:{},functionCooldowns:{},usedSkills:{},cooldowns:a.skills.map(s=>s.initialCooldown||0),damage:0,hpLoss:0,healing:0};actors.push(x);map.set(x.id,x);return x;}
    const pos={ally:0,enemy:0};for(const a of config.actors)init(a,pos[a.side]++);
    const initialGauges=actors.map(a=>({id:a.id,gauge:a.gauge}));
    const context=(owner,other={})=>({owner,source:owner,target:owner,selected:owner,triggerSource:owner,triggerTarget:owner,skill:null,kind:'system',...other});
    function who(name,ctx){return name==='Target'?ctx.target:name==='SelectTarget'?ctx.selected:name==='TriggerSource'?ctx.triggerSource:name==='TriggerTarget'?ctx.triggerTarget:name==='AuraSource'?ctx.auraSource||ctx.owner:ctx.owner;}
    function count(a,debuff){return a?.statuses.filter(s=>(debuff?s.isDebuff:s.buffType==='Buff')&&String(D.statuses[s.id]?.IsShowIcon).toUpperCase()!=='FALSE'&&s.duration>0).length+(debuff?(a?.debuffs||0):0);}
    function removable(s){return !yes(D.statuses[s.id]?.IsResident)&&!s.absolute;}
    function property(name,a,ctx,o={}){if(!a)return 0;const list=a.statuses.filter(s=>s.duration>=0||s.duration===Infinity),id=o.PropertyID||o.CheckID;
      switch(name){
        case 'ValueOne':return 1;case 'MaxHP':return a.maxHP;case 'NowHP':return a.hp;case 'NowHPRate':return a.hp/a.maxHP;case 'LastHPRate':return (1-a.hp/a.maxHP)*100;
        case 'Attack':return Math.max(0,a.attack*(1+stat(a,'attackBonus',ctx))+stat(a,'attackValue',ctx));
        case 'BuffCount':case 'OldBuffCount':return name==='OldBuffCount'?(ctx.oldBuffCount?.get(a.id)??count(a,false)):count(a,false);
        case 'CanRemoveBuffCount':return list.filter(s=>!s.isDebuff&&s.buffType==='Buff'&&removable(s)).length;
        case 'DebuffCount':case 'DeBuffCount':return count(a,true);case 'CampDebuffCount':return alive(a.side).reduce((n,x)=>n+count(x,true),0);
        case 'BuffCountByID':return list.filter(s=>s.id===id).length;case 'BuffStack':return list.filter(s=>s.id===id).reduce((n,s)=>n+(s.stacks||1),0);
        case 'BuffGroupStack':return list.filter(s=>(D.statuses[s.id]?.Group||s.id)===id).reduce((n,s)=>n+(s.stacks||1),0);
        case 'BuffMinRoundByID':return Math.min(Infinity,...list.filter(s=>s.id===id).map(s=>s.duration));
        case 'BuffValue':return list.find(s=>s.id===id)?.amount||0;case 'BlastBuffRoundValue':return list.filter(s=>s.id===id).reduce((n,s)=>n+(s.amount||0)*s.duration,0);
        case 'NowTime':return a.gauge;case 'LastRemoveDebuffCount':return ctx.lastRemoved?.get(a.id)||0;
        case 'EnemyCount':return alive(a.side==='ally'?'enemy':'ally').length;case 'FewEnemyCount':return Math.max(0,4-alive(a.side==='ally'?'enemy':'ally').length);
        case 'RoleNoPinch':return stat(a,'noPinch',ctx)||stat(a,'stun',ctx)||stat(a,'sleep',ctx);
        case 'AllDamage':return ctx.actionDamage||0;case 'SkillDamage':return ctx.hit?.damage??ctx.actionDamage??0;case 'WhoSkillDamage':return ctx.hits?.filter(h=>h.id===a.id).reduce((n,h)=>n+h.damage,0)||0;case 'EventHPDiff':return ctx.hpEvent?.value??ctx.hpDiff??0;case 'SkillDamageHPRate':return (ctx.hits?.filter(h=>h.id===a.id).reduce((n,h)=>n+h.hpLoss,0)||0)/a.maxHP;
        case 'CriticalRate':return (a.criticalRate||0)+stat(a,'criticalRateBonus',ctx);case 'ResistanceRate':return (a.resistanceRate||0)+stat(a,'resistanceBonus',ctx);
        default:if(propMap[name])return stat(a,propMap[name],ctx);throw Error('未支持的属性：'+name);
      }
    }
    function conditions(o,ctx){return (!o.Condition||condition(o.Condition,ctx))&&(!o.Conditions||o.Conditions.every(c=>condition(c,ctx)));}
    function condition(o,ctx){let ok=true,a=who(o.Who,ctx);if(o.TargetInfo){const pool=choose({...o.TargetInfo,Target:o.TargetInfo.TargetType},ctx);return pool.some(t=>condition({...o,TargetInfo:undefined,Who:'Target'},{...ctx,target:t}));}
      if(o.CheckFun){const s=ctx.skill;switch(o.CheckFun){
        case 'IsMainRound':case 'MainActionType':ok=ctx.kind==='main'&&ctx.source===mainActor;break;
        case 'IsNormalSkill':ok=!!s&&(s.id===ctx.source?.skills[0]?.id||ctx.baseSkillIndex===0);break;
        case 'SkillID':ok=s?.id===o.CheckID;break;case 'FunID':ok=ctx.funId===o.CheckID;break;
        case 'IsDamageSkill':ok=(s?.attackRate||0)>0;break;case 'IsNoDamageSkill':ok=!(s?.attackRate>0);break;
        case 'TargetIsAll':ok=!!s?.all;break;case 'TargetIsOne':ok=!!s&&!s.all;break;
        case 'IsCriticalHit':ok=ctx.hit?.outcome==='critical'||ctx.hits?.some(h=>h.outcome==='critical');break;
        case 'IsPinch':ok=ctx.kind==='pinch';break;case 'IsSkillNoPinch':ok=!!stat(ctx.source,'noPinch',ctx)||!!s?.noPinch;break;
        case 'IsNoSelf':ok=a!==ctx.owner;break;case 'IsSameCamp':ok=a?.side===ctx.owner.side;break;case 'IsDiffCamp':ok=a?.side!==ctx.owner.side;break;
        case 'HaveBuff':ok=a?.statuses.some(s=>(s.id===o.CheckID||(D.statuses[s.id]?.Group===o.CheckID))&&s.duration>=0);break;
        case 'AnyAllyHaveBuff':ok=alive(ctx.owner.side).some(a=>a.statuses.some(s=>(o.CheckIDs||[o.CheckID]).includes(s.id)));break;
        case 'CheckSkillCooldown':ok=cooldown(ctx.owner,o.CheckID)<=0;break;
        case 'CheckSkillNoUse':ok=!ctx.owner.usedSkills[o.CheckID];break;
        case 'Position':ok=(o.Who?a:ctx.target)?.position===Number(o.CheckID);break;
        case 'RoleElement':ok=a?.element===o.CheckID;break;
        case 'AnyAllyHaveCoolDown':ok=alive(ctx.owner.side).some(a=>a.cooldowns.some(n=>n>0));break;
        default:throw Error('未支持的条件：'+o.CheckFun);
      }}else if(o.Property){const v=property(o.Property,a,ctx,o),wanted=Number(o.Value)||0;ok=o.Comparer==='Gt'?v>=wanted:o.Comparer==='Gtn'?v>wanted:o.Comparer==='Lt'?v<=wanted:o.Comparer==='Ltn'?v<wanted:Math.abs(v-wanted)<1e-9;}
      if(o.Invert)ok=!ok;return !!ok&&conditions(o,ctx);
    }
    function convert(v,ctx){if(v==null)return 0;if(typeof v==='number')return v;if(v.ValueConvert)return convert(v.ValueConvert,ctx);const base=Number(v.Base)||0;if(!conditions(v,ctx))return base;
      let n=property(v.Property||'ValueOne',who(v.Who,ctx),ctx,v);if(v.MaxValue!=null)n=Math.min(n,Number(v.MaxValue));if(v.MinValue!=null)n=Math.max(n,Number(v.MinValue));
      let rate=Number(v.Rate??v.theValue??1);if(v.ExtraRate)rate+=convert(v.ExtraRate,ctx);let result=base+(v.Property?rate*n:0)+(v.AddRandom?random()*Number(v.AddRandom):0);
      if(v.FinalMaxValue!=null)result=Math.min(result,Number(v.FinalMaxValue));if(v.FinalMinValue!=null)result=Math.max(result,Number(v.FinalMinValue));if(v.FinalMaxValueConvert)result=Math.sign(result)*Math.min(Math.abs(result),Math.abs(convert(v.FinalMaxValueConvert,ctx)));return result;
    }
    function choose(o,ctx){if(ctx.directTargets&&['RandomTwo','RandomOne'].includes(o.Target||o.TargetType)&&ctx.skill?.targetType===(o.Target||o.TargetType)&&!o.SelectInfo&&!o.NoSelf&&!o.TargetCamp)return ctx.directTargets;const owner=ctx.owner,camp=o.TargetCamp==='My'?owner.side:o.TargetCamp==='Enemy'?opposite(owner):ctx.status?owner.side:opposite(owner),type=o.Target||o.TargetType||'SkillSetting';let pool=(['AllWithDead','DeadOne'].includes(type)?actors.filter(a=>a.side===camp&&(!a.wave||a.wave===wave)):alive(camp));
      if(o.NoSelf)pool=pool.filter(a=>a!==owner);if(o.RemoveWillPassRound)pool=pool.filter(a=>!stat(a,'stun',ctx)&&!stat(a,'sleep',ctx));
      if(type==='Self')pool=[owner];else if(type==='AuraSource')pool=[ctx.auraSource||owner];else if(type==='SkillSource')pool=ctx.source?[ctx.source]:[];else if(type==='ParamTarget')pool=ctx.paramTarget?[ctx.paramTarget]:[];else if(type==='TriggerTarget')pool=ctx.triggerTarget?[ctx.triggerTarget]:[];
      else if(['SkillSelect','Selected','SelectTarget','Target'].includes(type))pool=ctx.selected?[ctx.selected]:[];
      else if(type==='SkillDirectTargets'||type==='SkillSetting')pool=ctx.directTargets||ctx.selected&&[ctx.selected]||[];
      else if(type==='BackRow')pool=pool.filter(a=>a.position>0);
      else if(type==='DeadOne')pool=pool.filter(a=>a.hp<=1e-8).slice(0,1);
      if(o.Condition||o.Conditions)pool=pool.filter(a=>conditions(o,{...ctx,target:a}));
      if(['LessHPRate','TwoLessHPRate'].includes(type))pool=pool.slice().sort((a,b)=>a.hp/a.maxHP-b.hp/b.maxHP).slice(0,type==='TwoLessHPRate'?2:1);
      if(['HightestAtkOne','HightestSkillCD','MostTime','MaxProperty'].includes(type)){const val=a=>type==='HightestAtkOne'?property('Attack',a,ctx):type==='HightestSkillCD'?Math.max(...a.cooldowns):type==='MostTime'?a.gauge:property(o.Property,a,ctx,o);const max=Math.max(...pool.map(val));pool=pool.filter(a=>Math.abs(val(a)-max)<1e-9).slice(0,1);}
      if(['HaveDeBuffAll','HaveDeBuffOne'].includes(type))pool=pool.filter(a=>count(a,true)>0);if(type==='HaveDeBuffOne')pool=pool.slice(0,1);if(type==='HaveCoolDown')pool=pool.filter(a=>a.cooldowns.some(n=>n>0));
      if(['RandomOne','RandomTwo'].includes(type)){pool=[...pool];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}pool=pool.slice(0,type==='RandomTwo'?2:1);}
      if(o.Filter){const allowed=new Set(choose({...o.Filter,TargetCamp:o.TargetCamp||'My'},{...ctx}));pool=pool.filter(a=>allowed.has(a));}
      return pool;
    }
    const opposite=a=>a.side==='ally'?'enemy':'ally';
    function cooldown(a,id){const i=a.skills.findIndex(s=>s.id===id);return i>=0?a.cooldowns[i]||0:a.reactionCooldowns[id]||0;}
    function setCD(a,id,value,reset=false){const i=a.skills.findIndex(s=>s.id===id),cd=reset?(i>=0?a.skills[i].cooldown:(a.traits?.skillCooldowns?.[id]??Number(D.skills[id]?.CoolDown))||0):value;
      if(i>=0)a.cooldowns[i]=Math.max(0,reset?cd:(a.cooldowns[i]||0)+cd);else a.reactionCooldowns[id]=Math.max(0,reset?cd:(a.reactionCooldowns[id]||0)+cd);}
    function entries(a,ctx={}){return [...(a.traits?.functions||[]).map(f=>({f,owner:a})),...a.statuses.flatMap(s=>fields(D.statuses[s.id]).map(f=>({f,owner:a,status:s,auraSource:map.get(s.sourceId)})))];}
    let statDepth=0;
    function stat(a,key,ctx={}){if(!a)return 0;let sum=Number(a[key])||0;if(statDepth>8)throw Error('属性依赖循环：'+a.name+' '+key);statDepth++;
      try{for(const other of actors){if(other.hp<=0&&other!==a)continue;for(const e of entries(other,ctx)){const f=e.f;if(f.Trigger!=='Property'||propMap[f.Property]!==key)continue;const aura=!!f.IsAura;if(other!==a&&(!aura||other.side!==a.side))continue;const c=context(other,{...ctx,...e,target:a});if(!conditions(f,c))continue;sum+=(f.ValueConvert?convert(f.ValueConvert,c):Number(f.Value)||0)*(e.status&&yes(D.statuses[e.status.id]?.IsMergeProperty)?e.status.stacks||1:1)*(e.status&&yes(D.statuses[e.status.id]?.IsValueMultiplyProp)?e.status.amount:1);}}
        // Backward compatible explicit effects used by manual configurations and tests.
        for(const s of a.statuses)if(s.field===key&&!D.statuses[s.id])sum+=s.value||0;return sum;
      }finally{statDepth--;}
    }
    function effectiveSpeed(a){return Math.max(1,a.speed*(1+stat(a,'speedBonus'))+stat(a,'speedValue'));}
    function eligible(owner,entry,trigger,ctx){const f=entry.f;if((f.Trigger||'AfterSkill')!==trigger)return false;if(owner.hp<=0&&!['SelfDead','PreSelfDead','AfterRevive'].includes(trigger)&&!yes(f.DeadCanRun))return false;return conditions(f,context(owner,{...ctx,...entry}));}
    function hooks(trigger,ctx,owners=[ctx.owner]){const snapshot=owners.flatMap(owner=>entries(owner,ctx).filter(e=>eligible(owner,e,trigger,ctx)).map(e=>({...e,ctx:context(owner,{...ctx,...e})}))).sort((a,b)=>(Number(a.f.ParamOrder)||0)-(Number(b.f.ParamOrder)||0));for(const e of snapshot){if(e.status&&!e.owner.statuses.includes(e.status)&&trigger!=='SelfDead')continue;if(conditions(e.f,e.ctx)){const ok=execute(e.f,e.ctx);if(ok&&trigger==='TargetAfterSkill'&&e.f.skillId&&!e.status)note(e.owner.name+' 受击被动：'+e.f.skillId);}}}
    const policy=config.effectPolicy||(config.assumeEffects?'success':'skip');
    function roll(rate){if(rate<=0)return false;if(rate>=1)return true;return policy==='success'?true:policy==='skip'?false:random()<rate;}
    function applyStatus(id,target,source,o,ctx){const def=D.statuses[id];if(!def)throw Error('源状态不存在：'+id);const isDebuff=!['Buff','None'].includes(def.IsBuffType),hostile=source.side!==target.side;
      if(hostile&&((target.traits?.immunities||[]).includes(id)||(target.traits?.immunities||[]).includes(def.Group))){note(`${target.name} 固有免疫 ${id}`);return false;}
      if(isDebuff&&stat(target,'immune',ctx)&&!yes(o.IgnoreImmune)){note(target.name+' 免疫 '+id);return false;}if(def.IsBuffType==='Buff'&&stat(target,'cannotBuff',ctx)){note(target.name+' 封强化，未附加 '+id);return false;}
      let duration=o.StatusRound==null?Number(def.RoundCount)||1:Number(o.StatusRound);if(duration<0)duration=Infinity;
      const amount=convert(o.StatusValue||o.ValueConvert||(yes(def.IsValueMultiplyProp)?Number(o.Value)||Number(def.Value)||0:0),{...ctx,target}),max=Math.max(1,Number(def.MaxStack)||1),same=target.statuses.find(s=>s.id===id);
      if(same&&String(def.CanMerge).toUpperCase()!=='FALSE'){
        same.stacks=Math.min(max,(same.stacks||1)+1);if(String(def.CanUpdateRound).toUpperCase()!=='FALSE')same.duration=Math.max(same.duration,duration);
        same.amount=Math.max(same.amount||0,amount);same.birthTurn=target.ownTurn;same.serial=++serial;note(`${target.name} ${id}（${same.stacks}层 / ${duration===Infinity?'永久':duration+'回合'}）`);
      }else{target.statuses.push({id,sourceId:source.id,stacks:1,duration,amount,isDebuff,buffType:def.IsBuffType||'Debuff',absolute:yes(o.AbsoluteRemoveBuff),camp:isDebuff?'Enemy':'My',birthTurn:target.ownTurn,serial:++serial});note(`${target.name} ${id}（${duration===Infinity?'永久':duration+'回合'}）`);}
      syncShield(target);return true;
    }
    // Client CalculateDirectHit: snapshot attack × 1.871 / (1 + current defence × 0.3 / 2000).
    function statusDamage(target,amount){return Math.abs(amount)*C.constants.attackPower/(1+Math.max(0,target.defence*(1+stat(target,'defenceBonus'))+stat(target,'defenceValue'))*.3/C.constants.defence);}
    function consumeShield(a,amount){a.manualShield=Math.max(0,(a.manualShield||0)-amount);for(const s of a.statuses.filter(s=>s.id==='Shield'))s.amount=Math.max(0,s.amount-amount);syncShield(a);}
    // BattleRoleData..cctor sets MaxInjuryRate to 0.5; injury applies to the uninjured HP ceiling.
    function addInjury(a,rate){a.injuryRate=clamp((a.injuryRate||0)+rate,0,.5);a.maxHP=(a.uninjuredMaxHP||a.maxHP)*(1-a.injuryRate);a.injury=(a.uninjuredMaxHP||a.maxHP)*a.injuryRate;a.hp=Math.min(a.hp,a.maxHP);note(a.name+' 生命上限侵蚀 '+(a.injuryRate*100).toFixed(2)+'%');}
    function syncShield(a){a.shield=Math.max(a.manualShield||0,...a.statuses.filter(s=>s.id==='Shield').map(s=>s.amount||0));}
    function removeStatuses(a,predicate,n=-1){let left=n<0?Infinity:n,removed=[];a.statuses=a.statuses.filter(s=>{if(left&&predicate(s)){left--;removed.push(s);return false;}return true;});syncShield(a);return removed;}
    function revive(target,amount,ctx,id){if(target.hp>0)return false;target.hp=clamp(amount,1,target.maxHP);target.statuses=target.statuses.filter(s=>yes(D.statuses[s.id]?.DeadResident));target.manualShield=0;syncShield(target);note(`${target.name} 复活，生命 ${target.hp.toFixed(2)}`);hooks('AfterRevive',{...ctx,owner:target,target,selected:target,paramTarget:target,funId:id},alive());return true;}
    function hpChange(target,diff,ctx,kind='effect',injury=false){
      if(!Number.isFinite(diff))throw Error('生命变化数值无效');if(diff>=0){if(target.hp<=0)return 0;let amount=stat(target,'unhealable',ctx)?0:diff;const healCtx={...ctx,target,hpDiff:amount,hpEvent:{value:amount}};hooks('BeforeEvent',healCtx,[target]);amount=healCtx.hpEvent.value;
        const restored=Math.max(0,Math.min(target.maxHP-target.hp,amount));target.hp+=restored;event&&(event.healing+=restored);ctx.owner.healing+=restored;note(`${target.name} 恢复 ${restored.toFixed(2)}`);return restored;}
      if(target.hp<=0)return 0;const damageHit=['dot','blast','direct','split'].includes(kind);let rawDamage=damageHit&&stat(target,'invincible',ctx)?0:-diff;if(damageHit&&stat(target,'noDamage',ctx)){rawDamage=0;removeStatuses(target,s=>s.id==='SkillNullifier',1);note(target.name+' 技能无效化');}let loss=rawDamage,before=target.hp;
      let shieldLoss=['dot','blast','direct','split'].includes(kind)?Math.min(target.shield,loss):0;loss-=shieldLoss;consumeShield(target,shieldLoss);if(loss>=before&&!stat(target,'immortal',ctx)){const deadCtx={...ctx,target,owner:target,hpDiff:-loss};hooks('PreSelfDead',deadCtx,[target]);}
      if(stat(target,'immortal',ctx)||target.preventDeathStep===event?.step)loss=Math.min(loss,Math.max(0,before-1));loss=Math.min(loss,before);target.hp-=loss;
      if(injury&&loss>0)addInjury(target,loss/(target.uninjuredMaxHP||target.maxHP));
      const hit={id:target.id,name:target.name,sourceId:ctx.owner.id,skillId:ctx.skill?.id,kind,outcome:kind,damage:rawDamage,hpLoss:loss,hpBefore:before,hpAfter:target.hp,shieldAfter:target.shield};event?.targets.push(hit);if(event){event.damage+=rawDamage;event.hpLoss+=loss;}ctx.owner.damage+=rawDamage;ctx.owner.hpLoss+=loss;
      if(target.hp<=0)death(target,ctx);return loss;
    }
    function death(target,ctx){if(target.dying)return;target.dying=true;const deathCtx={...ctx,target,selected:target,triggerTarget:target,triggerSource:target};hooks('SelfDead',{...deathCtx,owner:target},[target]);if(target.hp<=0){note(target.name+' 倒下');hooks('OtherDead',deathCtx,actors.filter(a=>a!==target&&(!a.wave||a.wave===wave)));}
      if(target.hp<=0){target.statuses=target.statuses.filter(s=>yes(D.statuses[s.id]?.DeadResident));target.manualShield=0;syncShield(target);for(const a of alive())removeStatuses(a,s=>s.sourceId===target.id&&fields(D.statuses[s.id]).some(f=>f.Property==='IsSourceDeadRemove'));}target.dying=false;
    }
    function enqueue(source,skillId,selected,ctx,kind){if(!source||source.hp<=0||stat(source,'stun',ctx)||stat(source,'sleep',ctx))return false;if(kind==='counter'&&(ctx.kind==='counter'||stat(source,'noCounter',ctx)))return false;if(kind==='pinch'&&(ctx.kind==='pinch'||stat(source,'noPinch',ctx)))return false;
      const skill=skillId?lookup(skillId):source.skills[0];queue.push({source,skill,selected,kind,baseSkillIndex:0,root:ctx.root||ctx});note(`${source.name} ${kind==='counter'?'反击':kind==='pinch'?'夹击':'追加攻击'}：${skill.id}`);return true;}
    function execute(o,ctx){const owner=ctx.owner,key=(o.skillId||ctx.skill?.id||ctx.status?.id||'')+':'+(o.ID||o.key||o.Fun||''),cd=Number(o.CD)||0;
      if(cd>0&&(owner.functionCooldowns[key]||0)>0)return false;if(o.PreCond&&!condition(o.PreCond,ctx))return false;
      const rate=o.RateConvert?convert(o.RateConvert,ctx):Number(o.Rate??1)+(o.AddRate?convert(o.AddRate,ctx):0);
      if(!o.Fun)return true;
      if(!funs.has(o.Fun))throw Error('未支持的技能函数：'+o.Fun);
      if(o.Fun==='AdditionSkill'||o.Fun==='CounterSkill'){if(!roll(rate)||!conditions(o,ctx))return false;const target=o.Fun==='CounterSkill'?ctx.source:o.Target&&o.Target!=='SkillSelect'?choose(o,ctx)[0]:ctx.selected;const ok=enqueue(owner,o.Fun==='CounterSkill'?undefined:o.FID||ctx.skill?.id,target,ctx,o.Fun==='CounterSkill'?'counter':'addition');if(ok&&cd>0)owner.functionCooldowns[key]=cd;if(ok)follow(o,ctx,true);return ok;}
      if(o.Fun==='ReplaceSkill'||o.Fun==='ForceConquer'||o.Fun==='SplitDamage')return false;
      const selection=(o.SelectInfo?choose(o.SelectInfo,ctx):choose(o,ctx)).filter(target=>conditions(o,{...ctx,target}));let success=false,attempt=false;
      // Global prerequisites remain true for the whole multi-target operation; child cooldown changes must not suppress later targets.
      const prelim=o.Conditions?.filter(c=>!c.Who&&!c.TargetInfo&&['CheckSkillCooldown','IsMainRound','IsNormalSkill','SkillID'].includes(c.CheckFun));if(prelim?.some(c=>!condition(c,ctx)))return false;
      for(const target of selection){const c={...ctx,target};if(!roll(rate))continue;
        if(target.hp<=0&&!['Revive','DirectRevive','No','ImmortalAddHP'].includes(o.Fun)&&o.Target!=='AllWithDead')continue;attempt=true;
        const hostile=target.side!==owner.side&&['AddStatus','RandomAddStatus','RemoveBuf','AddTime','AddAllDeBuffRound','AddAllBuffRound','TransferBuff','TransferDeBuff','AddAllSkillCoolDown'].includes(o.Fun),ignores=Number(o.IgnoreResist)>0;
        if(hostile&&!yes(o.IgnoreDodge)&&ctx.hits?.some(h=>h.id===target.id&&h.outcome==='miss')){note(target.name+' 闪避，未施加 '+(o.FID||o.Fun));continue;}
        if(hostile&&policy==='skip'&&!ignores){warn('当前选择不计入敌方效果：'+o.Fun);continue;}
        if(hostile&&policy==='sampled'&&!ignores&&random()>=Math.min(stat(owner,'ignoreBuiltinResist',c)?1:.9,Math.max(0,1+(owner.effectHitRate||0)+stat(owner,'effectHitBonus',c)-(target.resistanceRate||0)-stat(target,'resistanceBonus',c)))){note(`${target.name} 抵抗 ${o.FID||o.Fun}`);continue;}
        const value=o.ValueConvert?convert(o.ValueConvert,c):Number(o.Value)||0;let done=false;
        switch(o.Fun){
          case 'No':done=true;break;
          case 'AddStatus':for(let n=0;n<Math.max(1,Number(o.Count)||1);n++)done=applyStatus(o.FID,target,owner,o,c)||done;break;
          case 'RandomAddStatus':{const ids=Array.isArray(o.FIDs)?o.FIDs:String(o.FIDs||'').split('~');if(ids.length)done=applyStatus(ids[Math.floor(random()*ids.length)],target,owner,o,c);break;}
          case 'AddHP':case 'AddHPWithInjury':hpChange(target,value,ctx.status&&value<0?{...c,owner:map.get(ctx.status.sourceId)||owner}:c,o.Fun==='AddHPWithInjury'?'injury':'effect',o.Fun==='AddHPWithInjury');done=true;break;
          case 'AddTime':{if(value>0&&stat(target,'antiAddTime',c)){note(target.name+' 受禁锢，行动条提升无效');break;}const v=value*(1+stat(target,'addTimeRate',c));target.gauge=Math.max(0,target.gauge+v);note(`${target.name} 行动条 ${v>=0?'+':''}${(v*100).toFixed(0)}%`);done=true;break;}
          case 'RemoveBuf':case 'RemoveDeBuf':case 'RemoveBufsByID':{const removed=removeStatuses(target,s=>o.Fun==='RemoveBufsByID'?s.id===o.FID&&(yes(o.AbsoluteRemoveBuff)||removable(s)):removable(s)&&(o.Fun==='RemoveDeBuf'?s.isDebuff:s.buffType==='Buff'),o.Value==null?-1:value);ctx.lastRemoved??=new Map();ctx.lastRemoved.set(target.id,removed.filter(s=>s.isDebuff).length);done=removed.length>0;note(`${target.name} 解除 ${removed.map(s=>s.id).join('、')||'0个状态'}`);break;}
          case 'AddAllBuffRound':case 'AddAllDeBuffRound':for(const s of target.statuses)if(removable(s)&&(o.Fun==='AddAllDeBuffRound'?s.isDebuff:s.buffType==='Buff'))s.duration+=value;removeStatuses(target,s=>s.duration<=0);note(`${target.name} ${o.Fun==='AddAllDeBuffRound'?'弱化':'强化'}持续回合 ${value>=0?'+':''}${value}`);done=true;break;
          case 'ReSetSkillCoolDown':setCD(target,o.FID,0,true);note(`${target.name} 被动CD ${o.FID} = ${cooldown(target,o.FID)}`);done=true;break;
          case 'AddSkillCoolDown':setCD(target,o.FID,value);note(`${target.name} 技能CD ${o.FID} ${value}`);done=true;break;
          case 'AddAllSkillCoolDown':target.cooldowns=target.cooldowns.map(n=>Math.max(0,n+value));for(const id of Object.keys(target.reactionCooldowns))target.reactionCooldowns[id]=Math.max(0,target.reactionCooldowns[id]+value);done=true;note(target.name+' 全技能CD '+value);break;
          case 'AddRound':if(!extraRounds.includes(target))extraRounds.push(target);note(target.name+' 获得追加回合');done=true;break;
          case 'ImmortalAddHP':target.preventDeathStep=event?.step;done=true;note(target.name+' 触发致命伤害保护，保留1生命');break;
          case 'Revive':case 'DirectRevive':done=revive(target,value||target.maxHP*.3,c,o.FID||o.ID);break;
          case 'AddPinchSkill':if(target!==ctx.source)done=enqueue(target,null,ctx.selected,c,'pinch');break;
          case 'TransferDeBuff':case 'TransferBuff':case 'TransferBuffFrom':{let from=o.Fun==='TransferDeBuff'?owner:o.Fun==='TransferBuff'?target:choose(o.FromSelect||{Target:'SkillDirectTargets'},c)[0],to=o.Fun==='TransferDeBuff'?target:o.Fun==='TransferBuff'?owner:target;if(!from||!to)break;const selected=from.statuses.filter(s=>removable(s)&&(o.Fun==='TransferDeBuff'?s.isDebuff:s.buffType==='Buff')).slice(0,value<0?undefined:value||1);for(const s of selected){const copied={...s,serial:++serial,birthTurn:to.ownTurn};to.statuses.push(copied);}if(o.IsTransferBuffRemove!==false)removeStatuses(from,s=>selected.includes(s));syncShield(to);done=selected.length>0;note(`${from.name} → ${to.name} 转移 ${selected.length} 个状态`);break;}
          case 'DirectHPValueHit':hpChange(target,-Math.abs(value),ctx.status&&ctx.status.isDebuff?{...c,owner:map.get(ctx.status.sourceId)||owner}:c,'direct');done=true;break;
          case 'BuffAttack':hpChange(target,-statusDamage(target,ctx.status?.amount||0),{...c,owner:map.get(ctx.status?.sourceId)||owner},'dot');done=true;break;
          case 'BlastBuff':{const list=target.statuses.filter(s=>s.id===o.FID);hpChange(target,-statusDamage(target,value),{...c,owner:map.get(list[0]?.sourceId)||owner},'blast');removeStatuses(target,s=>list.includes(s));done=!!list.length;break;}
          case 'AddEventHPDiff':if(ctx.hpEvent)ctx.hpEvent.value+=value;else ctx.hpDiff=(ctx.hpDiff||0)+value;done=true;break;
          case 'AddInjuryRate':addInjury(target,value);done=true;break;
        }
        success=success||done;if(done)for(const f of [...(o.SubFuns||[]),...(o.SubFun?[o.SubFun]:[])])execute({...f,skillId:o.skillId},{...c,lastRemoved:ctx.lastRemoved});
      }
      if((success||attempt)&&cd>0)owner.functionCooldowns[key]=cd;
      follow(o,ctx,false);return success;
    }
    function follow(o,ctx,sub){if(sub)for(const f of [...(o.SubFuns||[]),...(o.SubFun?[o.SubFun]:[])])execute({...f,skillId:o.skillId},ctx);for(const f of [...(o.ContinueFuns||[]),...(o.ContinueFun?[o.ContinueFun]:[])])execute({...f,skillId:o.skillId},ctx);}
    function legacy(skill,phase,ctx){for(const e of skill.effects||[]){if(e.phase!==phase||!roll(e.chance??1))continue;const o={Target:e.target,TargetCamp:e.camp,StatusRound:e.duration,FID:e.id};
      if(e.kind==='status'&&D.statuses[e.id])execute({...o,Fun:'AddStatus'},ctx);
      else if(e.kind==='status')for(const t of choose(o,ctx))t.statuses.push({...e,duration:e.duration,birthTurn:t.ownTurn,isDebuff:e.camp==='Enemy',serial:++serial});
      else if(e.kind==='gauge')execute({...o,Fun:'AddTime',Value:e.value},ctx);
      else if(e.kind==='shield'||e.kind==='heal')execute({...o,Fun:e.kind==='shield'?'AddStatus':'AddHP',FID:e.kind==='shield'?'Shield':undefined,ValueConvert:{Who:e.who,Property:e.scale,Rate:e.value}},ctx);
    }}
    function validTargets(source,skill){let pool=alive(skill.friendly?source.side:opposite(source));if(skill.friendly&&['DeadOne','AllWithDead'].includes(skill.targetType))pool=actors.filter(a=>a.side===source.side&&(!a.wave||a.wave===wave)&&(skill.targetType!=='DeadOne'||a.hp<=0));if(skill.noSelf)pool=pool.filter(a=>a!==source);if(!skill.friendly&&!skill.all){const visible=pool.filter(a=>!stat(a,'stealth'));if(visible.length)pool=visible;}return pool;}
    function damageModifiers(source,target,skill,ctx){let groups={},penetration=stat(source,'penetration',ctx),critical=0,forceConquer=false;
      const own=[...(skill.functions||[]).map(f=>({f,owner:source})),...entries(source,ctx)];
      for(const e of own){const f=e.f,c=context(e.owner,{...ctx,...e,target});if(!conditions(f,c))continue;if(f.ConditionAttack){const v=convert(f.ConditionAttack,c),group=f.ConditionAttack.Group||'';groups[group]=(groups[group]||0)+v;}
        if(f.PenetrateRate)penetration+=convert(f.PenetrateRate,c);if(f.Trigger==='SkillProperty'&&f.Property==='CriticalRate')critical+=f.ValueConvert?convert(f.ValueConvert,c):Number(f.Value)||0;if(f.Fun==='ForceConquer'||f.Property==='ForceConquer'||f.Trigger==='ForceConquer')forceConquer=true;}
      if(!skill.functions){const m=C.skillModifiers(skill.model||{conditions:[],penetrations:[]},{sourceHP:source.hp/source.maxHP*100,targetHP:target.hp/target.maxHP*100,debuffs:count(target,true)});groups.legacy=m.condition-1;penetration+=m.penetration;}
      let reduction=stat(target,'reduction',ctx),split=null,aura=[];
      for(const owner of alive(target.side))for(const e of entries(owner,ctx)){const f=e.f;if(f.Trigger!=='BeforeEvent'||(!f.IsAura&&owner!==target))continue;const c=context(owner,{...ctx,...e,target,selected:ctx.selected});if(!conditions(f,c))continue;
        if(f.HurtReduction){const n=convert(f.HurtReduction,c);if(f.IsAura)aura.push(n);else reduction+=n;}
        if(f.Fun==='SplitDamage'&&owner!==target){const rate=Number(f.Value)||0;if(!split||rate>split.rate)split={actor:owner,rate};}}
      reduction+=Math.max(0,...aura);return {condition:Object.values(groups).reduce((n,v)=>n*(1+v),1),penetration,critical,forceConquer,reduction,split};
    }
    function attack(source,target,skill,ctx){const m=damageModifiers(source,target,skill,ctx),forceElement=m.forceConquer?Object.keys({Ice:'Fire',Fire:'Earth',Earth:'Ground',Ground:'Ice',Light:'Dark',Dark:'Light'}).find(k=>C.relation(k,target.element)==='advantage'):undefined;
      const r=C.calculate({attack:source.attack+stat(source,'attackValue',ctx),attackRate:skill.attackRate,power:skill.power,condition:Math.max(0,m.condition),defence:target.defence+stat(target,'defenceValue',ctx),attackBonus:Math.max(-1,stat(source,'attackBonus',ctx)),defenceBonus:Math.max(-1,stat(target,'defenceBonus',ctx)),penetration:Math.max(0,m.penetration),antiPenetration:stat(target,'antiPenetration',ctx),damageBonus:stat(source,'damageBonus',ctx),reduction:clamp(m.reduction,0,1),vulnerability:stat(target,'vulnerability',ctx)+Math.max(0,-m.reduction),criticalRate:source.criticalRate+stat(source,'criticalRateBonus',ctx)+m.critical,criticalDamage:Math.max(0,source.criticalDamage+stat(source,'criticalDamageBonus',ctx)),criticalResistance:stat(target,'criticalResistance',ctx),dodgeRate:stat(target,'dodgeRate',ctx),hitRate:stat(source,'hitBonus',ctx),sourceElement:forceElement||source.element,targetElement:target.element,shield:target.shield,targetMaxHP:target.maxHP,targetHP:target.hp/target.maxHP*100,invincible:!!stat(target,'invincible',ctx)});
      let outcome=event.outcome||'normal';if(outcome==='sampled'){let v=random();outcome='normal';for(const k of ['miss','critical','strong','normal']){v-=r.probability[k];if(v<0){outcome=k;break;}}}if(outcome!=='expected'&&!(outcome in r.damage))throw Error('未知命中模式');
      let amount=outcome==='expected'?r.expected:r.damage[outcome];if(stat(target,'noDamage',ctx)){amount=0;removeStatuses(target,s=>s.id==='SkillNullifier',1);note(target.name+' 技能无效化');}
      if(m.split&&amount>0){const share=amount*m.split.rate;amount-=share;hpChange(m.split.actor,-share,{...ctx,owner:source},'split');note(`${m.split.actor.name} 分担 ${(m.split.rate*100).toFixed(0)}% 伤害`);}
      const before=target.hp;let shieldLoss=Math.min(target.shield,amount),loss=Math.max(0,amount-shieldLoss);
      if(loss>=before&&!stat(target,'immortal',ctx))hooks('PreSelfDead',{...ctx,owner:target,target,hpDiff:-loss},[target]);if(stat(target,'immortal',ctx)||target.preventDeathStep===event.step)loss=Math.min(loss,Math.max(0,before-1));loss=Math.min(before,loss);target.hp-=loss;
      consumeShield(target,shieldLoss);
      const hit={id:target.id,name:target.name,sourceId:source.id,skillId:skill.id,kind:ctx.kind,outcome,damage:amount,hpLoss:loss,hpBefore:before,hpAfter:target.hp,shieldAfter:target.shield};event.targets.push(hit);event.damage+=amount;event.hpLoss+=loss;source.damage+=amount;source.hpLoss+=loss;
      if(amount>0)removeStatuses(target,s=>s.id==='Sleep');if(target.hp<=0)death(target,{...ctx,hit});hooks('AfterEvent',{...ctx,hit,target,hpDiff:-loss},[target]);
      hooks('AnyOneAfterSkillHit',{...ctx,hit,triggerTarget:target,triggerSource:source},alive());return hit;
    }
    function executeAction(action){const {source,kind}=action;if(source.hp<=0)return;let skill=action.skill,selected=action.selected;const root=action.root||action,ctx=context(source,{source,selected,target:selected,triggerSource:source,triggerTarget:selected,skill,kind,root,baseSkillIndex:action.baseSkillIndex,lastRemoved:new Map(),oldBuffCount:new Map(actors.map(a=>[a.id,count(a,false)]))});
      for(const e of [...(skill.functions||[]).map(f=>({f,owner:source})),...entries(source,ctx)])if(e.f.Fun==='ReplaceSkill'&&conditions(e.f,ctx)){skill=lookup(e.f.FID);ctx.skill=skill;note(`${source.name} 战技替换为 ${skill.id}`);break;}
      const pool=validTargets(source,skill);if(!pool.includes(selected)&&selected?.hp<=0)selected=pool[0];if(!selected)selected=pool[0];if(!selected)return;ctx.selected=ctx.target=ctx.triggerTarget=selected;
      let type=skill.targetType;if(skill.raw?.TargetTypeFun){const info=B.parse(skill.raw.TargetTypeFun);if(conditions(info,ctx))type=info.TargetType;}
      let direct=skill.all?pool:type==='DeadOne'?pool.slice(0,1):type==='Self'?[source]:['RandomTwo','RandomOne'].includes(type)?choose({Target:type,TargetCamp:skill.friendly?'My':'Enemy'},ctx):[selected];ctx.directTargets=direct;ctx.skill={...skill,targetType:type};
      const actionRecord={actorId:source.id,kind,skillId:skill.id,targetIds:direct.map(t=>t.id),damage:0};event.actions.push(actionRecord);
      for(const f of skill.functions||[])if((f.Trigger||'AfterSkill')==='BeforeSkill'&&conditions(f,ctx))execute(f,ctx);hooks('BeforeSkill',ctx,[source]);legacy(skill,'BeforeSkill',ctx);
      const hits=[];if(!skill.friendly&&skill.attackRate>0)for(const t of direct)if(t.hp>0)hits.push(attack(source,t,skill,{...ctx,target:t}));ctx.hits=hits;ctx.actionDamage=hits.reduce((n,h)=>n+h.damage,0);actionRecord.damage=ctx.actionDamage;
      for(const f of skill.functions||[])if((f.Trigger||'AfterSkill')==='AfterSkill'&&conditions(f,ctx))execute(f,ctx);hooks('AfterSkill',ctx,[source]);for(const ally of alive(source.side).filter(a=>a!==source))for(const e of entries(ally,ctx))if(e.f.IsAura&&(e.f.Trigger||'AfterSkill')==='AfterSkill'){const auraCtx={...ctx,owner:source,auraSource:ally,status:e.status};if(conditions(e.f,auraCtx))execute(e.f,auraCtx);}legacy(skill,'AfterSkill',ctx);
      if(hits.length){removeStatuses(source,s=>(D.statuses[s.id]?.Group||s.id)==='Stealth');
        for(const hit of hits){const target=map.get(hit.id);hooks('TargetAfterSkill',{...ctx,owner:target,target,hit,triggerSource:source,triggerTarget:target},[target]);if(kind!=='counter'&&target.hp>0&&roll(stat(target,'counterRate',ctx)))enqueue(target,null,source,ctx,'counter');}
      }
      hooks('AnyEnemyAfterSkill',ctx,alive(opposite(source)));hooks('AnyAllyAfterSkill',ctx,alive(source.side));
      if(kind==='main'&&skill.attackRate>0&&!stat(source,'noPinch',ctx)&&roll(stat(source,'pinchRate',ctx))){const pool=alive(source.side).filter(a=>a!==source&&!stat(a,'noPinch',ctx));if(pool.length)enqueue(pool[Math.floor(random()*pool.length)],null,selected,ctx,'pinch');}
      source.usedSkills[skill.id]=(source.usedSkills[skill.id]||0)+1;
    }
    function drain(){let n=0;while(queue.length){if(++n>128)throw Error('连续触发超过128次，请检查效果循环');executeAction(queue.shift());}}
    function initHP(list){for(const a of list){const bonus=stat(a,'hpBonus');a.maxHP=Math.round((a.baseMaxHP*(1+bonus)+stat(a,'hpValue'))*1e9)/1e9;a.uninjuredMaxHP=a.maxHP;a.hp=Math.min(a.maxHP,a.hp*(a.maxHP/a.baseMaxHP));}}
    for(const a of [...actors,...future.flat()])for(const w of a.traits?.warnings||[])warnings.add(w);
    initHP(actors);
    const opening={step:0,effects:[],warnings:[],targets:[],actions:[],damage:0,hpLoss:0,healing:0};event=opening;for(const a of actors)hooks('StartBattle',context(a),[a]);drain();const startEffects=[...opening.effects];for(const a of actors)a.startingStats={maxHP:a.maxHP,attack:property('Attack',a,context(a)),defence:a.defence*(1+stat(a,'defenceBonus'))+stat(a,'defenceValue'),speed:effectiveSpeed(a)};
    const snapshot=()=>actors.map(a=>({id:a.id,name:a.name,side:a.side,wave:a.wave,hp:a.hp,maxHP:a.maxHP,shield:a.shield,damage:a.damage,hpLoss:a.hpLoss,healing:a.healing}));
    const initialState=snapshot();
    for(let step=1;step<=config.steps&&alive('ally').length&&alive('enemy').length;step++){
      const living=alive();let actor;while(extraRounds.length&&!actor){const x=extraRounds.shift();if(x.hp>0)actor=x;}const extra=!!actor;
      const wait=a=>a.gauge>1?1-a.gauge:(1-a.gauge)/(effectiveSpeed(a)/1000);if(!actor){actor=living[0];for(const a of living.slice(1))if(wait(a)<wait(actor)-1e-10)actor=a;const dt=Math.max(0,wait(actor));time+=dt;for(const a of living)a.gauge+=effectiveSpeed(a)/1000*dt;actor.gauge=0;}
      mainActor=actor;actor.ownTurn++;const active=new Map(actor.statuses.map(s=>[s,s.serial]));const roundCtx=context(actor,{kind:'main',source:actor});
      event={step,time,wave,availableTargetIds:living.map(a=>a.id),actorId:actor.id,actorName:actor.name,side:actor.side,ownTurn:actor.ownTurn,skillIndex:-1,skillName:'等待',cooldowns:[...actor.cooldowns],valid:true,reason:'',damage:0,hpLoss:0,healing:0,targets:[],actions:[],effects:step===1?[...startEffects]:[],warnings:[],targetId:'auto',outcome:config.mode||'expected',extraRound:extra};
      hooks('AnyOneBeforeRound',roundCtx,living);
      for(const s of [...actor.statuses]){const def=D.statuses[s.id];if(yes(def?.IsReduceBeforeRound)){s.duration--;const c={...roundCtx,status:s,selected:actor,target:actor,auraSource:map.get(s.sourceId)};for(const f of fields(def))if(f.Trigger==='BuffRound'&&conditions(f,c))execute(f,c);}}
      hooks('BeforeRound',roundCtx,[actor]);
      const order=config.plan?.[actor.id]?.[actor.ownTurn]||{},fallback=actor.defaultSkill??(actor.side==='enemy'?-1:0),ai=config.skillPolicy==='gameAI'&&fallback!==-1&&order.skill!==-1?B.select({actor,actors:alive(),stat,random,skillIndex:order.skill}):null;
      const autoUlt=['readyUlt','gameAI'].includes(config.skillPolicy)&&fallback!==-1&&actor.skills[1]&&actor.cooldowns[1]===0&&!stat(actor,'silence');let selection=order.skill??ai?.index??(autoUlt?1:fallback),skill=actor.skills[selection];
      const taunt=actor.statuses.find(s=>(D.statuses[s.id]?.Group||s.id)==='Taunt'&&map.get(s.sourceId)?.hp>0);if(taunt){selection=0;skill=actor.skills[0];event.effects.push(actor.name+' 受嘲讽，使用战技攻击施加者');}
      Object.assign(event,{skillIndex:selection,skillName:selection===-1?'等待':skill?.name||'未知技能',targetId:order.target||'auto',outcome:order.outcome||config.mode||'expected'});if(ai)note(ai.reason);
      if(actor.hp<=0){event.valid=false;event.reason='持续伤害致死：无法行动';}else if(stat(actor,'stun')||stat(actor,'sleep')){event.valid=false;event.reason=stat(actor,'sleep')?'睡眠：无法行动':'眩晕：无法行动';}
      else if(selection!==-1&&!skill){event.valid=false;event.reason='技能不存在';}else if(selection!==-1&&actor.cooldowns[selection]>0){event.valid=false;event.reason=`CD剩余 ${actor.cooldowns[selection]} 个自身回合，本次指令未执行`;}else if(selection===1&&stat(actor,'silence')){event.valid=false;event.reason='沉默：不能使用终结技';}
      let selected;if(skill){const pool=validTargets(actor,skill);selected=taunt?map.get(taunt.sourceId):order.target&&order.target!=='auto'?map.get(order.target):ai?.target||pool[0];if(!selected||!pool.includes(selected)){event.valid=false;event.reason=selected&&stat(selected,'stealth')?'目标处于潜影且有其他可见成员，本次指令未执行':'目标不存在、阵营不符或已倒下，本次指令未执行';}else event.selectedTargetId=selected.id;}
      if(event.valid&&selection!==-1){actor.cooldowns[selection]=skill.cooldown;queue.push({source:actor,skill,selected,kind:'main',baseSkillIndex:selection});drain();}
      const afterCtx=context(actor,{kind:'main',source:actor,skill,selected,target:selected,triggerSource:actor});hooks('AfterRound',afterCtx,[actor]);hooks('AnyOneAfterRound',afterCtx,alive());hooks('AnyEnemyAfterRound',afterCtx,alive(opposite(actor)));hooks('AnyAllyAfterRound',afterCtx,alive(actor.side));drain();
      for(const s of [...actor.statuses]){const def=D.statuses[s.id];if(!yes(def?.IsReduceBeforeRound)&&active.get(s)===s.serial){const c={...afterCtx,status:s,target:actor,selected:actor};for(const f of fields(def))if(f.Trigger==='BuffRound'&&conditions(f,c))execute(f,c);s.duration--;}}
      actor.cooldowns=actor.cooldowns.map(n=>Math.max(0,n-1));for(const bag of [actor.reactionCooldowns,actor.functionCooldowns])for(const id of Object.keys(bag))bag[id]=Math.max(0,bag[id]-1);
      removeStatuses(actor,s=>s.duration<=0);event.cooldownsAfter=[...actor.cooldowns];event.hp=actor.hp;event.gaugeAfter=actors.map(a=>({id:a.id,gauge:a.gauge}));event.allyDamage=event.targets.filter(t=>map.get(t.sourceId)?.side==='ally').reduce((n,t)=>n+t.damage,0);event.enemyDamage=event.targets.filter(t=>map.get(t.sourceId)?.side==='enemy').reduce((n,t)=>n+t.damage,0);events.push(event);
      if(alive('ally').length&&!alive('enemy').length&&wave<waveCount){const allies=actors.filter(a=>a.side==='ally');for(const a of allies){for(const s of a.statuses)s.duration--;removeStatuses(a,s=>s.duration<=0);}const next=future[wave-1];wave++;const added=next.map((a,i)=>init(a,i,false));initHP(added);for(const a of [...allies,...added])a.gauge=config.openingGauge==='game'?random()*B.initialGaugeMax:(config.actors.find(x=>x.id===a.id)||next.find(x=>x.id===a.id)).gauge;
        for(const a of added)hooks('StartBattle',context(a),[a]);drain();transitions.push({wave,afterStep:step,time,gauges:[...allies,...added].map(a=>({id:a.id,gauge:a.gauge})),allies:allies.map(a=>({id:a.id,hp:a.hp,ownTurn:a.ownTurn,cooldowns:[...a.cooldowns],statuses:a.statuses.map(s=>({...s}))}))});}
      event.state=snapshot();
    }
    const total=side=>actors.filter(a=>a.side===side).reduce((n,a)=>n+a.damage,0),cleared=wave===waveCount&&!alive('enemy').length;
    return {events,actors,time,initialState,initialGauges,transitions,waveIndex:wave,waveCount,clearedWaves:cleared?waveCount:wave-1,totalDamage:total('ally'),enemyDamage:total('enemy'),totalHPLoss:actors.filter(a=>a.side==='ally').reduce((n,a)=>n+a.hpLoss,0),invalid:events.filter(e=>!e.valid).length,warnings:[...warnings],ended:!alive('ally').length||cleared,winner:cleared?'ally':!alive('ally').length?'enemy':null};
  }
  return {compile,traits,simulate,audit,fields};
});
