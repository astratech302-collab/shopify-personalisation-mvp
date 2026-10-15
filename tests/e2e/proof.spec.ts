import {test,expect} from '@playwright/test';
test('original without JavaScript',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('/proof');await expect(page.locator('h1')).toHaveText('Original headline');await context.close();});
for(const variant of ['original','A','B'])test(`unmeasured ${variant} preview`,async({page})=>{await page.goto(`/proof?lp_preview=${variant}`);await expect(page.locator('h1')).toHaveText(variant==='original'?'Original headline':`${variant} headline`);expect(await page.evaluate(()=>localStorage.length)).toBe(0);});
test('unknown consent defaults without experiment storage',async({page})=>{await page.goto('/proof?lp_ad=123456789');await expect(page.locator('h1')).toHaveText('Original headline');expect(await page.evaluate(()=>localStorage.length)).toBe(0);});
test('allowed assignment is stable and emits distinct signals',async({page})=>{await page.goto('/proof?lp_consent=allowed&lp_ad=123456789');await expect.poll(()=>page.evaluate(()=>localStorage.length)).toBe(1);const before=await page.locator('h1').textContent();await page.reload();await expect(page.locator('h1')).toHaveText(before!);const names=await page.evaluate(()=>((window as unknown as {__proofEvents:{name:string}[]}).__proofEvents).map(e=>e.name));expect(names).toContain('app:experiment_assigned');expect(names).toContain('app:variant_rendered');});
test('storage denial falls back without emitting assignment',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('denied');};});
 await page.goto('/proof?lp_consent=allowed&lp_ad=123456789');await expect(page.locator('h1')).toHaveText('Original headline');
 expect(await page.evaluate(()=>((window as unknown as {__proofEvents:unknown[]}).__proofEvents).length)).toBe(0);
});
test('consent withdrawal clears assignment and restores original',async({page})=>{
 await page.goto('/proof?lp_consent=allowed&lp_ad=123456789');await expect.poll(()=>page.evaluate(()=>localStorage.length)).toBe(1);
 await page.evaluate(()=>{window.Shopify!.customerPrivacy!.analyticsProcessingAllowed=()=>false;document.dispatchEvent(new Event('visitorConsentCollected'));});
 await expect(page.locator('h1')).toHaveText('Original headline');expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
test('late consent does not enrol on the current view',async({page})=>{
 await page.goto('/proof?lp_ad=123456789');
 await page.evaluate(()=>{const privacy=window.Shopify!.customerPrivacy!;privacy.analyticsProcessingAllowed=()=>true;privacy.marketingAllowed=()=>true;privacy.preferencesProcessingAllowed=()=>true;document.dispatchEvent(new Event('visitorConsentCollected'));});
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);await expect(page.locator('h1')).toHaveText('Original headline');
});
