import { createRequire } from 'node:module';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium, expect } = createRequire(path.join(root, 'frontend/package.json'))('@playwright/test');
const base = process.env.VIDEO_BASE_URL;
const run = process.env.VIDEO_RUN_DIR;
if (!base || !run) throw new Error('Use render_all.sh, not record.mjs directly.');
const browser = await chromium.launch();
const manifest = [];
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let vertical = false;
let current = {x: 25, y: 25};
const logo = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="14" fill="#6955ed"/><path d="m12 22 25-11-10 26-4-11-11-4Zm11 4 14-15" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>`;
const fontBytes = await readFile(path.join(root,'frontend/node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2'));
const fontURL = `data:font/woff2;base64,${fontBytes.toString('base64')}`;

async function overlays(page) {
  await page.evaluate(({vertical}) => {
    const style = document.createElement('style');
    style.textContent = `#film-caption{position:fixed;z-index:2147483640;bottom:${vertical ? 24 : 20}px;left:50%;transform:translate(-50%,8px);opacity:0;transition:opacity .35s,transform .35s;background:rgba(20,24,44,.94);color:white;border:1px solid #ffffff24;border-radius:18px;padding:15px 25px;box-shadow:0 12px 35px #10142622;font:600 ${vertical ? 20 : 22}px/1.4 Inter,sans-serif;text-align:center;max-width:${vertical ? 'calc(100% - 30px)' : '94%'};width:max-content;pointer-events:none}#film-caption.show{opacity:1;transform:translate(-50%,0)}#film-cursor{position:fixed;top:0;left:0;width:30px;height:36px;z-index:2147483646;pointer-events:none;filter:drop-shadow(0 3px 4px #17255455);transform:translate(25px,25px)}.film-ripple{position:fixed;z-index:2147483645;width:12px;height:12px;border:3px solid #806aff;border-radius:50%;pointer-events:none;animation:film-ripple .65s ease-out forwards}@keyframes film-ripple{from{opacity:.9;transform:translate(-50%,-50%) scale(.5)}to{opacity:0;transform:translate(-50%,-50%) scale(5)}}`;
    document.head.append(style);
    style.textContent += 'body{padding-bottom:110px!important}button,a,textarea,select,h2{scroll-margin-block:110px}.toast{left:auto!important;right:24px;top:24px;bottom:auto!important;transform:translateY(-30px)!important}.toast.visible{transform:translateY(0)!important}';
    const caption=document.createElement('div');caption.id='film-caption';document.body.append(caption);
    const cursor=document.createElement('div');cursor.id='film-cursor';cursor.innerHTML='<svg viewBox="0 0 28 34"><path d="M3 2v26l6-7 5 11 5-2-5-10 10-1Z" fill="white" stroke="#33275e" stroke-width="2" stroke-linejoin="round"/></svg>';document.body.append(cursor);
    document.addEventListener('mousemove', e => {cursor.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;});
    document.addEventListener('mousedown', e => {const r=document.createElement('div');r.className='film-ripple';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.body.append(r);setTimeout(()=>r.remove(),700);});
  }, {vertical});
  current={x:25,y:25};
}
async function caption(page, text) {
  await page.evaluate(text=>{const el=document.getElementById('film-caption');el.classList.remove('show');setTimeout(()=>{el.textContent=text;el.classList.add('show');},180);},text);
}
async function move(page, locator) {
  await locator.waitFor({state:'visible'});
  for(let attempt=0;attempt<3;attempt++) {
    try {await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));break;}
    catch(error) {if(attempt===2 || !error.message.includes('not attached'))throw error;await page.waitForLoadState('networkidle');}
  }
  const box=await locator.boundingBox();
  if(!box) throw new Error('Missing visible cursor target');
  const target={x:box.x+box.width/2,y:box.y+Math.min(box.height/2,35)};
  const start={...current};
  for(let i=1;i<=28;i++) {const t=i/28;const k=t*t*(3-2*t);await page.mouse.move(start.x+(target.x-start.x)*k,start.y+(target.y-start.y)*k);await sleep(12);}
  current=target;
}
async function click(page,locator) {await move(page,locator);await locator.click({delay:90});}
async function nav(page,name) {
  if(vertical) {await click(page,page.getByRole('button',{name:'Open navigation'}));await click(page,page.getByRole('dialog').getByRole('link',{name,exact:true}));}
  else await click(page,page.getByRole('link',{name,exact:true}).first());
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/'+name.toLowerCase());
  await page.waitForLoadState('networkidle');
}
async function card(page, kind, dashboard) {
  await page.setContent(`<!doctype html><html><head><style>@font-face{font-family:Inter;src:url('${fontURL}')}*{box-sizing:border-box}body{margin:0;background:#f3f4fc;font-family:Inter,sans-serif;color:#20233d;overflow:hidden}.orb{position:absolute;width:720px;height:720px;border-radius:50%;background:radial-gradient(circle,#d9d3ff,transparent 70%);left:-180px;top:-220px}.stage{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:${vertical ? 30 : 80}px}.brand{display:flex;align-items:center;gap:20px;font-size:${vertical ? 35 : 62}px;letter-spacing:-2px}.brand svg{width:${vertical ? 60 : 90}px}.eyebrow{font-size:${vertical ? 13 : 19}px;letter-spacing:4px;color:#7968cb;margin-bottom:28px;text-align:center}.headline{font-size:${vertical ? 42 : 76}px;line-height:1.1;letter-spacing:-2px;text-align:center;margin:30px 0 20px;max-width:1100px}.sub{font-size:${vertical ? 21 : 29}px;color:#62657b;text-align:center;max-width:850px;line-height:1.5}.notifications{margin-top:25px;width:${vertical ? '100%' : '740px'};display:grid;gap:15px}.notification{background:#ffffffeb;border:1px solid #e2dff4;border-radius:20px;padding:${vertical ? 20 : 24}px;box-shadow:0 12px 35px #2822570a;opacity:0;transform:translateY(25px);animation:arrive .7s forwards}.notification b{display:block;font-size:${vertical ? 19 : 25}px;margin-bottom:8px}.notification span{font-size:${vertical ? 14 : 19}px;color:#77798a}.notification:nth-child(2){animation-delay:1s}.notification:nth-child(3){animation-delay:2s}.notification:nth-child(4){animation-delay:3s}@keyframes arrive{to{opacity:1;transform:translateY(0)}}.backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.10;filter:blur(3px)}.cta{margin-top:26px;border-radius:40px;padding:20px 32px;background:#6955ed;color:white;font-size:${vertical ? 18 : 25}px}.fiction{position:absolute;top:30px;right:30px;font-size:14px;color:#777b92}</style></head><body><div class="orb"></div>${dashboard ? `<img class="backdrop" src="data:image/png;base64,${dashboard}">` : ''}<div class="stage"><div class="eyebrow">${kind==='hook'?'YOUR NEXT OPPORTUNITY':'LOCAL-FIRST · HUMAN-LED'}</div><div class="brand">${logo}<strong>LeadPilot AI</strong></div>${kind==='hook'?`<h1 class="headline">Good inquiries.<br>Busy days.</h1><div class="notifications">${[['Sarah · website redesign','Mobile site + online ordering'],['Michael · local SEO','Updated address, new customers'],['Olivia · online store','Shipping and local pickup'],['Emma · online ordering','A simpler catering order flow']].map(([a,b])=>`<div class="notification"><b>${a}</b><span>New fictional inquiry · ${b}</span></div>`).join('')}</div>`:`<h1 class="headline">Your leads.<br>Organized.</h1><p class="sub">A calmer way to organize inquiries,<br>draft replies and plan follow-ups.</p><div class="cta">One-time purchase. Download and install.</div>`}</div><div class="fiction">Fictional demo</div></body></html>`);
  await page.addStyleTag({content: `@media(min-width:900px){.stage:has(.notifications){display:grid;grid-template-columns:1fr 1fr;gap:0 55px;align-content:center}.stage:has(.notifications) .eyebrow{grid-column:1;text-align:left;margin-bottom:20px}.stage:has(.notifications) .brand{grid-column:1;font-size:43px;align-self:start}.stage:has(.notifications) .brand svg{width:64px}.stage:has(.notifications) .headline{grid-column:1;font-size:65px;text-align:left;align-self:start;margin:30px 0}.notifications{grid-column:2;grid-row:1/span 4;width:100%;margin:0}.notification{padding:22px}.notification b{font-size:22px}.notification span{font-size:16px}}`});
  await page.evaluate(()=>document.fonts.ready);
}
async function scene(name,duration,url,action,kind) {
  const size=vertical?{width:1080,height:1920}:{width:1920,height:1080};
  const logical=vertical?{width:540,height:960}:{width:1280,height:720};
  const scale=vertical?2:1.5;
  const context=await browser.newContext({viewport:size,deviceScaleFactor:1,recordVideo:{dir:path.join(run,'raw'),size},permissions:['clipboard-read','clipboard-write'],colorScheme:'light'});
  await context.request.post(base+'/api/auth/login',{headers:{'X-Requested-With':'LeadPilot'},data:{email:'seller@example.com',password:'FictionalVideo123!'}});
  await context.route(base+'/__video_stage__',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;overflow:hidden}iframe{border:0;display:block;width:${logical.width}px;height:${logical.height}px;transform:scale(${scale});transform-origin:top left}</style><iframe title="LeadPilot filming stage" src="${base+url}" allow="clipboard-read; clipboard-write"></iframe>`}));
  const born=performance.now();
  const outer=await context.newPage();
  outer.on('pageerror',e=>errors.push(e.message));
  await outer.goto(base+'/__video_stage__');
  const page=await (await outer.locator('iframe').elementHandle()).contentFrame();
  page.mouse=outer.mouse;
  if(kind) await card(page,kind,kind==='end'?await readFile(path.join(run,'dashboard.png'),'base64'):null);
  else {await expect(page.getByRole('heading').first()).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');}
  if(kind==='end' && !vertical)await page.addStyleTag({content:'.stage{transform:translateY(-55px)}'});
  await overlays(page);
  await page.mouse.move(25,25);
  if(vertical) await page.addStyleTag({content:'body{padding-bottom:200px!important}button,a,textarea,select,h2{scroll-margin-block:200px}'});
  const start=(performance.now()-born)/1000;
  const t=performance.now();
  const at=async(seconds)=>{const left=seconds*1000-(performance.now()-t);if(left>0)await sleep(left);};
  await action(page,at);
  const elapsed=(performance.now()-t)/1000;
  if(elapsed>duration) throw new Error(`${name} actions exceeded scene duration (${elapsed.toFixed(1)} > ${duration})`);
  await at(duration+1);
  if(!kind && await page.getByTestId('toast').count()) {
    const toast=await page.getByTestId('toast').allTextContents();
    if(toast.some(t=>/error|failed|unavailable/i.test(t)))throw new Error(toast.join());
  }
  const video=outer.video();await context.close();
  manifest.push({name,duration,start,raw:await video.path(),vertical});
  console.log(`Recorded ${name}: ${duration}s (${start.toFixed(2)}s preparation trimmed)`);
}

try {
  await mkdir(path.join(run,'raw'),{recursive:true});
  const shot=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await shot.request.post(base+'/api/auth/login',{headers:{'X-Requested-With':'LeadPilot'},data:{email:'seller@example.com',password:'FictionalVideo123!'}});
  const sp=await shot.newPage();await sp.goto(base);await sp.waitForLoadState('networkidle');await sp.evaluate(()=>document.fonts.ready);await sp.screenshot({path:path.join(run,'dashboard.png')});await shot.close();
  await scene('s1-hook',10,'/',async(p,at)=>{await caption(p,'New leads are coming in. Are you following up?');await at(9);},'hook');
  await scene('s2-overview',10,'/',async(p,at)=>{await caption(p,'Meet LeadPilot AI.');await at(4);await caption(p,'Organize leads. Draft replies. Stay on top of follow-ups.');await move(p,p.getByTestId('overdue-count'));await at(9);});
  let leadURL, draftURL;
  await scene('s3-inquiry',15,'/',async(p,at)=>{await caption(p,'Every inquiry in one place.');await at(1);await click(p,p.getByTestId('simulate-inquiry'));await expect(p.getByTestId('toast')).toContainText('Emma Rivera');await move(p,p.getByRole('link',{name:/Emma Rivera/}).first());await at(4);await click(p,p.getByRole('link',{name:/Emma Rivera/}).first());await expect(p.getByRole('heading',{name:'Emma Rivera'})).toBeVisible();leadURL=new URL(p.url()).pathname;await move(p,p.getByText('Customer message',{exact:true}));await at(10);await move(p,p.getByText('Follow-up timeline',{exact:true}));});
  await scene('s4-draft',20,leadURL,async(p,at)=>{await caption(p,'A personalized first draft, ready for your review.');await click(p,p.getByTestId('generate-draft'));await expect(p.getByTestId('draft-body')).toHaveValue(/Emma/);await at(3);const tone=p.locator('.editor-grid aside select');await click(p,tone);await tone.selectOption('concise');await expect(tone).toHaveValue('concise');await at(6);const body=p.getByTestId('draft-body');await click(p,body);await body.press('Control+End');await body.pressSequentially('\n\nHappy to keep the conversation on email.',{delay:45});await move(p,body);await at(11);await caption(p,'You review. You send. Always.');await move(p,p.getByText('Your review checklist',{exact:true}));await at(14);await click(p,p.getByTestId('copy-draft'));await expect(p.getByTestId('toast')).toContainText('copied');await at(17);await click(p,p.getByTestId('approve-draft'));await expect(p.getByTestId('mark-sent')).toBeEnabled();draftURL=new URL(p.url()).pathname;});
  await scene('s5-followup',15,draftURL,async(p,at)=>{await caption(p,'Sent it yourself? Record it here.');await click(p,p.getByTestId('mark-sent'));await expect(p.getByRole('dialog')).toContainText('next follow-up');await at(3);await click(p,p.getByTestId('confirm-mark-sent'));await at(5);await nav(p,'Reminders');await caption(p,'Know who needs your attention.');await at(9);await nav(p,'Leads');await click(p,p.getByRole('link',{name:/Emma Rivera/}).first());await move(p,p.getByText('Activity history',{exact:true}));await at(14);});
  await scene('s6-end',15,'/',async(p,at)=>{await caption(p,'Your leads. Organized.');await at(14);},'end');
  vertical=true;
  const reset=await browser.newContext();await reset.request.post(base+'/api/auth/login',{headers:{'X-Requested-With':'LeadPilot'},data:{email:'seller@example.com',password:'FictionalVideo123!'}});
  for(const [route,method] of [['/demo','delete'],['/demo/load','post']]){const response=await reset.request[method](base+'/api'+route,{headers:{'X-Requested-With':'LeadPilot'}});if(!response.ok())throw new Error('Demo reset failed');}
  await reset.request.patch(base+'/api/settings',{headers:{'X-Requested-With':'LeadPilot'},data:{tone:'concise'}});await reset.close();
  await scene('v1-hook',5,'/',async(p,at)=>{await caption(p,'New inquiry. Next step?');await at(4);},'hook');
  await scene('v2-overview',7,'/',async(p,at)=>{await caption(p,'Your leads. One workspace.');await at(2);await nav(p,'Leads');await expect(p.getByTestId('mobile-leads')).toBeVisible();await at(6);});
  let mobileLead;
  await scene('v3-draft',12,'/leads',async(p,at)=>{await caption(p,'Draft. Review. Make it yours.');await click(p,p.getByRole('link',{name:/Sarah Chen/}).last());mobileLead=new URL(p.url()).pathname;await click(p,p.getByTestId('generate-draft'));await expect(p.getByTestId('draft-body')).toHaveValue(/Sarah/);await at(5);await move(p,p.getByTestId('draft-body'));await at(8);await caption(p,'You send. Never automatic.');await click(p,p.getByTestId('copy-draft'));await expect(p.getByTestId('toast')).toContainText('copied');await at(11);});
  await scene('v4-reminders',7,'/reminders',async(p,at)=>{await caption(p,'Follow-ups, kept in view.');await at(2);await move(p,p.getByRole('heading',{name:/Due today/}));await at(4);await move(p,p.getByRole('heading',{name:/Upcoming 7 days/}));await at(6);});
  await scene('v5-end',7,'/',async(p,at)=>{await caption(p,'LeadPilot AI · Download and install.');await at(6);},'end');
  const thumb=await browser.newPage({viewport:{width:1280,height:720}});
  const image=await readFile(path.join(run,'dashboard.png'),'base64');
  await thumb.setContent(`<style>@font-face{font-family:Inter;src:url('${fontURL}')}*{box-sizing:border-box}body{margin:0;background:#17172e;color:white;font-family:Inter,sans-serif;overflow:hidden}.panel{position:absolute;left:620px;top:70px;width:1200px;transform:rotate(-5deg);border:8px solid #ffffff20;border-radius:22px;overflow:hidden;box-shadow:0 25px 90px #0007}img{width:100%}.copy{position:absolute;left:65px;top:85px;width:600px}.brand{display:flex;align-items:center;gap:16px;font-size:33px}.brand svg{width:60px}h1{font-size:78px;line-height:1.06;letter-spacing:-4px;margin:50px 0 28px}p{color:#ccc8ec;font-size:24px;line-height:1.5}.tag{font-size:17px;color:#ada5ef;letter-spacing:3px}</style><div class="panel"><img src="data:image/png;base64,${image}"></div><div class="copy"><div class="brand">${logo}<b>LeadPilot AI</b></div><h1>Follow up on<br>every lead.</h1><p>Organize inquiries. Review drafts.<br>Plan your next step.</p><div class="tag">LOCAL-FIRST · HUMAN-LED</div></div>`);
  await thumb.evaluate(()=>document.fonts.ready);await thumb.screenshot({path:path.join(run,'thumbnail.png')});await thumb.close();
  if(errors.length)throw new Error(errors.join('\n'));
  await writeFile(path.join(run,'scenes.json'),JSON.stringify(manifest,null,2));
} finally {await browser.close();}
