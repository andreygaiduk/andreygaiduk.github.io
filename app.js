const projects = window.PROJECTS;
const settings = window.SITE;
const notes = window.NOTES || [];
const feed = document.getElementById('feed');
const sentinel = document.getElementById('sentinel');
const footer = document.getElementById('feed-footer');
const viewer = document.getElementById('viewer');
const menu = document.getElementById('nav');
const toggle = document.getElementById('menu-toggle');
const sections = [...document.querySelectorAll('.section')];
const get = id => document.getElementById(id);
let loaded = 0, activeIndex = -1, activeSection = 'projects', lastFocus = null, feedScroll = 0;
let activeNote = null, notesScroll = 0;
const validSections = new Set(sections.map(s=>s.id));
const siteName=settings.name||'Visual Archive';
const archiveTitle=siteName+' — Archive';
function appendParagraphs(parent,value){
  String(value||'').split(/\n\s*\n/).filter(Boolean).forEach(text=>{const p=document.createElement('p');p.textContent=text;parent.append(p);});
}
function externalLink(url,label){
  if(!/^https?:\/\//i.test(url||''))return null;
  const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function fillSettings(){
  document.querySelector('.wordmark').textContent=siteName;
  get('header-subtitle').textContent=settings.subtitle||'VISUAL ARCHIVE';
  get('nav-total').textContent=`Total: ${projects.length} / ${notes.length}`;
  get('notes-title').textContent=settings.notesTitle||'Notes';
  get('notes-subtitle').textContent=settings.notesSubtitle??'Thoughts, observations and fragments.';
  get('notes-subtitle').hidden=!get('notes-subtitle').textContent;
  get('about-name').textContent=settings.aboutName||siteName;
  renderMarkdown(get('about-body'),settings.aboutBody,'bio');
  if(typeof settings.aboutPhoto==='string'&&settings.aboutPhoto.startsWith('/assets/')){
    const photo=get('about-photo');photo.src=settings.aboutPhoto;photo.alt=settings.aboutName||siteName;photo.hidden=false;
    get('profile-layout').classList.add('has-photo');
  }
  function contactRow(label,value,href){
    if(!value)return;
    const dt=document.createElement('dt');dt.textContent=label;
    const dd=document.createElement('dd');
    if(href){const a=document.createElement('a');a.href=href;a.textContent=value;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener noreferrer';}dd.append(a);}else dd.textContent=value;
    get('contact-links').append(dt,dd);
  }
  const email=String(settings.email||'').trim();
  const telegram=String(settings.telegram||'').trim().replace(/^@/,'');
  contactRow('Email',email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'mailto:'+email:null);
  contactRow('Telegram',telegram?'@'+telegram:'',/^[a-zA-Z0-9_]+$/.test(telegram)?'https://t.me/'+telegram:null);
  contactRow('City',settings.city);
  renderNotes();
}
function noteMeta(note){
  const date=String(note.date||'').slice(0,10).split('-').reverse().join('.');
  const words=String(note.body||'').match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
  return [date,`${Math.max(1,Math.ceil(words.length/200))} min read`].filter(Boolean).join(' · ');
}
function renderNotes(){
  const fragment=document.createDocumentFragment();
  notes.forEach(note=>{
    const card=document.createElement('a');card.className='note-card';card.href='#note/'+encodeURIComponent(note.id);
    const meta=document.createElement('span');meta.className='note-meta';meta.textContent=noteMeta(note);
    const title=document.createElement('h2');title.textContent=note.title;
    card.append(meta,title);
    if(note.subtitle){const sub=document.createElement('p');sub.textContent=note.subtitle;card.append(sub);}
    const read=document.createElement('span');read.className='read-note';read.textContent='Read note ↗';card.append(read);
    fragment.append(card);
  });
  get('notes-list').replaceChildren(fragment);
  get('empty-notes').hidden=notes.length>0;
  const total=String(notes.length).padStart(2,'0');get('notes-count').textContent=total+' / '+total;
}
fillSettings();
if(!projects.length)get('empty-feed').hidden=false;
function renderNext(){
  const fragment=document.createDocumentFragment();
  projects.slice(loaded,loaded+4).forEach((p,i)=>{
    const a=document.createElement('a');
    a.className='project-card';a.href='#project/'+p.id;
    a.setAttribute('aria-label',p.title+', '+p.year);
    const cover=document.createElement('div');cover.className='cover';
    const img=new Image();img.src=p.image;img.alt=p.title;img.loading=loaded+i<4?'eager':'lazy';img.decoding='async';
    cover.append(img);
    const caption=document.createElement('div');caption.className='caption';
    const label=document.createElement('span');label.textContent=p.title;
    const category=document.createElement('span');category.className='category';category.textContent=p.type+' / '+p.year;
    caption.append(label,category);a.append(cover,caption);fragment.append(a);
  });
  feed.append(fragment);loaded=Math.min(loaded+4,projects.length);
  if(loaded===projects.length){footer.firstElementChild.textContent=projects.length+' / '+projects.length;footer.hidden=false;sentinel.hidden=true;observer.disconnect();}
}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&loaded<projects.length) renderNext()},{rootMargin:'500px'});
renderNext();observer.observe(sentinel);
function setMenu(open){
  menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
}
toggle.addEventListener('click',()=>setMenu(menu.hidden));
document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!toggle.contains(e.target))setMenu(false);});
menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
function showSection(id){
  if(!validSections.has(id))id='projects';
  if(activeSection!==id)window.scrollTo(0,0);
  activeSection=id;sections.forEach(s=>s.hidden=s.id!==id);
  document.querySelectorAll('.nav a').forEach(a=>{if(a.dataset.section===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
function showProject(index){
  if(index<0||index>=projects.length)return;
  const p=projects[index];activeIndex=index;showSection('projects');
  if(!viewer.open){lastFocus=document.activeElement;feedScroll=window.scrollY;viewer.showModal();document.body.classList.add('viewer-open');get('close-viewer').focus({preventScroll:true});}
  get('project-title').textContent=p.title;
  get('project-meta').textContent=[p.type,p.year].filter(Boolean).join(' / ');
  get('demo-label').hidden=!p.demo;
  renderProjectBlocks(p);
  get('project-count').textContent=String(index+1).padStart(2,'0')+' / '+String(projects.length).padStart(2,'0');
  get('prev').disabled=index===0;get('next').disabled=index===projects.length-1;
  viewer.scrollTop=0;
  document.title=p.title+' — '+siteName;
}
function projectFigure(media,p,eager=false){
  const figure=document.createElement('figure');
  figure.className='project-figure';
  const img=new Image();img.src=media.image;img.alt=media.alt||p.title;img.loading=eager?'eager':'lazy';img.decoding='async';
  if(media.width&&media.height){img.width=media.width;img.height=media.height;}
  figure.append(img);
  const caption=document.createElement('figcaption');
  if(media.caption){const label=document.createElement('span');label.textContent=media.caption;caption.append(label);}
  const src=media.source||p.source;
  const link=externalLink(src,'Источник ↗');if(link)caption.append(link);
  if(caption.childNodes.length)figure.append(caption);
  return figure;
}
function renderProjectBlocks(p){
  const target=get('project-blocks');
  const blocks=p.blocks?.length?p.blocks:[
    {type:'image',image:p.image,caption:'01 / Изображение'},
    {type:'text',text:p.description}
  ];
  const fragment=document.createDocumentFragment();
  blocks.forEach((block,index)=>{
    if(block.type==='image'){
      fragment.append(projectFigure(block,p,index===0));
    }else if(block.type==='gallery'){
      const gallery=document.createElement('div');gallery.className='project-gallery';
      (block.images||[]).forEach(media=>gallery.append(projectFigure(media,p)));
      fragment.append(gallery);
    }else if(block.type==='video'&&block.video){
      const figure=document.createElement('figure');figure.className='project-figure';const video=document.createElement('video');video.src=block.video;video.controls=true;video.playsInline=true;video.preload='metadata';figure.append(video);if(block.caption){const caption=document.createElement('figcaption');caption.textContent=block.caption;figure.append(caption);}fragment.append(figure);
    }else if(block.type==='text'){
      const copy=document.createElement('div');copy.className='project-text';
      if(block.heading){const h=document.createElement('h2');h.textContent=block.heading;copy.append(h);}
      String(block.text||'').split(/\n\s*\n/).filter(Boolean).forEach(text=>{const para=document.createElement('p');para.textContent=text;copy.append(para);});
      fragment.append(copy);
    }
  });
  target.replaceChildren(fragment);
}
function hideProject(){
  if(viewer.open){viewer.close();document.body.classList.remove('viewer-open');window.scrollTo(0,feedScroll);lastFocus?.focus({preventScroll:true});}
  activeIndex=-1;document.title=archiveTitle;
}
function showNote(note){
  const fromNotes=activeSection==='notes'&&!activeNote;
  if(fromNotes)notesScroll=window.scrollY;
  else if(activeSection!=='notes')notesScroll=0;
  showSection('notes');activeNote=note;
  get('notes-index').hidden=true;get('note-reader').hidden=false;
  get('note-title').textContent=note.title;get('note-meta').textContent=noteMeta(note);
  get('note-subtitle').textContent=note.subtitle||'';get('note-subtitle').hidden=!note.subtitle;
  renderMarkdown(get('note-body'),note.body,'article');
  document.title=note.title+' — '+archiveTitle;
  window.scrollTo(0,0);
  get('note-title').focus({preventScroll:true});
}
function hideNote(restore){
  if(!activeNote)return;
  const previous=activeNote;activeNote=null;
  get('note-reader').hidden=true;get('notes-index').hidden=false;
  if(restore){window.scrollTo(0,notesScroll);[...get('notes-list').querySelectorAll('a')].find(a=>a.getAttribute('href')==='#note/'+encodeURIComponent(previous.id))?.focus({preventScroll:true});}
}
function navigate(){
  let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}
  if(hash.startsWith('project/')){
    const i=projects.findIndex(p=>p.id===hash.slice(8));
    if(i>=0){hideNote(false);showProject(i);return;}
  }
  hideProject();
  if(hash.startsWith('note/')){
    const note=notes.find(n=>n.id===hash.slice(5));
    if(note){showNote(note);setMenu(false);return;}
  }
  hideNote(hash==='notes');showSection(validSections.has(hash)?hash:'projects');setMenu(false);
}
function closeProject(){history.replaceState(null,'','#projects');navigate();}
function step(delta){
  const i=activeIndex+delta;if(i>=0&&i<projects.length){history.replaceState(null,'','#project/'+projects[i].id);showProject(i);}
}
get('close-viewer').addEventListener('click',closeProject);get('back-to-feed').addEventListener('click',closeProject);
get('prev').addEventListener('click',()=>step(-1));get('next').addEventListener('click',()=>step(1));
get('project-top').addEventListener('click',()=>viewer.scrollTo({top:0,behavior:'smooth'}));
viewer.addEventListener('cancel',e=>{e.preventDefault();closeProject();});
document.addEventListener('keydown',e=>{
  if(!viewer.open&&e.key==='Escape')setMenu(false);
});
get('top').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
get('note-top').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
window.addEventListener('hashchange',navigate);navigate();
