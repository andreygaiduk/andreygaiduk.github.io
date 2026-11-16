/* Text-only Markdown for Notes and About. Raw HTML is displayed as text. */
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderMarkdown(target, source, prefix='note') {
  const definitions = new Map(), references = new Map(), lines = String(source||'').replace(/\r\n/g,'\n').split('\n');
  const body = [];
  let fence = null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i], marker=line.match(/^ {0,3}(`{3,}|~{3,})/);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;body.push(line);continue;}
    const def=!fence&&line.match(/^ {0,3}\[\^([^\]]+)\]:\s*(.*)$/);
    if(!def){body.push(line);continue;}
    const parts=[def[2]];
    while(i+1<lines.length&&/^(?: {4}|\t)/.test(lines[i+1]))parts.push(lines[++i].replace(/^(?: {4}|\t)/,''));
    definitions.set(def[1],parts.join('\n'));
  }
  const parser=new marked.Marked();
  parser.use({gfm:true, renderer:{
    html(token){return escapeHTML(token.text||token.raw);},
    image(token){return escapeHTML(token.text||'');}
  }, extensions:[{
    name:'footnoteReference',level:'inline',
    start(src){const i=src.indexOf('[^');return i<0?undefined:i;},
    tokenizer(src){const m=src.match(/^\[\^([^\]]+)\]/);if(m&&definitions.has(m[1]))return {type:'footnoteReference',raw:m[0],label:m[1]};},
    renderer(token){if(!references.has(token.label))references.set(token.label,references.size+1);const number=references.get(token.label);return `<sup><a href="#${prefix}-fn-${number}">${number}</a></sup>`;}
  }]});
  const template=document.createElement('template');
  template.innerHTML=parser.parse(body.join('\n'));
  // Construct footnotes before sanitization, with local jump links instead of navigation hashes.
  if(references.size){
    const foot=document.createElement('section');foot.className='footnotes';
    const list=document.createElement('ol');
    for(const [label,number] of references){
      const item=document.createElement('li');item.id=`${prefix}-fn-${number}`;
      item.innerHTML=parser.parse(definitions.get(label)||'');list.append(item);
    }
    foot.append(list);template.content.append(foot);
  }
  const allowed=new Set('A P BR H1 H2 H3 H4 H5 H6 STRONG EM DEL S BLOCKQUOTE UL OL LI HR PRE CODE TABLE THEAD TBODY TR TH TD SUP SECTION INPUT'.split(' '));
  for(const el of [...template.content.querySelectorAll('*')]){
    if(!allowed.has(el.tagName)){el.replaceWith(document.createTextNode(el.textContent||''));continue;}
    const href=el.getAttribute('href')||'', id=el.id, start=el.getAttribute('start'), checked=el.hasAttribute('checked'), isFoot=el.className==='footnotes';
    for(const attr of [...el.attributes])el.removeAttribute(attr.name);
    if(el.tagName==='A'){
      if(new RegExp('^#'+prefix+'-fn-\\d+$').test(href))el.setAttribute('href',href);
      else if(/^(?:https?:\/\/|mailto:)/i.test(href)){el.href=href;if(/^https?:/i.test(href)){el.target='_blank';el.rel='noopener noreferrer';}}
    }
    if(el.tagName==='LI'&&new RegExp('^'+prefix+'-fn-\\d+$').test(id))el.id=id;
    if(el.tagName==='OL'&&/^\d+$/.test(start||''))el.setAttribute('start',start);
    if(el.tagName==='SECTION'&&isFoot)el.className='footnotes';
    if(el.tagName==='INPUT'){el.type='checkbox';el.disabled=true;el.checked=checked;}
  }
  target.replaceChildren(template.content);
  for(const a of target.querySelectorAll(`a[href^="#${prefix}-fn-"]`))a.addEventListener('click',e=>{
    e.preventDefault();document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  for(const table of target.querySelectorAll('table')){const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;table.replaceWith(wrap);wrap.append(table);}
}
