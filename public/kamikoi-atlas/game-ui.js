'use strict';
window.AtlasGameUI=(()=>{
  const statIcons={maxHP:'HP',hp:'HP',HP:'HP',attack:'Attack',Attack:'Attack',defence:'Defence',Defence:'Defence',speed:'Speed',Speed:'Speed',CriticalRate:'Critical',CriticalDamageRate:'CriticalDamage',EffectHitRate:'EffectHit',ResistanceRate:'Resistance',PinchRate:'Pinch'};
  const skillIcons=new Set(['Skill_Attack','Skill_Buff','Skill_Debuff','Skill_Heal','Skill_Awakening','Skill_Ultimate_Attack','Skill_Ultimate_Buff','Skill_Ultimate_Debuff','Skill_Ultimate_Heal','Skill_Passive_Attack','Skill_Passive_Buff','Skill_Passive_Debuff','Skill_Passive_Heal']);
  function description(value){return !value||/^本地.*(?:缺失|缺少)$/.test(value)?'技能说明暂缺':value==='骨骼立绘快照'?'立绘预览':value;}
  function notice(value){return String(value).replace(/源技能缺失/g,'技能资料暂缺').replace(/本地中文文本缺失/g,'技能说明暂缺').replace(/配置AI/g,'敌方自动策略');}
  function icon(group,name,cls=''){
    const img=document.createElement('img');img.className='game-icon '+cls;img.dataset.iconGroup=group;img.src='assets/ui/'+group+'/'+name+'.webp';img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';return img;
  }
  function stat(key){return statIcons[key]?icon('Attribute',statIcons[key],'game-icon-tile'):null;}
  function skill(skill,index=0){const name=skill?.raw?.Icon?.match(/\[([^\]]+)\]/)?.[1];return icon('Skill',skillIcons.has(name)?name:index===1?'Skill_Ultimate_Attack':index===2?'Skill_Passive_Buff':'Skill_Attack','game-icon-tile');}
  function thumbnail(card){const art=card?.gallery?.find(a=>/_icon\.webp$/.test(a.file))||card?.preview;return art?.thumb||art?.file||'';}
  function portrait(card,cls=''){
    const box=document.createElement('span');box.className='game-portrait '+cls;
    const src=thumbnail(card);
    if(src){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';img.decoding='async';box.append(img);}
    else{box.classList.add('game-portrait-missing');box.textContent=card?.name?.slice(0,1)||'自';box.title=card?'图片暂未收录':'自定义敌方';}
    return box;
  }
  const utilityIcons={save:['Common','Icon_Confirm'],import:['Common','Icon_Copy'],export:['Common','Icon_Share'],reset:['Common','Icon_Renew'],add:['Common','Icon_Add'],arrow:['Common','Icon_Arrow4'],folder:['SystemIcon','Resource'],dice:['Common','Icon_Renew'],close:['Common','Icon_Cancel2'],delete:['Common','Icon_Delete'],edit:['Common','Icon_Edit'],search:['Common','Icon_Magnifier']};
  function utility(name){const [group,sprite]=utilityIcons[name]||utilityIcons.arrow;return icon(group,sprite,'utility-icon game-utility game-utility-'+name);}
  function decorateControl(control,text){
    if(control.dataset.gameDecorated)return control;
    text=String(text??'');
    const kind=/^[×✕]$|关闭/.test(text.trim())?'close':/删除|移除/.test(text)?'delete':/导出|下载/.test(text)?'export':/保存/.test(text)?'save':/导入|带入|上传/.test(text)?'import':/添加/.test(text)?'add':/恢复|清空|放弃|重置|重新/.test(text)?'reset':/读取|选择.*文件/.test(text)?'folder':/随机/.test(text)?'dice':/放大/.test(text)?'search':/计算|验证|运行/.test(text)?'arrow':/查看|管理|[→↗↓]\s*$/.test(text)?'arrow':null;
    if(kind){for(const node of control.childNodes)if(node.nodeType===3)node.textContent=node.textContent.replace(/^[＋+]\s*/,'').replace(/\s*[→↗↓]\s*$/,'').replace(/^[×✕]$/,'');control.prepend(utility(kind));control.dataset.gameDecorated=kind;}
    return control;
  }
  return {icon,stat,skill,thumbnail,portrait,utility,decorateControl,description,notice};
})();
