(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AtlasUserData=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='kamikoi-user-data-v1',LIMIT=2097152,clone=v=>JSON.parse(JSON.stringify(v));
  const empty=()=>({version:1,format:'kamikoi-user-data',name:'我的档案',fanRewards:0,roster:[],team:[],inventory:{}});
  function object(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error(label+'格式不正确');}
  function int(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+'需为 '+min+'–'+max+' 的整数');return v;}
  function normalize(input,atlas,growth){
    object(input,'资料');if(input.version!=null&&input.version!==1)throw Error('不支持此资料版本');if(input.format!=null&&input.format!=='kamikoi-user-data')throw Error('不是角色资料文件');
    if(!Array.isArray(input.roster))throw Error('资料需要 roster 角色列表；战斗方案不能作为角色资料导入');
    const byId=new Map(atlas.cards.filter(c=>c.named&&c.stats.length).map(c=>[c.id,c]));
    if(input.roster.length>byId.size)throw Error('角色列表数量超过图鉴范围');
    const out=empty();if(input.name!=null){if(typeof input.name!=='string'||input.name.length>40)throw Error('档案名称最多 40 字');out.name=input.name.trim()||'我的档案';}
    out.fanRewards=int(input.fanRewards??0,0,160,'粉丝团奖励次数');const seen=new Set();
    out.roster=input.roster.map((row,index)=>{
      object(row,'第 '+(index+1)+' 行');const card=byId.get(row.cardId);if(!card)throw Error('第 '+(index+1)+' 行：未知或未命名羁绊编号 '+String(row.cardId).slice(0,50));
      if(seen.has(card.id))throw Error('重复羁绊：'+card.name+'（'+card.id+'）');seen.add(card.id);
      const level=int(row.level??1,1,80,card.name+'等级'),stars=int(row.stars??0,0,5,card.name+'星级');
      const breakthrough=int(row.breakthrough??Math.ceil(level/10)-1,0,7,card.name+'突破');
      if(level>10*(breakthrough+1)||level<breakthrough*10)throw Error(card.name+'等级与突破阶段不匹配');
      const exp=int(row.exp??0,0,1000000,card.name+'经验');
      if((level===10*(breakthrough+1)&&exp>0)||(level<80&&exp>=growth.levels[card.rarity][level]))throw Error(card.name+'本级经验超出范围；已达等级上限时请填 0');
      return {cardId:card.id,level,stars,breakthrough,exp};
    });
    if(input.team!=null&&!Array.isArray(input.team))throw Error('默认队伍格式不正确');
    out.team=input.team==null?out.roster.slice(0,4).map(r=>r.cardId):[...input.team];
    if(out.team.length>4||new Set(out.team).size!==out.team.length||out.team.some(id=>!seen.has(id)))throw Error('默认队伍最多 4 名不重复的已拥有羁绊');
    object(input.inventory??{},'库存');
    for(const [id,count] of Object.entries(input.inventory||{})){if(!Object.hasOwn(growth.items,id))throw Error('未知库存道具编号：'+id.slice(0,50));out.inventory[id]=int(count,0,1000000000,'道具 '+id+' 库存');}
    return out;
  }
  function csvRows(text){
    const rows=[];let row=[],cell='',quoted=false,closed=false;
    function endCell(){row.push(cell);cell='';closed=false;}
    function endRow(){endCell();if(row.some(x=>x.trim()))rows.push(row);row=[];}
    for(let i=0;i<text.length;i++){
      const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
      if(c==='"'){if(cell||closed)throw Error('CSV 引号位置无效');quoted=true;}
      else if(c===',')endCell();else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();}
      else {if(closed)throw Error('CSV 引号后存在额外内容');cell+=c;}
    }
    if(quoted)throw Error('CSV 引号未闭合');if(cell||row.length||closed)endRow();return rows;
  }
  function parse(text,name,atlas,growth){
    if(typeof text!=='string'||text.length>LIMIT||new TextEncoder().encode(text).length>LIMIT)throw Error('文件不能超过 2 MB');text=text.replace(/^\uFEFF/,'');
    if(/\.json$/i.test(name)){let x;try{x=JSON.parse(text);}catch{throw Error('JSON 格式无效，请使用模板或导出的资料');}return normalize(x,atlas,growth);}
    if(!/\.csv$/i.test(name))throw Error('请选择 JSON 或 CSV 文件');
    const rows=csvRows(text),headers=rows.shift()?.map(x=>x.trim());
    if(!headers?.includes('cardId')||new Set(headers).size!==headers.length||headers.some(h=>!['cardId','level','stars','breakthrough','exp'].includes(h)))throw Error('CSV 表头需使用 cardId,level,stars,breakthrough,exp；不能重复或添加未知列');
    const roster=rows.map((cells,index)=>{if(cells.length!==headers.length)throw Error('CSV 第 '+(index+2)+' 行列数错误');const row={};headers.forEach((key,i)=>{const v=cells[i].trim();if(key==='cardId')row[key]=v;else if(v!==''){if(!/^\d+$/.test(v))throw Error('CSV 第 '+(index+2)+' 行 '+key+' 需要非负整数');row[key]=Number(v);}});return row;});
    return normalize({roster},atlas,growth);
  }
  function toCSV(profile){return '\uFEFFcardId,level,stars,breakthrough,exp\r\n'+profile.roster.map(r=>[r.cardId,r.level,r.stars,r.breakthrough,r.exp].join(',')).join('\r\n')+'\r\n';}
  function teamIds(profile){return profile.team.length?[...profile.team]:profile.roster.slice(0,4).map(r=>r.cardId);}
  function combatDefaults(profile,id){const row=profile.roster.find(r=>r.cardId===id);return {level:row?.level??80,stars:row?.stars??0,rewards:profile.fanRewards};}
  function growthDefaults(profile,id){const row=profile.roster.find(r=>r.cardId===id);return {currentLevel:row?.level??1,currentBreak:row?.breakthrough??0,currentExp:row?.exp??0};}
  function createStore(atlas,growth,storage){
    let current=empty(),previous=null,warning='';const listeners=new Set();
    try{const raw=storage?.getItem(KEY);if(raw){const saved=JSON.parse(raw);current=normalize(saved.current,atlas,growth);previous=saved.previous?normalize(saved.previous,atlas,growth):null;}}catch{warning='已保存资料无法读取，未覆盖原存储；可重新导入备份。';}
    const get=()=>clone(current);
    function save(value){const validated=normalize(value,atlas,growth);try{if(!storage)throw Error();storage.setItem(KEY,JSON.stringify({current:validated,previous:current}));}catch{throw Error('本地保存失败：浏览器存储不可用或空间不足，请导出资料备份');}previous=current;current=validated;warning='';for(const listener of listeners)listener(get());return get();}
    return {get,save,restore(){if(!previous)throw Error('没有上一版可恢复');return save(previous);},hasPrevious:()=>!!previous,get warning(){return warning;},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
  }
  return {empty,normalize,parse,toCSV,teamIds,combatDefaults,growthDefaults,createStore,LIMIT};
});
