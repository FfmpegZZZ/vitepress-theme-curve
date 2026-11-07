'use strict';
window.AtlasGrowthCalculator=(()=>{
  const U=window.AtlasGameUI,G=window.AtlasGrowth,D=window.ATLAS_GROWTH;
  const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const fmt=v=>v.toLocaleString('zh-CN');
  function button(text,fn,cls=''){const e=n('button',cls,text);e.type='button';e.addEventListener('click',fn);return U.decorateControl(e,text);}
  function itemIcon(id){return U.icon('Item',D.items[id].icon,'growth-item-icon');}
  function mount(host,atlas,userStore){
    const Users=window.AtlasUserData,personal=()=>userStore?.get()||Users.empty();let userDirty=false;
    const cards=atlas.cards.filter(c=>c.named&&D.profiles[c.raw.RoleUpgradeID]);
    let card=cards.find(c=>c.id===Users.teamIds(personal())[0])||cards.find(c=>c.id==='C04_SSR_002')||cards[0];
    const stock={...personal().inventory};
    const intro=n('div','team-intro');intro.append(n('p','eyebrow','GROWTH PLANNER'),n('h2','','养成所需，一次算清'),n('p','','选择当前与目标练度，按最高档资源关计算材料缺口与体力。'));host.append(intro);
    const userBar=n('div','user-defaults'),userNote=n('p'),link=n('a','','管理我的数据 ↗');link.href='#userdata';userBar.append(userNote,button('带入我的练度与库存',()=>applyPersonal(true),'team-button'),link);host.append(userBar);
    host.addEventListener('input',()=>{userDirty=true;updateUserNote();});host.addEventListener('change',()=>{userDirty=true;updateUserNote();});
    function updateUserNote(){const row=personal().roster.find(r=>r.cardId===card.id);userNote.textContent=row?`${personal().name} · ${userDirty?'临时计划，未改写个人档案':'已带入个人练度与库存'}`:'未录入此羁绊，可直接设置当前练度。';}
    const setup=n('section','growth-setup'),choose=button('',()=>openPicker(),'team-card-select growth-card-select');choose.setAttribute('aria-label','选择养成羁绊');
    const ranges=n('div','growth-ranges');
    const controls={};
    function numeric(key,label,value,min,max,parent){
      const wrap=n('label','team-field'),e=n('input');e.type='number';e.min=min;e.max=max;e.step=1;e.value=value;e.setAttribute('aria-label',label);wrap.append(n('span','',label),e);parent.append(wrap);controls[key]=e;return e;
    }
    function stageSelect(key,label,value,parent){
      const wrap=n('label','team-field'),e=n('select');e.setAttribute('aria-label',label);
      for(let i=0;i<=7;i++){const option=n('option','',`${i===0?'未突破':'突破 '+i+' 次'} · 上限 Lv.${(i+1)*10}`);option.value=i;e.append(option);}e.value=value;
      controls[key]=e;wrap.append(n('span','',label),e);parent.append(wrap);
    }
    for(const [side,title,level,stage] of [['current','当前养成',1,0],['target','目标养成',80,7]]){
      const panel=n('div','growth-range');panel.append(n('h3','',title));const fields=n('div','growth-fields');
      numeric(side+'Level',side==='current'?'当前等级':'目标等级',level,1,80,fields);stageSelect(side+'Break',side==='current'?'当前突破':'目标突破',stage,fields);panel.append(fields);ranges.append(panel);
    }
    const progressRow=n('div','growth-progress');numeric('currentExp','本级已有经验',0,0,119,progressRow);const progressHint=n('p','growth-note');progressRow.append(progressHint);
    setup.append(choose,ranges,progressRow,n('p','growth-note','突破阶段随等级匹配；整十级可选择先突破。'));host.append(setup);

    const inventory=n('details','growth-inventory'),inventoryTitle=n('summary','','已有材料 · 可调整');inventory.append(inventoryTitle);
    const stockGrid=n('div','growth-stock-grid');inventory.append(stockGrid,n('p','growth-note','试算不会扣减已保存库存。'));
    inventory.append(button('清空所有库存',()=>{userDirty=true;updateUserNote();for(const key of Object.keys(stock))delete stock[key];renderStock();update();},'reset-button'));host.append(inventory);
    const error=n('p','growth-error');error.setAttribute('role','alert');error.hidden=true;host.append(error);
    const results=n('div','growth-results');results.setAttribute('aria-label','养成计算结果');host.append(results);

    const picker=n('dialog','team-card-picker');picker.setAttribute('aria-labelledby','growth-picker-title');
    const pickerHeader=n('div','team-picker-header'),pickerTitle=n('h2','','选择养成羁绊');pickerTitle.id='growth-picker-title';
    const close=button('×',()=>picker.close(),'team-picker-close');close.setAttribute('aria-label','关闭养成角色选择');pickerHeader.append(pickerTitle,close);
    const filters=n('div','team-picker-filters'),search=n('input'),rarity=n('select');search.type='search';search.placeholder='搜索羁绊、角色或编号';search.setAttribute('aria-label','搜索养成羁绊');rarity.setAttribute('aria-label','养成稀有度筛选');
    const ownership=n('select','user-picker-ownership');ownership.setAttribute('aria-label','养成角色拥有筛选');for(const [value,label] of [['owned','仅看已拥有'],['all','全部羁绊']]){const o=n('option','',label);o.value=value;ownership.append(o);}
    for(const value of ['','SSR','SR','R']){const o=n('option','',value||'全部稀有度');o.value=value;rarity.append(o);}filters.append(U.icon('Common','Icon_Magnifier','game-icon-tile'),search,rarity);
    filters.append(ownership);const count=n('p','team-picker-count'),grid=n('div','team-picker-grid');count.setAttribute('role','status');picker.append(pickerHeader,filters,count,grid);host.append(picker);
    function renderPicker(){
      const owned=new Map(personal().roster.map(r=>[r.cardId,r]));const query=search.value.trim().toLowerCase(),matches=cards.filter(c=>(ownership.value!=='owned'||owned.has(c.id))&&(!rarity.value||c.rarity===rarity.value)&&(!query||[c.name,c.id,...c.peopleNames].join(' ').toLowerCase().includes(query)));
      grid.replaceChildren();
      for(const c of matches){const option=button('',()=>{card=c;picker.close();applyPersonal(false);userDirty=true;updateUserNote();},'team-picker-option');option.setAttribute('aria-label',c.name+' · '+c.rarity+' · '+c.peopleNames.join('/'));option.setAttribute('aria-pressed',String(c.id===card.id));const art=n('div','team-picker-art');art.append(U.portrait(c),U.icon('Role',c.rarity,'team-picker-rarity'));option.append(art,n('b','',c.name),n('small','',c.peopleNames.join(' / ')));if(owned.has(c.id)){const r=owned.get(c.id);option.append(n('small','user-owned-badge',`已拥有 · Lv.${r.level} / ${r.stars} 星`));}grid.append(option);}
      count.textContent='找到 '+matches.length+' 份羁绊 · 点击图片选择';
    }
    function openPicker(){search.value='';rarity.value='';ownership.value=personal().roster.length?'owned':'all';renderPicker();picker.showModal();search.focus();}
    search.addEventListener('input',renderPicker);rarity.addEventListener('change',renderPicker);
    ownership.addEventListener('change',renderPicker);
    picker.addEventListener('click',event=>{if(event.target!==picker)return;const r=picker.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)picker.close();});
    function renderCard(){
      const text=n('span','team-card-select-copy');text.append(n('b','',card.name),n('small','',card.peopleNames.join(' / ')+' · '+card.elementName+' · '+card.rarity),n('small','team-card-select-hint','更换羁绊 ›'));
      choose.replaceChildren(U.portrait(card),text,U.icon('Role',card.rarity,'team-select-rarity'));
    }
    function renderStock(){
      stockGrid.replaceChildren();
      for(const id of [...D.expItems.slice().reverse(),D.moneyId,...D.stages[card.element].rewards.map(r=>r.id)]){
        const item=D.items[id],label=n('label','growth-stock-item'),text=n('span');text.append(n('b','',item.name),n('small','',item.value?'每个 '+fmt(item.value)+' 经验':id===D.moneyId?'星银宝藏掉落':'对应属性突破材料'));
        const input=n('input');input.type='number';input.min=0;input.max=1000000000;input.step=1;input.value=stock[id]||0;input.setAttribute('aria-label','已有'+item.name);input.addEventListener('input',()=>{stock[id]=input.valueAsNumber;update();});label.append(itemIcon(id),text,input);stockGrid.append(label);
      }
    }
    function syncProgress(){
      const lv=controls.currentLevel.valueAsNumber,stage=Number(controls.currentBreak.value),value=D.levels[card.rarity][lv];
      const capped=lv===(stage+1)*10;controls.currentExp.disabled=capped;controls.currentExp.max=capped?0:(value||0)-1;
      if(capped||controls.currentExp.valueAsNumber>=value)controls.currentExp.value=0;
      progressHint.textContent=capped?'已达到当前等级上限，本级经验为 0。':value?'距离下一级共需 '+fmt(value)+' 经验；这里只填经验条当前进度。':'请填写 1–80 级。';
    }
    function normalize(key){
      const current=controls.currentLevel.valueAsNumber,target=controls.targetLevel.valueAsNumber;
      if(key.endsWith('Level')){
        const lv=controls[key].valueAsNumber;if(!Number.isInteger(lv)||lv<1||lv>80)return;
        const stage=controls[key.replace('Level','Break')];stage.value=G.requiredBreak(lv);
        if(key==='targetLevel'&&Number(stage.value)<Number(controls.currentBreak.value))stage.value=controls.currentBreak.value;
        if(key==='currentLevel'&&target<current)controls.targetLevel.value=current;
      }else if(key.endsWith('Break')){
        const prefix=key.replace('Break',''),stage=Number(controls[key].value),level=controls[prefix+'Level'];
        level.value=Math.max(1,stage*10,Math.min((stage+1)*10,level.valueAsNumber||1));
      }
      if(key.startsWith('current')){
        if(controls.targetLevel.valueAsNumber<controls.currentLevel.valueAsNumber)controls.targetLevel.value=controls.currentLevel.value;
        if(Number(controls.targetBreak.value)<Number(controls.currentBreak.value))controls.targetBreak.value=controls.currentBreak.value;
      }
      syncProgress();
    }
    for(const [key,input] of Object.entries(controls))input.addEventListener(key.endsWith('Break')?'change':'input',()=>{if(key!=='currentExp')normalize(key);update();});
    function materialLine(id,amount){const line=n('span','growth-loot');line.append(itemIcon(id),n('span','',D.items[id].name+' × '+fmt(amount)));return line;}
    function update(){
      let result;
      try{result=G.calculate(D,{profileId:card.raw.RoleUpgradeID,currentLevel:controls.currentLevel.valueAsNumber,targetLevel:controls.targetLevel.valueAsNumber,currentBreak:Number(controls.currentBreak.value),targetBreak:Number(controls.targetBreak.value),currentExp:controls.currentExp.valueAsNumber,inventory:stock});}
      catch(e){error.textContent=e.message;error.hidden=false;results.replaceChildren();return;}
      error.hidden=true;results.replaceChildren();
      const overview=n('section','growth-overview'),head=n('div','growth-result-heading');head.append(n('p','eyebrow','YOUR GROWTH PLAN'),n('h3','',card.name+' · Lv.'+controls.currentLevel.value+' → Lv.'+controls.targetLevel.value),n('p','','突破 '+controls.currentBreak.value+' → '+controls.targetBreak.value+' 次 · 已扣除填写的库存'));overview.append(head);
      const metrics=n('div','growth-metrics');
      for(const [label,value,unit] of [['所需经验',result.exp.required,'EXP'],['突破银币',result.money.required,'银币'],['预计通关',result.totalRuns,'次'],['合计体力',result.totalEnergy,'体力']]){const box=n('div','growth-metric');box.append(n('span','',label),n('strong','',fmt(value)),n('small','',unit));metrics.append(box);}overview.append(metrics,n('p','growth-note','银币仅计突破费用，升级费用待核实。'));results.append(overview);
      const needs=n('section','growth-needs');needs.append(n('h3','','材料清单'));
      const table=n('table'),thead=n('thead'),hr=n('tr');for(const text of ['资源','总需求','已有','还缺'])hr.append(n('th','',text));thead.append(hr);table.append(thead);const tbody=n('tbody');
      const rows=[{id:'exp',...result.exp},{id:D.moneyId,...result.money},...result.materials];
      for(const row of rows){const tr=n('tr'),name=n('td');if(row.id==='exp'){name.append(itemIcon('101'),n('span','','升级经验'));}else{name.append(itemIcon(row.id),n('span','',D.items[row.id].name));}tr.append(name,n('td','',fmt(row.required)),n('td','',fmt(row.owned)),n('td','',fmt(row.deficit)));tbody.append(tr);}table.append(tbody);const wrap=n('div','growth-table-wrap');wrap.append(table);needs.append(wrap);results.append(needs);
      const farms=n('section','growth-farms');farms.append(n('h3','','刷本安排'),n('p','growth-note','按资源关末关的常规奖励估算 · 每次 8 体力'));
      const farmGrid=n('div','growth-farm-grid');
      for(const farm of result.farms){const box=n('article','growth-farm');box.dataset.kind=farm.kind;
        const header=n('div','growth-farm-heading');header.append(itemIcon(farm.stage.rewards[0].id),n('h4','',farm.stage.name+' · 第 '+farm.stage.floor+' 关'));box.append(header);
        const cost=n('p','growth-farm-cost');cost.append(n('strong','',fmt(farm.runs)),document.createTextNode(' 次通关'),n('span','',fmt(farm.energy)+' 体力'));box.append(cost);
        const yieldLine=n('div','growth-farm-yield');yieldLine.append(n('small','','每次获得'));
        for(const reward of farm.stage.rewards)yieldLine.append(materialLine(reward.id,reward.count));
        if(farm.kind==='exp')yieldLine.append(n('p','growth-note','合计 '+fmt(farm.yield)+' 经验 / 次'));box.append(yieldLine);
        if(!farm.runs)box.append(n('p','growth-farm-surplus','库存已满足，无需刷取。'));
        else if(farm.kind==='crystal'){const rest=n('div','growth-farm-surplus');rest.append(n('small','','满足需求后预计剩余'));for(const m of farm.loot)rest.append(materialLine(m.id,m.surplus));box.append(rest);}
        else box.append(n('p','growth-farm-surplus','本轮新增资源余量：'+fmt(farm.surplus)+(farm.kind==='exp'?' 经验':' 银币')));
        farmGrid.append(box);
      }farms.append(farmGrid);results.append(farms);
      const details=n('details','growth-details');details.append(n('summary','','逐次突破与升级明细'));
      for(const step of result.steps){const line=n('div','growth-step');line.append(n('b','',`突破 ${step.from} → ${step.to} 次 · Lv.${step.to*10} 时`),materialLine(D.moneyId,step.money));for(const m of step.materials)line.append(materialLine(m.id,m.count));details.append(line);}
      if(!result.steps.length)details.append(n('p','growth-note','当前计划无需新增突破。'));
      const levels=n('p','growth-level-list',result.exp.levelSteps.map(s=>`Lv.${s.from}→${s.to}：${fmt(s.exp)}`).join(' ｜ ')||'当前计划无需升级。');details.append(levels);results.append(details);
      const notes=n('details','growth-details');notes.append(n('summary','','计算规则与数据来源'),n('p','growth-note','升星不影响升级与突破材料。经验按道具总经验折算，结晶按属性分别扣除库存；三品质结晶同场掉落，刷取次数取各品质缺口所需次数的最大值。'),n('p','growth-note','经验来自 RoleLevelUp，突破来自 RoleUpgrade；等级上限按当前突破次数计算。道具名称与图标来自 Item，刷本消耗与常规奖励来自 Scene / Drop。'),n('p','growth-note','银币按已确认的突破费用计算，刷取关卡为星银宝藏。升级是否另耗银币尚待确认，暂未计入。'),n('p','growth-note','经验库存与刷取余量按道具总价值折算，不模拟逐个喂养的溢出损失；不计合成、分解、首通、活动、VIP或额外自然恢复体力。最高档关卡需已解锁并可稳定通关。结果为参考值，实际消耗与奖励以游戏内为准。'));
      for(const name of D.sources){const a=n('a','',name+' ↗');a.href='data/raw/'+name+'.txt';a.target='_blank';a.rel='noopener';notes.append(a);}results.append(notes);
    }
    function applyPersonal(includeStock){
      const p=personal(),defaults=Users.growthDefaults(p,card.id);for(const [key,value]of Object.entries(defaults))controls[key].value=value;
      controls.targetLevel.value=Math.max(defaults.currentLevel,controls.targetLevel.valueAsNumber||80);controls.targetBreak.value=Math.max(defaults.currentBreak,window.AtlasGrowth.requiredBreak(controls.targetLevel.valueAsNumber));
      if(includeStock){for(const id of Object.keys(stock))delete stock[id];Object.assign(stock,p.inventory);userDirty=false;}
      renderCard();renderStock();syncProgress();update();updateUserNote();
    }
    applyPersonal(true);userStore?.subscribe(()=>{if(!userDirty){const first=cards.find(c=>c.id===Users.teamIds(personal())[0]);if(first)card=first;applyPersonal(true);}else updateUserNote();});
    return {loadCard(c){if(cards.some(x=>x.id===c.id)){card=c;applyPersonal(false);userDirty=true;updateUserNote();}}};
  }
  return {mount};
})();
