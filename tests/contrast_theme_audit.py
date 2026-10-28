# Contrast audit across 5 themes + curriculum/about CTA check (iteration 49)
import asyncio, json, sys, os
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
THEMES = ["cellar", "soft-cellar", "parchment", "red-crush", "white-crush"]
AUDIT = open("/app/scripts/contrast_audit.js").read()
ADMIN = open("/root/admin.jwt").read().strip()
OWNER = os.environ.get("OWNER_JWT", "")
SHOTS = "/app/.screenshots/contrast"
os.makedirs(SHOTS, exist_ok=True)

PAGES = [("/home", ADMIN), ("/curriculum", ADMIN), ("/curriculum/about", ADMIN), ("/pricing", ADMIN),
         ("/demo/tour", ADMIN), ("/know", ADMIN), ("/why-ownology", ADMIN), ("/cellar-journal", ADMIN),
         ("/free-run", ADMIN), ("/guide", ADMIN), ("/brand", OWNER), ("/admin", ADMIN),
         ("/admin/people", ADMIN), ("/admin/contacts", ADMIN), ("/dashboard", ADMIN)]

async def block_posts(route):
    if route.request.method != "GET":
        await route.abort()
    else:
        await route.continue_()

async def new_ctx(b, jwt, theme, w=1920, h=1080):
    ctx = await b.new_context(viewport={"width": w, "height": h})
    await ctx.add_cookies([{"name": "app_session_id", "value": jwt, "domain": "localhost", "path": "/"}])
    await ctx.add_init_script(f"localStorage.setItem('ownology:theme-override','{theme}');")
    await ctx.route("**/*", block_posts)
    return ctx

async def scroll(page):
    await page.evaluate("""async () => { for (let y=0; y<document.body.scrollHeight; y+=600){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); } window.scrollTo(0,0); }""")
    await page.wait_for_timeout(800)

async def cta_check(b):
    for th in THEMES:
        ctx = await new_ctx(b, ADMIN, th)
        p = await ctx.new_page()
        await p.goto(BASE + "/curriculum/about", wait_until="domcontentloaded")
        await p.wait_for_selector('[data-testid="cta-final-view"]', timeout=30000)
        await p.wait_for_timeout(1500)
        cls = await p.evaluate("document.documentElement.className")
        res = {}
        for tid in ["cta-view-curriculum", "cta-final-view", "cta-final-pricing"]:
            res[tid] = await p.evaluate("""(tid) => { const el=document.querySelector(`[data-testid=${tid}]`); const cs=getComputedStyle(el);
              let bg=null; for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n).backgroundColor; if(c && c!=='rgba(0, 0, 0, 0)'){bg=c;break;}}
              return {color: cs.color, bg, text: el.innerText.trim()}; }""", tid)
        el = p.locator('[data-testid="cta-final-view"]')
        await el.scroll_into_view_if_needed()
        await p.wait_for_timeout(500)
        sec = el.locator("xpath=ancestor::section[1]")
        try:
            await sec.screenshot(path=f"{SHOTS}/cta_{th}.jpeg", quality=40, type="jpeg")
        except Exception:
            await p.screenshot(path=f"{SHOTS}/cta_{th}.jpeg", quality=40, type="jpeg")
        print("CTA", th, "html=", cls, json.dumps(res))
        await ctx.close()

async def audit(b, only_theme=None, w=1920, h=1080, pages=None, tag="all"):
    out = {}
    pages = pages or PAGES
    for th in THEMES:
        if only_theme and th != only_theme: continue
        ctx = await new_ctx(b, ADMIN, th, w, h)
        for path, jwt in pages:
            if path == "/brand":
                await ctx.add_cookies([{"name": "app_session_id", "value": OWNER, "domain": "localhost", "path": "/"}])
            p = await ctx.new_page()
            try:
                await p.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                await p.wait_for_timeout(3500)
                await scroll(p)
                bad = await p.evaluate(AUDIT)
            except Exception as e:
                bad = [f"ERR {e}"]
            out[f"{th} {path}"] = bad
            print(f"AUDIT {th:12s} {path:20s} {len(bad)}", flush=True)
            await p.close()
            if path == "/brand":
                await ctx.add_cookies([{"name": "app_session_id", "value": ADMIN, "domain": "localhost", "path": "/"}])
        await ctx.close()
    json.dump(out, open(f"/app/test_reports/contrast_audit_{tag}_{only_theme or 'all'}.json", "w"), indent=1)

async def main():
    mode = sys.argv[1]
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path="/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell")
        if mode == "cta": await cta_check(b)
        elif mode == "mobile":
            MP = [x for x in PAGES if x[0] in ("/home","/pricing","/demo/tour","/free-run","/brand","/admin/people","/dashboard","/curriculum/about")]
            await audit(b, sys.argv[2], 390, 844, MP, "mobile")
        else: await audit(b, sys.argv[2] if len(sys.argv) > 2 else None)
        await b.close()

asyncio.run(main())
