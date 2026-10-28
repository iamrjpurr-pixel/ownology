# Visual sanity: footer, amber pills/buttons, work-mode nav per theme (desktop + mobile)
import asyncio, os, json, sys
from playwright.async_api import async_playwright
ADMIN = open("/root/admin.jwt").read().strip()
OWNER = os.environ["OWNER_JWT"]
EXE = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
S = "/app/.screenshots/contrast"
THEMES = sys.argv[1].split(",")

RATIO = """(sel) => { const out=[]; const lum=(c)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};
 const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
 const px=(c)=>{cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255]};
 document.querySelectorAll(sel).forEach(el=>{ if(!el.getBoundingClientRect().width) return; const tn=[...el.querySelectorAll('*'),el].find(n=>[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>1))||el;
  let bg=null; for(let n=tn;n;n=n.parentElement){const c=px(getComputedStyle(n).backgroundColor); if(c[3]>0.5){bg=c;break;}} bg=bg||[255,255,255,1];
  const fg=px(getComputedStyle(tn).color); const a=fg[3]; const f=[0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));
  const L1=lum(f),L2=lum(bg); out.push(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2)+' '+(el.getAttribute('data-testid')||el.className.toString().slice(0,30))+' "'+el.innerText.trim().slice(0,25)+'"');});
 return out; }"""

CHECKS = [
    ("/home", ADMIN, ['[data-testid="nav-professionals"]', '.btn-amber'], None),
    ("/dashboard", ADMIN, ['[data-testid="site-footer"] a, [data-testid="site-footer"] p, [data-testid="footer-strapline"]', '[data-testid^="worknav-"]'], '[data-testid="site-footer"]'),
    ("/free-run", ADMIN, ['[data-testid="site-footer"] a, [data-testid="site-footer"] p', '[data-testid="made-with-ownology-footer"]'], '[data-testid="made-with-ownology-footer"]'),
    ("/admin/people", ADMIN, ['[data-testid^="people-filter-"]'], '[data-testid="people-filters"]'),
    ("/brand", OWNER, ['[data-testid="vault-role-badge"]'], None),
    ("/demo/tour", ADMIN, ['[data-testid^="demo-tank-"] span, [data-testid^="demo-wine"]'], None),
]

async def run(b, th, w, h, tag):
    for path, jwt, sels, shot in CHECKS:
        ctx = await b.new_context(viewport={"width": w, "height": h})
        await ctx.add_cookies([{"name": "app_session_id", "value": jwt, "domain": "localhost", "path": "/"}])
        await ctx.add_init_script(f"localStorage.setItem('ownology:theme-override','{th}');localStorage.setItem('ow_import_offered_16062','1');")
        async def blk(route):
            await (route.abort() if route.request.method != "GET" else route.continue_())
        await ctx.route("**/*", blk)
        p = await ctx.new_page()
        try:
            await p.goto("http://localhost:3000" + path, wait_until="domcontentloaded", timeout=45000)
            await p.wait_for_timeout(5000)
            for s in sels:
                r = await p.evaluate(RATIO, s)
                low = [x for x in r if float(x.split()[0]) < 4.5]
                print(f"{tag} {th} {path} [{s[:40]}] n={len(r)} below4.5={low[:6]}", flush=True)
            if shot and await p.locator(shot).count():
                el = p.locator(shot).first
                await el.scroll_into_view_if_needed(); await p.wait_for_timeout(400)
                await el.screenshot(path=f"{S}/{tag}_{th}_{path.strip('/').replace('/','_')}.jpeg", quality=40, type="jpeg")
            if path == "/dashboard" and tag == "m":
                await p.screenshot(path=f"{S}/m_{th}_dashboard_full.jpeg", quality=40, type="jpeg")
        except Exception as e:
            print("ERR", tag, th, path, str(e)[:150])
        await ctx.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=EXE)
        for th in THEMES:
            await run(b, th, 1920, 1080, "d")
            await run(b, th, 390, 844, "m")
        await b.close()
asyncio.run(main())
