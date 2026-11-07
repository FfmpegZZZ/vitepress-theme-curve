'use strict';
(() => {
  const data = window.ATLAS;
  const U = window.AtlasGameUI;
  if (!data) { document.body.textContent = '图鉴数据未能加载。请将整个图鉴文件夹保留在一起，再打开 index.html。'; return; }
  let userStorage;try{userStorage=window.localStorage;}catch{}
  const userStore=window.AtlasUserData.createStore(data,window.ATLAS_GROWTH,userStorage);
  const $ = id => document.getElementById(id);
  const state = {view:'cards',person:'',search:'',rarity:'',element:'',availability:'',reserved:false,sort:'default',page:1};
  const PAGE_SIZE = 24;
  const personById = new Map(data.people.map(p=>[p.id,p]));
  const supplemental=window.ATLAS_SUPPLEMENTAL;
  for(const card of data.cards){
    for(const art of supplemental?.images||[]){
      // Related story CG, themes and backgrounds are not the card's artwork.
      if(!art.cardIds.includes(card.id)||art.category!=='character'||art.path!==`Assets/Game/Hero/${card.id}/Img/${card.id}.png`)continue;
      card.gallery.push({label:art.label||art.name,file:art.file,thumb:art.thumb,width:art.width,height:art.height,source:art.path,supplemental:true});
    }
    if(!card.preview&&card.gallery.length)card.preview=card.gallery[0];
    card.hasImage=card.gallery.length>0;
  }
  data.meta.cardsWithImage=data.cards.filter(c=>c.named&&c.hasImage).length;
  const rarityRank = {SSR:0,SR:1,R:2};
  const statNames = {HP:'生命',Attack:'攻击',Defence:'防御',Speed:'速度（参考值）',CriticalRate:'暴击率',CriticalDamageRate:'暴击伤害',EffectHitRate:'效果命中',ResistanceRate:'效果抵抗',PinchRate:'特殊属性（待确认）'};
  const rateFields = new Set(['CriticalRate','CriticalDamageRate','EffectHitRate','ResistanceRate','PinchRate']);
  function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
  function button(text,cls,onClick) { const n=el('button',cls,text); n.type='button'; if(onClick)n.addEventListener('click',onClick); return U.decorateControl(n,text); }
  function picture(src,alt,cls,lazy=true) { const n=el('img',cls);n.src=src;n.alt=alt;if(lazy)n.loading='lazy';n.decoding='async';return n; }
  function countFor(p) { return data.cards.filter(c=>c.named && c.people.includes(p)).length; }
  function formatNumber(value) {return Number(value).toLocaleString('zh-CN',{maximumFractionDigits:3});}
  function formatStat(k,value) {return rateFields.has(k)?`${Number((value*100).toFixed(3))}%`:formatNumber(value);}
  function renderNav() {
    const nav=$('character-nav');nav.replaceChildren();
    const all=button('',`character-nav-button${!state.person?' active':''}`,()=>selectPerson(''));
    const allIcon=el('span','nav-avatar all-icon');allIcon.append(U.icon('SystemIcon','Role'));
    all.append(allIcon,el('span','','全部角色'),el('span','nav-count',data.people.length));
    all.setAttribute('aria-pressed',String(!state.person));nav.append(all);
    for(const p of data.people){
      const n=button('',`character-nav-button${state.person===p.id?' active':''}`,()=>selectPerson(p.id));
      const avatar=el('span','nav-avatar'); if(p.thumb)avatar.append(picture(p.thumb,'','',false));
      n.append(avatar,el('span','',p.name),el('span','nav-count',countFor(p.id)));
      n.setAttribute('aria-pressed',String(state.person===p.id));nav.append(n);
    }
  }
  function selectPerson(id){state.person=id;state.page=1;state.view='cards';renderNav();renderHero();switchView('cards');}
  function renderHero(){
    const person=personById.get(state.person), visual=$('hero-visual');visual.replaceChildren();
    if(person){
      $('hero-title').textContent=person.name;
      $('hero-description').textContent=person.description || '查看角色立绘与关联羁绊资料。';
      if(person.portrait)visual.append(picture(person.portrait,'','single',false));
      const related=data.cards.filter(c=>c.named&&c.people.includes(person.id));
      setCounts([[related.length,'关联羁绊'],[related.filter(c=>c.fullArt).length,'完整卡面'],[related.filter(c=>c.gallery.some(x=>x.label==='骨骼立绘快照')).length,'服装立绘']]);
      $('hero-index').textContent=`CHARACTER / ${person.id}`;
    }else{
      $('hero-title').textContent='神明与羁绊';
      $('hero-description').textContent='从相遇的瞬间，到每一次并肩作战。\n收藏角色立绘、羁绊卡面与战斗资料。';
      for(const id of ['C01_002','C01_102']){const p=personById.get(id);if(p?.portrait)visual.append(picture(p.portrait,'','',false));}
      setCounts([[data.meta.characters,'角色档案'],[data.meta.namedCards,'羁绊档案'],[data.meta.cardsWithArt,'完整卡面']]);
      $('hero-index').textContent='ARCHIVE / 001';
    }
  }
  function setCounts(pairs){$('hero-counts').replaceChildren(...pairs.map(([count,label])=>{const n=el('div');n.append(el('strong','',String(count).padStart(2,'0')),el('span','',label));return n;}));}
  function switchView(view){
    const changed=state.view!==view;
    state.view=view;
    document.body.dataset.view=view;
    const viewNames={cards:'羁绊图鉴',people:'角色立绘',rankings:'角色梯度',calculator:'组队计算',growth:'养成计算',userdata:'我的数据',about:'收录说明'};
    document.querySelector('.breadcrumbs').lastChild.textContent=' '+viewNames[view];
    for(const key of ['cards','people','rankings','calculator','growth','userdata','about'])$(key+'-view').hidden=key!==view;
    document.querySelectorAll('[data-view]').forEach(n=>{const active=n.dataset.view===view;n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    if(view==='cards')renderCards();else if(view==='people')renderPeople();else if(view==='about')renderAbout();
    if(['people','calculator','growth','userdata','rankings'].includes(view))history.replaceState(null,'',location.pathname+location.search+'#'+view);else if(['#people','#calculator','#growth','#userdata','#rankings','#media'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search);
    if(changed)window.scrollTo({top:0,behavior:'instant'});
  }
  const searchIndex = new Map(data.cards.map(c=>[c.id,[c.id,c.name,...c.peopleNames,c.elementName,c.jobName,...c.skills.filter(s=>!s.hidden).map(s=>s.name+' '+s.description)].join(' ').toLowerCase()]));
  function filteredCards(){
    const query=state.search.toLowerCase().trim();
    const cards=data.cards.filter(c=>(state.reserved||c.named)&&(!state.person||c.people.includes(state.person))&&(!state.rarity||c.rarity===state.rarity)&&(!state.element||c.element===state.element)&&(!query||searchIndex.get(c.id).includes(query))&&(!state.availability||(state.availability==='image'&&c.hasImage)||(state.availability==='full'&&c.fullArt)||(state.availability==='missing'&&!c.hasImage)));
    if(state.sort==='rarity')cards.sort((a,b)=>rarityRank[a.rarity]-rarityRank[b.rarity]||a.id.localeCompare(b.id));
    if(state.sort==='name')cards.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')||a.id.localeCompare(b.id));
    return cards;
  }
  function renderCards(){
    const cards=filteredCards(),pages=Math.max(1,Math.ceil(cards.length/PAGE_SIZE));state.page=Math.min(state.page,pages);
    const count=$('results-count');count.replaceChildren(document.createTextNode('找到 '),el('strong','',cards.length),document.createTextNode(' 份羁绊'+(state.person?' · '+personById.get(state.person).name:'')));
    const grid=$('card-grid');grid.replaceChildren();
    $('empty-state').hidden=cards.length!==0;
    cards.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).forEach(c=>{
      const n=button('','card',()=>openCard(c));n.setAttribute('aria-label',`${c.name}，${c.rarity}，${c.peopleNames.join('、')}，查看详情`);n.dataset.cardId=c.id;
      const art=c.preview;
      const type=art?.supplemental?'supplement-art':art?.label==='骨骼立绘快照'?'portrait-art':art?.label!=='完整卡面'?'icon-art':'';
      const stage=el('div','card-visual '+(art?type:'no-art'));
      if(art)stage.append(picture(art.thumb||art.file,`${c.name} · ${art.label}`));else stage.append(U.icon('SystemIcon','Role','missing-art-icon'),el('p','','图片暂未收录'));
      const rarity=el('span','rarity-badge game-rarity-badge '+c.rarity);rarity.setAttribute('aria-label',c.rarity);rarity.append(U.icon('Role',c.rarity));stage.append(rarity);
      if(art)stage.append(el('span','art-type',art.supplemental?'补充素材':art.label==='骨骼立绘快照'?'立绘预览':art.label==='完整卡面'?'完整卡面':'头像预览'));
      const copy=el('div','card-copy');copy.append(el('p','card-kicker',c.id),el('h3','',c.name),el('p','card-people',c.peopleNames.join(' / ')||'暂无对应角色'));
      const bottom=el('div','card-bottom'),identity=el('span','card-identity'),element=el('span','element-label element-'+c.element,c.elementName),job=el('span','job-label',c.jobName);if(c.element)element.prepend(U.icon('Role',c.element));if(c.job)job.prepend(U.icon('Role',c.job,'game-job-icon'));identity.append(element,job);const openIcon=el('span','arrow');openIcon.append(U.utility('arrow'));bottom.append(identity,openIcon);copy.append(bottom);n.append(stage,copy);grid.append(n);
    });
    const pagination=$('pagination');pagination.replaceChildren();
    if(pages>1){
      const change=page=>{state.page=page;renderCards();$('cards-view').scrollIntoView({block:'start',behavior:'smooth'});};
      const prev=button('‹','',()=>change(state.page-1));prev.disabled=state.page===1;prev.setAttribute('aria-label','上一页');pagination.append(prev);
      const visible=new Set([1,pages,state.page-1,state.page,state.page+1]);if(pages<=8)for(let i=1;i<=pages;i++)visible.add(i);
      let last=0;
      for(const page of [...visible].filter(x=>x>0&&x<=pages).sort((a,b)=>a-b)){
        if(last&&page-last>1)pagination.append(el('span','','…'));
        const n=button(page,page===state.page?'active':'',()=>change(page));n.setAttribute('aria-label',`第 ${page} 页`);if(page===state.page)n.setAttribute('aria-current','page');pagination.append(n);last=page;
      }
      const next=button('›','',()=>change(state.page+1));next.disabled=state.page===pages;next.setAttribute('aria-label','下一页');pagination.append(next);
    }
  }
  function renderPeople(){
    $('people-grid').replaceChildren(...data.people.map(p=>{
      const n=button('','person-card',()=>openPerson(p));n.setAttribute('aria-label',p.name+'，查看角色立绘');
      const stage=el('div','person-visual');if(p.portrait)stage.append(picture(p.portrait,p.name+' · 基础立绘'));
      const label=el('div','person-label');label.append(el('h3','',p.name),el('span','',countFor(p.id)+' 份羁绊 ↗'));n.append(stage,label);return n;
    }));
    const extra=$('extra-art');extra.replaceChildren();
    if(data.extraPortraits.length){
      extra.append(el('h3','extra-heading','其他角色立绘'),el('p','extra-description','以下立绘的角色归属尚待确认，暂以编号展示。'));
      const grid=el('div','extra-grid');
      for(const p of data.extraPortraits){const n=button('','extra-card',()=>openZoom(p.webp,p.id+' · 未关联立绘'));n.append(picture(p.thumb||p.webp,p.id+' · 未关联立绘'),el('span','',p.id+' ↗'));grid.append(n);}
      const extraCard=data.unmatchedImages.find(x=>x.name==='C01_X_000');
      if(extraCard){const n=button('','extra-card',()=>openZoom(extraCard.file,'C01_X_000 · 未关联卡面'));n.append(picture(extraCard.thumb,'C01_X_000 · 未关联卡面'),el('span','','C01_X_000 ↗'));grid.append(n);}
      extra.append(grid);
    }
  }
  function openZoom(file,label){$('zoom-title').textContent=label;$('zoom-image').src=file;$('zoom-image').alt=label;$('zoom-download').href=file;$('zoom-download').download=file.split('/').pop();if(!$('zoom-dialog').open)$('zoom-dialog').showModal();}
  function detailReturnUrl(){return location.pathname+location.search+(['rankings','people'].includes(state.view)?'#'+state.view:'');}
  function closeDetail(){if($('detail-dialog').open)$('detail-dialog').close();if(location.hash.startsWith('#card='))history.replaceState(null,'',detailReturnUrl());}
  function openCard(card){
    const content=$('detail-content');content.replaceChildren();
    const header=el('header','detail-header');header.append(el('p','eyebrow','BOND ARCHIVE / '+card.id));
    const title=el('h2','',card.name);title.id='detail-title';header.append(title);
    const meta=el('div','detail-meta'),rarity=el('span','plain-badge game-rarity-badge'),element=el('span','element-label element-'+card.element,card.elementName);rarity.setAttribute('aria-label',card.rarity);rarity.append(U.icon('Role',card.rarity));if(card.element)element.prepend(U.icon('Role',card.element));const job=el('span','job-label',card.jobName);if(card.job)job.prepend(U.icon('Role',card.job,'game-job-icon'));meta.append(rarity,el('span','',card.peopleNames.join(' / ')||'角色未关联'),element,job);if(!card.named)meta.append(el('span','','名称待确认'));header.append(meta);content.append(header);
    const body=el('div','detail-body'),artColumn=el('div','detail-art-column'),dataColumn=el('div','detail-data-column');
    const stage=el('div','art-stage'),caption=el('div','gallery-caption'),thumbs=el('div','gallery-thumbs');
    const showArt=index=>{
      const art=card.gallery[index];stage.replaceChildren();caption.replaceChildren();
      stage.classList.toggle('portrait-stage',art?.label==='骨骼立绘快照');
      if(art){stage.append(picture(art.file,card.name+' · '+U.description(art.label),'',false),button('放大查看 ↗','zoom-button',()=>openZoom(art.file,card.name+' · '+U.description(art.label))));stage.querySelector('img').addEventListener('click',()=>openZoom(art.file,card.name+' · '+U.description(art.label)));caption.append(el('span','',U.description(art.label)),el('span','',art.width?`${art.width} × ${art.height}`:'立绘预览'));}
      else stage.append(el('p','missing-message','图片暂未收录\n可先查看技能、数值与升星效果。'));
      [...thumbs.children].forEach((n,i)=>n.classList.toggle('active',i===index));
    };
    card.gallery.forEach((art,index)=>{const n=button('','',()=>showArt(index));n.setAttribute('aria-label',U.description(art.label));n.append(picture(art.thumb||art.file,U.description(art.label)));thumbs.append(n);});
    artColumn.append(stage,caption,thumbs,el('p','art-source',card.id+'\n图片与资料来源见「来源」'));showArt(0);
    const tabs=el('div','detail-tabs'),panel=el('div');
    const showPanel=key=>{
      [...tabs.children].forEach(n=>{n.classList.toggle('active',n.dataset.tab===key);n.setAttribute('aria-pressed',String(n.dataset.tab===key));});
      panel.replaceChildren();
      if(key==='skills')renderSkills(panel,card);
      if(key==='stats')renderStats(panel,card);
      if(key==='growth')renderGrowth(panel,card);
      if(key==='source')renderSource(panel,card);
    };
    for(const [key,label] of [['skills','技能'],['stats','数值'],['growth','成长'],['source','来源']]){const n=button(label,'',()=>showPanel(key));n.dataset.tab=key;tabs.append(n);}
    dataColumn.append(button('加入组队计算 →','primary-button calc-card-link',()=>enterCalculator(card)));
    if(card.named&&window.ATLAS_GROWTH.profiles[card.raw.RoleUpgradeID])dataColumn.append(button('计算养成材料 →','download-button',()=>{closeDetail();growthCalculator.loadCard(card);switchView('growth');$('growth-view').scrollIntoView({block:'start',behavior:'smooth'});}));
    dataColumn.append(tabs,panel);showPanel('skills');body.append(artColumn,dataColumn);content.append(body);
    if(!$('detail-dialog').open)$('detail-dialog').showModal();$('detail-dialog').scrollTop=0;
    history.replaceState(null,'','#card='+encodeURIComponent(card.id));
  }
  function renderSkills(panel,card){
    const visibleSkills=card.skills.filter(skill=>!skill.hidden);
    for(const [index,skill] of visibleSkills.entries()){
      const block=el('article','skill-block'),heading=el('div','skill-heading');
      const category=['战技','终结技','被动'][index] || skill.name;
      heading.append(U.skill(skill,index),el('span','skill-number',String(index+1).padStart(2,'0')),el('h3','',category));
      if(skill.unlocksAtStarLevel){
        heading.append(el('span','skill-tag',`升星 Lv. ${skill.unlocksAtStarLevel} 解锁`));
      }else if(skill.type==='Passive'){
        const qualifier=skill.name.replace(/【被动】/g,'').trim();
        if(qualifier && qualifier!==category)heading.append(el('span','skill-tag',qualifier));
      }
      block.append(heading,el('p','',U.description(skill.description)));
      const fields=el('div','skill-fields');if(skill.cooldown)fields.append(el('span','','冷却 '+skill.cooldown+' 回合'));if(skill.attackRate)fields.append(el('span','','攻击系数 '+Number((Number(skill.attackRate)*100).toFixed(3))+'%'));block.append(fields);
      const statuses=(skill.statuses||[]).filter(s=>s.description);if(statuses.length){const notes=el('div','status-explanation');notes.textContent=statuses.map(s=>s.name+'：'+s.description).join('\n');block.append(notes);}if(skill.type!=='Passive'&&Number(skill.attackRate)>0)block.append(button('计算此技能 →','download-button',()=>enterCalculator(card,skill.id)));panel.append(block);
    }
    if(!visibleSkills.length)panel.append(el('p','muted-note','技能资料暂未收录。'));
    panel.append(el('p','muted-note','升星解锁与强化效果见「成长」。'));
  }
  function renderStats(panel,card){
    if(!card.stats.length){panel.append(el('p','muted-note','数值资料暂未收录。'));return;}
    const controls=el('div','level-control');controls.append(el('span','','参考等级'));
    const range=el('input');range.type='range';range.min=0;range.max=card.stats.length-1;range.value=0;range.setAttribute('aria-label','参考等级滑块');
    const select=el('select');select.setAttribute('aria-label','参考等级');card.stats.forEach((s,i)=>{const o=el('option','',`Lv. ${s.level}`);o.value=i;select.append(o);});
    controls.append(range,select);panel.append(controls);
    const profiles=el('div','level-control stat-profile-controls');
    const stars=el('select');stars.setAttribute('aria-label','参考星级');
    for(let i=0;i<card.starMultipliers.length;i++){const option=el('option','',i===0?'0 星 · 未升星':`${i} 星${i===5?' · 满星':''}`);option.value=i;stars.append(option);}
    const fanRewards=el('input');fanRewards.type='number';fanRewards.min=0;fanRewards.max=160;fanRewards.step=1;fanRewards.value=0;fanRewards.setAttribute('aria-label','粉丝团属性奖励次数');
    profiles.append(el('span','','参考星级'),stars,el('span','','粉丝团奖励次数'),fanRewards);panel.append(profiles);
    const grid=el('div','stat-grid');panel.append(grid);
    const breakdown=el('p','stat-formula');panel.append(breakdown);
    const update=index=>{
      range.value=index;select.value=index;
      const multiplier=card.starMultipliers[Number(stars.value)],rewards=Math.max(0,Math.min(160,Math.floor(Number(fanRewards.value)||0))),perReward=data.meta.fanClubBonusPerReward;
      const bonus=Object.fromEntries(Object.entries(perReward).map(([key,value])=>[key,value*rewards]));
      grid.replaceChildren(...Object.entries(card.stats[index].values).map(([k,v])=>{const value=Number((v*(multiplier[k]||1)+(bonus[k]||0)).toFixed(9));const n=el('div','stat-cell'),label=el('span','',statNames[k]||k),icon=U.stat(k);if(icon)label.prepend(icon);n.append(label,el('strong','',formatStat(k,value)));return n;}));
      breakdown.textContent=`参考属性 · ${card.stats[index].level} 级 / ${stars.value} 星。生命、攻击、防御升星累计加成 ${Number(((multiplier.HP-1)*100).toFixed(3))}% / ${Number(((multiplier.Attack-1)*100).toFixed(3))}% / ${Number(((multiplier.Defence-1)*100).toFixed(3))}%。粉丝团加成：生命 +${bonus.HP} / 攻击 +${bonus.Attack} / 防御 +${bonus.Defence}。`;
    };
    range.addEventListener('input',()=>update(Number(range.value)));select.addEventListener('change',()=>update(Number(select.value)));stars.addEventListener('change',()=>update(Number(select.value)));fanRewards.addEventListener('input',()=>update(Number(select.value)));update(0);
    panel.append(el('p','muted-note','粉丝团奖励填全账号累计次数；每次生命 +25、攻击 +4、防御 +3，默认不计入。'));
    if(card.id==='C04_SSR_002'){
      const check=el('details','stat-verification');
      check.append(el('summary','','为什么同等级生命值不同？'),el('p','','80 级未升星基础生命为 20,500；计入 17 次粉丝团奖励后为 20,925。满星、不计粉丝团奖励时为 41,000。'),el('p','','粉丝团奖励会额外增加属性。若满星仍计入这 17 次奖励，参考生命为 41,425，该条件尚待游戏面板核对。'));
      check.append(button('查看 80 级 · 17 次粉丝团奖励','download-button',()=>{select.value=card.stats.findIndex(s=>s.level===80);stars.value=0;fanRewards.value=17;update(Number(select.value));}),button('查看满星基础数值','download-button',()=>{select.value=card.stats.findIndex(s=>s.level===80);stars.value=5;fanRewards.value=0;update(Number(select.value));}));panel.append(check);
    }
    if(card.id==='C02_SSR_006')panel.append(el('p','muted-note','共奏心音的 3 级参考属性与已核对的游戏面板有差异。计算低等级战斗时，建议按游戏面板调整属性。'));
    const formula=el('details','stat-formula');formula.append(el('summary','','数值公式与来源'),el('p','',data.meta.statNote),el('p','','等级属性表：'+card.propertyId),el('p','','角色系数：生命 ×'+card.coefficients.HP+' / 攻击 ×'+card.coefficients.Attack+' / 防御 ×'+card.coefficients.Defence+' / 速度 ×'+card.coefficients.Speed));panel.append(formula);
  }
  function renderGrowth(panel,card){
    for(const [key,label] of [['RoleImprint','升星效果']]){
      const group=el('section','growth-group');group.append(el('h3','',label));const rows=card.growth[key]||[];
      if(!rows.length)group.append(el('p','muted-note','升星资料暂未收录。'));
      for(const row of rows){const n=el('div','growth-row');const rates=[['生命',row.hpRate],['攻击',row.attackRate],['防御',row.defenceRate]].filter(x=>x[1]).map(([k,v])=>k+' '+Number((Number(v)*100).toFixed(3))+'%').join(' · ');n.append(el('span','','Lv. '+row.level),el('p','',row.description||rates||'效果说明暂缺'));group.append(n);}panel.append(group);
    }
    panel.append(el('p','muted-note','以上为各升星阶段新增效果。数值页按已达到阶段累计属性加成；满星生命、攻击、防御共提升 100%。Lv. 3 解锁被动，不额外增加三项属性比例。'));
  }
  function renderSource(panel,card){
    const block=el('div','raw-source');block.append(el('h3','','资料与资源编号'),el('p','','角色表 ID：'+card.id),el('p','','角色来源：'+card.source.bundle),el('p','','等级属性引用：'+card.propertyId),el('p','','资源目录版本：'+data.meta.catalog));
    const download=button('保存这份羁绊的 JSON ↓','download-button',()=>{
      const blob=new Blob([JSON.stringify(card,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=card.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });block.append(download);
    const details=el('details');details.append(el('summary','','查看角色原始字段'),el('pre','',JSON.stringify(card.raw,null,2)));block.append(details);
    const growth=el('details');growth.append(el('summary','','查看成长表原始字段'),el('p','','当前成长展示采用升星表 RoleImprint。RoleAscend 原始配置仅保留供查阅，不作为当前突破加成展示。'),el('pre','',JSON.stringify(card.growth,null,2)));block.append(growth);
    const skills=el('details');skills.append(el('summary','','查看技能原始字段'),el('pre','',JSON.stringify(card.skills.map(s=>s.raw||{ID:s.id,missing:true}),null,2)));block.append(skills);
    const hiddenSkills=card.skills.filter(s=>s.hidden);
    if(hiddenSkills.length){
      const hidden=el('details');
      hidden.append(el('summary','','隐藏技能（内部配置）'),el('p','','原始角色引用标有 :Hide，不作为额外的玩家技能展示。'),el('pre','',JSON.stringify(hiddenSkills.map(s=>({reference:s.id+':Hide',raw:s.raw||{ID:s.id,missing:true}})),null,2)));
      block.append(hidden);
    }
    const art=el('details');art.append(el('summary','','查看图片来源'),el('pre','',JSON.stringify(card.gallery.map(x=>({label:x.label,source:x.source,skin:x.skin})),null,2)));block.append(art);
    panel.append(block);
  }
  function openPerson(person){
    const content=$('detail-content');content.replaceChildren();const body=el('div','person-detail'),stage=el('div','person-detail-visual'),copy=el('div','person-detail-copy');
    if(person.portrait)stage.append(picture(person.portrait,person.name+' · 基础立绘','',false));
    copy.append(el('p','eyebrow','CHARACTER / '+person.id));const title=el('h2','',person.name);title.id='detail-title';copy.append(title,el('p','person-description',person.description||'角色介绍暂未收录。'));
    const facts=el('div','person-facts');for(const [key,value]of [['关联羁绊',countFor(person.id)+' 份'],['粉丝团解锁关卡',person.unlockStage||'暂未收录']]){const line=el('div');line.append(el('span','',key),document.createTextNode(value));facts.append(line);}copy.append(facts,el('p','muted-note','角色介绍来自粉丝团。'));
    const actions=el('div','person-actions');actions.append(button('查看关联羁绊 →','primary-button',()=>{closeDetail();selectPerson(person.id);}),button('查看完整立绘 ↗','',()=>openZoom(person.portrait,person.name+' · 基础立绘')),button('查看Q版形象','download-button',()=>{closeDetail();openChibi(person.id);}));copy.append(actions);body.append(stage,copy);content.append(body);if(!$('detail-dialog').open)$('detail-dialog').showModal();$('detail-dialog').scrollTop=0;
  }
  function renderAbout(){
    const host=$('about-view');host.replaceChildren();const header=el('div','about-heading');header.append(el('p','eyebrow','ABOUT THIS COLLECTION'),el('h2','','关于图鉴'),el('p','','收录角色、羁绊与战斗资料，帮助你查阅技能、规划队伍与培养路线。'));host.append(header);
    const stats=el('div','coverage-stats');for(const [n,label]of [[data.meta.characters,'位角色'],[data.meta.namedCards,'份羁绊档案'],[data.meta.cardsWithArt,'张完整卡面'],[data.meta.cardsWithImage,'份已收录图片']]){const card=el('div','coverage-stat');card.append(el('strong','',n),el('span','',label));stats.append(card);}host.append(stats);
    const section=(title,paragraphs)=>{const n=el('section','info-block');n.append(el('h3','',title));for(const p of paragraphs)n.append(el('p','',p));host.append(n);return n;};
    section('收录范围',[`收录 ${data.meta.characters} 位角色与 ${data.meta.namedCards} 份已命名羁绊，可查阅卡面、技能、数值与升星效果。`,'图片按完整卡面、立绘与头像分别标注；Q版形象可在“角色立绘”中查看。','部分图片或技能说明暂未收录。名称待确认的条目默认隐藏，可通过筛选显示；羁绊是否开放、如何获取，请以游戏内为准。']);
    section('数值与计算',['参考属性由等级基础值、升星加成与粉丝团奖励计算。可在数值页调整等级、星级和奖励次数。','升星加成逐阶段累计；满星生命、攻击、防御累计提升 100%，升星 Lv.3 解锁被动。突破只提升等级上限，不额外增加属性。','速度按游戏数据中的单位展示，可能与游戏界面的显示尺度不同。部分低等级数值存在已知差异，可在计算器中按游戏面板调整。','组队计算与梯度排行均为模拟参考。技能时机、队友搭配、属性克制和随机结果都会影响实战表现。']);
    const use=section('个人资料与备份',['在“我的数据”中记录已拥有的羁绊、练度与材料库存，计算器会默认使用保存的资料。计算器里的临时调整不会改写个人档案。','个人资料仅保存在当前浏览器，不上传服务器。更换浏览器、访问地址或清理浏览器数据前，请导出备份；之后可重新导入。']);
    const link=el('a','','下载基础角色资料 JSON ↗');link.href='data/atlas.json';link.download='Kamikoi_Atlas.json';
    const sources=el('details','info-block');sources.append(el('summary','','数据来源与文件下载'),el('p','',`游戏版本 ${data.meta.gameVersion} · 资料版本 ${data.meta.catalog} · 资料整理日期：2026.11.03。以下提供数据表供核对。`),link);host.append(sources);
    const wrap=el('div','source-table-wrap'),table=el('table','source-table'),thead=el('thead'),headrow=el('tr');for(const text of ['数据表','记录数','原始文件'])headrow.append(el('th','',text));thead.append(headrow);table.append(thead);const tbody=el('tbody');for(const source of data.sources){const row=el('tr');row.append(el('td','',source.table),el('td','',source.rows));const cell=el('td'),a=el('a','','查看 TXT ↗');a.href=source.file;a.target='_blank';a.rel='noopener';cell.append(a);row.append(cell);tbody.append(row);}table.append(tbody);wrap.append(table);sources.append(wrap);
    section('素材权属',['游戏中的角色、美术、名称与原文属于原权利人。本图鉴供玩家查阅与参考。']);
    section('免责声明',['本站为非官方玩家图鉴，角色资料、攻略、梯度排行和计算结果仅供参考，可能因资料遗漏、版本更新或模拟条件而与游戏内表现不同。','实际数值、技能效果、养成消耗、关卡奖励及开放情况均以游戏内为准。培养建议不构成抽取或消费建议，模拟结果不代表实战通关保证。']);
  }
  function reset(){Object.assign(state,{person:'',search:'',rarity:'',element:'',availability:'',reserved:false,sort:'default',page:1});$('search').value='';$('element-filter').value='';$('availability-filter').value='';$('include-reserved').checked=false;$('sort').value='default';document.querySelectorAll('[data-rarity]').forEach(n=>{const active=n.dataset.rarity==='';n.classList.toggle('active',active);n.setAttribute('aria-pressed',String(active));});renderNav();renderHero();renderCards();}
  $('card-total').textContent=data.meta.namedCards;
  for(const [value,label]of [...new Map(data.cards.map(c=>[c.element,c.elementName]))].filter(([key])=>key).sort()) {const o=el('option','',label);o.value=value;$('element-filter').append(o);}
  const viewIcons={cards:['SystemIcon','Role'],people:['SystemIcon','FanClub'],rankings:['Common','Icon_Star1'],calculator:['SystemIcon','Trial'],growth:['Item','GrowthPotion_SSR'],userdata:['SystemIcon','Role'],about:['Common','Icon_Info']};
  document.querySelectorAll('[data-view]').forEach(n=>{const [group,name]=viewIcons[n.dataset.view];n.prepend(U.icon(group,name,n.dataset.view==='about'?'game-icon-tile':''));n.addEventListener('click',()=>switchView(n.dataset.view));});
  document.querySelectorAll('[data-rarity]').forEach(n=>n.addEventListener('click',()=>{state.rarity=n.dataset.rarity;state.page=1;document.querySelectorAll('[data-rarity]').forEach(x=>{const active=x===n;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});renderCards();}));
  $('search').addEventListener('input',()=>{state.search=$('search').value;state.page=1;renderCards();});
  for(const [id,key]of [['element-filter','element'],['availability-filter','availability'],['sort','sort']])$(id).addEventListener('change',()=>{state[key]=$(id).value;state.page=1;renderCards();});
  $('include-reserved').addEventListener('change',()=>{state.reserved=$('include-reserved').checked;state.page=1;renderCards();});
  $('reset-filters').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
  $('source-button').addEventListener('click',()=>switchView('about'));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();reset();switchView('cards');window.scrollTo({top:0,behavior:'smooth'});});
  $('detail-close').addEventListener('click',closeDetail);
  $('detail-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#card='))history.replaceState(null,'',detailReturnUrl());});
  $('zoom-close').addEventListener('click',()=>$('zoom-dialog').close());
  for(const id of ['detail-close','zoom-close']){$(id).replaceChildren(U.utility('close'));}
  for(const id of ['reset-filters','empty-reset','source-button','zoom-download'])U.decorateControl($(id),$(id).textContent);
  for(const id of ['detail-dialog','zoom-dialog'])$(id).addEventListener('click',event=>{if(event.target!==$(id))return;const r=$(id).getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$(id).close();});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();switchView('cards');$('search').focus();}});
  document.body.dataset.view=state.view;
  renderNav();renderHero();renderCards();
  window.AtlasUserDataUI.mount($('user-data-manager'),data,window.ATLAS_GROWTH,userStore);
  window.AtlasCalculator.mount($('single-calculator'),data,userStore);
  const calculator=window.AtlasTeamCalculator.mount($('team-calculator'),data,userStore);
  const growthCalculator=window.AtlasGrowthCalculator.mount($('growth-calculator'),data,userStore);
  window.AtlasRankings.mount($('rankings'),data,userStore,{openCard,goCalculator:()=>switchView('calculator')});
  const chibiGallery=window.AtlasChibiGallery.mount($('chibi-gallery'),data,{openZoom});
  function setPortraitMode(mode){
    const isChibi=mode==='chibi';$('standard-portraits').hidden=isChibi;$('chibi-gallery').hidden=!isChibi;
    for(const [id,active] of [['portrait-standard',!isChibi],['portrait-chibi',isChibi]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
  }
  function openChibi(person=''){switchView('people');setPortraitMode('chibi');chibiGallery.select(person);$('people-view').scrollIntoView({block:'start',behavior:'instant'});}
  $('portrait-standard').addEventListener('click',()=>setPortraitMode('standard'));
  $('portrait-chibi').addEventListener('click',()=>setPortraitMode('chibi'));
  function enterCalculator(card,skillId){closeDetail();calculator.loadCard(card,skillId);switchView('calculator');$('calculator-view').scrollIntoView({block:'start',behavior:'smooth'});}
  document.querySelectorAll('a:not(.brand),.user-file-label').forEach(control=>U.decorateControl(control,control.textContent));
  function openLinkedCard(){
    if(location.hash==='#media'){openChibi();return;}
    if(location.hash==='#people'){switchView('people');return;}
    if(location.hash==='#rankings'){switchView('rankings');return;}
    if(location.hash==='#userdata'){switchView('userdata');return;}
    if(location.hash==='#growth'){switchView('growth');return;}
    if(location.hash==='#calculator'){switchView('calculator');return;}
    if(!location.hash.startsWith('#card='))return;
    let id;try{id=decodeURIComponent(location.hash.slice(6));}catch{return;}
    const card=data.cards.find(c=>c.id===id);if(card)openCard(card);
  }
  window.addEventListener('hashchange',openLinkedCard);
  openLinkedCard();
})();
