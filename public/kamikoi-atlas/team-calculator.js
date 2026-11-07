'use strict';
window.AtlasTeamCalculator=(()=>{
  let api;
  function mount(host,data,userStore){
    if(api)return api;
    const T=window.KamikoiTeamCombat,C=window.KamikoiCombat,U=window.AtlasGameUI,cards=data.cards.filter(c=>c.named&&c.stats.length),byId=new Map(cards.map(c=>[c.id,c]));
    const trials=window.ATLAS_TRIALS,P=window.AtlasTrialProfiles,trialScenes=trials?.scenes||[],trialEnemies=new Map(trialScenes.flatMap(s=>s.waves.flatMap(w=>w.enemies.map(e=>[e.key,e]))));
    const storageKey='kamikoi-team-calculator-v1';let nextAlly=1,nextEnemy=1,result,verification;
    const Users=window.AtlasUserData;let userDirty=false;
    const personal=()=>userStore?.get()||Users.empty();
    function usePersonalActor(x){if(x.side==='ally')Object.assign(x,Users.combatDefaults(personal(),x.cardId));}
    const state={steps:24,mode:'sampled',assumeEffects:true,effectPolicy:'sampled',openingGauge:'game',seed:1,skillPolicy:'gameAI',verificationLimit:500,actors:[],plan:{},trialScene:'Trial_1',trialWave:1};
    const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=/warning/.test(cls||'')?U.notice(text):text;return e;};
    const f=v=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
    const button=(text,fn,cls='team-button')=>{const b=n('button',cls,text);b.type='button';b.addEventListener('click',fn);return U.decorateControl(b,text);};
    const elements=[['','中立'],['Ice','蓝澈'],['Fire','红璇'],['Earth','绿琉'],['Ground','黄曜']];
    function fresh(side,cardId){const id=(side==='ally'?'a'+nextAlly++:'e'+nextEnemy++),x={id,side,cardId:cardId||(side==='ally'?'C04_SSR_002':'manual'),level:80,stars:0,rewards:0,name:side==='ally'?'羁绊':'自定义敌方',maxHP:100000,hp:100000,attack:0,defence:2500,speed:2000,gauge:0,criticalRate:15,criticalDamage:130,element:'',shield:0,defaultSkill:side==='enemy'?-1:0,cd:4,initialCooldown:0,rate1:100,rate2:180,power1:1,power2:1,all1:false,all2:false,attackBonus:0,defenceBonus:0,damageBonus:0,reduction:0,vulnerability:0,penetration:0,dodgeRate:0,criticalResistance:0,debuffs:0};usePersonalActor(x);if(x.cardId!=='manual')applyProfile(x,true);return x;}
    function applyProfile(x,resetSkills=false){
      if(x.trialKey){const enemy=trialEnemies.get(x.trialKey);if(enemy)P.apply(x,enemy,T.compile);return;}
      const card=byId.get(x.cardId);if(!card)return;
      x.level=Math.min(card.stats.at(-1).level,Math.max(1,Number(x.level)||80));
      const p=C.profile(card,x.level,Number(x.stars),Number(x.rewards),data.meta.fanClubBonusPerReward);
      Object.assign(x,{name:card.name,maxHP:p.HP,hp:p.HP,attack:p.Attack,defence:p.Defence,speed:p.Speed,criticalRate:p.CriticalRate*100,criticalDamage:p.CriticalDamageRate*100,element:card.element});
      if(resetSkills){const skills=card.skills.filter(s=>!s.hidden&&s.type!=='Passive').slice(0,2).map(T.compile);x.cd=skills[1]?.cooldown||0;x.initialCooldown=skills[1]?.initialCooldown||0;skills.forEach((s,i)=>{x['rate'+(i+1)]=s.attackRate*100;x['power'+(i+1)]=s.power;x['all'+(i+1)]=s.all;});}
    }
    const defaultIds=Users.teamIds(personal());
    for(const id of defaultIds.length?defaultIds:['C04_SSR_002','C03_SSR_001','C01_SSR_001','C01_SSR_002'])state.actors.push(fresh('ally',id));
    state.actors.push(...(selectedWave()?.enemies.map(enemy=>P.apply(fresh('enemy'),enemy,T.compile))||[fresh('enemy')]));
    const intro=n('div','team-intro');intro.append(n('p','eyebrow','TEAM BATTLE / 行动时间轴'),n('h2','','排好队伍，再决定每一次出手'),n('p','','选择最多 4 名角色与关卡，按速度自动排队，并在时间轴安排技能。'));host.append(intro);
    const userBar=n('div','user-defaults'),userNote=n('p');userBar.append(userNote,button('带入我的队伍',()=>applyPersonalTeam()));const userLink=n('a','','管理我的数据 ↗');userLink.href='#userdata';userBar.append(userLink);host.append(userBar);
    host.addEventListener('input',event=>{if(event.target.closest('.battle-charts'))return;userDirty=true;updateUserNote();});host.addEventListener('change',event=>{if(event.target.closest('.battle-charts'))return;userDirty=true;updateUserNote();});
    function updateUserNote(){const p=personal();userNote.textContent=p.roster.length?`${p.name} · ${userDirty?'临时方案，未改写个人档案':'已带入个人队伍与练度'}`:'当前为四人示例队伍，可直接更换或导入个人数据。';}
    function applyPersonalTeam(){
      const ids=Users.teamIds(personal());if(!ids.length){userNote.textContent='尚无已拥有角色，请先在“我的数据”录入。';return;}
      const oldIds=new Set(state.actors.filter(a=>a.side==='ally').map(a=>a.id));for(const id of oldIds)delete state.plan[id];
      for(const orders of Object.values(state.plan))for(const order of Object.values(orders))if(oldIds.has(order.target))order.target='auto';
      state.actors=[...ids.map(id=>fresh('ally',id)),...state.actors.filter(a=>a.side==='enemy')];userDirty=false;renderActors();recalculate();updateUserNote();
    }
    const controls=n('div','team-controls');host.append(controls);
    const configGrid=n('div','team-config-grid'),allyBox=n('section','team-side'),enemyBox=n('section','team-side enemy-side');configGrid.append(allyBox,enemyBox);host.append(configGrid);
    const status=n('p','team-save-status');status.setAttribute('role','status');host.append(status);
    const error=n('p','calc-error');error.setAttribute('role','alert');error.hidden=true;host.append(error);
    const clearCheck=n('section','team-clear-check');clearCheck.setAttribute('aria-label','关卡通关验证');host.append(clearCheck);
    const summary=n('section','team-summary');host.append(summary);
    const chartSection=n('section');host.append(chartSection);
    const charts=window.AtlasBattleCharts.mount(chartSection,{cardForActor:a=>byId.get(a.cardId)});
    const timeline=n('section','team-timeline');host.append(timeline);
    const scope=n('details','team-scope');scope.append(n('summary','','规则、效果覆盖与计算假设'));host.append(scope);
    const quickNav=n('nav','team-quick-nav');quickNav.setAttribute('aria-label','战斗计算快捷导航');
    for(const [label,target]of [['01 我方队伍',allyBox],['02 关卡敌方',enemyBox],['03 通关结果',clearCheck],['04 战斗图表',chartSection],['05 技能时间轴',timeline]]){const jump=button(label,event=>{for(const b of quickNav.querySelectorAll('[aria-current]'))b.removeAttribute('aria-current');event.currentTarget.setAttribute('aria-current','location');target.scrollIntoView({block:'start',behavior:'smooth'});target.focus({preventScroll:true});},'team-jump');target.tabIndex=-1;if(target===clearCheck)jump.setAttribute('aria-current','location');quickNav.append(jump);}
    host.insertBefore(quickNav,userBar);
    function selectedTrial(){return trialScenes.find(s=>s.id===state.trialScene)||trialScenes[0];}
    function selectedWave(){return selectedTrial()?.waves[0];}
    function sceneLabel(scene){return scene.group==='Trial'||scene.group.startsWith('SpecTrial_')?`第 ${scene.floor} 层`:scene.label;}
    function trialLabel(enemy){const scene=trialScenes.find(s=>s.id===enemy.source.sceneId);return `${scene.groupName} · ${sceneLabel(scene)} · Lv.${enemy.level}${enemy.boss?' · 首领':''}`;}
    function followingWaveProfiles(members=state.actors){return P.followingWaves(members,trialScenes,(enemy,id)=>P.apply({id,side:'enemy'},enemy,T.compile));}
    function replaceEnemyTeam(enemies){
      const oldIds=new Set([...state.actors.filter(a=>a.side==='enemy'),...followingWaveProfiles().flat()].map(a=>a.id));
      for(const id of oldIds)delete state.plan[id];
      for(const orders of Object.values(state.plan))for(const order of Object.values(orders))if(oldIds.has(order.target))order.target='auto';
      state.actors=[...state.actors.filter(a=>a.side==='ally'),...enemies];renderActors();recalculate();
    }
    function updateTrialTeam(){
      const scene=selectedTrial(),wave=selectedWave();
      replaceEnemyTeam(wave.enemies.map(enemy=>P.apply(fresh('enemy'),enemy,T.compile)));
      status.textContent=`已切换：${scene.groupName} · ${sceneLabel(scene)} · 共 ${scene.waves.length} 波。`;
    }
    function trialControls(box){
      if(!trialScenes.length)return;
      const scene=selectedTrial(),wave=selectedWave(),isTrial=state.actors.some(a=>a.side==='enemy'&&a.trialKey),panel=n('section','team-trial-controls');panel.setAttribute('aria-label','关卡敌方数据选择');
      const title=n('div','team-trial-title');title.append(U.icon('SystemIcon','Trial'),n('h4','','选择关卡与敌方阵容'));panel.append(title);
      const controls=n('div','team-trial-selects'),groups=[...new Map(trialScenes.map(s=>[s.group,['Fire','Ice','Earth','Ground'].includes(s.group)?'元素结晶 · '+s.groupName:s.groupName]))];panel.append(controls);
      field(controls,'trial-group','关卡类型',isTrial?scene.group:'',isTrial?groups:[['','选择关卡类型…'],...groups],v=>{if(!v)return;state.trialScene=trialScenes.find(s=>s.group===v).id;state.trialWave=1;updateTrialTeam();});
      const floors=trialScenes.filter(s=>s.group===scene.group).map(s=>[s.id,`${sceneLabel(s)} · Lv.${s.level}`]);
      field(controls,'trial-floor','关卡',isTrial?scene.id:'',isTrial?floors:[['','选择关卡…'],...floors],v=>{if(!v)return;state.trialScene=v;state.trialWave=1;updateTrialTeam();});
      if(isTrial)for(const w of scene.waves)panel.append(n('p','team-trial-preview',`第 ${w.index} 波 · ${w.enemies.length} 人：${w.enemies.map(e=>e.name+(e.boss?'（首领）':'')).join('、')}`));
      else panel.append(n('p','team-trial-preview','当前为自定义敌方；选择关卡后自动更新整关敌方。'));
      if(isTrial)panel.append(button('切换为自定义敌方',()=>{replaceEnemyTeam([fresh('enemy')]);status.textContent='已切换为自定义敌方，可自由配置队伍。';},'team-text-button'));
      panel.append(n('p','team-note','切换关卡后自动重算，验证包含全部波次。'));box.append(panel);
    }
    function field(parent,key,label,value,choices,onChange,options={}){
      const wrap=n('label','team-field');const id='team-'+key;wrap.htmlFor=id;wrap.append(n('span','',label));let control;
      if(choices){control=n('select');for(const [v,text]of choices){const o=n('option','',text);o.value=v;control.append(o);}}
      else{control=n('input');control.type=options.text?'text':'number';if(!options.text){control.min=options.min??0;control.max=options.max??1000000000;control.step=options.integer?'1':'any';}}
      control.id=id;control.value=value;control.required=true;control.setAttribute('aria-label',label);control.addEventListener(control.type==='number'?'input':'change',()=>{onChange(control.type==='number'?control.value===''?NaN:Number(control.value):control.value);});wrap.append(control);parent.append(wrap);return control;
    }
    function renderControls(){
      controls.replaceChildren();
      field(controls,'steps','模拟回合数（全场行动次数）',state.steps,null,v=>{state.steps=v;recalculate();},{min:1,max:500,integer:true});
      field(controls,'mode','默认伤害判定',state.mode,[['sampled','按概率模拟命中 / 暴击 / 闪避'],['normal','普通命中'],['critical','全部暴击'],['expected','期望路径估算'],['strong','全部强击'],['miss','全部闪避']],v=>{state.mode=v;recalculate();});
      field(controls,'effects','概率 / 敌方状态',state.effectPolicy,[['sampled','按概率与普通抵抗模拟'],['success','假设施加成功'],['skip','不计入']],v=>{state.effectPolicy=v;state.assumeEffects=v!=='skip';recalculate();});
      field(controls,'skill-policy','未安排回合的技能（双方）',state.skillPolicy,[['gameAI','敌方按关卡策略 / 我方优先终结技'],['readyUlt','双方CD就绪优先终结技'],['configured','按成员默认行动']],v=>{state.skillPolicy=v;recalculate();});
      field(controls,'opening-gauge','开局行动条',state.openingGauge,[['game','游戏随机 0–5%'],['manual','自定义初始行动条']],v=>{state.openingGauge=v;recalculate();});
      field(controls,'seed','随机种子（可复现）',state.seed,null,v=>{state.seed=v;recalculate();},{min:0,max:4294967295,integer:true});
      field(controls,'verification-limit','通关验证行动上限',state.verificationLimit,[[100,'100 次全场行动'],[200,'200 次全场行动'],[500,'500 次全场行动']],v=>{state.verificationLimit=Number(v);recalculate();});
      const actions=n('div','team-tools');
      actions.append(button('保存方案',()=>{try{if(!result)throw new Error('请先修正输入错误，再保存方案');localStorage.setItem(storageKey,JSON.stringify(state));status.textContent='方案已保存到当前浏览器。';}catch(e){status.textContent=e.message||'浏览器存储不可用，可导出方案文件。';}}),button('读取方案',()=>{try{const raw=localStorage.getItem(storageKey);if(!raw)throw new Error('当前浏览器尚无保存的方案');load(JSON.parse(raw));status.textContent='已读取保存的方案。';}catch(e){status.textContent=e.message;}}),button('导出方案与结果 ↓',download),button('导入方案',()=>importInput.click()));
      controls.append(actions);
      actions.append(button('换一次随机过程',()=>{state.seed=(state.seed+1)>>>0;renderControls();recalculate();}));
      actions.append(button('查看结果与时间轴 ↓',()=>summary.scrollIntoView({block:'start',behavior:'smooth'})));
      actions.lastChild.classList.add('team-primary');
      const advanced=n('details','team-advanced-controls');advanced.append(n('summary','','模拟选项与随机设置'));const advancedGrid=n('div','team-advanced-grid');advanced.append(advancedGrid);
      const fields=[...controls.querySelectorAll(':scope > .team-field')];for(const field of fields.slice(1))advancedGrid.append(field);
      controls.insertBefore(advanced,actions);
      const files=n('details','team-plan-menu');files.append(n('summary','','方案管理'));const fileActions=n('div','team-plan-actions');for(const b of [...actions.children].slice(0,4))fileActions.append(b);files.append(fileActions);actions.prepend(files);
    }
    const importInput=n('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;host.append(importInput);
    importInput.addEventListener('change',async()=>{const file=importInput.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());load(parsed.config||parsed);status.textContent='方案已导入。';}catch(e){status.textContent='导入失败：'+e.message;}importInput.value='';});
    function load(s){
      if(!s||!Array.isArray(s.actors)||!Number.isInteger(s.steps)||s.steps<1||s.steps>500||s.actors.length>9||s.actors.some(x=>!['ally','enemy'].includes(x.side)||!x.id||!(x.cardId==='manual'||byId.has(x.cardId))||(x.trialKey&&(!trialEnemies.has(x.trialKey)||x.side!=='enemy'))))throw new Error('方案格式、羁绊或关卡敌方编号无效');
      for(const side of ['ally','enemy'])if(s.actors.filter(a=>a.side===side).length<1||s.actors.filter(a=>a.side===side).length>(side==='enemy'&&s.actors.some(a=>a.trialKey)?5:4))throw new Error('我方和自定义敌方需要1—4个单位，关卡敌方每波最多5人');
      P.validateTeam(s.actors,trialScenes);
      const waves=followingWaveProfiles(s.actors);
      T.validate({actors:actorsForEngine(s.actors),enemyWaves:waves.map(actorsForEngine),steps:s.steps});
      if(s.seed!=null&&(!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295))throw new Error('随机种子无效');
      Object.assign(state,{steps:s.steps,mode:['sampled','normal','critical','expected','strong','miss'].includes(s.mode)?s.mode:'normal',assumeEffects:!!s.assumeEffects,actors:s.actors,plan:s.plan||{},seed:s.seed??1,openingGauge:s.openingGauge==='game'?'game':'manual',effectPolicy:['sampled','success','skip'].includes(s.effectPolicy)?s.effectPolicy:s.assumeEffects?'success':'skip'});
      state.skillPolicy=['gameAI','readyUlt'].includes(s.skillPolicy)?s.skillPolicy:'configured';state.verificationLimit=[100,200,500].includes(s.verificationLimit)?s.verificationLimit:500;
      const source=trialEnemies.get(state.actors.find(a=>a.side==='enemy')?.trialKey);
      state.trialScene=source?.source.sceneId||(trialScenes.some(t=>t.id===s.trialScene)?s.trialScene:'Trial_1');state.trialWave=1;
      nextAlly=Math.max(0,...state.actors.filter(a=>a.side==='ally').map(a=>Number(a.id.slice(1))||0))+1;nextEnemy=Math.max(0,...state.actors.filter(a=>a.side==='enemy').map(a=>Number(a.id.slice(1))||0))+1;
      renderControls();renderActors();recalculate();
      userDirty=true;updateUserNote();
    }
    function download(){if(!result){status.textContent='请先修正输入错误，再导出计算方案。';return;}const blob=new Blob([JSON.stringify({version:1,created:new Date().toISOString(),config:state,result,verification,assumptions:'按速度与行动条；每次全场行动计一回合；通关结果为当前策略与假设下的模拟判断；期望路径不是全随机分支精确期望；未模拟效果见结果警示'},null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=n('a');a.href=url;a.download='神明恋爱-组队战斗方案.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    function refreshProfile(x){
      applyProfile(x);
      for(const key of ['maxHP','hp','attack','defence','speed','criticalRate','criticalDamage','element']){const el=document.getElementById('team-'+x.id+'-'+key);if(el)el.value=x[key];}
      refreshMemberHeading(x);refreshAutoPanel(x);
    }
    function refreshAutoPanel(x){
      const panel=host.querySelector('.team-member[data-actor-id="'+x.id+'"] .team-auto-panel');if(!panel)return;
      panel.replaceChildren();
      for(const [key,label]of [['maxHP','生命'],['attack','攻击'],['defence','防御'],['speed','速度']]){const item=n('span','team-auto-stat'),copy=n('span');copy.append(n('small','',label),n('b','',f(x[key])));item.append(U.stat(key),copy);panel.append(item);}
      const card=trialEnemies.get(x.trialKey)||byId.get(x.cardId),active=card?.skills.filter(s=>!s.hidden&&s.type!=='Passive')||[];
      const skills=n('div','team-auto-skills');
      for(let i=0;i<2;i++){const line=n('div'),copy=n('span');copy.append(n('b','',i===0?'战技':'终结技'),n('small','',`${f(x['rate'+(i+1)])}%${i===1?' · CD '+x.cd:''}`));line.append(U.skill(active[i],i),copy);skills.append(line);}panel.append(skills);
    }
    function refreshMemberHeading(x){const s=host.querySelector('.team-member[data-actor-id="'+x.id+'"] > .team-member-heading, .team-member[data-actor-id="'+x.id+'"] > summary');if(s){s.querySelector('b').textContent=(state.actors.filter(a=>a.side===x.side).findIndex(a=>a.id===x.id)+1)+'  '+x.name;s.querySelector('.team-member-meta').textContent=`速度 ${f(x.speed)} · 初始条 ${f(x.gauge)}%`;}}
    const picker=n('dialog','team-card-picker');picker.setAttribute('aria-labelledby','team-picker-title');
    const pickerHeader=n('div','team-picker-header'),pickerTitle=n('h2','','选择羁绊');pickerTitle.id='team-picker-title';
    pickerHeader.append(pickerTitle,button('×',()=>picker.close(),'team-picker-close'));pickerHeader.lastChild.setAttribute('aria-label','关闭角色选择');
    const pickerFilters=n('div','team-picker-filters'),pickerSearch=n('input'),pickerRarity=n('select');
    const pickerOwnership=n('select','user-picker-ownership');pickerOwnership.setAttribute('aria-label','组队角色拥有筛选');for(const [value,label] of [['owned','仅看已拥有'],['all','全部羁绊']]){const o=n('option','',label);o.value=value;pickerOwnership.append(o);}
    pickerSearch.type='search';pickerSearch.placeholder='搜索羁绊名称、角色或编号';pickerSearch.setAttribute('aria-label','搜索羁绊');
    pickerRarity.setAttribute('aria-label','筛选羁绊稀有度');for(const value of ['','SSR','SR','R']){const option=n('option','',value||'全部稀有度');option.value=value;pickerRarity.append(option);}
    pickerFilters.append(U.icon('Common','Icon_Magnifier','game-icon-tile'),pickerSearch,pickerRarity,pickerOwnership);
    const pickerCount=n('p','team-picker-count'),pickerGrid=n('div','team-picker-grid');pickerGrid.setAttribute('role','group');pickerGrid.setAttribute('aria-label','可选羁绊');pickerCount.setAttribute('role','status');
    picker.append(pickerHeader,pickerFilters,pickerCount,pickerGrid);host.append(picker);let pickerTarget;
    function selectCard(id){
      const x=pickerTarget;if(!x)return;picker.close();x.cardId=id;delete x.trialKey;
      usePersonalActor(x);userDirty=true;updateUserNote();
      if(id==='manual'){x.name='自定义敌方';x.attack=0;x.defaultSkill=-1;}else applyProfile(x,true);
      delete state.plan[x.id];renderActors(x.id);recalculate();document.getElementById('team-'+x.id+'-card')?.focus({preventScroll:true});
    }
    function renderPicker(){
      const owned=new Map(personal().roster.map(r=>[r.cardId,r]));const query=pickerSearch.value.trim().toLowerCase(),matches=cards.filter(c=>(pickerTarget.side!=='ally'||pickerOwnership.value!=='owned'||owned.has(c.id))&&(!pickerRarity.value||c.rarity===pickerRarity.value)&&(!query||[c.name,c.id,...c.peopleNames].join(' ').toLowerCase().includes(query)));
      pickerGrid.replaceChildren();
      if(pickerTarget.side==='enemy'&&!query&&!pickerRarity.value){const manual=button('',()=>selectCard('manual'),'team-picker-option');manual.append(U.portrait(null),n('b','','自定义敌方'),n('small','','单独设置敌方属性'));manual.setAttribute('aria-pressed',String(pickerTarget.cardId==='manual'));pickerGrid.append(manual);}
      for(const c of matches){const choice=button('',()=>selectCard(c.id),'team-picker-option');choice.setAttribute('aria-label',c.name+' · '+c.rarity+' · '+c.peopleNames.join('/'));choice.setAttribute('aria-pressed',String(pickerTarget.cardId===c.id));choice.dataset.cardId=c.id;
        const art=n('div','team-picker-art');art.append(U.portrait(c),U.icon('Role',c.rarity,'team-picker-rarity'));choice.append(art,n('b','',c.name),n('small','',c.peopleNames.join(' / ')));
        if(pickerTarget.side==='ally'&&owned.has(c.id)){const r=owned.get(c.id);choice.append(n('small','user-owned-badge',`已拥有 · Lv.${r.level} / ${r.stars} 星`));}
        if(!U.thumbnail(c))choice.append(n('small','team-picker-no-art','图片暂未收录'));pickerGrid.append(choice);}
      pickerCount.textContent=matches.length?'找到 '+matches.length+' 份羁绊 · 点击图片选择':'没有符合条件的羁绊';
    }
    function openPicker(x,label){pickerTarget=x;pickerTitle.textContent='选择羁绊 · '+label;pickerSearch.value='';pickerRarity.value='';pickerOwnership.hidden=x.side!=='ally';pickerOwnership.value=x.side==='ally'&&personal().roster.length?'owned':'all';renderPicker();picker.showModal();pickerSearch.focus();}
    pickerSearch.addEventListener('input',renderPicker);pickerRarity.addEventListener('change',renderPicker);
    pickerOwnership.addEventListener('change',renderPicker);
    function renderActors(expandId){
      for(const [side,box,label]of [['ally',allyBox,'我方队伍'],['enemy',enemyBox,'敌方队伍']]){
        const members=state.actors.filter(a=>a.side===side),trialTeam=side==='enemy'&&members.some(a=>a.trialKey);box.replaceChildren();const head=n('div','team-side-heading');head.append(n('h3','',label),n('span','',trialTeam?`${members.length} 人 · 首波同时参战`:`${members.length} / 4`));const add=button('＋ 添加'+(side==='ally'?'我方':'敌方'),()=>{if(members.length>=4||trialTeam)return;userDirty=true;updateUserNote();const x=fresh(side,side==='ally'?cards.find(c=>!state.actors.some(a=>a.side==='ally'&&a.cardId===c.id))?.id:undefined);state.actors.push(x);renderActors(x.id);recalculate();});add.disabled=members.length>=4;if(!trialTeam)head.append(add);box.append(head);
        if(side==='enemy')trialControls(box);
        if(trialTeam&&selectedTrial().waves.length>1)box.append(n('h4','team-wave-heading','第 1 波 · 开场阵容'));
        const row=n('div','team-member-row');row.style.setProperty('--team-count',members.length);row.setAttribute('role','group');row.setAttribute('aria-label',label+'角色选择');row.tabIndex=0;box.append(row);
        if(members.length>1){const hint=n('p','team-scroll-hint','左右滑动查看整队');box.insertBefore(hint,row);}
        for(const [i,x]of members.entries()){
          const d=n(side==='ally'?'section':'details','team-member');d.dataset.actorId=x.id;if(side==='enemy')d.open=!!x.trialKey||expandId===x.id||members.length===1;
          const labelText=`${side==='ally'?'我方':'敌方'}${i+1}`,s=n(side==='ally'?'div':'summary',side==='ally'?'team-member-heading':'');s.append(n('b','',`${i+1}  ${x.name}`),n('span','team-member-meta',`速度 ${f(x.speed)} · 初始条 ${f(x.gauge)}%`));d.append(s);
          const body=n('div','team-member-body');d.append(body);row.append(d);
          const update=(key,v)=>{x[key]=v;refreshMemberHeading(x);refreshAutoPanel(x);recalculate();};
          const trial=trialEnemies.get(x.trialKey),card=byId.get(x.cardId),choose=trial?n('div','team-card-select team-trial-member'):button('',()=>openPicker(x,labelText),'team-card-select');choose.id='team-'+x.id+'-card';if(!trial){choose.setAttribute('aria-label','选择羁绊（'+labelText+'）：'+x.name);choose.setAttribute('aria-haspopup','dialog');}
          const choiceCopy=n('span','team-card-select-copy');choiceCopy.append(n('b','',x.name),n('small','',trial?trialLabel(trial):card?card.peopleNames.join(' / '):'单独设置敌方属性'));if(!trial)choiceCopy.append(n('small','team-card-select-hint','更换羁绊 ›'));choose.append(U.portrait(trial||card),choiceCopy);if(card)choose.append(U.icon('Role',card.rarity,'team-select-rarity'));body.append(choose);
          if(trial){const auto=n('div','team-auto-panel');body.append(auto);refreshAutoPanel(x);body.append(n('p','team-trial-source',`${trial.roleId} · ${trial.source.propertyId} Lv.${trial.level}`),n('p','team-note','属性按所选关卡自动填写。'));const passive=n('details','team-trial-effects');passive.append(n('summary','','敌方被动与特殊机制'));for(const skill of trial.skills.filter(s=>!s.hidden&&s.type==='Passive'))passive.append(n('p','team-note',(skill.name||skill.id)+'：'+U.description(skill.description)));for(const value of Object.values(trial.source.roleDynamicFields))passive.append(n('p','team-note',value));body.append(passive);}
          else if(x.cardId!=='manual'){
            const auto=n('div','team-auto-panel');body.append(auto);refreshAutoPanel(x);
            const growth=n('div','team-growth-options');const growthTitle=n('p','team-growth-title');growthTitle.append(U.icon('Common','Icon_Star1','game-icon-tile'),n('span','','等级与升星'));growth.append(growthTitle);body.append(growth);
            const profile=n('div','team-profile-grid');growth.append(profile);
            field(profile,x.id+'-level','等级',x.level,null,v=>{x.level=v;if(Number.isInteger(v)&&v>=1&&v<=80)refreshProfile(x);recalculate();},{min:1,max:80,integer:true});
            const stars=field(profile,x.id+'-stars','星级',x.stars,Array.from({length:6},(_,j)=>[j,j===0?'0 星 · 未升星':j+' 星'+(j===5?' · 满星':'')]),v=>{x.stars=Number(v);refreshProfile(x);recalculate();});stars.setAttribute('aria-label','星级（'+labelText+'）');
            profile.querySelector('input').setAttribute('aria-label','等级（'+labelText+'）');
            const rewards=n('details','team-rewards-options');rewards.append(n('summary','','粉丝团加成（可选）'));growth.append(rewards);
            field(rewards,x.id+'-rewards','粉丝团奖励次数',x.rewards,null,v=>{x.rewards=v;if(Number.isInteger(v)&&v>=0&&v<=160)refreshProfile(x);recalculate();},{max:160,integer:true});
          }else field(body,x.id+'-name','敌方名称',x.name,null,v=>{x.name=v||'自定义敌方';refreshMemberHeading(x);recalculate();},{text:true});
          const manual=x.cardId!=='manual'||trial?n('details','team-manual-options'):body;if(manual!==body){manual.append(n('summary','','高级：手动覆盖属性与战斗条件（可选）'));body.append(manual);manual.append(button('恢复自动属性与技能',()=>{applyProfile(x,true);renderActors(x.id);recalculate();},'team-text-button'));}
          const grid=n('div','team-stat-grid');manual.append(grid);
          for(const [key,label,opts]of [['maxHP','最大生命',{min:1}],['hp','初始生命',{}],['attack','面板攻击',{}],['defence','面板防御',{}],['speed','速度',{min:.001}],['gauge','初始行动条 %',{max:100}],['criticalRate','暴击率 %',{max:1000}],['criticalDamage','暴击伤害 %',{max:10000}]])field(grid,x.id+'-'+key,label,x[key],null,v=>update(key,v),opts);
          field(grid,x.id+'-element','属性',x.element,elements,v=>update('element',v));
          field(grid,x.id+'-defaultSkill','默认行动',x.defaultSkill,[[0,'战技'],[-1,'等待 / 不攻击']],v=>update('defaultSkill',Number(v)));
          const sg=n('div','team-stat-grid');manual.append(sg);
          field(sg,x.id+'-cd','终结技 CD（自身回合）',x.cd,null,v=>update('cd',v),{max:99,integer:true});
          field(sg,x.id+'-initialCooldown','终结技初始剩余 CD',x.initialCooldown,null,v=>update('initialCooldown',v),{max:99,integer:true});
          const adv=n('details','team-member-advanced');adv.append(n('summary','','技能倍率与额外战斗条件'));manual.append(adv);const ag=n('div','team-stat-grid');adv.append(ag);
          for(const [key,label,min,max]of [['rate1','战技倍率 %',0,10000],['rate2','终结技倍率 %',0,10000],['power1','战技 Power',0,100],['power2','终结技 Power',0,100],['shield','初始护盾',0,1e9],['attackBonus','攻击额外变化 %',-100,1000],['defenceBonus','防御额外变化 %',-100,1000],['damageBonus','总增伤 %',-100,1000],['reduction','总减伤 %',0,100],['vulnerability','额外承伤 %',0,1000],['penetration','额外穿透 %',0,100],['dodgeRate','闪避率 %',-100,1000],['criticalResistance','抗暴率 %',-100,1000],['debuffs','初始减益数量',0,99]])field(ag,x.id+'-'+key,label,x[key]??0,null,v=>update(key,v),{min,max,integer:key==='debuffs'});
          if(x.cardId==='manual'){field(ag,x.id+'-all1','战技范围',String(x.all1),[['false','单体'],['true','全体']],v=>update('all1',v==='true'));field(ag,x.id+'-all2','终结技范围',String(x.all2),[['false','单体'],['true','全体']],v=>update('all2',v==='true'));}
          manual.append(n('p','team-note',trial?'仅覆盖本次敌方配置，可恢复关卡数据。':'已按等级与星级自动换算；核对面板时可手动覆盖。'));
          if(!trialTeam){const remove=button('移除此成员',()=>{userDirty=true;updateUserNote();state.actors=state.actors.filter(a=>a.id!==x.id);delete state.plan[x.id];renderActors();recalculate();},'team-text-button');remove.disabled=members.length===1;body.append(remove);}
        }
        if(trialTeam)for(const wave of selectedTrial().waves.slice(1)){
          const detail=n('details','team-later-wave');detail.append(n('summary','',`第 ${wave.index} 波 · ${wave.enemies.length} 名敌方 · 击败上一波后自动入场`));
          const roster=n('div','team-member-row');roster.style.setProperty('--team-count',wave.enemies.length);roster.setAttribute('aria-label','第'+wave.index+'波敌方资料');roster.tabIndex=0;
          for(const e of wave.enemies){
            const member=n('section','team-member team-future-enemy'),art=n('div','team-card-select team-trial-member');
            const name=n('span','team-card-select-copy');name.append(n('b','',e.name+(e.boss?' · 首领':'')),n('small','',`Lv.${e.level} · ${elements.find(x=>x[0]===e.element)?.[1]||e.element}`));art.append(U.portrait(e),name);member.append(art);
            const stats=n('div','team-auto-panel');for(const [key,label]of [['HP','生命'],['Attack','攻击'],['Defence','防御'],['Speed','速度']]){const item=n('span','team-auto-stat'),copy=n('span');copy.append(n('small','',label),n('b','',f(e.values[key])));item.append(U.stat(key),copy);stats.append(item);}member.append(stats);
            const skills=n('details','team-trial-effects');skills.append(n('summary','','技能与被动资料'));for(const s of e.skills.filter(s=>!s.hidden))skills.append(n('p','team-note',`${s.name||s.id}${s.type!=='Passive'?' · CD '+s.cooldown:''}：${U.description(s.description)}`));member.append(skills);roster.append(member);
          }
          detail.append(roster);box.append(detail);
        }
      }
    }
    function actorsForEngine(members=state.actors){
      P.validateTeam(members,trialScenes);
      return members.map(x=>{
        for(const key of ['level','stars','rewards'])if(!Number.isInteger(x[key])||x[key]<(key==='level'?1:0)||x[key]>(key==='rewards'?160:key==='stars'?5:80))throw new Error(x.name+' 的等级、星级或奖励次数无效');
        const trial=trialEnemies.get(x.trialKey),card=trial||byId.get(x.cardId);
        const skills=card?card.skills.filter(s=>!s.hidden&&s.type!=='Passive').slice(0,2).map(T.compile):[0,1].map(i=>({id:x.id+'s'+i,name:i===0?'战技':'终结技',model:{conditions:[],penetrations:[]},effects:[],warnings:[]}));
        skills.forEach((s,i)=>{s.attackRate=x['rate'+(i+1)]/100;s.power=x['power'+(i+1)];s.cooldown=i===0?0:x.cd;s.initialCooldown=i===0?0:x.initialCooldown;s.all=x['all'+(i+1)];});
        const values=trial?.values||card?.stats.find(s=>s.level===x.level)?.values||{};
        const a={...x,skills,traits:T.traits(card,x.stars,!!trial),boss:!!trial?.boss,effectHitRate:values.EffectHitRate||0,resistanceRate:values.ResistanceRate||0,pinchRate:values.PinchRate||0,gauge:x.gauge/100,criticalRate:x.criticalRate/100,criticalDamage:x.criticalDamage/100};
        // Player automatic play currently uses ready ultimate; source trial AI applies to trial units only.
        if(!trial)a.traits.ai=null;
        for(const k of ['attackBonus','defenceBonus','damageBonus','reduction','vulnerability','penetration','dodgeRate','criticalResistance'])a[k]=(x[k]??0)/100;
        return a;
      });
    }
    function recalculate(){
      error.hidden=true;
      try{
        const invalid=[...host.querySelectorAll('.team-field input')].find(el=>!el.validity.valid);if(invalid)throw new Error((invalid.closest('label').querySelector('span')?.textContent||'输入')+'：请填写范围内的有效数值');
        const actors=actorsForEngine(),enemyWaves=followingWaveProfiles().map(actorsForEngine),config={actors,enemyWaves,steps:state.steps,mode:state.mode,assumeEffects:state.assumeEffects,effectPolicy:state.effectPolicy,openingGauge:state.openingGauge,seed:state.seed,plan:state.plan,skillPolicy:state.skillPolicy,verificationLimit:state.verificationLimit};
        result=T.simulate(config);verification=T.verify(config);renderVerification();renderSummary();charts.update(verification,result);renderTimeline([...actors,...enemyWaves.flat()]);renderScope();
        summary.hidden=chartSection.hidden=timeline.hidden=clearCheck.hidden=false;
      }catch(e){result=verification=null;error.hidden=false;error.textContent=e.message;summary.hidden=chartSection.hidden=timeline.hidden=clearCheck.hidden=true;}
    }
    function renderVerification(){
      clearCheck.replaceChildren();const a=verification.assessment,trial=trialEnemies.get(state.actors.find(x=>x.side==='enemy')?.trialKey);
      clearCheck.dataset.verdict=a.status;
      clearCheck.append(n('p','eyebrow','STAGE CHECK / 通关模拟'),n('h3','','当前队伍能否通关'),n('p','team-clear-stage',trial?trialLabel(trial):'当前自定义敌方阵容'));
      const incomplete=verification.warnings.some(w=>w.includes('源技能缺失'));const titles={cleared:incomplete?'模拟可通关（资料缺项）':'模拟可通关',defeated:incomplete?'本次模拟未通关（资料缺项）':'本次模拟未通关',unresolved:'行动上限内未分出胜负'};if(incomplete)clearCheck.append(n('p','team-warning','该关卡部分技能资料暂缺，可能影响通关判断；缺项详见下方说明。'));
      clearCheck.append(n('strong','team-clear-verdict',titles[a.status]));
      const text=a.status==='cleared'?`第 ${verification.events.length} 次全场行动击败全部敌人，我方存活 ${a.alliesAlive} 人。`:a.status==='defeated'?`第 ${verification.events.length} 次全场行动我方全灭，敌方仍存活 ${a.enemiesAlive} 人。`:`已模拟 ${verification.events.length} 次全场行动，双方仍有成员存活；达到上限不等于无法通关。`;
      clearCheck.append(n('p','',text),n('p','team-wave-progress',`整关进度：已击败 ${verification.clearedWaves} / ${verification.waveCount} 波${a.status==='cleared'?' · 全部完成':` · 当前第 ${verification.waveIndex} 波`}`));
      const notes={sampled:'命中概率抽样（单次模拟，不代表胜率）',normal:'普通命中',critical:'全部暴击',expected:'期望路径估算',strong:'全部强击',miss:'全部闪避'};
      const policy={gameAI:'敌方按关卡策略，我方冷却结束后优先终结技',readyUlt:'双方CD就绪优先终结技',configured:'按成员默认行动'};
      const settings=n('details');settings.append(n('summary','','本次模拟设置'),n('p','team-note',`未安排行动：${policy[state.skillPolicy]}。${notes[state.mode]}；状态${state.effectPolicy==='sampled'?'按施加概率及普通抵抗抽样':state.effectPolicy==='success'?'假设施加成功':'忽略概率与敌方效果'}。${state.openingGauge==='game'?'开局随机条 0–5%':'使用手填开局条'}，种子 ${state.seed}。验证上限 ${a.limit} 次全场行动，独立于预览长度。`));clearCheck.append(settings);
      const hp=n('div','team-clear-roster');for(const side of ['ally','enemy']){const group=n('div');group.append(n('h4','',side==='ally'?'验证结束 · 我方':'验证结束 · 敌方'));for(const actor of verification.actors.filter(x=>x.side===side))group.append(n('p','',`${side==='enemy'&&verification.waveCount>1?'第'+actor.wave+'波 · ':''}${actor.name}：${actor.hp>1e-8?f(actor.hp)+' / '+f(actor.maxHP):'已倒下'}`));hp.append(group);}clearCheck.append(hp);
      if(verification.transitions.length){const log=n('details');log.append(n('summary','','换波记录与入场行动条'));for(const t of verification.transitions){log.append(n('p','',`第 ${t.afterStep} 次行动后进入第 ${t.wave} 波`));for(const g of t.gauges)log.append(n('p','team-note',`${verification.actors.find(a=>a.id===g.id).name}：行动条 ${f(g.gauge*100)}%`));}clearCheck.append(log);}
      if(a.defeats.length){const log=n('details');log.append(n('summary','','关键减员记录'));for(const d of a.defeats)log.append(n('p','team-note',`第 ${d.step} 次行动 · ${d.side==='ally'?'我方':'敌方'} ${d.name} 倒下`));clearCheck.append(log);}
      if(verification.invalid)clearCheck.append(n('p','team-warning',`验证中有 ${verification.invalid} 次行动未能执行，请检查完整时间轴中的CD、控制及目标失效提示。`));
      if(verification.warnings.length){const warnings=n('details','team-clear-warnings');warnings.append(n('summary','',`本次模拟提示 · ${verification.warnings.length} 项`));for(const w of verification.warnings)warnings.append(n('p','team-warning',w));clearCheck.append(warnings);}
      const opening=n('details');opening.append(n('summary','','本次开局行动条'));for(const g of verification.initialGauges)opening.append(n('p','team-note',`${verification.actors.find(a=>a.id===g.id).name}：${f(g.gauge*100)}%`));clearCheck.append(opening);
      clearCheck.append(n('p','team-note','模拟结果仅供参考，不代表实机胜率或通关保证；实际效果以游戏内为准。可点击“换一次随机过程”比较结果。'),button('查看完整验证时间轴',()=>{state.steps=state.verificationLimit;renderControls();recalculate();summary.scrollIntoView({block:'start',behavior:'smooth'});}));
    }
    function renderSummary(){
      summary.replaceChildren();const heading=n('div','team-result-title');heading.append(n('p','eyebrow','BATTLE RESULT / 连续结算'),n('h3','',`当前时间轴预览（上限 ${state.steps} 次行动）`));summary.append(heading);
      const metrics=n('div','team-metrics');for(const [val,label]of [[f(result.totalDamage),'我方累计伤害'],[f(result.totalHPLoss),'我方有效扣血'],[f(result.enemyDamage),'敌方累计伤害'],[result.events.length,'已模拟全场行动']]){const m=n('div');m.append(n('span','',label),n('strong','',val));metrics.append(m);}summary.append(metrics);
      if(result.invalid)summary.append(n('p','team-warning',`${result.invalid} 条指令无法执行（CD、控制或目标失效），已标红；合计仅包括执行成功的行动。`));
      if(result.ended)summary.append(n('p','team-battle-ended',`${result.winner==='ally'?'敌方':'我方'}已全部倒下，时间轴提前结束。`));
      if(result.waveCount>1)summary.append(n('p','team-wave-progress',`预览进度：已击败 ${result.clearedWaves} / ${result.waveCount} 波 · 当前第 ${result.waveIndex} 波`));
      const hp=n('div','team-hp-grid');for(const side of ['ally','enemy']){const group=n('div');group.append(n('h4','',side==='ally'?'我方成员与贡献':'敌方剩余状态'));for(const a of result.actors.filter(a=>a.side===side)){const row=n('div','team-hp-row'),title=n('div');title.append(n('strong','',a.name),n('span','',a.hp<=0?'已倒下':`${f(a.hp)} / ${f(a.maxHP)}`));row.append(title);const meter=n('div','team-hp-track'),bar=n('span');bar.style.width=Math.max(0,a.hp/a.maxHP*100)+'%';meter.append(bar);row.append(meter,n('small','',`自身行动 ${a.ownTurn} 次 · 伤害 ${f(a.damage)} · 护盾 ${f(a.shield)}`));if(a.startingStats)row.append(n('small','',`入场属性（含被动）：生命 ${f(a.startingStats.maxHP)} · 攻 ${f(a.startingStats.attack)} · 防 ${f(a.startingStats.defence)} · 速 ${f(a.startingStats.speed)}`));group.append(row);}hp.append(group);}summary.append(hp);

    }
    function renderTimeline(actors){
      timeline.replaceChildren();const head=n('div','team-timeline-heading');head.append(n('h3','','技能释放时间轴'),button('清空全部施技安排',()=>{state.plan={};recalculate();}));timeline.append(head,n('p','team-note','每行代表一次行动。可修改技能与目标，冷却中的技能不可选；未安排时使用默认策略。'));
      const wrap=n('div','team-timeline-scroll'),table=n('table','team-timeline-table'),thead=n('thead'),hr=n('tr');for(const t of ['全场回合 / 相对时间','行动成员','释放技能','指定目标','伤害判定','伤害 / 扣血','战斗记录'])hr.append(n('th','',t));thead.append(hr);table.append(thead);const tbody=n('tbody');table.append(tbody);wrap.append(table);timeline.append(wrap);
      const actorMap=new Map(actors.map(a=>[a.id,a]));
      for(const e of result.events){
        const actor=actorMap.get(e.actorId),saved=state.plan[e.actorId]?.[e.ownTurn]||{},row=n('tr',(!e.valid?'team-invalid ':'' )+(e.side==='enemy'?'team-enemy-row':''));row.dataset.actorId=e.actorId;row.dataset.ownTurn=e.ownTurn;row.dataset.step=e.step;
        row.dataset.wave=e.wave;
        const cell=()=>{const td=n('td');row.append(td);return td;};const time=cell();time.append(n('strong','',String(e.step).padStart(2,'0')),n('small','',`第 ${e.wave} 波 · ${f(e.time)}`));
        const name=cell();name.append(n('b','',e.actorName),n('small','',`${e.side==='ally'?'我方':'敌方'} · 自身第 ${e.ownTurn} 回合`));
        const set=(key,value)=>{state.plan[e.actorId]??={};state.plan[e.actorId][e.ownTurn]={...(state.plan[e.actorId][e.ownTurn]||{}),[key]:value};recalculate();};
        const choose=n('select');choose.setAttribute('aria-label',`${e.actorName} 自身第${e.ownTurn}回合技能`);
        const automatic=n('option','',`自动：本次${e.skillName}`);automatic.value='auto';choose.append(automatic);
        const wait=n('option','','等待');wait.value=-1;choose.append(wait);
        actor.skills.forEach((s,i)=>{const cd=e.cooldowns[i]||0,o=n('option','',`${s.name}${cd>0?` · CD ${cd}`:''}`);o.value=i;o.disabled=cd>0;choose.append(o);});choose.value=saved.skill==null?'auto':String(saved.skill);choose.addEventListener('change',()=>{state.plan[e.actorId]??={};const order=state.plan[e.actorId][e.ownTurn]??={};if(choose.value==='auto')delete order.skill;else{order.skill=Number(choose.value);order.target='auto';}recalculate();});const skillCell=cell();skillCell.append(choose);if(e.cooldowns[1]>0)skillCell.append(n('small','',`终结技：自身第 ${e.ownTurn+e.cooldowns[1]} 回合就绪`));
        const skill=actor.skills[e.skillIndex],camp=skill?.friendly?actor.side:actor.side==='ally'?'enemy':'ally',target=n('select');target.setAttribute('aria-label',`${e.actorName} 自身第${e.ownTurn}回合目标`);const auto=n('option','',skill?.all?'全体（按技能范围）':'自动选择存活目标');auto.value='auto';target.append(auto);for(const a of actors.filter(a=>a.side===camp&&(e.availableTargetIds.includes(a.id)||saved.target===a.id))){const position=a.side==='ally'?state.actors.filter(x=>x.side==='ally').findIndex(x=>x.id===a.id)+1:Number(a.trialKey?.split(':')[2])||state.actors.filter(x=>x.side==='enemy').findIndex(x=>x.id===a.id)+1;const o=n('option','',`${a.name}（${a.side==='ally'?'我方':'敌方'}${position}）`);o.value=a.id;target.append(o);}target.value=saved.target||'auto';target.disabled=e.skillIndex===-1||!!skill?.all;target.addEventListener('change',()=>set('target',target.value));cell().append(target);
        const outcome=n('select');outcome.setAttribute('aria-label',`${e.actorName} 自身第${e.ownTurn}回合伤害判定`);for(const [v,t]of [['inherit','使用默认'],['normal','普通'],['critical','暴击'],['strong','强击'],['miss','闪避'],['expected','期望路径']]){const o=n('option','',t);o.value=v;outcome.append(o);}outcome.value=saved.outcome||'inherit';outcome.addEventListener('change',()=>{if(outcome.value==='inherit'){const p=state.plan[e.actorId]?.[e.ownTurn];if(p)delete p.outcome;recalculate();}else set('outcome',outcome.value);});cell().append(outcome);
        const damage=cell();damage.append(n('strong','',`我 ${f(e.allyDamage||0)}`),n('small','',`敌 ${f(e.enemyDamage||0)} · 总扣血 ${f(e.hpLoss)}`));
        const log=cell();for(const action of e.actions||[])if(action.kind!=='main')log.append(n('p','team-effect',`${actorMap.get(action.actorId)?.name||action.actorId} · ${({addition:'追加攻击',pinch:'夹击',counter:'反击'})[action.kind]||action.kind} · ${action.skillId} · 伤害 ${f(action.damage)}`));if(e.extraRound)log.append(n('p','team-effect','追加回合：立即行动，独立推进自身冷却'));if(!e.valid)log.append(n('p','team-warning',e.reason));if(e.selectedTargetId&&!e.targets.length)log.append(n('p','',`目标：${actorMap.get(e.selectedTargetId)?.name||e.selectedTargetId}`));for(const t of e.targets)log.append(n('p','',`${actorMap.get(t.sourceId)?.name||'效果'} → ${t.name}：${({dot:'持续伤害',blast:'引爆',direct:'反伤/联动伤害',split:'分担伤害',injury:'侵蚀',effect:'生命变化',normal:'普通',critical:'暴击',strong:'强击',miss:'闪避',expected:'期望'})[t.outcome]||''} · 生命 ${f(t.hpBefore)} → ${f(t.hpAfter)}${t.shieldAfter?' · 盾 '+f(t.shieldAfter):''}`));if(e.effects.length>2){const changes=n('details');changes.append(n('summary','',e.effects.length+' 项状态、治疗或行动条变化'));for(const t of e.effects)changes.append(n('p','team-effect',t));log.append(changes);}else for(const t of e.effects)log.append(n('p','team-effect',t));if(e.warnings.length){const details=n('details');details.append(n('summary','',`${e.warnings.length} 项效果提示`));for(const w of e.warnings)details.append(n('p','team-warning',w));log.append(details);}if(e.skillIndex===-1)log.append(n('p','','等待；自身CD照常递减'));tbody.append(row);
      }
    }
    function renderScope(){
      const open=scope.open;scope.replaceChildren(n('summary','','规则、效果覆盖与计算假设'));scope.open=open;
      scope.append(n('p','','手动安排优先，绑定成员的自身回合；速度或行动条变化后会重新排队。等待仍推进自身冷却，CD 在自身回合结束减 1。我方第 1 位对应前列。'));
      scope.append(n('p','','资源关卡按关卡的三波顺序结算，同波敌人同时入场，最多5人。我方生命、技能CD和被动CD保留；换波不消耗一次全场行动，状态剩余回合减1，双方行动条重新初始化。手填行动条模式每波使用配置值；游戏模式每波重新抽样0–5%。护盾按持续期到期；新入场单位执行开战触发。'));
      for(const p of ['回合数＝全场单个单位的一次行动；每人自己的行动次数另列。默认开局随机行动条0–5%，也可切换为成员手填。随机种子保存于方案；短预览与完整验证共用同一随机过程。同刻就绪仍按配置先后处理。','基础伤害公式、属性克制及CD沿用已核对的客户端规则。随机模式按闪避→暴击→强击→普通的互斥概率选一个结果；闪避仍造成75%普通伤害。期望路径的后续血量和死亡时间属于近似。','试炼敌人自身回合开始时叠攻5%/15%，永久保留，最多999层；固有免疫不受施加成功假设影响。烟光迷离升星Lv.3解锁受击潜影与拉条20%，独立被动CD2；试炼敌人自带此被动时直接生效。','潜影在有可见队友时不能成为单体目标，群攻承伤减少50%，自身造成攻击伤害后解除。敌方自动行动使用关卡技能优先级、CD、基础治疗/冷却条件及前列概率；部分复杂条件、选目标打分仍作近似。我方自动策略为就绪终结技，可手动覆盖。','概率状态可按施加概率和普通抵抗抽样，或统一成功/忽略。普通抵抗通过率为min(90%,max(0,1+效果命中−效果抵抗))，固有免疫始终优先。技能中的忽略抵抗与忽略闪避分别生效。','按游戏技能数据执行已解锁被动及追加技能，追加/夹击/反击计入各自角色贡献且不占用自身主行动；追加回合单列。持续伤害按状态时点结算，驱散、转移、延时、护盾到期、复活和特殊CD参与后续计算。数据缺失或所选忽略策略显示具体提示。实机取整、同刻触发先后仍需持续对照；低等级已知属性差异可用面板覆盖。'])scope.append(n('p','',p));
      const previewWarnings=result.warnings.filter(w=>!verification.warnings.includes(w));if(previewWarnings.length){scope.append(n('h4','','时间轴预览的额外提示'));for(const w of previewWarnings)scope.append(n('p','team-warning',w));}
      if(trials?.note)scope.append(n('p','',trials.note));
      const rules=n('a','','查看组队规则、CD 依据与计算范围 ↗');rules.href='reports/team-calculator-rules.md';rules.target='_blank';rules.rel='noopener';scope.append(rules);
    }
    function loadCard(card,skillId){
      userDirty=true;updateUserNote();
      let x=state.actors.find(a=>a.side==='ally'&&a.cardId===card.id);
      if(!x){if(state.actors.filter(a=>a.side==='ally').length>=4){status.textContent='我方已满4人，请先移除成员或在成员配置中替换羁绊。';host.scrollIntoView({block:'start'});return;}x=fresh('ally',card.id);state.actors.splice(state.actors.findIndex(a=>a.side==='enemy'),0,x);}
      if(skillId){const i=card.skills.filter(s=>!s.hidden&&s.type!=='Passive').findIndex(s=>s.id===skillId);if(i>=0){state.plan[x.id]??={};state.plan[x.id][1]={skill:i,target:'auto'};}}
      status.textContent=`已将 ${card.name} 带入我方队伍。`;renderActors(x.id);recalculate();
    }
    renderControls();renderActors();recalculate();updateUserNote();userStore?.subscribe(()=>{if(!userDirty)applyPersonalTeam();else updateUserNote();});api={loadCard};return api;
  }
  return {mount};
})();
