export const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>example公司</title>
<style>__CSS__</style>
</head>
<body>
<script>window.onerror=function(m,src,l){document.title="ERR "+l+": "+m;};</script>
<div class="app">
  <header class="top">
    <div class="brand"><span class="mark"></span><span class="bn">example公司</span><span class="tagline">配置</span></div>
    <div class="top-right"><span class="chip" id="profileChip">…</span></div>
  </header>
  <div class="body">
    <aside class="rail"><div class="rail-in" id="rail"></div></aside>
    <main class="stage">
      <section class="step fade" id="s-model" style="--i:0"></section>
      <section class="step fade" id="s-agent" style="--i:1"></section>
      <section class="step fade" id="s-verify" style="--i:2"></section>
      <section class="step fade" id="s-more" style="--i:3"></section>
    </main>
  </div>
</div>
<div class="sheet hidden" id="sheet"><div class="sheet-box"><div class="sheet-head"><div id="sheetTitle"></div><button class="icon-btn" data-act="closeSheet">✕</button></div><div id="sheetBody" class="fields"></div><div id="sheetSteps" class="steps"></div><div class="row end"><button class="btn outlined" data-act="copySnippet">复制全部</button><button class="btn filled" data-act="closeSheet">完成</button></div></div></div>
<div class="intro hidden" id="intro">
  <div class="intro-card">
    <div class="intro-mark"></div>
    <h1 class="intro-title">example公司</h1>
    <p class="intro-sub">识别你装了什么，自动写进配置。全程只在本机进行。</p>
    <button class="btn filled intro-btn" data-act="autoStart">自动配置</button>
    <button class="btn outlined intro-btn is-secondary" data-act="manualStart">手动配置</button>
    <div class="intro-note">自动配置会改动检测到的客户端；原文件先备份，可一键回滚。</div>
  </div>
</div>
<div class="autoview hidden" id="autoview"></div>
<div class="toast hidden" id="toast"></div>
<script src="/app.js?v=__VER__"></script>
</body>
</html>`;

const APP_CSS = `
:root{
  --bg:#ffffff; --surface:#ffffff; --surface-1:#f7f7f7; --surface-2:#f0f0f0; --surface-3:#e8e8e8;
  --on:#0a0a0a; --on-2:#565656; --on-3:#8b8b8b;
  --line:#e2e2e2; --line-2:#cfcfcf;
  --accent:#0a0a0a; --on-accent:#ffffff;
  --err:#b3261e;
  --elev-1:0 1px 2px rgba(0,0,0,.06),0 1px 3px 1px rgba(0,0,0,.05);
  --elev-2:0 2px 6px 2px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.08);
  --elev-3:0 6px 10px 4px rgba(0,0,0,.06),0 2px 3px rgba(0,0,0,.08);
  --ease:cubic-bezier(.2,0,0,1);
  --ease-emph:cubic-bezier(.05,.7,.1,1);
  --d1:150ms; --d2:250ms; --d3:420ms;
  --r-xs:6px; --r-s:10px; --r-m:14px; --r-l:20px; --r-xl:28px;
}
@media (prefers-color-scheme: dark){
  :root{
    --bg:#0b0b0b; --surface:#0b0b0b; --surface-1:#141414; --surface-2:#1b1b1b; --surface-3:#232323;
    --on:#f3f3f3; --on-2:#a8a8a8; --on-3:#787878;
    --line:#252525; --line-2:#3a3a3a;
    --accent:#f3f3f3; --on-accent:#0b0b0b;
    --err:#ffb4a9;
    --elev-1:0 1px 3px rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.4);
    --elev-2:0 2px 6px 2px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.5);
    --elev-3:0 6px 10px 4px rgba(0,0,0,.35),0 2px 3px rgba(0,0,0,.5);
  }
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--on)}
body{font:14px/1.6 "Roboto","Segoe UI Variable","Segoe UI",system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
button{font:inherit;color:inherit;margin:0;border:0;background:none;cursor:pointer}
input{font:inherit;color:inherit}

/* ---------- top bar ---------- */
.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 36px;
  background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:saturate(1.4) blur(14px);
  border-bottom:1px solid transparent;transition:border-color var(--d2) var(--ease)}
.top.scrolled{border-bottom-color:var(--line)}
.brand{display:flex;align-items:center;gap:12px}
.brand .mark{width:11px;height:11px;border-radius:50%;background:var(--accent);transition:transform var(--d2) var(--ease-emph)}
.brand:hover .mark{transform:scale(1.25)}
.bn{font-size:15px;font-weight:600;letter-spacing:-.01em}
.tagline{font-size:12px;color:var(--on-3);letter-spacing:.02em}
.chip{font:11.5px/1 ui-monospace,Consolas,monospace;color:var(--on-2);background:var(--surface-1);padding:7px 11px;border-radius:var(--r-xl)}

/* ---------- shell ---------- */
.body{display:grid;grid-template-columns:344px minmax(0,1fr);max-width:1240px;margin:0 auto}
.rail{padding:64px 28px 120px 36px;position:sticky;top:0;align-self:start;height:100vh}
.rail-in{display:flex;flex-direction:column}
.ritem{display:grid;grid-template-columns:34px 1fr;gap:16px;cursor:pointer;border-radius:var(--r-m);padding:4px 8px 4px 0;
  transition:background-color var(--d1) var(--ease)}
.ritem:hover{background:color-mix(in srgb,var(--on) 4%,transparent)}
.ritem .nc{display:flex;flex-direction:column;align-items:center}
.ritem .num{width:32px;height:32px;border-radius:50%;border:1px solid var(--line-2);display:grid;place-items:center;
  font:12.5px/1 ui-monospace,Consolas,monospace;color:var(--on-2);background:var(--surface);
  transition:background-color var(--d2) var(--ease),color var(--d2) var(--ease),border-color var(--d2) var(--ease),transform var(--d2) var(--ease-emph)}
.ritem .vline{flex:1;width:1px;background:var(--line);margin:8px 0;min-height:40px}
.ritem:last-child .vline{display:none}
.ritem .tx{padding-bottom:34px}
.ritem .t{font-size:14px;font-weight:600;color:var(--on-2);transition:color var(--d2) var(--ease)}
.ritem .d{font-size:11.5px;color:var(--on-3);margin-top:3px;line-height:1.55;max-width:230px}
.ritem.on .num{background:var(--accent);color:var(--on-accent);border-color:var(--accent);transform:scale(1.06)}
.ritem.on .t{color:var(--on)}
.ritem.done .num{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.ritem.done .t{color:var(--on)}
.ritem.muted{opacity:.55}

/* ---------- stage ---------- */
.stage{padding:64px 40px 160px;display:flex;flex-direction:column;gap:84px;min-width:0}
.step{scroll-margin-top:32px}
.sh{display:flex;align-items:baseline;gap:14px;margin-bottom:8px}
.sh .n{font:11px/1 ui-monospace,Consolas,monospace;color:var(--on-3);letter-spacing:.06em}
.sh h2{margin:0;font-size:21px;font-weight:600;letter-spacing:-.022em}
.sn{color:var(--on-2);font-size:13px;margin:0 0 32px;max-width:520px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.row.end{justify-content:flex-end}
.stack{display:flex;flex-direction:column;gap:14px}
.label{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--on-3);margin:0 0 12px}
.gap{margin-top:36px}

/* ---------- buttons (Material filled / outlined / text) ---------- */
.btn{position:relative;overflow:hidden;isolation:isolate;display:inline-flex;align-items:center;gap:8px;
  padding:13px 22px;border-radius:var(--r-xl);font-size:13.5px;font-weight:600;letter-spacing:.01em;
  transition:box-shadow var(--d2) var(--ease),background-color var(--d1) var(--ease),opacity var(--d1) var(--ease),transform var(--d1) var(--ease-emph)}
.btn svg{width:18px;height:18px;fill:currentColor;flex:none}
.btn.filled{background:var(--accent);color:var(--on-accent)}
.btn.filled:hover{box-shadow:var(--elev-1)}
.btn.filled:active{transform:scale(.985)}
.btn.outlined{border:1px solid var(--line-2);color:var(--on)}
.btn.outlined:hover{background:color-mix(in srgb,var(--on) 5%,transparent)}
.btn.text{color:var(--on-2);padding:10px 12px}
.btn.text:hover{color:var(--on);background:color-mix(in srgb,var(--on) 5%,transparent)}
.btn[disabled]{opacity:.34;pointer-events:none}
.btn.sm{padding:9px 16px;font-size:12.5px}
.icon-btn{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--on-2);
  transition:background-color var(--d1) var(--ease)}
.icon-btn:hover{background:color-mix(in srgb,var(--on) 7%,transparent)}
.ripple{position:absolute;border-radius:50%;background:currentColor;opacity:.18;transform:scale(0);pointer-events:none;
  animation:rip 520ms var(--ease) forwards;z-index:-1}
@keyframes rip{to{transform:scale(1);opacity:0}}

/* ---------- fields ---------- */
.field{position:relative}
.field input{width:100%;padding:17px 18px 15px;background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-s);
  color:var(--on);outline:none;transition:border-color var(--d2) var(--ease),background-color var(--d2) var(--ease),box-shadow var(--d2) var(--ease)}
.field input:focus{border-color:var(--on);background:var(--surface);box-shadow:0 0 0 3px color-mix(in srgb,var(--on) 8%,transparent)}
.field input::placeholder{color:var(--on-3)}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:760px){.f2{grid-template-columns:1fr}}

/* ---------- option rows ---------- */
.opt{display:flex;align-items:center;gap:16px;padding:21px 22px;border:1px solid var(--line);border-radius:var(--r-m);
  background:var(--surface);cursor:pointer;transition:border-color var(--d2) var(--ease),background-color var(--d2) var(--ease),box-shadow var(--d2) var(--ease)}
.opt:hover{border-color:var(--line-2);box-shadow:var(--elev-1)}
.opt.on{border-color:var(--on);background:var(--surface-1)}
.opt .ring{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line-2);flex:none;position:relative;
  transition:border-color var(--d2) var(--ease)}
.opt.on .ring{border-color:var(--on)}
.opt.on .ring::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--accent);
  animation:pop var(--d2) var(--ease-emph)}
@keyframes pop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
.opt .b{flex:1;min-width:0}
.opt .nm{font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.opt .mt{font:11.5px/1.5 ui-monospace,Consolas,monospace;color:var(--on-3);word-break:break-all;margin-top:3px}
.pill{font-size:10.5px;font-weight:500;color:var(--on-3);border:1px solid var(--line);border-radius:var(--r-xs);padding:1px 6px}
.pill.ok{color:var(--on);border-color:var(--line-2)}

/* ---------- agent rows ---------- */
.ag{display:flex;flex-direction:column;gap:14px;padding:22px;border:1px solid var(--line);border-radius:var(--r-m);
  background:var(--surface);transition:border-color var(--d2) var(--ease),box-shadow var(--d2) var(--ease)}
.ag:hover{box-shadow:var(--elev-1)}
.ag.on{border-color:var(--on);background:var(--surface-1)}
.ag-top{display:flex;align-items:center;gap:14px;cursor:pointer}
.ag .tick{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--line-2);flex:none;display:grid;place-items:center;
  transition:background-color var(--d2) var(--ease),border-color var(--d2) var(--ease)}
.ag .tick svg{width:13px;height:13px;fill:transparent;transition:fill var(--d2) var(--ease)}
.ag.on .tick{background:var(--accent);border-color:var(--accent)}
.ag.on .tick svg{fill:var(--on-accent)}
.ag .name{font-size:13.5px;font-weight:600;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ag .p{font:11px/1.5 ui-monospace,Consolas,monospace;color:var(--on-3);word-break:break-all;margin-top:3px}
.ag .tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-left:32px}
.ag .tools input{flex:1;min-width:220px;padding:11px 13px;background:var(--surface-2);border:1px solid var(--line);
  border-radius:var(--r-s);font:11.5px/1.4 ui-monospace,Consolas,monospace;outline:none;transition:border-color var(--d2) var(--ease)}
.ag .tools input:focus{border-color:var(--on)}

/* ---------- verify ---------- */
.vres{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:8px}
.vrow{display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)}
.vrow .ic{width:20px;height:20px;flex:none;display:grid;place-items:center;color:var(--on-3)}
.vrow .ic.ok{color:var(--on)}
.vrow .ic.bad{color:var(--err)}
.vrow .nm{font-size:13px;font-weight:600}
.vrow .mt{font:11px/1.5 ui-monospace,Consolas,monospace;color:var(--on-3);word-break:break-all;margin-top:2px}
.vrow .ms{margin-left:auto;font:12px/1 ui-monospace,Consolas,monospace;color:var(--on-2);flex:none}
.empty{color:var(--on-3);font-size:12.5px;padding:22px 0}

/* ---------- sheet ---------- */
.sheet{position:fixed;inset:0;background:color-mix(in srgb,#000 42%,transparent);display:grid;place-items:center;padding:24px;z-index:60;
  animation:fadein var(--d2) var(--ease)}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.sheet-box{width:min(720px,100%);max-height:86vh;display:flex;flex-direction:column;gap:16px;background:var(--surface);
  border-radius:var(--r-l);padding:24px;box-shadow:var(--elev-3);animation:sheetin var(--d3) var(--ease-emph)}
@keyframes sheetin{from{transform:translateY(24px) scale(.98);opacity:0}to{transform:none;opacity:1}}
.sheet-head{display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:600}
.fields{display:flex;flex-direction:column;gap:16px;overflow:auto;flex:1;padding-right:2px}
.frow{display:flex;flex-direction:column;gap:7px}
.frow .fl{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--on-3)}
.frow .fv{display:flex;gap:8px;align-items:stretch}
.frow code{flex:1;min-width:0;background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-s);
  padding:13px 15px;font:12.5px/1.5 ui-monospace,Consolas,monospace;color:var(--on);word-break:break-all;
  transition:border-color var(--d2) var(--ease)}
.frow code:hover{border-color:var(--line-2)}
.copybtn{flex:none;width:46px;border:1px solid var(--line-2);border-radius:var(--r-s);background:transparent;
  display:grid;place-items:center;color:var(--on-2);transition:background-color var(--d1) var(--ease),color var(--d1) var(--ease)}
.copybtn:hover{background:color-mix(in srgb,var(--on) 6%,transparent);color:var(--on)}
.copybtn svg{width:17px;height:17px;fill:currentColor}
.steps{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--on-2);max-height:150px;overflow:auto}
.steps div{padding-left:2px}

/* ---------- misc ---------- */
.intro{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:24px;
  background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(18px) saturate(1.2);
  animation:fadein var(--d3) var(--ease)}
.intro-card{width:min(420px,100%);display:flex;flex-direction:column;align-items:center;text-align:center;gap:0;
  padding:44px 32px 34px;border:1px solid var(--line);border-radius:var(--r-xl);background:var(--surface);
  box-shadow:var(--elev-3);animation:sheetin var(--d3) var(--ease-emph)}
.intro-mark{width:64px;height:64px;border-radius:50%;background:var(--accent);position:relative;margin-bottom:22px}
.intro-mark::after{content:"";position:absolute;inset:16px;border-radius:50%;border:2px solid var(--on-accent);opacity:.9}
.intro-title{margin:0;font-size:26px;font-weight:650;letter-spacing:-.03em}
.intro-sub{margin:10px 0 30px;font-size:13px;line-height:1.7;color:var(--on-2);max-width:300px}
.intro-btn{width:100%;height:54px;justify-content:center;font-size:15px;border-radius:var(--r-m)}
.intro-btn + .intro-btn{margin-top:12px}
.intro-btn.is-secondary{opacity:.62;border-color:var(--line-2);font-weight:500}
.intro-btn.is-secondary:hover{opacity:.9}
.intro-note{margin-top:22px;font-size:11px;line-height:1.6;color:var(--on-3);max-width:290px}
.autoview{position:fixed;inset:0;z-index:85;overflow:auto;padding:48px 24px 80px;
  background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(12px);
  animation:fadein var(--d2) var(--ease)}
.auto-inner{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:22px}
.auto-head{display:flex;align-items:center;gap:12px}
.auto-head .t{font-size:19px;font-weight:650;letter-spacing:-.02em}
.auto-head .s{font-size:12px;color:var(--on-3)}
.auto-card{border:1px solid var(--line);border-radius:var(--r-m);background:var(--surface);padding:22px}
.auto-card h3{margin:0 0 6px;font-size:14px;font-weight:600}
.auto-card .p{margin:0 0 16px;font-size:12.5px;color:var(--on-2);line-height:1.65}
.auto-list{display:flex;flex-direction:column;gap:10px;max-height:46vh;overflow:auto}
.auto-row{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r-s);cursor:pointer}
.auto-row.on{border-color:var(--on);background:var(--surface-1)}
.auto-row .tick{width:18px;height:18px;border:1.5px solid var(--line-2);border-radius:5px;display:grid;place-items:center;flex:none}
.auto-row.on .tick{background:var(--accent);border-color:var(--accent)}
.auto-row .tick svg{width:12px;height:12px;fill:transparent}
.auto-row.on .tick svg{fill:var(--on-accent)}
.auto-row .nm{font-size:13.5px;font-weight:600}
.auto-row .ev{font:11px/1.5 ui-monospace,Consolas,monospace;color:var(--on-3);word-break:break-all;margin-top:2px}
.auto-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap}
.auto-kv{display:grid;grid-template-columns:96px 1fr;gap:10px 16px;font-size:13px}
.auto-kv .k{color:var(--on-3);font-size:12px}
.auto-kv .v{font-family:ui-monospace,Consolas,monospace;word-break:break-all}
.auto-advice{margin:14px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}
.auto-advice li{font-size:12.5px;line-height:1.6;color:var(--on-2);padding-left:16px;position:relative}
.auto-advice li::before{content:"—";position:absolute;left:0;color:var(--on-3)}
.spinner{width:16px;height:16px;border:2px solid var(--line-2);border-top-color:var(--on);border-radius:50%;
  animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--accent);color:var(--on-accent);
  padding:13px 22px;border-radius:var(--r-xl);font-size:13px;box-shadow:var(--elev-2);z-index:70;
  animation:toastin var(--d2) var(--ease-emph)}
@keyframes toastin{from{transform:translate(-50%,10px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.hidden{display:none!important}
.fade{opacity:0;transform:translateY(20px);animation:fadeup var(--d3) var(--ease-emph) forwards;animation-delay:calc(var(--i,0) * 80ms)}
@keyframes fadeup{to{opacity:1;transform:none}}
.err{color:var(--err);font-size:12.5px}
.note{font-size:11.5px;color:var(--on-3)}
.search{padding:11px 14px;background:var(--surface-1);border:1px solid var(--line);border-radius:var(--r-s);font-size:12.5px;outline:none;min-width:200px}
.search:focus{border-color:var(--on)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.fade{opacity:1;transform:none}}
@media(max-width:900px){
  .body{grid-template-columns:1fr}
  .rail{position:static;height:auto;padding:28px 20px 0;border-bottom:1px solid var(--line)}
  .rail-in{flex-direction:row;gap:20px;overflow-x:auto;padding-bottom:16px}
  .ritem{grid-template-columns:28px auto}
  .ritem .vline{display:none}
  .ritem .tx{padding-bottom:0}
  .ritem .d{display:none}
  .stage{padding:32px 20px 100px;gap:52px}
  .top{padding:0 20px}
}
`;

export const CSS = APP_CSS;

const ICONS = {
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  key: 'M12.65 10A5.99 5.99 0 0 0 7 6a6 6 0 1 0 5.65 8H14v2h2v-2h2v-2h-2v-2h-2.35zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  lock: 'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM8 6a4 4 0 0 1 8 0v2H8V6z',
  plug: 'M9 2v6H7v4a5 5 0 0 0 4 4.9V22h2v-5.1A5 5 0 0 0 17 12V8h-2V2h-2v6h-2V2H9z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
  dots: 'M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  bolt: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
  path: 'M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z',
};

export const APP_JS = String.raw`
'use strict';
var boot = null, filter = '', sheetText = '', busy = false, showAllAgents = false;

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
function icon(n, cls){
  var d = { check:'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', close:'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', key:'M12.65 10A5.99 5.99 0 0 0 7 6a6 6 0 1 0 5.65 8H14v2h2v-2h2v-2h-2v-2h-2.35zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z', lock:'M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM8 6a4 4 0 0 1 8 0v2H8V6z', plug:'M9 2v6H7v4a5 5 0 0 0 4 4.9V22h2v-5.1A5 5 0 0 0 17 12V8h-2V2h-2v6h-2V2H9z', copy:'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z', path:'M20 6h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z' }[n] || '';
  return '<svg viewBox="0 0 24 24" class="' + (cls || '') + '" aria-hidden="true"><path d="' + d + '"/></svg>';
}
function toast(m){
  var t = $('toast'); t.textContent = m; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.add('hidden'); }, 3200);
}
function api(p, opt){
  return fetch(p, Object.assign({ headers: { 'content-type': 'application/json' } }, opt || {}))
    .then(function(r){ return r.text().then(function(tx){
      var j; try { j = JSON.parse(tx); } catch(e){ throw new Error('HTTP ' + r.status); }
      if (!r.ok) throw new Error(j.error || j.message || ('HTTP ' + r.status));
      return j;
    }); });
}
function post(p, b){ return api(p, { method: 'POST', body: JSON.stringify(b || {}) }); }
function load(){
  return api('/api/bootstrap').then(function(b){ boot = b; render(); });
}

/* ---------------- rail ---------------- */
function renderRail(){
  var list = boot.steps || [];
  var active = null;
  for (var i = 0; i < list.length; i++){ if (!list[i].done && !list[i].optional){ active = list[i].id; break; } }
  if (!active) active = 'verify';
  $('rail').innerHTML = list.map(function(s){
    var cls = 'ritem' + (s.done ? ' done' : '') + (s.id === active ? ' on' : '') + (s.optional ? ' muted' : '');
    return '<div class="' + cls + '" data-jump="' + s.id + '">' +
      '<div class="nc"><div class="num">' + (s.done ? '✓' : s.n) + '</div><div class="vline"></div></div>' +
      '<div class="tx"><div class="t">' + esc(s.title) + '</div><div class="d">' + esc(s.detail || s.hint) + '</div></div>' +
    '</div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('[data-jump]'), function(el){
    el.onclick = function(){
      var t = $('s-' + el.getAttribute('data-jump'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

function sh(n, title, note){
  return '<div class="sh"><span class="n">0' + n + '</span><h2>' + esc(title) + '</h2></div>' +
    (note ? '<p class="sn">' + esc(note) + '</p>' : '');
}

/* ---------------- step 1 ---------------- */
function renderModel(){
  var site = boot.site || {};
  var keys = boot.keys || [];
  var prim = (boot.providers || [])[0] || null;
  var model = (boot.settings || {}).selectedModel || '';
  var html = sh(1, '选择模型', site.loggedIn ? '选一把 key，再选一个模型。' : '登录一次，密钥和模型都会自动列出来。');

  if (!site.loggedIn){
    html += '<div class="f2" style="margin-bottom:12px">' +
        '<div class="opt' + (site.url && site.url.indexOf('example2') >= 0 ? '' : ' on') + '" data-site="https://example1.com">' +
          '<span class="ring"></span><span class="b"><div class="nm">example1.com</div></span></div>' +
        '<div class="opt' + (site.url && site.url.indexOf('example2') >= 0 ? ' on' : '') + '" data-site="https://example2.com">' +
          '<span class="ring"></span><span class="b"><div class="nm">example2.com</div></span></div>' +
      '</div>' +
      '<div class="stack">' +
        '<div class="field"><input id="loginEmail" type="text" placeholder="邮箱" autocomplete="username"></div>' +
        '<div class="field"><input id="loginPass" type="password" placeholder="密码" autocomplete="current-password"></div>' +
      '</div>' +
      '<div class="row" style="margin-top:18px">' +
        '<button class="btn filled" data-act="login">' + icon('lock') + '登录</button>' +
        '<button class="btn outlined" data-act="fromBrowser" title="读本机 Edge/Chrome 里已经登录的面板会话">' + icon('bolt') + '用浏览器登录态</button>' +
      '</div>' +
      '<div class="note" style="margin-top:10px">密码不保存；「用浏览器登录态」只读本机文件，不联网上传。' +
      ((boot.browserProfiles || 0) > 0 ? '（找到 ' + boot.browserProfiles + ' 个浏览器配置）' : '') + '</div>' +
      '<div class="err" id="loginErr" style="margin-top:12px"></div>';
    $('s-model').innerHTML = html;
    return;
  }

  html += '<div class="opt on" style="cursor:default;margin-bottom:26px">' +
      '<span class="ring"></span><span class="b"><div class="nm">' + esc(site.email || '已登录') +
      '<span class="pill ok">已登录</span></div><div class="mt">' + esc(site.url) + '</div></span>' +
      '<button class="btn text sm" data-act="logout">退出</button></div>';

  var chan = (boot.settings || {}).channelName || 'example公司';
  html += '<div class="label">渠道名称</div>' +
    '<div class="row" style="margin-bottom:8px">' +
      '<input id="chanName" class="search" style="flex:1;min-width:220px" value="' + esc(chan) + '" maxlength="40">' +
      '<button class="btn out sm" data-act="saveName">保存</button>' +
    '</div>' +
    '<div class="note" style="margin-bottom:26px">这个名称会写进所有配置和复制文本，改一次全站生效。</div>';

  var net = boot.lastNet || null;
  html += '<div class="label">网络</div>' +
    '<div class="vres" id="netStrip">' + (net ? net.rows.map(function(r){
      return '<div class="vrow"><span class="ic ' + (r.ok ? 'ok' : 'bad') + '">' + icon(r.ok ? 'check' : 'close') + '</span>' +
        '<span><div class="nm">' + esc(r.label) + '</div><div class="mt">' + esc(r.note || r.url || '') + '</div></span>' +
        '<span class="ms">' + (r.ok ? r.ms + ' ms' : '连不上') + '</span></div>';
    }).join('') : '<div class="empty">正在测网络…</div>') + '</div>' +
    '<div class="row" style="margin-top:8px"><button class="btn text sm" data-act="netQuick">重新测</button>' +
    (net && net.rows.filter(function(r){ return r.ok; }).length ? '<span class="note">第一行是本机网络，后两行是中转站</span>' : '') + '</div>';

  html += '<div class="label" style="margin-top:34px">API 密钥</div>' +
    '<div class="note" style="margin-bottom:10px">用浏览器登录态最省事；不想登录就自己把 key 粘进来。</div>' +
    '<div class="row" style="margin-bottom:12px">' +
      '<button class="btn outlined" data-act="fromBrowser">' + icon('bolt') + '用浏览器登录态</button>' +
      '<input id="pasteKey" type="text" placeholder="或者直接粘贴 sk-… 密钥" style="flex:1;min-width:240px">' +
      '<button class="btn filled" data-act="pasteKey">用这把 key</button>' +
    '</div>' +
    '<div class="stack">' +
    (keys.length ? keys.map(function(k){
      return '<div class="opt' + (k.active ? ' on' : '') + '" data-key="' + esc(k.id) + '">' +
        '<span class="ring"></span><span class="b"><div class="nm">' + esc(k.name) +
        (k.rate ? '<span class="pill">' + k.rate + 'x</span>' : '') +
        (k.image ? '<span class="pill ok">可出图</span>' : '') +
        (k.group ? '<span class="pill">' + esc(k.group) + '</span>' : '') + '</div>' +
        '<div class="mt">' + esc(k.masked) + '</div></span></div>';
    }).join('') : '<div class="empty">这个账号下还没有密钥，先去面板创建一个。</div>') + '</div>';

  if (prim && prim.models && prim.models.length){
    var list = prim.models.map(function(m){ return m.id; });
    var shown = filter ? list.filter(function(id){ return id.toLowerCase().indexOf(filter.toLowerCase()) >= 0; }) : list;
    html += '<div class="gap"></div><div class="row" style="justify-content:space-between">' +
      '<div class="label" style="margin:0">模型 · ' + list.length + '</div>' +
      '<input class="search" id="modelFilter" placeholder="筛选模型" value="' + esc(filter) + '"></div>' +
      '<div class="stack" style="margin-top:12px;max-height:420px;overflow:auto">' +
        (shown.slice(0, 120).map(function(id){
          return '<div class="opt' + (model === id ? ' on' : '') + '" data-model="' + esc(id) + '">' +
            '<span class="ring"></span><span class="b"><div class="nm">' + esc(id) + '</div></span></div>';
        }).join('') || '<div class="empty">没有匹配的模型</div>') + '</div>';
  } else {
    html += '<div class="gap"></div><div class="empty">先选一把 key。</div>';
  }

  $('s-model').innerHTML = html;
  var f = $('modelFilter');
  if (f) f.oninput = function(){ filter = f.value; renderModel(); var el = $('modelFilter'); if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };
}

/* ---------------- step 2 ---------------- */
function renderAgent(){
  var all = (boot.agents || []);
  var cats = boot.categories || [{ id: 'cli', label: '终端 / 编码 Agent' }];
  var found = all.filter(function(a){ return a.detectedPath; }).length;
  var total = all.filter(function(a){ return a.writable !== 'guided'; }).length;

  var html = sh(2, '选择 Agent', '本机装了的会直接读出来。没读到的，指一下配置文件，或者复制文本自己去填。');
  html += '<div class="row" style="margin-bottom:10px">' +
    '<button class="btn text sm" data-act="pickInstalled">只选已读到</button>' +
    '<button class="btn text sm" data-act="clearAgents">清空</button></div>';

  if (found < total){
    html += '<div class="row" style="margin:0 0 18px">' +
      '<button class="btn text sm" data-act="toggleAll">' +
      (showAllAgents ? '只看已读到的' : ('显示全部 ' + total + ' 个（本机读到 ' + found + ' 个）')) + '</button></div>';
  }

  if (!found && !showAllAgents){
    html += '<div class="opt" style="cursor:default;border-style:dashed;margin-bottom:18px">' +
      '<span class="b"><div class="nm">还没读到已安装的客户端</div>' +
      '<div class="mt">可能装在非默认路径，或者是绿色版。点「显示全部」，自己指定配置文件路径；或直接复制配置去手填。</div></span></div>';
  }

  cats.forEach(function(cat){
    var list = all.filter(function(a){
      if (a.category !== cat.id) return false;
      if (showAllAgents) return true;
      return a.detectedPath || a.selected;
    });
    if (!list.length) return;
    html += '<div class="label" style="margin:34px 0 14px">' + esc(cat.label) +
      ' <span style="text-transform:none;letter-spacing:0;color:var(--on-3)">' + list.length + '</span></div>';
    html += '<div class="stack">' + list.map(function(a){
      var guided = a.writable === 'guided';
      var path = a.override || a.detectedPath || (a.paths && a.paths[0] && a.paths[0].path) || '';
      var foundIt = !!a.detectedPath;
      if (guided){
        return '<div class="ag"><div class="ag-top" style="cursor:default">' +
          '<span class="b"><div class="name">' + esc(a.name) + '<span class="pill">手填</span></div>' +
          '<div class="p">' + esc(a.note || '只能在软件里填') + '</div></span>' +
          '<button class="btn text sm" data-snippet="' + esc(a.id) + '">' + icon('copy') + '复制配置</button>' +
        '</div></div>';
      }
      return '<div class="ag' + (a.selected ? ' on' : '') + '" data-ag="' + esc(a.id) + '">' +
        '<div class="ag-top" data-toggle="' + esc(a.id) + '">' +
          '<span class="tick">' + icon('check') + '</span>' +
          '<span class="b"><div class="name">' + esc(a.name) +
            '<span class="pill' + (foundIt ? ' ok' : '') + '">' + (foundIt ? '已读到' : (a.writable === 'export' ? '导出' : '未找到')) + '</span></div>' +
            '<div class="p">' + esc(path || (a.hint ? '没找到；可能在 ' + a.hint : '未检测到配置路径')) + '</div></span>' +
        '</div>' +
        '<div class="tools">' +
          '<input data-path="' + esc(a.id) + '" placeholder="自定义配置文件路径（留空用默认）" value="' + esc(a.override || '') + '">' +
          '<button class="btn text sm" data-savepath="' + esc(a.id) + '">用这个路径</button>' +
          '<button class="btn text sm" data-snippet="' + esc(a.id) + '">' + icon('copy') + '复制配置</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  });

  $('s-agent').innerHTML = html;
}

/* ---------------- step 3 ---------------- */
function renderVerify(){
  var d = boot.lastDiagnose;
  var tools = (d && d.tools) || [];
  var html = sh(3, '连通性验证', '每个 agent 按自己的协议发一条最小请求。返回 200 才算通。');
  html += '<div class="row"><button class="btn filled" data-act="verify">' + icon('plug') + '开始验证</button>' +
    (d ? '<span class="note">上次 ' + esc(new Date(d.at).toLocaleTimeString('zh-CN', { hour12: false })) + '</span>' : '') + '</div>';
  html += tools.length
    ? '<div class="vres">' + tools.map(function(t){
        return '<div class="vrow"><span class="ic ' + (t.ok ? 'ok' : 'bad') + '">' + icon(t.ok ? 'check' : 'close') + '</span>' +
          '<span><div class="nm">' + esc(t.toolName) + '</div>' +
          '<div class="mt">' + esc(t.model || '') + (t.baseUrl ? ' · ' + esc(t.baseUrl) : '') + (t.error ? ' · ' + esc(t.error) : '') + '</div></span>' +
          '<span class="ms">' + (t.ok ? t.ms + ' ms' : '失败') + '</span></div>';
      }).join('') + '</div>'
    : '<div class="empty">还没有验证过。先在上面选好 agent。</div>';
  $('s-verify').innerHTML = html;
}

/* ---------------- step 4 ---------------- */
function renderMore(){
  var ok = (boot.providers || [])[0] && boot.providers[0].hasKey;
  if (!ok){
    $('s-more').innerHTML = sh(4, '推荐插件', '把模型配好之后，这里会列出能直接用的插件。') +
      '<div class="empty">还没有可用的 key。</div>';
    return;
  }
  if (!boot.plugins) api('/api/plugins').then(function(r){ boot.plugins = r.plugins; renderMore(); });
  var list = boot.plugins || [];
  $('s-more').innerHTML = sh(4, '推荐插件', '模型已经通了。下面这些能让 DSH 更好用 —— 装哪个都行，下载交给 DSH。') +
    '<div class="row" style="margin-bottom:14px">' +
      '<button class="btn text sm" data-act="plugAll">全部安装（可安装的）</button></div>' +
    '<div class="stack">' + (list.length ? list.map(function(p2){
      var can = p2.kind === 'package';
      return '<div class="ag"><div class="ag-top" style="cursor:default">' +
        '<span class="b"><div class="name">' + esc(p2.name) +
          '<span class="pill">' + (can ? '插件包' : 'DSH 内置开关') + '</span></div>' +
        '<div class="p">' + esc(p2.desc) + '</div></span>' +
        (can
          ? '<button class="btn text sm" data-plugin="' + esc(p2.id) + '">安装</button>'
          : '<button class="btn text sm" data-pluginhint="' + esc(p2.name) + '">怎么开</button>') +
      '</div></div>';
    }).join('') : '<div class="empty">正在加载…</div>') + '</div>';
}

var spy = null;
function wireScroll(){
  var top = document.querySelector('.top');
  window.addEventListener('scroll', function(){
    if (top) top.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
  if (!('IntersectionObserver' in window)) return;
  if (spy) spy.disconnect();
  var map = {};
  Array.prototype.forEach.call(document.querySelectorAll('.ritem'), function(el){
    map['s-' + el.getAttribute('data-jump')] = el;
  });
  spy = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var el = map[en.target.id];
      if (!el) return;
      Array.prototype.forEach.call(document.querySelectorAll('.ritem'), function(x){ x.classList.remove('on'); });
      el.classList.add('on');
    });
  }, { rootMargin: '-12% 0px -74% 0px', threshold: 0 });
  ['model','agent','verify','more'].forEach(function(id){
    var sec = $('s-' + id);
    if (sec) spy.observe(sec);
  });
}

function render(){
  $('profileChip').textContent = boot.profile || 'default';
  if (!boot.introSeen && $('autoview').classList.contains('hidden')) showIntro(true);
  renderRail(); renderModel(); renderAgent(); renderVerify(); renderMore();
  wireScroll();
  if (!render._scrolled) { render._scrolled = true; window.scrollTo({ top: 0 }); }
}

/* ---------------- actions ---------------- */
document.addEventListener('click', function(ev){
  var autoRow = ev.target.closest('.auto-row');
  if (autoRow){ autoRow.classList.toggle('on'); return; }
  var rippleTarget = ev.target.closest('.btn');
  if (rippleTarget) ripple(rippleTarget, ev);
  var siteEl = ev.target.closest('[data-site]');
  if (siteEl && !boot.site.loggedIn){ return post('/api/endpoint', { url: siteEl.getAttribute('data-site') }).then(load); }
  var keyEl = ev.target.closest('[data-key]');
  if (keyEl) return run(selectKey(keyEl.getAttribute('data-key')));
  var modelEl = ev.target.closest('[data-model]');
  if (modelEl) return run(selectModel(modelEl.getAttribute('data-model')));
  var toggle = ev.target.closest('[data-toggle]');
  if (toggle) return run(toggleAgent(toggle.getAttribute('data-toggle')));
  var savePath = ev.target.closest('[data-savepath]');
  if (savePath){
    var id = savePath.getAttribute('data-savepath');
    var input = document.querySelector('[data-path="' + id + '"]');
    return run(post('/api/agent/path', { toolId: id, path: input ? input.value.trim() : '' }).then(load));
  }
  var snip = ev.target.closest('[data-snippet]');
  if (snip) return run(openSnippet(snip.getAttribute('data-snippet')));
  var act = ev.target.closest('[data-act]');
  if (!act) return;
  var a = act.getAttribute('data-act');
  if (a === 'plugAll'){ run(pluginInstallAll()); return; }
  var pb = ev.target.closest('[data-plugin]');
  if (pb){ run(pluginInstall(pb.getAttribute('data-plugin'), pb)); return; }
  var ph = ev.target.closest('[data-pluginhint]');
  if (ph){ toast('在 DSH：设置 → 插件 → 实验性插件，打开「' + ph.getAttribute('data-pluginhint') + '」'); return; }
  if (a === 'netQuick'){ run(netQuick()); return; }
  if (a === 'pasteKey'){
    var inp = $('pasteKey');
    var k = inp ? inp.value.trim() : '';
    if (!k) { toast('先粘贴密钥'); return; }
    return run(post('/api/provider/quick', { apiKey: k, baseUrl: (boot.site || {}).url || 'https://example1.com' })
      .then(function(r){ toast('已保存' + (r.fetched && r.fetched.length ? '，拉到 ' + r.fetched.length + ' 个模型' : '')); return load(); })
      .catch(function(e){ toast(e.message); }));
  }
  if (a === 'autoStart'){ autoStart(); return; }
  if (a === 'manualStart'){ run(dismissIntro()); return; }
  if (a === 'autoRetry'){ autoStart(); return; }
  if (a === 'netRetry'){ runScan(); return; }
  if (a === 'openFull'){ run(dismissIntro()); return; }
  if (a === 'autoRunSelected'){
    var picked = [];
    Array.prototype.forEach.call(document.querySelectorAll('.auto-row.on'), function(el){ picked.push(el.getAttribute('data-tool')); });
    if (!picked.length){ toast('至少选一个'); return; }
    autoRun(picked, null); return;
  }
  if (a === 'login') return run(doLogin());
  if (a === 'fromBrowser'){
    var el = $('loginErr');
    if (el) el.textContent = '正在读浏览器本地存储…';
    return run(post('/api/site/browser', { site: boot.site.url || 'https://example1.com' })
      .then(function(r){
        if (!r.ok) { if (el) el.textContent = r.reason || '没读到'; return; }
        toast('已读取 ' + r.from + (r.balance ? ' · 余额 ' + r.balance : ''));
        return load();
      })
      .catch(function(e){ if (el) el.textContent = e.message; }));
  }
  if (a === 'logout') return run(post('/api/site/logout', { site: boot.site.url }).then(load));
  if (a === 'verify') return run(verify());
  if (a === 'saveName'){
    var inp = $('chanName');
    var v = inp ? inp.value.trim() : '';
    return run(post('/api/settings', { channelName: v }).then(function(){ toast('名称已改为 ' + (v || 'example公司')); return load(); }));
  }
  if (a === 'toggleAll'){ showAllAgents = !showAllAgents; renderAgent(); return; }
  if (a === 'pickInstalled') return run(bulk(true));
  if (a === 'clearAgents') return run(bulk(false));
  if (a === 'closeSheet'){ $('sheet').classList.add('hidden'); return; }
  var cbtn = ev.target.closest('[data-copy]');
  if (cbtn){
    var idx = Number(cbtn.getAttribute('data-copy'));
    if (sheetFields[idx]) copyText(sheetFields[idx].value);
    return;
  }
  if (a === 'copySnippet'){ copyText(sheetText); return; }
});

function ripple(el, ev){
  var r = el.getBoundingClientRect();
  var size = Math.max(r.width, r.height) * 2;
  var s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = size + 'px';
  s.style.left = (ev.clientX - r.left - size / 2) + 'px';
  s.style.top = (ev.clientY - r.top - size / 2) + 'px';
  el.appendChild(s);
  setTimeout(function(){ s.remove(); }, 560);
}

function run(p){
  if (busy) return Promise.resolve();
  busy = true;
  return Promise.resolve(p).catch(function(e){ toast(e.message || String(e)); }).finally(function(){ busy = false; });
}

function doLogin(){
  var email = ($('loginEmail') || {}).value || '';
  var pass = ($('loginPass') || {}).value || '';
  if (!email.trim() || !pass) { $('loginErr').textContent = '邮箱和密码都要填'; return Promise.resolve(); }
  $('loginErr').textContent = '';
  return post('/api/site/login', { site: boot.site.url || 'https://example1.com', email: email.trim(), password: pass })
    .then(function(){ return load().then(function(){ toast('登录成功'); }); })
    .catch(function(e){ if ($('loginErr')) $('loginErr').textContent = e.message; });
}

function selectKey(id){
  return post('/api/key/select', { site: boot.site.url, keyId: id })
    .then(function(r){ toast('已选 key · ' + (r.models || []).length + ' 个模型'); return load(); });
}

function selectModel(id){
  return post('/api/model/select', { modelId: id })
    .then(function(){ filter = ''; toast('已选 ' + id); return load(); });
}

function toggleAgent(id){
  var a = (boot.agents || []).filter(function(x){ return x.id === id; })[0];
  if (!a) return Promise.resolve();
  return post('/api/agent/select', { toolId: id, on: !a.selected }).then(load);
}

function bulk(on){
  var ids = (boot.agents || []).filter(function(a){ return a.writable !== 'guided' && (on ? !!a.detectedPath : true); }).map(function(a){ return a.id; });
  if (!on) ids = (boot.agents || []).map(function(a){ return a.id; });
  return post('/api/assign/bulk', { toolIds: ids, clear: !on }).then(load);
}

var sheetFields = [];

function openSnippet(id){
  return api('/api/agent/snippet?tool=' + encodeURIComponent(id)).then(function(r){
    sheetText = r.text;
    sheetFields = r.fields || [];
    $('sheetTitle').textContent = ((boot.settings || {}).channelName || 'example公司') + ' · ' + r.title;
    $('sheetBody').innerHTML = sheetFields.map(function(f, i){
      return '<div class="frow"><div class="fl">' + esc(f.label) + '</div>' +
        '<div class="fv"><code>' + esc(f.value) + '</code>' +
        '<button class="copybtn" data-copy="' + i + '" title="复制 ' + esc(f.label) + '">' + icon('copy') + '</button></div></div>';
    }).join('');
    var steps = r.steps || [];
    $('sheetSteps').innerHTML = steps.length
      ? '<div class="fl" style="font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--on-3);margin:6px 0 2px">步骤</div>' +
        steps.map(function(s){ return '<div>' + esc(s) + '</div>'; }).join('')
      : '';
    $('sheet').classList.remove('hidden');
  });
}

function copyText(t){
  var ok = false;
  try { navigator.clipboard.writeText(t); ok = true; } catch (e) { ok = false; }
  if (!ok){
    var ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok = true; } catch (e) { ok = false; }
    document.body.removeChild(ta);
  }
  toast(ok ? '已复制' : '复制失败，请手动选中');
}

function verify(){
  var ids = (boot.agents || []).filter(function(a){ return a.selected; }).map(function(a){ return a.id; });
  if (!ids.length) { toast('先选 agent'); return Promise.resolve(); }
  toast('验证中…');
  return post('/api/diagnose', { tools: ids }).then(function(){ return load().then(function(){ toast('验证完成'); }); });
}


/* ---------------- startup: intro + auto flow ---------------- */
function pluginInstall(id, btn){
  if (!confirm('让 DSH 安装这个插件？它会执行 dsh plugin add，需要一点时间。')) return Promise.resolve();
  var old = btn ? btn.textContent : '';
  if (btn){ btn.textContent = '安装中…'; btn.disabled = true; }
  return post('/api/plugin/install', { id: id, run: true }).then(function(r){
    if (r.ok) toast('装好了：' + id);
    else toast('没装成，命令：' + (r.command || r.hint || ''));
    if (btn && !r.ok){ btn.textContent = '复制命令'; btn.disabled = false; btn.onclick = function(){ copyText(r.command || ''); }; }
    else if (btn){ btn.textContent = '已安装'; btn.disabled = true; }
    return load();
  }).catch(function(e){ toast(e.message); if (btn){ btn.textContent = old; btn.disabled = false; } });
}

function pluginInstallAll(){
  var list = (boot.plugins || []).filter(function(p2){ return p2.kind === 'package'; });
  if (!list.length) return Promise.resolve();
  if (!confirm('依次安装 ' + list.length + ' 个插件包？')) return Promise.resolve();
  return list.reduce(function(chain, p2){
    return chain.then(function(){ return post('/api/plugin/install', { id: p2.id, run: true }).catch(function(){}); });
  }, Promise.resolve()).then(function(){ toast('安装流程结束'); return load(); });
}

function netQuick(){
  $('netStrip') && ($('netStrip').innerHTML = '<div class="empty">正在测网络…</div>');
  return api('/api/net/quick').then(function(r){ boot.lastNet = r; renderModel(); });
}

function showIntro(on){ $('intro').classList.toggle('hidden', !on); }
function showAuto(html){ var v = $('autoview'); v.classList.remove('hidden'); v.innerHTML = '<div class="auto-inner">' + html + '</div>'; }
function hideAuto(){ $('autoview').classList.add('hidden'); }

function apiRaw(path, body){
  return fetch(path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) })
    .then(function(r){ return r.text().then(function(t){ var j; try { j = JSON.parse(t); } catch(e){ j = { error: 'HTTP ' + r.status }; } return { status: r.status, body: j }; }); });
}

function chips(list){
  return (list || []).map(function(e){
    return '<span class="pill' + (e.ok ? ' ok' : '') + '">' + esc(e.label) + ' ' + (e.ok ? e.ms + 'ms' : '不通') + '</span>';
  }).join(' ');
}

function autoStart(){
  showIntro(false);
  showAuto('<div class="auto-head"><span class="spinner"></span><div class="t">正在扫描本机</div><div class="s">配置目录 / 安装目录 / 命令行 / 扩展 / 开始菜单</div></div>');
  runScan();
}

function runScan(){
  return apiRaw('/api/auto/scan').then(function(r){
    if (r.status !== 200) throw new Error(r.body.error || ('HTTP ' + r.status));
    renderScan(r.body);
  }).catch(function(e){
    showAuto('<div class="auto-head"><div class="t">扫描失败</div></div><div class="auto-card"><p class="p">' + esc(e.message) + '</p>' +
      '<div class="auto-actions"><button class="btn outlined" data-act="autoRetry">重试</button>' +
      '<button class="btn outlined is-secondary" data-act="manualStart">手动配置</button></div></div>');
  });
}

function renderScan(d){
  var found = d.found || [];
  var head = '<div class="auto-head"><div class="t">自动配置</div><div class="s">扫了 35 个客户端 · 装了 ' + found.length + ' 个</div></div>';
  if (!d.networkOk){ return renderNetwork(d.endpoints, null, head); }
  if (!found.length){
    showAuto(head + '<div class="auto-card"><h3>没找到已安装的客户端</h3>' +
      '<p class="p">查过配置目录、安装目录、PATH、VS Code 扩展、开始菜单。可能是绿色版或装在非常规位置 —— 手动配置里可以自己指路径。</p>' +
      '<div class="auto-actions"><button class="btn outlined" data-act="autoRetry">重新扫描</button>' +
      '<button class="btn filled" data-act="manualStart">手动配置</button></div></div>' +
      '<div class="auto-card"><h3>线路</h3><p class="p">' + chips(d.endpoints) + '</p></div>');
    return;
  }
  if (found.length === 1){
    return autoRun([found[0].id], found[0].name);
  }
  var rows = found.map(function(t){
    return '<div class="auto-row on" data-tool="' + esc(t.id) + '">' +
      '<span class="tick">' + icon('check') + '</span>' +
      '<span style="min-width:0"><div class="nm">' + esc(t.name) +
      (t.deprecated ? '<span class="pill">已停服</span>' : '') + '</div>' +
      '<div class="ev">' + esc(t.evidence || t.configPath || t.programPath || t.cliPath || t.extPath || '') + '</div></span></div>';
  }).join('');
  showAuto(head + '<div class="auto-card"><h3>选择要配置的软件</h3>' +
    '<p class="p">检测到 ' + found.length + ' 个。默认全选，点一下可以取消。</p>' +
    '<div class="auto-list">' + rows + '</div>' +
    '<div class="auto-actions"><button class="btn outlined" data-act="manualStart">手动配置</button>' +
    '<button class="btn filled" data-act="autoRunSelected">开始配置</button></div></div>' +
    '<div class="auto-card"><h3>线路</h3><p class="p">' + chips(d.endpoints) + '</p></div>');
}

function autoRun(ids, label){
  showAuto('<div class="auto-head"><span class="spinner"></span><div class="t">正在配置' + (label ? ' · ' + esc(label) : '') + '</div>' +
    '<div class="s">选线路 → 取密钥 → 写配置 → 备份</div></div>');
  return apiRaw('/api/auto/run', { tools: ids }).then(function(r){
    var b = r.body;
    if (b && b.ok) return renderDone(b);
    if (b && b.mode === 'network') return renderNetwork((b.diagnosis && b.diagnosis.endpoints) || [], b.diagnosis, '');
    if (b && b.mode === 'login'){
      showAuto('<div class="auto-head"><div class="t">需要登录一次</div></div><div class="auto-card">' +
        '<p class="p">' + esc(b.reason || '没有可用的登录状态') + '。在 Edge/Chrome 里登录面板后，点下面重试即可。</p>' +
        '<div class="auto-actions"><button class="btn outlined" data-act="autoRetry">重试</button>' +
        '<button class="btn filled" data-act="manualStart">手动配置</button></div></div>');
      return;
    }
    showAuto('<div class="auto-head"><div class="t">没能自动完成</div></div><div class="auto-card"><p class="p">' +
      esc((b && (b.reason || b.error)) || '未知原因') + '</p><div class="auto-actions">' +
      '<button class="btn outlined" data-act="autoRetry">重试</button>' +
      '<button class="btn filled" data-act="manualStart">手动配置</button></div></div>');
  }).catch(function(e){
    showAuto('<div class="auto-head"><div class="t">出错了</div></div><div class="auto-card"><p class="p">' + esc(e.message) + '</p>' +
      '<div class="auto-actions"><button class="btn outlined" data-act="autoRetry">重试</button></div></div>');
  });
}

function renderDone(r){
  var files = (r.results || []).filter(function(x){ return x.written; });
  showAuto('<div class="auto-head"><div class="t">配置完成</div><div class="s">' + esc(r.endpoint) + ' · ' + r.endpointMs + 'ms</div></div>' +
    '<div class="auto-card"><div class="auto-kv">' +
      '<span class="k">账号</span><span class="v">' + esc(r.account.email || '-') + (r.account.balance != null ? ' · 余额 ' + esc(String(r.account.balance)) : '') + '</span>' +
      '<span class="k">密钥</span><span class="v">' + esc(r.key.name) + ' · ' + esc(r.key.masked) + (r.key.rate ? ' · ' + r.key.rate + 'x' : '') + '</span>' +
      '<span class="k">模型</span><span class="v">' + esc(r.model) + '</span>' +
      '<span class="k">上下文</span><span class="v">' + (r.contextCap || '-') + '（站点上限 × 95%）</span>' +
      '<span class="k">客户端</span><span class="v">' + esc(r.tools.map(function(t){ return t.name; }).join('、')) + '</span>' +
      '<span class="k">写入</span><span class="v">' + files.length + ' 个文件</span>' +
    '</div></div>' +
    '<div class="auto-card"><h3>线路</h3><p class="p">' + chips(r.otherEndpoints) + '</p></div>' +
    '<div class="auto-actions"><button class="btn outlined" data-act="autoRetry">换一台再配</button>' +
    '<button class="btn filled" data-act="openFull">打开完整界面</button></div>');
}

function renderNetwork(endpoints, diag, head){
  var advice = (diag && diag.advice) || [];
  var rows = (endpoints || []).map(function(e){
    return '<div class="drow"><span class="l"><div>' + esc(e.label || e.url) + '</div>' +
      '<div class="m">' + esc(e.baseUrl || e.url || '') + '</div></span>' +
      '<span class="v' + (e.ok ? '' : ' bad') + '">' + (e.ok ? e.ms + ' ms' : '连不上') + '</span></div>';
  }).join('');
  showAuto((head || '<div class="auto-head"><div class="t">网络不通</div></div>') +
    '<div class="auto-card"><h3>两条线路都没通</h3>' +
    '<p class="p">先确认不是本机网络的问题。下面是我们刚才实测的结果。</p>' +
    '<div class="vres">' + rows + '</div>' +
    (advice.length ? '<ul class="auto-advice">' + advice.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
    '</div>' +
    '<div class="auto-actions"><button class="btn outlined" data-act="netRetry">重新检测</button>' +
    '<button class="btn filled" data-act="manualStart">手动配置</button></div>');
}

function dismissIntro(){
  hideAuto(); showIntro(false);
  return post('/api/intro', { seen: true }).then(function(){ return load(); }).catch(function(){});
}

load().then(function(){
  if (!boot.lastNet) netQuick();
}).catch(function(e){ toast('ERR[' + (e && e.message) + '] ' + String(e && e.stack || '').split('\n').slice(1,3).join(' | ')); });
`;
