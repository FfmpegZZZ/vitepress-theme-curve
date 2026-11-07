'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasBattleCharts=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const palette=['#577b47','#b18136','#5a819b','#aa657b'],enemyColor='#b86c60';
  const finite=v=>Number.isFinite(v)?v:0;
  function model(battle){
    const members=battle.actors.filter(a=>a.side==='ally').map((a,i)=>({...a,color:palette[i%palette.length]}));
    const sum=(state,side,key)=>state.filter(a=>a.side===side).reduce((s,a)=>s+finite(a[key]),0);
    let previousAlly=0,previousEnemy=0;
    const point=(state,event)=>{
      const allyDamage=sum(state,'ally','damage'),enemyDamage=sum(state,'enemy','damage');
      const p={step:event?.step||0,wave:event?.wave||1,event,allyDamage,enemyDamage,allyBurst:allyDamage-previousAlly,enemyBurst:enemyDamage-previousEnemy,hp:{},state};
      for(const a of state.filter(a=>a.side==='ally'))p.hp[a.id]=a.maxHP>0?Math.max(0,Math.min(100,a.hp/a.maxHP*100)):0;
      previousAlly=allyDamage;previousEnemy=enemyDamage;return p;
    };
    const points=[point(battle.initialState||[],null),...battle.events.map(e=>point(e.state||[],e))];
    const peak=points.slice(1).reduce((best,p)=>p.allyBurst>best.allyBurst?p:best,{step:0,allyBurst:0,event:null});
    return {members,points,peak,transitions:battle.transitions||[]};
  }
  function mount(host,{cardForActor}){
    const U=window.AtlasGameUI,fmt=v=>finite(v).toLocaleString('zh-CN',{maximumFractionDigits:0}),short=v=>v>=100000000?(v/100000000).toFixed(1)+'亿':v>=10000?(v/10000).toFixed(1)+'万':fmt(v);
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const svgEl=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
    let battles={},source='verification',metric='damage',selected=0,hidden=new Set();
    host.classList.add('battle-charts');host.setAttribute('aria-label','战斗图表');
    function select(label,choices,value,change){const wrap=el('label','battle-chart-select'),s=el('select');wrap.append(el('span','',label),s);s.setAttribute('aria-label',label);for(const [v,t]of choices){const o=el('option','',t);o.value=v;s.append(o);}s.value=value;s.addEventListener('change',()=>change(s.value));return wrap;}
    function draw(){
      host.replaceChildren();const battle=battles[source];if(!battle)return;const m=model(battle),maxStep=m.points.at(-1).step;
      selected=Math.min(selected,maxStep);
      const header=el('div','battle-charts-heading'),title=el('div');title.append(el('p','eyebrow','BATTLE INSIGHTS'),el('h3','','战斗图表'));header.append(title,select('图表范围',[['verification','完整通关模拟'],['preview','当前时间轴预览']],source,v=>{source=v;selected=0;draw();}));host.append(header);
      const status=battle.winner==='ally'?'模拟通关':battle.winner==='enemy'?'我方全灭':'尚未结束';
      host.append(el('p','battle-chart-context',`${source==='verification'?'完整通关模拟':'当前时间轴预览'} · ${maxStep} 次全场行动 · ${battle.waveCount||1} 波 · ${status}`));
      const metrics=el('div','battle-chart-highlights'),peak=m.peak;
      for(const [icon,value,label]of [['Attack',fmt(battle.totalDamage),'我方累计伤害'],['Critical',fmt(peak.event?peak.allyBurst:0),peak.event?`单次行动峰值 · 第 ${peak.step} 次`:'单次行动峰值'],['HP',fmt(m.members.reduce((s,a)=>s+a.healing,0)),'我方实际治疗'],['Defence',`${m.members.filter(a=>a.hp>1e-8).length} / ${m.members.length}`,'结束时我方存活']]){const card=el('div');card.append(U.icon('Attribute',icon,'game-icon-tile'),el('span','',label),el('strong','',value));metrics.append(card);}host.append(metrics);
      const grid=el('div','battle-chart-grid');host.append(grid);const cursors=[];
      function panel(title,caption,icon){const card=el('section','battle-chart-panel'),h=el('h4');h.append(U.stat(icon),document.createTextNode(title));card.append(h,el('p','battle-chart-caption',caption));grid.append(card);return card;}
      const contribution=panel('角色贡献','追加攻击、夹击与反击归属实际出手角色。','attack');
      contribution.append(select('贡献指标',[['damage','造成伤害'],['hpLoss','有效扣血'],['healing','实际治疗']],metric,v=>{metric=v;draw();}));
      const total=m.members.reduce((s,a)=>s+finite(a[metric]),0),largest=Math.max(1,...m.members.map(a=>finite(a[metric])));
      for(const a of m.members){const row=el('div','battle-contribution'),name=el('div','battle-contribution-name');name.append(U.portrait(cardForActor(a)),el('span','',a.name));const val=el('div','battle-contribution-value');val.append(el('strong','',fmt(a[metric])),el('small','',`${total?(a[metric]/total*100).toFixed(1):'0.0'}%`));const track=el('div','battle-contribution-track'),bar=el('span');bar.style.width=(finite(a[metric])/largest*100)+'%';bar.style.background=a.color;track.append(bar);row.append(name,val,track);contribution.append(row);}
      if(!total)contribution.append(el('p','battle-chart-empty',metric==='healing'?'本次模拟未产生实际治疗。':'本次模拟暂无该项贡献。'));
      const cumulative=panel('双方累计伤害','包含护盾吸收与溢出伤害；有效扣血可在角色贡献中查看。','attack');
      const health=panel('我方生命变化','行动与换波结算后的生命比例，包含治疗与复活。','hp');
      const burst=panel('逐行动伤害','同次行动触发的追加、反击与持续伤害一并计入。','CriticalRate');
      const damageSeries=[{key:'allyDamage',name:'我方',color:palette[0]},{key:'enemyDamage',name:'敌方',color:enemyColor}];
      const hpSeries=m.members.map(a=>({key:a.id,name:a.name,color:a.color}));
      function legend(panel,series,toggle=false){const l=el('div','battle-chart-legend');for(const s of series){const b=el(toggle?'button':'span','battle-chart-key',s.name),swatch=el('i');swatch.style.background=s.color;b.prepend(swatch);if(toggle){b.type='button';b.setAttribute('aria-pressed',String(!hidden.has(s.key)));b.title='显示或隐藏 '+s.name;b.addEventListener('click',()=>{hidden.has(s.key)?hidden.delete(s.key):hidden.add(s.key);draw();});}l.append(b);}panel.append(l);}
      function plot(panel,series,type,hp=false){
        const width=600,height=250,L=54,R=16,top=25,bottom=42,W=width-L-R,H=height-top-bottom;
        const value=(p,s)=>hp?finite(p.hp[s.key]):finite(p[s.key]);
        const high=hp?100:Math.max(1,...m.points.flatMap(p=>series.map(s=>value(p,s))));
        const ceil=hp?100:Math.pow(10,Math.floor(Math.log10(high)))*Math.ceil(high/Math.pow(10,Math.floor(Math.log10(high))));
        const x=p=>L+p.step/Math.max(1,maxStep)*W,y=v=>top+H-Math.min(ceil,v)/ceil*H;
        const svg=svgEl('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`${panel.querySelector('h4').textContent}，横轴为全场行动次数，可通过下方行动选择器查看数值`});
        const text=(tx,ty,label,anchor='end')=>{const t=svgEl('text',{x:tx,y:ty,'text-anchor':anchor});t.textContent=label;svg.append(t);};
        for(let i=0;i<=4;i++){const v=ceil*i/4,yy=y(v);svg.append(svgEl('line',{x1:L,x2:width-R,y1:yy,y2:yy,class:'battle-chart-gridline'}));text(L-8,yy+4,hp?fmt(v)+'%':short(v));}
        const ticks=[...new Set([0,...Array.from({length:4},(_,i)=>Math.round(maxStep*(i+1)/4))])];for(const step of ticks)text(x({step}),height-23,String(step),'middle');text(width-R,height-3,'全场行动次数');
        for(const t of m.transitions){const xx=x({step:t.afterStep});svg.append(svgEl('line',{x1:xx,x2:xx,y1:top,y2:top+H,class:'battle-chart-wave'}));const mark=svgEl('title');mark.textContent=`第 ${t.afterStep} 次行动后进入第 ${t.wave} 波`;svg.lastChild.append(mark);}
        for(const s of series){
          if(hp&&hidden.has(s.key))continue;
          if(type==='bar'){
            const size=Math.min(11,W/Math.max(1,maxStep)*.42),offset=s.key==='allyBurst'?-size:0;
            for(const p of m.points.slice(1)){const rect=svgEl('rect',{x:x(p)+offset,y:y(value(p,s)),width:size,height:Math.max(0,top+H-y(value(p,s))),fill:s.color,opacity:'.82'});svg.append(rect);}
          }else svg.append(svgEl('polyline',{points:m.points.map(p=>`${x(p)},${y(value(p,s))}`).join(' '),fill:'none',stroke:s.color,'stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'}));
        }
        const atPoint=el('p','battle-chart-point-value');
        const cursor=svgEl('line',{y1:top,y2:top+H,class:'battle-chart-cursor'});svg.append(cursor);cursors.push(p=>{cursor.setAttribute('x1',x(p));cursor.setAttribute('x2',x(p));atPoint.textContent=`${p.step?'第 '+p.step+' 次行动':'开战结算'} · `+series.filter(s=>!hp||!hidden.has(s.key)).map(s=>s.name+' '+fmt(value(p,s))+(hp?'%':'')).join(' / ');});
        svg.addEventListener('pointermove',event=>{if(!maxStep)return;const rect=svg.getBoundingClientRect(),xx=(event.clientX-rect.left)/rect.width*width;showPoint(Math.max(0,Math.min(maxStep,Math.round((xx-L)/W*maxStep))));});
        panel.append(svg,atPoint);legend(panel,series,hp);
      }
      plot(cumulative,damageSeries,'line');plot(health,hpSeries,'line',true);plot(burst,[{key:'allyBurst',name:'我方',color:palette[0]},{key:'enemyBurst',name:'敌方',color:enemyColor}],'bar');
      if(m.transitions.length)host.append(el('p','battle-chart-waves',m.transitions.map(t=>`第 ${t.afterStep} 次行动后 → 第 ${t.wave} 波`).join('　 /　 ')));
      const inspection=el('section','battle-chart-inspector'),label=el('label','battle-chart-range'),input=el('input'),readout=el('div','battle-chart-readout');input.type='range';input.min='0';input.max=String(maxStep);input.step='1';input.disabled=!maxStep;input.setAttribute('aria-label','查看第几次全场行动');label.append(el('span','','查看行动详情 · 移动图表指针或拖动滑杆'),input);inspection.append(label,readout);host.append(inspection);
      function showPoint(index){
        selected=index;input.value=String(index);const p=m.points[index]||m.points[0];for(const set of cursors)set(p);readout.replaceChildren();
        readout.append(el('strong','',p.event?`第 ${p.step} 次行动 · 第 ${p.wave} 波 · ${p.event.actorName} · ${p.event.skillName}`:'开战结算后 · 行动开始前'));
        readout.append(el('span','',`本次伤害：我方 ${fmt(p.allyBurst)} / 敌方 ${fmt(p.enemyBurst)}　累计：我方 ${fmt(p.allyDamage)} / 敌方 ${fmt(p.enemyDamage)}`));
        const roster=el('div','battle-chart-health-values');for(const a of m.members){const s=el('span','',`${a.name} ${fmt(p.hp[a.id])}%`);s.style.borderColor=a.color;roster.append(s);}readout.append(roster);
      }
      input.addEventListener('input',()=>showPoint(Number(input.value)));showPoint(selected);
      const details=el('details','battle-chart-data'),table=el('table'),thead=el('thead'),tr=el('tr');details.append(el('summary','','查看图表数值表'));for(const text of ['行动','波次','行动成员 / 技能','我方伤害','敌方伤害','我方累计','敌方累计',...m.members.map(a=>a.name+'生命')])tr.append(el('th','',text));thead.append(tr);table.append(thead);const body=el('tbody');for(const p of m.points){const row=el('tr');for(const value of [p.step,p.wave,p.event?`${p.event.actorName} / ${p.event.skillName}`:'开战结算',fmt(p.allyBurst),fmt(p.enemyBurst),fmt(p.allyDamage),fmt(p.enemyDamage),...m.members.map(a=>fmt(p.hp[a.id])+'%')])row.append(el('td','',value));body.append(row);}table.append(body);const scroll=el('div','battle-chart-table-scroll');scroll.append(table);details.append(scroll);host.append(details);
    }
    return {update(verification,preview){battles={verification,preview};draw();}};
  }
  return {model,mount};
});
