'use strict';
window.AtlasMediaLibrary=(()=>{
  const categories={fanclub:'粉丝团',chibi:'Q版角色',character:'角色与敌人',story:'剧情图片',background:'场景背景',banner:'横幅',theme:'主题',title:'称号',interface:'界面图标',effect:'战斗特效',texture:'原始纹理'};
  const n=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function mount(host,atlas,{openCard,openZoom}){
    const data=window.ATLAS_SUPPLEMENTAL;if(!data){host.append(n('p','','素材资料未能加载，请刷新页面。'));return {select:()=>{}};}
    const U=window.AtlasGameUI,cards=new Map(atlas.cards.map(c=>[c.id,c])),people=new Map(atlas.people.map(p=>[p.id,p]));
    const state={category:'fanclub',person:'',card:'',search:'',variants:false,page:1},pageSize=24;
    const btn=(label,fn,cls='team-button')=>{const b=n('button',cls,label);b.type='button';b.addEventListener('click',fn);return U.decorateControl(b,label);};
    const images=data.images.map(x=>({...x,label:x.label||x.name,peopleNames:x.people.map(id=>people.get(id)?.name||id),cardNames:x.cardIds.map(id=>cards.get(id)?.name||id)}));
    const displayPriority=x=>x.rendered?2:x.path.includes('/FanClub/Picture/Photo/')?1:0;
    images.sort((a,b)=>displayPriority(b)-displayPriority(a));
    const paths=new Set(images.map(x=>x.path));
    function variant(x){return /_icon$/i.test(x.name)&&paths.has(x.path.replace(/_icon(\.[^.]+)$/i,'$1'));}
    const intro=n('div','team-intro');intro.append(n('p','eyebrow','GAME MATERIALS / 游戏素材'),n('h2','','游戏素材库'),n('p','','按角色与分类查找图片，支持放大查看与下载。'));host.append(intro);
    const stats=n('div','media-stats');for(const [value,label] of [[data.images.length,'图片条目'],[data.tables.length,'原始数据表'],[data.skeletons.filter(x=>x.file.endsWith('.skel.bytes')).length,'动画素材组']]){const box=n('div');box.append(n('strong','',value.toLocaleString('zh-CN')),n('span','',label));stats.append(box);}host.append(stats);
    const controls=n('div','media-controls'),search=n('input');search.type='search';search.placeholder='搜索素材编号、角色或羁绊';search.setAttribute('aria-label','搜索游戏素材');search.addEventListener('input',()=>{state.search=search.value;state.page=1;render();});
    const person=n('select');person.setAttribute('aria-label','素材所属角色');person.append(new Option('全部角色',''));for(const p of atlas.people)person.append(new Option(p.name,p.id));person.addEventListener('change',()=>{state.person=person.value;state.card='';state.page=1;render();});
    const toggle=n('label','media-variants'),check=n('input');check.type='checkbox';check.addEventListener('change',()=>{state.variants=check.checked;state.page=1;render();});toggle.append(check,n('span','','显示小图变体'));
    controls.append(search,person,toggle,btn('重置筛选',()=>{Object.assign(state,{person:'',card:'',search:'',variants:false,page:1});search.value='';person.value='';check.checked=false;render();}));host.append(controls);
    const tabs=n('nav','media-categories');tabs.setAttribute('aria-label','素材分类');const categoryButtons=[];
    for(const [key,label] of [['all','全部成图'],...Object.entries(categories),['tables','数据表']]){const count=key==='tables'?data.tables.length:key==='all'?images.filter(x=>x.category!=='texture').length:images.filter(x=>x.category===key).length;if(!count)continue;const b=btn('',()=>{state.category=key;state.page=1;render();},'media-category');b.append(n('span','',label),n('small','',count));tabs.append(b);categoryButtons.push([key,b]);}host.append(tabs);
    const status=n('p','media-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const note=n('p','media-note'),grid=n('div','media-grid'),pagination=n('nav','media-pagination');pagination.setAttribute('aria-label','素材分页');host.append(status,note,grid,pagination);
    const help=n('details','media-help');help.append(n('summary','','素材范围与来源'),n('p','',`资料日期：${data.sourceDate} · 版本 ${data.catalog}。图片提供网页预览图下载，同一图片的小图变体默认合并。`),n('p','','动画纹理是拼装零件；动画静帧为还原后的画面，两者均与完整卡面分开标注。'),n('p','','数据表提供 TXT / JSON 文件供核对，包含的内容不一定已在游戏中开放。'));const manifest=n('a','download-button','下载素材清单');manifest.href='data/supplemental.json';manifest.download='神明恋爱-补充素材索引.json';help.append(manifest);host.append(help);
    const dialog=n('dialog','media-dialog');dialog.setAttribute('aria-labelledby','media-detail-title');const dialogBody=n('div'),close=btn('关闭',()=>dialog.close(),'team-button media-dialog-close');dialog.append(close,dialogBody);host.append(dialog);
    dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
    function link(label,url,download=false){const a=n('a','download-button',label);a.href=url;if(download)a.download=url.split('/').pop();else{a.target='_blank';a.rel='noopener';}return U.decorateControl(a,label);}
    function viewImage(item){
      dialogBody.replaceChildren();const title=n('h2','',item.label);title.id='media-detail-title';const img=n('img','media-full-image');img.src=item.file;img.alt=item.label;img.decoding='async';
      const info=n('div','media-detail-copy');info.append(title,n('p','media-note',`${categories[item.category]} · ${item.width} × ${item.height}${item.currentCatalog?'':' · 历史版本版本'}`));
      if(item.peopleNames.length)info.append(n('p','',item.peopleNames.join(' / ')));
      const actions=n('div','media-detail-actions');actions.append(link('保存图片',item.file,true),btn('放大查看',()=>{dialog.close();openZoom(item.file,item.label);}));
      for(const id of item.cardIds){const c=cards.get(id);if(c)actions.append(btn(c.name+' · 羁绊详情',()=>{dialog.close();openCard(c);}));}
      
      info.append(actions);
      const source=n('details','media-source');source.append(n('summary','','文件来源与版本'),n('p','',item.path),n('p','',item.source),n('p','',item.currentCatalog?'与收录资料版本一致':'历史版本素材'));
      info.append(source);dialogBody.append(img,info);dialog.showModal();close.focus();
    }
    function filtered(){const query=state.search.trim().toLocaleLowerCase();return images.filter(x=>(state.category==='all'?x.category!=='texture':x.category===state.category)&&(!state.person||x.people.includes(state.person))&&(!state.card||x.cardIds.includes(state.card))&&(state.variants||!variant(x))&&(!query||[x.label,x.name,x.path,...x.cardNames,...x.peopleNames].join(' ').toLocaleLowerCase().includes(query)));}
    function render(){
      categoryButtons.forEach(([key,b])=>{b.classList.toggle('active',key===state.category);b.setAttribute('aria-pressed',String(key===state.category));});grid.replaceChildren();pagination.replaceChildren();
      grid.classList.toggle('media-table-mode',state.category==='tables');
      if(state.category==='tables'){
        note.hidden=false;note.textContent='可下载游戏数据表；其中的内容不一定已在游戏中开放。';const query=state.search.trim().toLowerCase(),tables=data.tables.filter(t=>[t.table,t.path].join(' ').toLowerCase().includes(query));status.textContent=`${tables.length} 份数据表 · 资料版本 ${data.catalog}`;person.disabled=check.disabled=true;
        const wrap=n('div','source-table-wrap'),table=n('table','source-table'),head=n('thead'),tr=n('tr');for(const label of ['数据表','记录数','版本','查看 / 下载'])tr.append(n('th','',label));head.append(tr);table.append(head);const body=n('tbody');for(const row of tables){const line=n('tr');line.append(n('td','',row.table),n('td','',row.rows??'未解析'),n('td','',row.currentCatalog?'收录版本':'历史版本'));const cell=n('td');cell.append(link('TXT.GZ',row.file,true));if(row.json)cell.append(link('JSON.GZ',row.json,true));if(row.parseError)cell.append(n('span','media-note','仅提供 TXT 原文'));line.append(cell);body.append(line);}table.append(body);wrap.append(table);grid.append(wrap);return;
      }
      person.disabled=check.disabled=false;
      note.textContent=state.category==='texture'?'此分类为动画拼装素材，可在详情中打开动画预览。':state.card?'关联图片包含剧情、主题与背景，请留意图片类型。':state.category==='story'?'剧情CG为故事内容，不代表羁绊卡面。':'';note.hidden=!note.textContent;
      const list=filtered(),pages=Math.max(1,Math.ceil(list.length/pageSize));state.page=Math.max(1,Math.min(state.page,pages));status.textContent=`${state.category==='all'?'全部成图':categories[state.category]} · ${list.length} 张${state.person?' · '+people.get(state.person).name:''}${state.card?' · '+cards.get(state.card)?.name:''}`;
      for(const x of list.slice((state.page-1)*pageSize,state.page*pageSize)){const b=btn('',()=>viewImage(x),'media-tile');b.setAttribute('aria-label','查看素材 '+x.label);const stage=n('span','media-tile-stage '+(x.category==='background'||x.category==='story'?'media-landscape':'')),img=n('img');img.src=x.thumb;img.alt=x.label;img.loading='lazy';img.decoding='async';stage.append(img);const text=n('span','media-tile-copy');text.append(n('b','',x.label),n('small','',x.peopleNames.join(' / ')||`${x.width} × ${x.height}`));b.append(stage,text);if(x.category==='texture')b.append(n('span','media-kind','动画纹理'));else if(x.rendered)b.append(n('span','media-kind','动画静帧'));if(!x.currentCatalog)b.append(n('span','media-version','历史'));grid.append(b);}
      if(!list.length)grid.append(n('p','media-empty','没有找到素材，试试更换分类、角色或关键词。'));
      if(pages>1){const change=p=>{state.page=p;render();status.scrollIntoView({block:'start',behavior:'smooth'});};const prev=btn('上一页',()=>change(state.page-1));prev.disabled=state.page===1;const next=btn('下一页',()=>change(state.page+1));next.disabled=state.page===pages;pagination.append(prev,n('span','',`${state.page} / ${pages}`),next);}
    }
    function select({person:pid='',card='',category='all'}={}){Object.assign(state,{person:pid,card,category,search:'',page:1});person.value=pid;search.value='';render();}
    render();return {select,render};
  }
  return {mount};
})();
