'use strict';
window.AtlasCalculator = (() => {
  let api;
  function mount(host, data, userStore) {
    if(api)return api;
    const C=window.KamikoiCombat, fields={}, cards=data.cards.filter(c=>c.named&&c.stats.length);
    const byId=new Map(cards.map(c=>[c.id,c]));
    const Users=window.AtlasUserData,personal=()=>userStore?.get()||Users.empty();let userDirty=false;
    let source, skill, model, targetManual=true;
    const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const fmt=v=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
    const pct=v=>fmt(v*100)+'%';
    function section(title,kicker){const s=n('section','calc-panel');if(kicker)s.append(n('p','eyebrow',kicker));s.append(n('h3','',title));return s;}
    function field(parent,key,label,value,options={}) {
      const wrap=n('label','calc-field');wrap.htmlFor='calc-'+key;
      wrap.append(n('span','',label));let control;
      if(options.choices){control=n('select');for(const [v,text]of options.choices){const o=n('option','',text);o.value=v;control.append(o);}}
      else {control=n('input');control.type='number';control.min=options.min??0;control.max=options.max??100000000;control.step=options.step??'any';control.inputMode='decimal';}
      control.id='calc-'+key;control.value=value;control.required=true;fields[key]=control;
      if(options.hint)wrap.append(n('small','',options.hint));wrap.append(control);parent.append(wrap);return control;
    }
    function check(parent,key,label){const wrap=n('label','calc-check'),input=n('input');input.type='checkbox';input.id='calc-'+key;fields[key]=input;wrap.append(input,n('span','',label));parent.append(wrap);return input;}
    const opts=cards.map(c=>[c.id,`${c.name} · ${c.peopleNames.join('/')} · ${c.rarity}`]);
    const elementOpts=[['','中立 / 未指定'],['Ice','蓝澈'],['Fire','红璇'],['Earth','绿琉'],['Ground','黄曜']];
    const intro=n('div','calc-intro');intro.append(n('div','',undefined));
    intro.firstChild.append(n('p','eyebrow','BATTLE LAB / 伤害研究'),n('h2','','每一次出手，都有依据'),n('p','','带入羁绊与技能，比较属性、升星和战斗状态对伤害的影响。'));
    intro.append(n('span','calc-proof','客户端公式已核对 · 单目标主段估算'));host.append(intro);
    const userBar=n('div','user-defaults'),userNote=n('p'),useMine=n('button','team-button','带入我的练度'),userLink=n('a','','管理我的数据 ↗');useMine.type='button';userLink.href='#userdata';userBar.append(userNote,useMine,userLink);host.append(userBar);
    function updateUserNote(){userNote.textContent=personal().roster.some(r=>r.cardId===fields.source?.value)?(userDirty?'临时方案，未改写个人档案。':'已带入个人练度。'):'选择羁绊后，自动带入已保存练度。';}
    function fillPersonal(){const d=Users.combatDefaults(personal(),fields.source.value);fields.level.value=d.level;fields.stars.value=d.stars;fields.rewards.value=d.rewards;}
    const form=n('form','calc-form');form.noValidate=true;form.addEventListener('submit',e=>e.preventDefault());
    const setup=n('div','calc-setup');form.append(setup);
    const left=section('我方与技能','01 / ATTACKER'),right=section('敌方与战况','02 / TARGET');setup.append(left,right);
    field(left,'source','进攻羁绊','C04_SSR_002',{choices:opts});
    const profileGrid=n('div','calc-profile-grid');left.append(profileGrid);
    field(profileGrid,'level','等级',80,{min:1,max:80,step:1});
    field(profileGrid,'stars','星级',0,{choices:Array.from({length:6},(_,i)=>[i,i===0?'0 星 · 未升星':i===5?'5 星 · 满星':`${i} 星`])});
    field(profileGrid,'rewards','粉丝团奖励次数',0,{max:160,step:1});
    const sourceNote=n('p','calc-note');left.append(sourceNote);
    field(left,'skill','出手技能','',{choices:[]});
    const description=n('p','calc-skill-description');left.append(description);
    const sourceGrid=n('div','calc-grid');left.append(sourceGrid);
    field(sourceGrid,'attack','面板攻击',4350);
    field(sourceGrid,'sourceHP','自身剩余生命 %',100,{max:100});
    field(sourceGrid,'criticalRate','面板暴击率 %',15,{max:1000});
    field(sourceGrid,'criticalDamage','面板暴击伤害 %',130,{max:10000});
    field(sourceGrid,'sourceElement','我方属性','Ground',{choices:elementOpts});
    field(sourceGrid,'attackState','战中攻击状态',0,{choices:[[0,'无额外状态'],[20,'攻击提升 +20%'],[-20,'攻击下降 −20%']]});
    const sourceMode=n('p','calc-note','攻击和暴击可直接改成实机面板。战中状态在面板之后另计。');left.append(sourceMode);
    field(right,'target','目标数据来源','manual',{choices:[['manual','手动填写敌方数据'],...opts]});
    const targetProfile=n('div','calc-profile-grid');right.append(targetProfile);
    field(targetProfile,'targetLevel','敌方等级',80,{max:80,min:1,step:1});
    field(targetProfile,'targetStars','敌方星级',0,{choices:Array.from({length:6},(_,i)=>[i,i+' 星'])});
    field(targetProfile,'targetRewards','敌方奖励次数',0,{max:160,step:1});
    const targetGrid=n('div','calc-grid');right.append(targetGrid);
    field(targetGrid,'defence','面板防御',2500);
    field(targetGrid,'targetMaxHP','最大生命',41000,{min:1});
    field(targetGrid,'targetHP','敌方剩余生命 %',100,{max:100});
    field(targetGrid,'targetElement','敌方属性','',{choices:elementOpts});
    field(targetGrid,'defenceState','战中防御状态',0,{choices:[[0,'无额外状态'],[-20,'防御下降 −20%'],[20,'防御提升 +20%']]});
    field(targetGrid,'debuffs','敌方减益数量',0,{max:99,step:1});
    const relationNote=n('p','calc-relation');right.append(relationNote);
    const checks=n('div','calc-checks');right.append(checks);
    check(checks,'targeted','敌方被锁定（闪避 −30%，承伤 +10%）');
    check(checks,'stealth','敌方潜影 · 仅在本次为全体攻击时勾选（减伤 50%）');
    check(checks,'critBuff','我方暴击伤害提升（+50 个百分点）');
    check(checks,'invincible','敌方无敌');
    const targetNote=n('p','calc-note','敌方生命用于条件增伤与生命损失估算；全体攻击显示每个同条件目标的伤害。');right.append(targetNote);
    const advanced=n('details','calc-advanced'),sum=n('summary','','进阶条件 · 穿透、增减伤与命中');advanced.append(sum);form.append(advanced);
    const advancedGrid=n('div','calc-grid calc-advanced-grid');advanced.append(advancedGrid);
    field(advancedGrid,'attackRate','技能攻击倍率 %',180,{max:10000});
    field(advancedGrid,'power','技能威力系数',1,{max:100});
    field(advancedGrid,'flatAttack','公式固定项',0,{hint:'与攻击×倍率相加，仍受防御与全局系数影响'});
    field(advancedGrid,'condition','额外条件倍率',1,{max:100,hint:'自动技能条件之外的乘数；默认 1'});
    field(advancedGrid,'attackBonus','额外攻击变化 %',0,{min:-100,max:1000});
    field(advancedGrid,'defenceBonus','额外防御变化 %',0,{min:-100,max:1000});
    field(advancedGrid,'penetration','额外防御穿透 %',0,{max:100});
    field(advancedGrid,'antiPenetration','敌方抗穿透 %',0,{max:100});
    field(advancedGrid,'damageBonus','我方总增伤 %',0,{min:-100,max:1000,hint:'填写已结算的增伤合计，不含条件倍率'});
    field(advancedGrid,'reduction','敌方总减伤 %',0,{max:100,hint:'不含上方潜影勾选值'});
    field(advancedGrid,'vulnerability','敌方额外承伤 %',0,{max:1000,hint:'不含上方锁定勾选值'});
    field(advancedGrid,'shield','敌方现有护盾',0);
    field(advancedGrid,'dodgeRate','敌方闪避率 %',0,{min:-100,max:1000});
    field(advancedGrid,'hitRate','我方命中修正 %',0,{min:-100,max:1000,hint:'用于闪避判定；不同于效果命中'});
    field(advancedGrid,'criticalResistance','敌方暴击抵抗 %',0,{min:-100,max:1000});
    field(advancedGrid,'hitRule','命中特殊规则','natural',{choices:[['natural','自然判定'],['hit','必定命中'],['miss','必定闪避']]} );
    field(advancedGrid,'critRule','暴击特殊规则','natural',{choices:[['natural','自然判定'],['crit','必定暴击（仍先判闪避）'],['no','不能暴击']]} );
    field(advancedGrid,'strongRule','强击特殊规则','natural',{choices:[['natural','自然判定 · 25%'],['strong','必定强击（仍先判闪避、暴击）'],['no','不能强击']]} );
    const actions=n('div','calc-actions'),reset=n('button','download-button','恢复默认条件'),save=n('button','download-button','保存计算记录 ↓');reset.type=save.type='button';actions.append(n('span','calc-note','修改后自动计算'),reset,save);form.append(actions);host.append(form);
    const error=n('p','calc-error');error.role='alert';error.hidden=true;host.append(error);
    const results=n('section','calc-results');results.setAttribute('aria-label','伤害计算结果');host.append(results);
    const autoNote=n('div','calc-auto-note');host.append(autoNote);
    const guide=section('理解这场战斗','BATTLE NOTES');guide.classList.add('calc-guide');host.append(guide);
    for(const [title,text]of [
      ['行动与技能','行动值随时间按速度累积：行动值增加 = 速度 × 经过时间；到 100% 可行动。通常剩余时间 =（1 − 当前行动值）÷ 速度。推进行动 20% 是行动条直接加 0.2，并非速度增加 20%。初始行动条存在随机值，因此出手顺序也受开局影响。终结技有独立冷却，升星 Lv.3 解锁被动；嘲讽、潜影、控制与驱散都会影响选择。'],
      ['四种属性环环相克','蓝澈 → 红璇 → 绿琉 → 黄曜 → 蓝澈（箭头表示克制）。顺属性伤害 ×1.1，暴击率 +15 个百分点；逆属性使敌方闪避率 +50 个百分点，伤害系数本身为 ×1。'],
      ['闪避、暴击、强击是互斥结果','先判闪避，再判暴击，最后判强击。闪避伤害 ×0.75；强击 ×1.15，基础判定率 25%；暴击乘面板暴击伤害，130% 代表 ×1.3。期望值按这个顺序计算实际发生概率。'],
      ['防御与穿透','防御减伤系数为 2000 ÷（2000 + 有效防御）。例如防御 2500 时保留 44.44% 伤害。穿透减少进入分母的防御，抗穿透降低穿透收益。减防与增伤属于不同计算位置。'],
      ['状态会改变战术','攻击提升增加 20% 攻击，减防降低 20% 防御。潜影受到全体攻击时减伤 50%；锁定使闪避降低 30 个百分点、承伤提升 10%。护盾先承受伤害。毒、剧毒在回合触发的配置分别为最大生命 5%、10%，不纳入本次技能主段。'],
      ['效果命中不等于攻击命中','普通状态抵抗检定的通过率为 min（90%，max（0，100% + 我方效果命中 − 敌方效果抵抗））。例如双方均为 0% 时，抵抗检定仍只有 90% 通过率。技能自身的施加概率、免疫、忽略抵抗与其他触发条件还需另外判断；这不是最终上状态概率，也不用于伤害暴击或闪避计算。'],
      ['计算范围与可信度','主伤害公式、属性环和命中判定已核对客户端代码。自动处理简单的丧失生命比例、敌方减益数量与固定穿透条件。未模拟追加攻击、反击、协同、全队被动触发、治疗、持续伤害、特殊伤害上限及全部状态叠加规则；这些效果需另算。生命损失是当前护盾与生命下的静态估算，最终整数取整尚未实机校准。部分低等级参考数值与游戏面板有差异，可手填实机属性。']
    ]){const d=n('details');d.append(n('summary','',title),n('p','',text));guide.append(d);}
    const evidence=n('a','calc-evidence','查看公式与依据文档 ↗');evidence.href='reports/combat_rules.md';evidence.target='_blank';guide.append(evidence);
    function v(key){return Number(fields[key].value);}
    function cardProfile(card, prefix='') {
      return C.profile(card,v(prefix?'targetLevel':'level'),v(prefix?'targetStars':'stars'),v(prefix?'targetRewards':'rewards'),data.meta.fanClubBonusPerReward);
    }
    function fillSource() {
      source=byId.get(fields.source.value);
      fields.level.max=source.stats.at(-1).level;fields.level.value=Math.min(v('level'),Number(fields.level.max));
      const p=cardProfile(source);fields.attack.value=fmtInput(p.Attack);fields.criticalRate.value=fmtInput(p.CriticalRate*100);fields.criticalDamage.value=fmtInput(p.CriticalDamageRate*100);fields.sourceElement.value=source.element;
      sourceNote.textContent=`参考属性 ${fields.level.value} 级 / ${fields.stars.value} 星 · 生命 ${fmt(p.HP)} · 攻击 ${fmt(p.Attack)} · 防御 ${fmt(p.Defence)}。粉丝团每次生命 +25、攻击 +4、防御 +3。部分低等级数值可能与游戏面板有差异。`;
      sourceMode.textContent='攻击和暴击可直接改成实机面板。战中状态在面板之后另计。';
    }
    function fmtInput(value){return Number(Number(value).toFixed(6));}
    function fillSkills(id) {
      fields.skill.replaceChildren();
      source.skills.filter(s=>!s.hidden&&s.type!=='Passive').slice(0,2).forEach((s,i)=>{const o=n('option','',`${i===0?'战技':'终结技'} · ${s.attackRate?fmt(Number(s.attackRate)*100)+'% 攻击系数':'无直接攻击系数'}`);o.value=s.id;fields.skill.append(o);});
      if(id&&[...fields.skill.options].some(o=>o.value===id))fields.skill.value=id;
      fillSkill();
    }
    function fillSkill(){
      skill=source.skills.find(s=>s.id===fields.skill.value);model=C.skillModel(skill||{raw:{}});
      fields.attackRate.value=model.attackRate*100;fields.power.value=model.power;
      description.textContent=window.AtlasGameUI.description(skill?.description);
    }
    function fillTarget(){
      targetManual=fields.target.value==='manual';targetProfile.hidden=targetManual;
      if(!targetManual){const c=byId.get(fields.target.value);fields.targetLevel.max=c.stats.at(-1).level;fields.targetLevel.value=Math.min(v('targetLevel'),Number(fields.targetLevel.max));const p=cardProfile(c,'target');fields.defence.value=fmtInput(p.Defence);fields.targetMaxHP.value=fmtInput(p.HP);fields.targetElement.value=c.element;fields.criticalResistance.value=fmtInput((p.CriticalResistanceRate||0)*100);}
    }
    let record;
    function update(){
      results.hidden=false;error.hidden=true;
      try{
        for(const [key,control]of Object.entries(fields))if(control.type==='number'&&!(targetManual&&['targetLevel','targetRewards'].includes(key))&&!control.checkValidity())throw new Error('请检查「'+control.closest('label').querySelector('span').textContent+'」的输入范围，不能留空。');
        const mod=C.skillModifiers(model,{sourceHP:v('sourceHP'),targetHP:v('targetHP'),debuffs:v('debuffs')});
        const p={attack:v('attack'),attackRate:v('attackRate')/100,power:v('power'),flatAttack:v('flatAttack'),condition:mod.condition*v('condition'),defence:v('defence'),attackBonus:(v('attackBonus')+v('attackState'))/100,defenceBonus:(v('defenceBonus')+v('defenceState'))/100,penetration:mod.penetration+v('penetration')/100,antiPenetration:v('antiPenetration')/100,damageBonus:v('damageBonus')/100,reduction:v('reduction')/100+(fields.stealth.checked?0.5:0),vulnerability:v('vulnerability')/100+(fields.targeted.checked?0.1:0),criticalRate:v('criticalRate')/100,criticalDamage:v('criticalDamage')/100+(fields.critBuff.checked?0.5:0),criticalResistance:v('criticalResistance')/100,dodgeRate:v('dodgeRate')/100-(fields.targeted.checked?0.3:0),hitRate:v('hitRate')/100,sourceElement:fields.sourceElement.value,targetElement:fields.targetElement.value,shield:v('shield'),targetMaxHP:v('targetMaxHP'),targetHP:v('targetHP'),invincible:fields.invincible.checked,forceHit:fields.hitRule.value==='hit',forceMiss:fields.hitRule.value==='miss',forceCritical:fields.critRule.value==='crit',noCritical:fields.critRule.value==='no',forceStrong:fields.strongRule.value==='strong',noStrong:fields.strongRule.value==='no'};
        const r=C.calculate(p);record={created:new Date().toISOString(),source:source.id,skill:skill?.id,profile:{level:v('level'),stars:v('stars'),fanClubRewards:v('rewards')},input:p,result:r,scope:'单目标技能主段估算，未模拟全部被动、追加攻击与最终整数取整'};
        relationNote.textContent=r.relation==='advantage'?'我方克制 · 伤害 ×1.1，暴击率 +15 个百分点':r.relation==='disadvantage'?'我方被克制 · 敌方闪避率 +50 个百分点':'双方无克制 · 使用中立系数';
        results.replaceChildren();
        const resultHead=n('div','calc-result-heading');resultHead.append(n('p','eyebrow','03 / DAMAGE ESTIMATE'),n('h3','',source.name+' · '+(skill?.slot===1?'战技':'终结技')),n('span','','单个目标 / 一次主段 · 小数估算'));results.append(resultHead);
        const headline=n('div','calc-headline');const expectation=n('div');expectation.append(n('span','','期望伤害'),n('strong','',fmt(r.expected)));const hp=n('div');hp.append(n('span','','期望生命损失 · 计入护盾'),n('strong','',fmt(r.expectedLoss)));headline.append(expectation,hp);results.append(headline);
        const table=n('table','calc-result-table');const head=n('tr');for(const t of ['判定结果','伤害','实际概率','生命损失'])head.append(n('th','',t));const thead=n('thead');thead.append(head);table.append(thead);const tbody=n('tbody');
        for(const [key,label]of [['normal','普通'],['critical','暴击'],['strong','强击'],['miss','闪避']]){const row=n('tr');row.append(n('th','',label),n('td','',fmt(r.damage[key])),n('td','',pct(r.probability[key])),n('td','',fmt(r.loss[key])));tbody.append(row);}table.append(tbody);results.append(table);
        const bars=n('div','calc-probabilities');bars.setAttribute('aria-label','判定概率分布');
        for(const [key,label]of [['normal','普通'],['critical','暴击'],['strong','强击'],['miss','闪避']])if(r.probability[key]>0){const b=n('span','calc-prob-'+key);b.style.width=pct(r.probability[key]);b.title=label+' '+pct(r.probability[key]);bars.append(b);}results.append(bars);
        const process=n('details','calc-process');process.open=true;process.append(n('summary','','这次伤害是怎样算出来的？'));
        const lines=n('ol');
        for(const t of [
          `攻击项：${fmt(p.attack)} × ${fmt(1+p.attackBonus)} × ${fmt(p.attackRate)} + ${fmt(p.flatAttack)} = ${fmt(r.attack*p.attackRate+p.flatAttack)}`,
          `技能条件：自动 ×${fmt(mod.condition)}，手动 ×${fmt(v('condition'))}；Power ×${fmt(p.power)}`,
          `有效防御：${fmt(p.defence)} × ${fmt(1+p.defenceBonus)} × 穿透余量 = ${fmt(r.effectiveDefence)}；防御系数 ${pct(r.defenceFactor)}`,
          `伤害主段：攻击项 × 1.871 × Power × 条件倍率 × 属性 ${fmt(r.elementFactor)} × 防御系数 × 我方增伤 ${fmt(r.sourceFactor)} × 敌方承伤 ${fmt(r.targetFactor)} = ${fmt(r.raw)}`,
          `普通 ×1 / 暴击 ×${fmt(p.criticalDamage)} / 强击 ×1.15 / 闪避 ×0.75${p.invincible?'；敌方无敌，本次结果归零':''}`,
          `期望伤害 = 四种伤害分别乘其实际概率后求和；生命损失逐种扣除护盾 ${fmt(p.shield)}，上限为目标现有生命 ${fmt(p.targetMaxHP*p.targetHP/100)}。`
        ])lines.append(n('li','',t));process.append(lines);results.append(process);
        autoNote.replaceChildren();
        const applied=[];
        for(const c of model.conditions)applied.push(c.property==='LastHPRate'?`${c.who==='Source'?'自身':'敌方'}丧失生命条件`:'敌方减益数量 / 固定条件');
        if(model.penetrations.length)applied.push('技能防御穿透 '+pct(mod.penetration));
        if(applied.length)autoNote.append(n('p','', '已自动带入：'+[...new Set(applied)].join('、')+'。'));
        for(const warning of [...model.warnings,...model.extra])autoNote.append(n('p','calc-warning',window.AtlasGameUI.notice(warning)+'。'));
        if(!model.attackRate)autoNote.append(n('p','calc-warning','该技能没有直接攻击系数。当前不计算治疗、护盾或独立伤害事件；可在进阶条件手动填写公式参数。'));
        autoNote.append(n('p','','仅计算所选技能主段。被动、后续状态与追加段未自动触发；技能带来的状态不能默认提前作用于本次伤害。'));
        save.disabled=false;
      }catch(e){results.hidden=true;error.hidden=false;error.textContent=e.message;save.disabled=true;record=null;}
    }
    function profileValid(target=false){return (target?['targetLevel','targetRewards']:['level','rewards']).every(k=>fields[k].checkValidity());}
    form.addEventListener('input',e=>{const key=e.target.id.replace('calc-','');if(['level','rewards'].includes(key)&&profileValid())fillSource();if(['targetLevel','targetRewards'].includes(key)&&profileValid(true))fillTarget();if(['attack','criticalRate','criticalDamage'].includes(key))sourceMode.textContent='当前使用手动面板值；上方参考属性不会随手动修改变化。重新选择羁绊、等级、星级或奖励次数会重新计算属性。';update();});
    form.addEventListener('change',e=>{const key=e.target.id.replace('calc-','');if(key==='source'){source=byId.get(fields.source.value);fillPersonal();if(profileValid())fillSource();fillSkills();}else if(key==='stars'&&profileValid()){fillSource();}else if(key==='skill')fillSkill();else if(key==='target'&&fields.target.value==='manual')fillTarget();else if(['target','targetStars'].includes(key)&&profileValid(true))fillTarget();update();});
    form.addEventListener('input',()=>{userDirty=true;updateUserNote();});form.addEventListener('change',()=>{userDirty=true;updateUserNote();});
    useMine.addEventListener('click',()=>{fillPersonal();fillSource();fillSkills();update();userDirty=false;updateUserNote();});
    reset.addEventListener('click',()=>{for(const [key,f]of Object.entries(fields)){if(f.type==='checkbox')f.checked=false;}for(const [k,val]of Object.entries({attackState:0,defenceState:0,attackBonus:0,defenceBonus:0,flatAttack:0,condition:1,penetration:0,antiPenetration:0,damageBonus:0,reduction:0,vulnerability:0,shield:0,dodgeRate:0,hitRate:0,criticalResistance:0,sourceHP:100,targetHP:100,debuffs:0,hitRule:'natural',critRule:'natural',strongRule:'natural'}))fields[k].value=val;fillSource();fillSkill();fillTarget();update();});
    save.addEventListener('click',()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json;charset=utf-8'})),a=n('a');a.href=url;a.download=`${source.id}-伤害计算.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    function loadCard(card,skillId){fields.source.value=card.id;fillPersonal();fillSource();fillSkills(skillId);update();userDirty=true;updateUserNote();}
    const first=Users.teamIds(personal())[0];if(first)fields.source.value=first;fillPersonal();
    api={loadCard};fillSource();fillSkills();fillTarget();update();updateUserNote();userStore?.subscribe(()=>{if(!userDirty){const id=Users.teamIds(personal())[0];if(id)fields.source.value=id;fillPersonal();fillSource();fillSkills();update();}updateUserNote();});return api;
  }
  return {mount};
})();
