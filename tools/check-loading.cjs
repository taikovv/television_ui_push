const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
   window.fixture={launches:0};
   window.tizen={application:{getAppsInfo:(ok)=>{fixture.appsDone=ok;},launch:(_,ok)=>{fixture.launches++;ok();}},systeminfo:{getPropertyValue:(_,ok)=>{fixture.inputsDone=ok;},addPropertyValueChangeListener:()=>1}};
  });
  const url=pathToFileURL(path.resolve(__dirname,'../app/index.html')).href;
  await page.goto(url);
  await page.waitForFunction(()=>document.fonts.check('700 112px Heros'));
  assert.equal(await page.locator('#boot').isVisible(),true);
  assert.equal(await page.locator('.page').isVisible(),false);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>fixture.launches),0);
  await page.screenshot({path:path.resolve(__dirname,'../.local/crt-loading-preview.png')});
  await page.evaluate(()=>fixture.appsDone([{id:'rJeHak5zRg.Spotify',name:'Spotify'}]));
  assert.equal(await page.locator('body').getAttribute('class'),'loading','waits for input discovery too');
  await page.evaluate(()=>fixture.inputsDone([]));
  await page.waitForFunction(()=>document.getElementById('boot').hidden);
  assert.equal(await page.locator('.focus .name').textContent(),'spotify');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>fixture.launches),1);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('#boot').isVisible(),false,'does not replay on return');

  await page.reload();
  await page.keyboard.press('Backspace');
  await page.waitForFunction(()=>document.getElementById('boot').hidden);
  assert.equal(await page.locator('.page').isVisible(),true);
  assert.ok((await page.locator('.name').allTextContents()).includes('samsung home'));

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  assert.equal(await page.locator('.crt-signal').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.waitForFunction(()=>document.getElementById('boot').hidden,{},{timeout:6500});
  assert.equal(await page.locator('.page').isVisible(),true,'timeout exposes recovery controls');
  assert.deepEqual(errors,[]);
  console.log('Loading passed: real discovery gating, blocked launch keys, ready dismissal, no replay, Back escape, timeout recovery and reduced motion.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
