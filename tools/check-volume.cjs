const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('home.appearance','dark');
   window.fixture={level:45,muted:false,keys:[],calls:0,fail:false,failRegister:false,hidden:false};
   Object.defineProperty(document,'hidden',{get:()=>fixture.hidden,configurable:true});
   window.tizen={application:{getAppsInfo:ok=>ok([{id:'rJeHak5zRg.Spotify',name:'Spotify'}]),launch:(_,ok)=>ok()},systeminfo:{getPropertyValue:(_,ok)=>ok({connected:[]}),addPropertyValueChangeListener:()=>1},tvinputdevice:{registerKey:k=>{if(fixture.failRegister&&k==='VolumeDown')throw Error('denied');fixture.keys.push(k);},unregisterKey:k=>{fixture.keys=fixture.keys.filter(x=>x!==k);}},tvaudiocontrol:{getVolume:()=>{if(fixture.fail)throw Error('unavailable');return fixture.level;},isMute:()=>fixture.muted,setMute:v=>{fixture.calls++;fixture.muted=v;},setVolumeUp:()=>{fixture.calls++;fixture.level=Math.min(100,fixture.level+1);fixture.muted=false;},setVolumeDown:()=>{fixture.calls++;fixture.level=Math.max(0,fixture.level-1);fixture.muted=false;},setVolumeChangeListener:fn=>{fixture.changed=fn;},unsetVolumeChangeListener:()=>{fixture.changed=null;}}};
  });
  const url=pathToFileURL(path.resolve(__dirname,'../app/index.html')).href;
  async function ready(){await page.waitForFunction(()=>document.getElementById('boot').hidden);await page.waitForTimeout(650);}
  async function key(code){return page.evaluate(code=>{const e=new KeyboardEvent('keydown',{keyCode:code,bubbles:true,cancelable:true});document.dispatchEvent(e);return e.defaultPrevented;},code);}
  await page.goto(url);await ready();
  assert.deepEqual(await page.evaluate(()=>fixture.keys),['VolumeUp','VolumeDown','VolumeMute']);
  assert.equal(await page.locator('#volume-osd').isVisible(),false);
  assert.equal(await key(447),true);
  assert.equal(await page.evaluate(()=>fixture.level),46);
  assert.equal(await page.evaluate(()=>fixture.calls),1,'one key changes volume exactly once');
  assert.equal(await page.locator('#volume-value').textContent(),'46');
  assert.equal(await page.locator('.volume-step.lit').count(),12);
  const bounds=await page.locator('#volume-osd').boundingBox();
  assert.ok(Math.abs(bounds.x+bounds.width/2-960)<1,'volume bar is horizontally centered');
  await page.screenshot({path:path.resolve(__dirname,'../.local/crt-volume-preview.png')});
  await key(449);assert.equal(await page.locator('#volume-label').textContent(),'muted');
  assert.equal(await page.locator('.volume-step.lit').count(),0);
  await key(448);assert.equal(await page.evaluate(()=>fixture.muted),false);
  await page.evaluate(()=>{fixture.level=100;fixture.changed();});
  await key(447);assert.equal(await page.locator('#volume-value').textContent(),'100');
  await page.evaluate(()=>{fixture.level=0;fixture.changed();});
  await key(448);assert.equal(await page.locator('.volume-step.lit').count(),0);
  await page.evaluate(()=>{fixture.hidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  assert.deepEqual(await page.evaluate(()=>fixture.keys),[]);
  assert.equal(await page.locator('#volume-osd').isVisible(),false);
  const before=await page.evaluate(()=>fixture.calls);await key(447);
  assert.equal(await page.evaluate(()=>fixture.calls),before,'background does not handle volume');
  await page.evaluate(()=>{fixture.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>fixture.keys.length),3);
  assert.equal(await page.locator('#volume-osd').isVisible(),false,'no stale popup after return');
  await page.evaluate(()=>{fixture.fail=true;});await key(447);
  assert.deepEqual(await page.evaluate(()=>fixture.keys),[]);
  assert.equal(await page.locator('#volume-osd').isVisible(),false);
  assert.ok((await page.locator('#said').textContent()).includes('volume unavailable'));
  await page.evaluate(()=>{fixture.fail=false;fixture.failRegister=true;document.dispatchEvent(new Event('visibilitychange'));});
  assert.deepEqual(await page.evaluate(()=>fixture.keys),[],'partial registration rolls back');
  assert.equal(await key(447),false,'leaves native keys alone after registration failure');
  await page.evaluate(()=>{fixture.failRegister=false;document.dispatchEvent(new Event('visibilitychange'));});
  await key(447);await page.waitForFunction(()=>document.getElementById('volume-osd').hidden,{},{timeout:3500});
  assert.deepEqual(errors,[]);
  console.log('Volume passed: real readings, one step per key, mute, boundaries, foreground lifecycle, native fallback, partial registration rollback and dismissal.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
