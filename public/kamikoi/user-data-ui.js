'use strict';
window.AtlasUserDataUI=(()=>{
  const U=window.AtlasUserData,V=window.AtlasGameUI;
  const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  function button(text,fn,cls='team-button'){const e=n('button',cls,text);e.type='button';e.addEventListener('click',fn);return V.decorateControl(e,text);}
  function mount(host,atlas,growth,store){
    const cards=atlas.cards.filter(c=>c.named&&c.stats.length),byId=new Map(cards.map(c=>[c.id,c]));let draft=store.get(),pending;
    const intro=n('div','team-intro');intro.append(n('p','eyebrow','MY COLLECTION'),n('h2','','把你的羁绊，带入每次计算'),n('p','','保存角色、练度与库存，计算器自动带入。'));host.append(intro);
    const toolbar=n('section','user-panel'),importTitle=n('h3','','导入与备份'),tools=n('div','user-actions');toolbar.append(importTitle,n('p','growth-note','支持本站 JSON / CSV 模板，最大 2 MB。资料仅保存在当前浏览器，不上传服务器。'));
    const fileLabel=n('label','user-file-label','选择角色数据文件'),file=n('input');file.type='file';file.accept='.json,.csv,application/json,text/csv';file.setAttribute('aria-label','导入角色数据文件');fileLabel.append(file);tools.append(fileLabel);
    function download(value,name,type){const url=URL.createObjectURL(new Blob([value],{type})),a=n('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    tools.append(button('导出已保存 JSON',()=>download(JSON.stringify(store.get(),null,2),'神明恋爱-我的角色数据.json','application/json;charset=utf-8')));
    tools.append(button('导出当前编辑 JSON',()=>{try{download(JSON.stringify(U.normalize(draft,atlas,growth),null,2),'神明恋爱-当前编辑数据.json','application/json;charset=utf-8');message('已下载当前编辑内容；如需用于计算，请点击“保存我的资料”。');}catch(e){message('导出失败：'+e.message,true);}}));
    for(const [label,path] of [['下载 JSON 模板','data/user-data-template.json'],['下载 CSV 模板','data/user-data-template.csv']]){const a=n('a','team-button',label);a.href=path;a.download=path.split('/').at(-1);tools.append(a);}
    tools.append(button('恢复上一版资料',()=>{try{store.restore();message('已恢复上一版资料。');}catch(e){message(e.message,true);}}));toolbar.append(tools);host.append(toolbar);
    const status=n('p','user-status');status.setAttribute('role','status');const error=n('p','growth-error');error.setAttribute('role','alert');error.hidden=true;host.append(status,error);
    function message(text,bad=false){status.textContent=bad?'':text;error.textContent=bad?text:'';error.hidden=!bad;}
    const editor=n('section','user-panel'),header=n('div','user-section-heading'),count=n('span');header.append(n('h3','','我的角色与默认队伍'),count);editor.append(header);
    const settings=n('div','user-settings');
    function field(parent,label,value,{min=0,max=80,type='number',choices,onChange}={}){
      const wrap=n('label','team-field'),input=n(choices?'select':'input');input.setAttribute('aria-label',label);
      if(choices){for(const [id,text] of choices){const o=n('option','',text);o.value=id;input.append(o);}}else{input.type=type;if(type==='number'){input.min=min;input.max=max;input.step=1;}else input.maxLength=40;}input.value=value;
      input.addEventListener(choices||type==='text'?'change':'input',()=>{onChange?.(choices?Number(input.value):type==='number'?input.valueAsNumber:input.value);message('修改尚未保存，保存后供计算器使用。');});wrap.append(n('span','',label),input);parent.append(wrap);return input;
    }
    const name=field(settings,'档案名称',draft.name,{type:'text',onChange:v=>draft.name=v}),rewards=field(settings,'账号粉丝团奖励次数',draft.fanRewards,{max:160,onChange:v=>draft.fanRewards=v});editor.append(settings,n('p','growth-note','勾选最多 4 名组成默认队伍；未勾选时使用列表前 4 名。'));
    const actions=n('div','user-actions');actions.append(button('＋ 添加已拥有羁绊',()=>openPicker()),button('保存我的资料',save,'primary-button'));editor.append(actions);
    const teamPreview=n('div','user-team-preview');teamPreview.setAttribute('aria-label','默认队伍预览');editor.append(teamPreview);
    const roster=n('div','user-roster');roster.setAttribute('aria-label','我的角色练度列表');editor.append(roster);host.append(editor);
    const inventory=n('details','user-panel');inventory.append(n('summary','','养成材料库存（可选）'));const inventoryGrid=n('div','growth-stock-grid');inventory.append(inventoryGrid,n('p','growth-note','保存后供养成计算使用，试算不会扣减库存。'));host.append(inventory);
    const bottom=n('div','user-actions');bottom.append(button('保存我的资料',save,'primary-button'),button('放弃未保存修改',()=>{draft=store.get();render();message('已还原为上次保存的资料。');}));host.append(bottom);
    const help=n('details','user-panel');help.append(n('summary','','导入格式与使用说明'),n('p','growth-note','暂不支持直接解析游戏存档或截图。默认队伍按所列顺序入场，可用“前移”调整。'),n('p','growth-note','CSV 仅导入角色列表，默认队伍取前 4 名，粉丝团奖励与库存为 0；完整备份请使用 JSON。导入是替换整份档案，预览确认后生效，并保留上一版可恢复。'),n('p','growth-note','cardId：羁绊编号（添加窗口可查）；level：1–80；stars：0–5；breakthrough：突破次数 0–7；exp：当前等级经验条进度。省略突破时按等级推定最低必要次数，整十级若已完成突破需手动指定。JSON 的 fanRewards 是账号全局奖励次数，team 是最多 4 个已拥有编号，inventory 是道具编号与数量。'),n('p','growth-note','资料仅保存在当前浏览器和当前地址；更换浏览器、访问地址或清理浏览器数据后需要重新导入。建议导出 JSON 备份。计算器的修改只作用于当前试算，不会自动写回档案。'));host.append(help);
    function markChanged(){message('修改尚未保存，保存后供计算器使用。');}
    function save(){try{store.save(draft);message('已保存。临时方案如需同步，请点击计算器的“带入我的队伍 / 练度”。');}catch(e){message(e.message,true);}}
    function renderTeam(){teamPreview.replaceChildren();const ids=U.teamIds(draft);if(!ids.length)return;ids.forEach((id,i)=>{const c=byId.get(id),row=draft.roster.find(r=>r.cardId===id),box=n('span','user-team-chip');box.append(V.portrait(c),n('span','',`${i+1}. ${c.name} · Lv.${row.level} / ${row.stars} 星`));teamPreview.append(box);});}
    function renderRoster(){
      count.textContent=draft.roster.length+' 份已拥有';renderTeam();roster.replaceChildren();
      if(!draft.roster.length){const empty=n('div','user-empty');empty.append(n('p','','还没有角色资料'),n('p','growth-note','导入资料或添加羁绊，开始记录练度。'));roster.append(empty);}
      for(const row of draft.roster){
        const card=byId.get(row.cardId),box=n('article','user-roster-card'),head=n('div','user-roster-head'),copy=n('div');copy.append(n('h4','',card.name),n('small','',card.rarity+' · '+card.peopleNames.join(' / ')+' · '+card.id));head.append(V.portrait(card),copy);box.append(head);
        const fields=n('div','user-row-fields');let expInput,breakInput;
        const level=field(fields,'等级 · '+card.name,row.level,{min:1,max:80,onChange:v=>{row.level=v;if(Number.isInteger(v)&&v>=1&&v<=80){row.breakthrough=Math.ceil(v/10)-1;breakInput.value=row.breakthrough;row.exp=0;expInput.value=0;refreshExp();}renderTeam();}});
        field(fields,'星级 · '+card.name,row.stars,{choices:Array.from({length:6},(_,i)=>[i,i+' 星']),onChange:v=>{row.stars=v;renderTeam();}});
        breakInput=field(fields,'突破次数 · '+card.name,row.breakthrough,{choices:Array.from({length:8},(_,i)=>[i,(i?'突破 '+i+' 次':'未突破')+' · 上限 '+(i+1)*10+' 级']),onChange:v=>{row.breakthrough=v;row.level=Math.max(1,v*10,Math.min((v+1)*10,row.level||1));level.value=row.level;row.exp=0;expInput.value=0;refreshExp();renderTeam();}});
        expInput=field(fields,'本级经验 · '+card.name,row.exp,{max:1000000,onChange:v=>row.exp=v});
        function refreshExp(){const cap=row.level===(row.breakthrough+1)*10;expInput.disabled=cap;expInput.max=cap?0:(growth.levels[card.rarity][row.level]||1)-1;}
        refreshExp();box.append(fields);
        const foot=n('div','user-row-actions'),teamLabel=n('label','user-check'),check=n('input');check.type='checkbox';check.checked=draft.team.includes(card.id);check.setAttribute('aria-label','默认队伍 · '+card.name);teamLabel.append(check,document.createTextNode('加入默认队伍'));check.addEventListener('change',()=>{if(check.checked&&draft.team.length>=4){check.checked=false;message('默认队伍最多 4 名，请先取消一名。',true);return;}draft.team=draft.team.filter(id=>id!==card.id);if(check.checked)draft.team.push(card.id);renderTeam();markChanged();});foot.append(teamLabel);
        foot.append(button('前移',()=>{const i=draft.team.indexOf(card.id);if(i>0){[draft.team[i-1],draft.team[i]]=[draft.team[i],draft.team[i-1]];renderTeam();markChanged();}},'team-text-button'),button('移除角色',()=>{draft.roster=draft.roster.filter(r=>r!==row);draft.team=draft.team.filter(id=>id!==card.id);renderRoster();markChanged();},'team-text-button'));box.append(foot);roster.append(box);
      }
    }
    function renderInventory(){inventoryGrid.replaceChildren();for(const item of Object.values(growth.items)){
      const wrap=n('label','growth-stock-item'),copy=n('span'),input=n('input');copy.append(n('b','',item.name),n('small','',item.id));input.type='number';input.min=0;input.max=1000000000;input.step=1;input.value=draft.inventory[item.id]||0;input.setAttribute('aria-label','档案库存 · '+item.name);input.addEventListener('input',()=>{draft.inventory[item.id]=input.valueAsNumber;markChanged();});wrap.append(V.icon('Item',item.icon,'growth-item-icon'),copy,input);inventoryGrid.append(wrap);
    }}
    function render(){name.value=draft.name;rewards.value=draft.fanRewards;renderRoster();renderInventory();}
    const picker=n('dialog','team-card-picker');picker.setAttribute('aria-labelledby','user-picker-title');const ph=n('div','team-picker-header'),pt=n('h2','','添加已拥有羁绊');pt.id='user-picker-title';ph.append(pt,button('关闭',()=>picker.close()));
    const filters=n('div','team-picker-filters'),search=n('input');search.type='search';search.placeholder='搜索羁绊、角色或编号';search.setAttribute('aria-label','搜索可录入羁绊');filters.append(search);const pickerGrid=n('div','team-picker-grid');picker.append(ph,filters,pickerGrid);host.append(picker);
    function openPicker(){search.value='';renderPicker();picker.showModal();search.focus();}
    function renderPicker(){const query=search.value.trim().toLowerCase();pickerGrid.replaceChildren();for(const c of cards.filter(c=>[c.name,c.id,...c.peopleNames].join(' ').toLowerCase().includes(query))){const owned=draft.roster.some(r=>r.cardId===c.id),b=button('',()=>{draft.roster.push({cardId:c.id,level:1,stars:0,breakthrough:0,exp:0});if(draft.team.length<4)draft.team.push(c.id);picker.close();renderRoster();markChanged();},'team-picker-option');b.disabled=owned;b.setAttribute('aria-label','录入 '+c.name+' · '+c.id);b.append(V.portrait(c),n('b','',c.name),n('small','',c.rarity+' · '+c.id),n('small','',owned?'已拥有':c.peopleNames.join(' / ')));pickerGrid.append(b);}}
    search.addEventListener('input',renderPicker);
    const preview=n('dialog','user-import-preview');preview.setAttribute('aria-labelledby','user-import-title');const title=n('h2','','导入预览');title.id='user-import-title';const previewBody=n('div'),previewTools=n('div','user-actions');previewTools.append(button('保存并使用这份资料',()=>{if(!pending)return;try{store.save(pending);pending=null;preview.close();message('导入成功，资料已保存。计算器可使用你的角色与练度。');}catch(e){message(e.message,true);preview.close();}} ,'primary-button'),button('取消导入',()=>{pending=null;preview.close();}));preview.append(title,previewBody,previewTools);host.append(preview);
    file.addEventListener('change',async()=>{const selected=file.files[0];if(!selected)return;try{
      if(selected.size>U.LIMIT)throw Error('文件不能超过 2 MB');pending=U.parse(await selected.text(),selected.name,atlas,growth);previewBody.replaceChildren(n('p','',`${selected.name} · ${pending.roster.length} 份羁绊 · 默认队伍 ${U.teamIds(pending).length} 人`),n('p','growth-note',`保存后替换当前 ${store.get().roster.length} 份角色资料，并保留上一版。CSV 不包含账号奖励与库存，请导入后补填。`));
      const list=n('div','user-preview-list');for(const row of pending.roster){const c=byId.get(row.cardId),line=n('div','user-preview-row');line.append(V.portrait(c),n('span','',c.name),n('small','',`Lv.${row.level} · ${row.stars} 星 · 突破 ${row.breakthrough} 次 · 经验 ${row.exp}`));list.append(line);}previewBody.append(list);preview.showModal();
    }catch(e){pending=null;message('导入失败：'+e.message,true);}file.value='';});
    store.subscribe(value=>{draft=value;render();});render();if(store.warning)message(store.warning,true);else message(draft.roster.length?'已载入保存的资料，共 '+draft.roster.length+' 份羁绊。':'还没有保存角色资料，可以导入文件或添加羁绊。');
    return {store};
  }
  return {mount};
})();
