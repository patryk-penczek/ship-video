/* Screen builders: functions that return HTML for app replicas. One per screen.
   In a real film, build these from the product's actual components (structure, copy, sizes, tokens, icons),
   then audit each one against the source before filming. This sample is a placeholder to learn the pattern. */
window.UI = (() => {
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const row = (text, meta, cls = "") => `<div class="demo-row ${cls}"><span class="demo-box">${check}</span><span class="demo-txt">${text}</span><small>${meta}</small></div>`;

  function app() {
    return `<div class="demo-app">
      <div class="demo-app-top"><i></i><i></i><i></i><b>Tasks</b></div>
      <div class="demo-app-body">
        <div class="demo-app-h"><h2>Today</h2><span><b class="demo-done-n">0</b> of 3 done</span></div>
        <div class="demo-app-new"><div class="demo-app-in"><span class="q">Add a task…</span></div><div class="demo-app-btn">Add</div></div>
        <div class="demo-app-list">
          ${row("", "now", "new")}
          ${row("Call the dentist", "9:00")}
          ${row("Buy oat milk", "11:30")}
        </div>
      </div>
    </div>`;
  }

  return { app, check };
})();
