'use strict';
window.AtlasChibiGallery=(()=>{
  function mount(host,atlas,{openZoom}){
    const U=window.AtlasGameUI,images=window.ATLAS_CHIBI?.images||[],people=new Map(atlas.people.map(p=>[p.id,p]));
    const n=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const btn=(label,fn,cls='team-button')=>{const e=n('button',cls,label);e.type='button';e.addEventListener('click',fn);return U.decorateControl(e,label);};
    const state={person:'',kind:'portrait'};
    const controls=n('div','media-controls'),person=n('select'),kind=n('select');
    person.setAttribute('aria-label','Q版所属角色');person.append(new Option('全部角色',''));for(const p of atlas.people)person.append(new Option(p.name,p.id));
    kind.setAttribute('aria-label','Q版图片类型');kind.append(new Option('Q版立绘','portrait'),new Option('Q版头像','icon'));
    person.addEventListener('change',()=>{state.person=person.value;render();});kind.addEventListener('change',()=>{state.kind=kind.value;render();});
    controls.append(person,kind,btn('重置筛选',()=>{state.person='';state.kind='portrait';person.value='';kind.value='portrait';render();}));host.append(controls);
    const status=n('p','media-status'),grid=n('div','media-grid');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(status,grid);
    const dialog=n('dialog','media-dialog');dialog.setAttribute('aria-labelledby','chibi-detail-title');const body=n('div'),close=btn('关闭',()=>dialog.close(),'team-button media-dialog-close');dialog.append(close,body);host.append(dialog);
    dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
    function show(image){
      body.replaceChildren();const img=n('img','media-full-image');img.src=image.file;img.alt=image.label;const info=n('div','media-detail-copy'),title=n('h2','',image.label);title.id='chibi-detail-title';
      info.append(title,n('p','media-note',`${image.width} × ${image.height}`));const actions=n('div','media-detail-actions'),save=n('a','download-button','保存图片');save.href=image.file;save.download=image.file.split('/').pop();
      actions.append(U.decorateControl(save,save.textContent),btn('放大查看',()=>{dialog.close();openZoom(image.file,image.label);}));info.append(actions);body.append(img,info);dialog.showModal();close.focus();
    }
    function render(){
      const list=images.filter(x=>(state.kind==='portrait'?x.rendered:!x.rendered)&&(!state.person||x.people.includes(state.person)));grid.replaceChildren();
      status.textContent=`${state.kind==='portrait'?'Q版立绘':'Q版头像'} · ${list.length} 张${state.person?' · '+people.get(state.person).name:''}`;
      for(const image of list){const b=btn('',()=>show(image),'media-tile');b.setAttribute('aria-label','查看 '+image.label);const stage=n('span','media-tile-stage'),img=n('img');img.src=image.thumb;img.alt=image.label;img.loading='lazy';stage.append(img);const copy=n('span','media-tile-copy');copy.append(n('b','',image.label));b.append(stage,copy);grid.append(b);}
      if(!list.length)grid.append(n('p','media-empty','暂无对应图片，可查看其他角色或切换图片类型。'));
    }
    render();return {select(personId=''){state.person=personId;state.kind='portrait';person.value=personId;kind.value='portrait';render();}};
  }
  return {mount};
})();
