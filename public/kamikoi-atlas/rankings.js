'use strict';
window.AtlasRankings=(()=>{
 const labels={overall:'综合通关',single:'单体输出',mob:'多敌输出',support:'替换收益',survival:'生存保队'};
 const professions=[['Defender','守护'],['Medic','祈祷'],['Warrior','戒律'],['Vanguard','审判']];
 const fmt=v=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:0});
 const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function mount(host,atlas,store,{openCard,goCalculator}){
  const D=window.ATLAS_RANKINGS,U=window.AtlasGameUI,R=window.AtlasRankingCore;if(!D||D.version!==3||!R){host.append(n('p','growth-error','排行加载失败，请刷新页面重试。'));return;}
  const visiblePool=D.profiles[0].filter(R.rankable).length;
  const cards=new Map(atlas.cards.map(c=>[c.id,c])),cache=new Map(),state={dimension:'overall',scope:'hard',stars:3,job:'',search:'',rarity:'',element:'',owned:false,expanded:new Set()};
  function scoped(){const key=state.stars+':'+state.scope;if(!cache.has(key))cache.set(key,R.scope(D.profiles[state.stars],D.scenes,D.references,D.scopes[state.scope]?.ids||[state.scope]));return cache.get(key);}
  const intro=n('div','team-intro ranking-intro');intro.append(n('p','eyebrow','BOND TIER LIST / 培养梯度参考'),n('h2','','角色梯度排行'),n('p','','按高难关卡表现，查看各职业的培养优先级。'));host.append(intro);
  const banner=n('div','ranking-context');banner.append(U.icon('Common','Icon_Star1','game-icon-tile'),n('div','','SSR：T0–T1 · SR：T2–T3'),n('span','','每关 10 个随机样本 · 2026.11.06'));host.append(banner);
  host.append(n('p','ranking-assumption','基于固定队伍的同职业替换模拟，仅供培养参考，实际表现以游戏内为准。'));
  host.append(n('p','growth-note','试炼 42、50 层缺少技能数据，暂未参评。'));
  const controls=n('section','ranking-controls');controls.setAttribute('aria-label','梯度排行筛选');host.append(controls);
  function select(label,values,key){const wrap=n('label','team-field');wrap.append(n('span','',label));const e=n('select');e.setAttribute('aria-label',label);for(const [v,text]of values){const o=n('option','',text);o.value=v;e.append(o);}e.value=state[key];e.addEventListener('change',()=>{state[key]=key==='stars'?Number(e.value):e.value;state.expanded.clear();render();});wrap.append(e);controls.append(wrap);return e;}
  select('战斗场景',[...Object.entries(D.scopes).map(([id,s])=>[id,s.name]),...D.scenes.map(s=>[s.id,s.name])],'scope');
  select('排行星级',Array.from({length:6},(_,i)=>[i,i===0?'0 星 · 未升星':i+' 星'+(i===3?' · 被动解锁':i===5?' · 满星':'')]),'stars');
  select('稀有度',[['','SSR + SR'],['SSR','SSR'],['SR','SR']],'rarity');
  select('属性',[['','全部属性'],...new Map(atlas.cards.filter(c=>c.named&&c.element).map(c=>[c.element,c.elementName]))],'element');
  const search=n('label','ranking-search');search.append(U.icon('Common','Icon_Magnifier','game-icon-tile ranking-search-icon'));const input=n('input');input.type='search';input.placeholder='搜索羁绊、角色或技能特点';input.setAttribute('aria-label','搜索排行');input.addEventListener('input',()=>{state.search=input.value;render();});search.append(input);controls.append(search);
  const owned=n('label','ranking-owned'),checkbox=n('input');checkbox.type='checkbox';checkbox.addEventListener('change',()=>{state.owned=checkbox.checked;render();});owned.append(checkbox,n('span','','仅看已拥有'));controls.append(owned);
  const tabs=n('nav','ranking-dimensions');tabs.setAttribute('aria-label','职业排行');const tabButtons=[];
  for(const [key,label]of [['','综合'],...professions]){const b=n('button','',label);b.type='button';b.prepend(U.icon(key?'Role':'Common',key||'Icon_Star1','game-icon-tile'));b.addEventListener('click',()=>{state.job=key;state.expanded.clear();render();});tabs.append(b);tabButtons.push([key,b]);}host.append(tabs);
  const explanation=n('p','ranking-explanation');host.append(explanation);
  const help=n('details','ranking-method');help.append(n('summary','','评级规则与适用范围'));
  help.append(n('p','','队伍基准按前后位置为：舞台新星（守护）、雨中细吻（祈祷）、馀温悸动（戒律）、烟光迷离（审判）。候选卡替换同职业的一位，保留另外三位；队友与候选卡使用相同星级、满生命入场，带入各自真实属性、技能和被动，战斗引擎直接使用真实面板，培养梯度另按稀有度分档，避免队友带过关掩盖候选卡的数值差距。'));
  help.append(n('p','',`默认高难 ${D.scopes.hard.ids.length} 关：综合试炼 40–49 层的 9 个完整关卡与四种元素结晶末关。日常刷图单列，可切换到高层试炼、元素末关或指定关卡独立排名。每关 ${D.seeds.length} 个固定种子（${D.seeds.join('、')}），上限 ${D.limit} 次全场行动，与组队通关验证一致；到上限未分胜负记未决，不作胜利。`));
  help.append(n('p','','按概率结算命中、暴击、状态与抵抗，开局随机条 0–5%；我方就绪终结技优先，敌方用关卡 AI。保留完整波次、克制、免疫、叠攻、护罩、治疗、追加与跨波状态。更高难度取自原关卡配置，不人为放大敌人数值。当前未完成所有实机触发顺序和整数舍入校准。'));
  help.append(n('p','ranking-caution','暂未参评：'+D.excluded.map(s=>s.id+'（'+s.reason+'）').join('；')+'。相关技能资料补齐前，第 50 层不纳入评级。'));
  help.append(n('p','','综合评分 = 70×整关通关 + 15×已完成波次比例 + 7.5×全队存活比例 + 2.5×队伍剩余血量比例 + 5×通关速度项；速度项仅通关时计算，为 1/(1+行动时间/10)。结果先按关卡与种子等权平均。生存值 = 70×候选卡结算存活比例 + 20×候选卡剩余血量比例 + 10×全队存活比例。治疗、护罩等通过实际战斗结果影响评分，不按技能标签单独加分。'));
  help.append(n('p','','单体、多敌输出：在对应真实关卡中统计候选卡来源的有效扣血／整场行动时间，包含其追加和持续伤害，排除队友伤害与过量伤害；阵亡后没有输出，仍使用整场时间作分母。替换收益为 50 加上相对同职业基准卡的综合评分差，最低为 0；不是增伤百分比，也不是纯辅助能力榜。'));
  help.append(n('p','',`本榜仅展示 ${visiblePool} 张资料完整的 SSR、SR，R 不展示，也不参与它们的相对分。培养档位先按稀有度区分：SSR 为 T0–T1，SR 为 T2–T3；战斗评分不添加稀有度分数。相对分只在同职业、同稀有度内计算，不能跨稀有度比较。`));
  help.append(n('p','','T0 为 SSR 中本职业前两位以内、通关率至少 90% 且自身存活率至少 80% 的稳定领先者；第二位综合评分与领先者差不超过 0.25（其他维度为 0.5%）。第二、三位完全同分时不按编号凑名额，T0 可空缺。其余 SSR 列为 T1，表示常规培养选择，不保证当前关卡能通关。'));
  help.append(n('p','','SR 在本职业同稀有度内比较：相对分至少 50、通关率至少 90%、自身存活率至少 80% 为 T2，其余 T3。T2 为 SR 中优先选择，T3 为按需培养。四档是明确的培养优先级规则，并非模拟器证明的绝对战力倍数。综合合并职业，职业按钮过滤；搜索、属性、稀有度和拥有筛选均不重新评级。'));
  help.append(n('p','','这是基于当前数据与基准的参考榜，未代表官方、社区共识或实机通关结论。属性克制、首领免控、手动时机、队友搭配和关卡波次会改变结果。缺少技能中文说明的卡单列待评估；是否有图片不影响参评。低梯度卡也可能提供特定关卡需要的对策。'));
  const source=n('a','download-button','下载评分与基准数据（GZip）');source.href='data/rankings.json.gz';source.download='神明恋爱-梯度排行依据.json.gz';help.append(source);host.append(help);
  const enemyInfo=n('details','ranking-method');host.append(enemyInfo);
  const count=n('p','ranking-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');host.append(count);
  const ceiling=n('p','ranking-assumption');host.append(ceiling);
  const result=n('div','ranking-results ranking-tier-results');host.append(result);
  result.tabIndex=-1;const jump=n('button','team-button ranking-jump','查看梯度 ↓');jump.addEventListener('click',()=>{result.scrollIntoView({block:'start',behavior:'smooth'});result.focus({preventScroll:true});});controls.append(jump);
  const pending=n('details','ranking-pending');host.append(pending);
  function matches(c,row){const query=state.search.toLocaleLowerCase().trim(),ownedIds=new Set((store?.get().roster||[]).map(r=>r.cardId));return R.rankable(c)&&(!state.job||c.job===state.job)&&(!state.rarity||c.rarity===state.rarity)&&(!state.element||c.element===state.element)&&(!state.owned||ownedIds.has(c.id))&&(!query||[c.name,c.id,...c.peopleNames,...(row?.tags||[]),...c.skills.map(s=>s.description)].join(' ').toLocaleLowerCase().includes(query));}
  function cardTile(row,position,compact=false){
   const c=cards.get(row.id),tile=n('article','ranking-card'),head=n('div','ranking-card-head'),portrait=U.portrait(c),copy=n('div');
   const title=n('button','ranking-card-title',c.name);title.addEventListener('click',()=>openCard(c));copy.append(title,n('small','',c.peopleNames.join(' / ')+' · '+c.jobName));head.append(portrait,copy,U.icon('Role',c.rarity,'ranking-rarity'));tile.append(head);
   const tier=row.tiers[state.dimension];tile.append(n('span','ranking-priority priority-'+tier,tier+' · '+({T0:'SSR 核心优先',T1:'SSR 常规选择',T2:'SR 优先选择',T3:'SR 按需培养'}[tier])));
   const score=n('div','ranking-score');score.append(n('span','',(state.job?c.jobName:'综合')+'榜第 '+position+' 位'),n('strong','',row.scores[state.dimension].toFixed(1)),n('small','','同职业同稀有度相对分'));if(!compact)tile.append(score);
   const stats=n('div','ranking-panel');for(const [key,label]of [['HP','生命'],['Attack','攻击'],['Defence','防御'],['Speed','速度']]){const cell=n('span');cell.append(n('small','',label),n('b','',fmt(row.panel[key])));stats.append(cell);}if(!compact)tile.append(stats);
   tile.append(n('p','ranking-outcome',`样本通关 ${(row.performance.clearRate*100).toFixed(1)}% · 本卡存活 ${(row.performance.survived*100).toFixed(1)}%`));
   if(!row.performance.clearRate)tile.append(n('p','ranking-caution','当前场景样本未通关，请调整队伍或练度后验证。'));
   tile.append(n('p','ranking-benchmark',`整关评分 ${row.overallRaw.toFixed(2)} / 100`));
   if(row.performance.unresolved)tile.append(n('p','ranking-caution',`到行动上限未决 ${(row.performance.unresolved*100).toFixed(1)}%`));
   const tags=n('div','ranking-tags');for(const tag of row.tags.slice(0,4))tags.append(n('span','',tag));if(!row.tags.length)tags.append(n('span','','直接伤害'));tile.append(tags);
   const best=Object.keys(labels).filter(k=>k!=='overall').sort((a,b)=>row.scores[b]-row.scores[a])[0];tile.append(n('p','ranking-best','相对优势：'+labels[best]));
   if(state.dimension==='single'||state.dimension==='mob')tile.append(n('p','ranking-benchmark','基准伤害 / 时间：'+fmt(row[state.dimension])));
   const detail=n('details','ranking-reasons');detail.append(n('summary','','评分依据与技能说明'));
   if(compact){tile.classList.add('ranking-card-compact');detail.append(score,stats);}
   const metrics=n('div','ranking-mini-scores');for(const key of ['single','mob','support','survival']){const line=n('div'),bar=n('progress');bar.max=100;bar.value=row.scores[key];bar.setAttribute('aria-label',labels[key]+'相对分');line.append(n('span','',labels[key]),bar,n('b','',row.scores[key].toFixed(1)));metrics.append(line);}detail.append(metrics);
   detail.append(n('p','',`单体关卡 ${fmt(row.single)} / 多敌关卡 ${fmt(row.mob)}，均为候选卡有效扣血／整场行动时间。`));
   detail.append(n('p','',`综合评分 ${row.overallRaw.toFixed(2)} · 相对同职业基准 ${row.performance.baselineDelta>=0?'+':''}${row.performance.baselineDelta.toFixed(2)} · 生存评分 ${row.survival.toFixed(2)}。`));
   for(const test of row.stageResults){const scene=D.scenes.find(s=>s.id===test.sceneId);detail.append(n('p','ranking-stage-result',`${scene.name}：${test.samples.filter(s=>s.clearRate).length}/${D.seeds.length} 次通关 · 本卡存活 ${test.samples.filter(s=>s.survived).length}/${D.seeds.length} · 未决 ${test.samples.filter(s=>s.unresolved).length} 次 · 平均全场行动 ${test.actions.toFixed(1)} 次`));}
   for(const skill of c.skills.filter(s=>!s.hidden)){const locked=skill.type==='Passive'&&state.stars<(skill.unlocksAtStarLevel??3);const text=n('p',locked?'ranking-locked':'');text.append(n('b','',(skill.type==='Passive'?'被动':skill.name)+(locked?' · 未解锁，不计入':'')+'：'),document.createTextNode(U.description(skill.description)));detail.append(text);}
   if(row.tags.includes('中毒'))detail.append(n('p','ranking-caution','中毒按实际敌方生命与免疫结算。'));
   for(const warning of [...row.cautions,...row.warnings])detail.append(n('p','ranking-caution',U.notice(warning)));tile.append(detail);
   const actions=n('div','ranking-card-actions'),view=n('button','team-text-button','查看详情');view.addEventListener('click',()=>openCard(c));actions.append(view);tile.append(actions);return tile;
  }
  function render(){
   tabButtons.forEach(([key,b])=>{b.classList.toggle('active',key===state.job);b.setAttribute('aria-pressed',String(key===state.job));});
   const descriptions={overall:'按真实关卡整关通关、全队存活、剩余生命和通关速度评估。',single:'在单敌关卡中的有效扣血／整场行动时间，包含倒下造成的输出损失。',mob:'在多敌、多波关卡中的有效扣血／整场行动时间。',support:'相对同职业基准卡的整关结果变化，包含输出、保队与协同。',survival:'根据候选卡实际存活、剩余生命和全队存活评估；没有固定护罩或治疗标签加分。'};
   const sceneName=D.scopes[state.scope]?.name||D.scenes.find(s=>s.id===state.scope).name;
   const selectedIds=new Set(D.scopes[state.scope]?.ids||[state.scope]);
   enemyInfo.replaceChildren(n('summary','','查看关卡敌方阵容'));
   for(const s of D.scenes.filter(s=>selectedIds.has(s.id))){enemyInfo.append(n('p','',s.name+' · '+s.waveCount+' 波'));for(const e of s.enemies){const wave=e.source.waveField==='WaveInfo3JsonString'?3:e.source.waveField==='WaveInfo2JsonString'?2:1;enemyInfo.append(n('p','ranking-stage-result',`第 ${wave} 波 ${e.name} · Lv.${e.source.propertyLevel} · 生命 ${fmt(e.HP)} / 攻击 ${fmt(e.Attack)} / 防御 ${fmt(e.Defence)} / 速度 ${fmt(e.Speed)}`));}}
   explanation.textContent=`${sceneName} · Lv.80 / ${state.stars} 星 · ${state.stars<3?'常见三星被动尚未解锁。':'已按实际解锁条件计入被动。'}${descriptions[state.dimension]}`;
   const all=scoped().filter(R.rankable).sort((a,b)=>b.scores[state.dimension]-a.scores[state.dimension]||a.id.localeCompare(b.id));
   const nearClear=all.filter(r=>r.performance.clearRate>=.98).length;ceiling.hidden=nearClear<all.length*.7;ceiling.textContent=`${nearClear}/${all.length} 组队伍的样本通关率达 98%。队友贡献较大，通关率需结合本卡表现阅读。`;
   const filtered=all.filter(r=>matches(cards.get(r.id),r)),viewName=state.job?professions.find(([id])=>id===state.job)[1]:'综合';count.textContent=`${viewName} · ${filtered.length} / ${visiblePool} 张`+(state.owned?' · 仅看已拥有':'');result.replaceChildren();
   if(!filtered.length){const empty=n('div','user-empty');empty.append(n('p','','暂无符合条件的羁绊'),n('p','growth-note',state.owned?'可先在“我的数据”录入角色，或关闭“仅看已拥有”。':'试试其他关键词、属性或稀有度。'));result.append(empty);}
   const names={T0:'SSR · 核心优先',T1:'SSR · 常规选择',T2:'SR · 优先选择',T3:'SR · 按需培养'},raw=r=>state.dimension==='overall'?r.overallRaw:r[state.dimension];
   const tierNav=n('nav','ranking-tier-summary');tierNav.setAttribute('aria-label','梯度快速定位');if(filtered.length)result.append(tierNav);
   const tierOrder=Object.keys(names),ordered=all.filter(r=>!state.job||r.job===state.job).sort((a,b)=>tierOrder.indexOf(a.tiers[state.dimension])-tierOrder.indexOf(b.tiers[state.dimension])||raw(b)-raw(a)||a.id.localeCompare(b.id)),ranks=new Map(ordered.map((r,i)=>[r.id,i+1]));
   if(filtered.length)for(const [tier,label]of Object.entries(names)){
    const rows=filtered.filter(r=>r.tiers[state.dimension]===tier).sort((a,b)=>raw(b)-raw(a)||a.id.localeCompare(b.id)),band=n('section','ranking-band');band.dataset.tier=tier;band.setAttribute('aria-label',tier+' '+label);
    band.tabIndex=-1;const shortcut=n('button','',tier+' · '+rows.length+' 张');shortcut.type='button';shortcut.addEventListener('click',()=>{band.scrollIntoView({block:'start',behavior:'smooth'});band.focus({preventScroll:true});});tierNav.append(shortcut);
    const heading=n('div','ranking-band-heading');heading.append(n('h3','',tier),n('div','',label),n('small','',rows.length+' 张'));band.append(heading);
    if(rows.length){const grid=n('div','ranking-grid');for(const row of rows)grid.append(cardTile(row,ranks.get(row.id),true));band.append(grid);}else band.append(n('p','ranking-tier-empty','当前条件下暂无 '+tier+' 角色。'));
    result.append(band);
   }
   pending.replaceChildren();const list=D.pending.filter(r=>matches(cards.get(r.id)));pending.append(n('summary','','待评估 · '+list.length+' 张（技能说明不完整）'),n('p','growth-note','技能说明补全后参与评级。'));const grid=n('div','ranking-pending-grid');for(const row of list){const c=cards.get(row.id),b=n('button','',c.name);b.prepend(U.portrait(c));b.addEventListener('click',()=>openCard(c));grid.append(b);}pending.append(grid);pending.hidden=!list.length;
  }
  const end=n('div','ranking-next');end.append(n('p','','找到合适的卡后，用自己的队伍与关卡验证实际表现。'));const go=n('button','primary-button','前往组队验证');go.prepend(U.utility('arrow'));go.addEventListener('click',goCalculator);end.append(go);host.append(end);
  store?.subscribe(render);render();return {render};
 }
 return {mount};
})();
