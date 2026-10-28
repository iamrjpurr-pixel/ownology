# Brand Vault website import (e1test owner, wineryId 16062). Only websitePreview + importWines POSTs allowed.
import asyncio, os, json
from playwright.async_api import async_playwright
OWNER = os.environ["OWNER_JWT"]
EXE = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
S = "/app/.screenshots/contrast"
ALLOW = ("brandPortal.websitePreview", "brandPortal.importWines")

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=EXE)
        ctx = await b.new_context(viewport={"width": 1920, "height": 1080})
        await ctx.add_cookies([{"name": "app_session_id", "value": OWNER, "domain": "localhost", "path": "/"}])
        await ctx.add_init_script("localStorage.setItem('ow_import_offered_16062','1');")
        calls = []
        async def blk(route):
            r = route.request
            if r.method != "GET" and not any(a in r.url for a in ALLOW):
                await route.abort()
            else:
                if r.method != "GET": calls.append(r.url.split("/api/trpc/")[1][:60])
                await route.continue_()
        await ctx.route("**/*", blk)
        p = await ctx.new_page()
        try:
            await p.goto("http://localhost:3000/brand", wait_until="domcontentloaded")
            await p.wait_for_selector('[data-testid="vault-import-website"]', timeout=30000)
            await p.wait_for_timeout(2000)
            print("PASS guided import shown; dialog auto-open?", await p.locator('[data-testid="import-website-dialog"]').count())
            print("toolbar import btn:", await p.locator('[data-testid="import-website-button"]').count())
            await p.click('[data-testid="vault-import-website"]')
            await p.wait_for_selector('[data-testid="import-website-dialog"]', timeout=5000)
            print("prefilled url:", await p.input_value('[data-testid="import-website-url"]'))
            await p.fill('[data-testid="import-website-url"]', "patinawines.com.au/collection/wines/")
            await p.click('[data-testid="import-website-read"]')
            await p.wait_for_timeout(1500)
            print("reading msg:", await p.locator('[data-testid="import-website-reading"]').count())
            await p.wait_for_selector('[data-testid="import-website-results"], [data-testid="import-website-none"]', timeout=120000)
            if await p.locator('[data-testid="import-website-none"]').count():
                print("FAIL none:", await p.inner_text('[data-testid="import-website-none"]'))
                return
            items = p.locator('[data-testid^="import-wine-"]')
            n = await items.count()
            print("RESULTS count:", n)
            for i in range(n):
                print("  ", i, (await items.nth(i).inner_text()).replace("\n", " | "))
            await p.screenshot(path=f"{S}/import_results.jpeg", quality=40, type="jpeg")
            print("save label before:", await p.inner_text('[data-testid="import-website-save"]'))
            await items.nth(n - 1).locator('button[role="checkbox"]').click()
            await p.wait_for_timeout(300)
            print("save label after untick:", await p.inner_text('[data-testid="import-website-save"]'))
            await p.click('[data-testid="import-website-save"]')
            t = p.locator('[data-sonner-toast]').first
            await t.wait_for(timeout=20000)
            print("TOAST:", await t.inner_text())
            await p.wait_for_timeout(2500)
            print("dialog open after save:", await p.locator('[data-testid="import-website-dialog"]').count())
            rows = p.locator('[data-testid^="wine-list-item-"]')
            print("wine list count:", await rows.count())
            for i in range(await rows.count()):
                print("  row", (await rows.nth(i).inner_text()).replace("\n", " | "))
            await rows.first.click()
            await p.wait_for_timeout(1000)
            print("protocol:", (await p.inner_text('[data-testid="wine-protocol"]'))[:250])
            await p.screenshot(path=f"{S}/import_after.jpeg", quality=40, type="jpeg")
        except Exception as e:
            print("ERROR", e)
            await p.screenshot(path=f"{S}/import_err.jpeg", quality=40, type="jpeg")
        print("POSTS made:", calls)
        await b.close()
asyncio.run(main())
