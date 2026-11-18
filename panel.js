/* ============================================================
   Panel "Estilo del fondo" — 54 efectos (adaptado de certificaton-ui.js)
   Requiere shader-engine.js (expone window.RGShader)
   ============================================================ */
(function () {
  "use strict";

  // [clave, número, nombre, ...tags]  (tag "light" => tema claro)
  const EFFECTS = [
    ["swMesh","S1","SENA · Malla Suave","sena","light"],
    ["swTopo","S2","SENA · Topografía","sena","light"],
    ["swLeaf","S3","SENA · Crecimiento","sena","light"],
    ["swGrid","S4","SENA · Rejilla Técnica","sena","light"],
    ["swAur","S5","SENA · Aurora Verde","sena","light"],
    ["swRing","S6","SENA · Anillos","sena","light"],
    ["senaMalla","19","SENA · Malla Verde","sena"],
    ["senaTopo","20","SENA · Topografía","sena"],
    ["senaHojas","21","SENA · Hojas","sena"],
    ["senaDatos","22","SENA · Crecimiento","sena"],
    ["senaAnillos","23","SENA · Anillos","sena"],
    ["carretera","01","Carretera Neón"],
    ["synthwave","02","Synthwave Líquido"],
    ["esmeralda","03","Ganancia Esmeralda"],
    ["tunel","04","Túnel Hiperveloz"],
    ["circuito","05","Circuito Vivo"],
    ["aurora","06","Aurora Sedosa"],
    ["plasma","07","Plasma Metaball"],
    ["hex","08","Panal Hex"],
    ["lluvia","09","Lluvia Digital"],
    ["nebulosa","10","Nebulosa Cósmica"],
    ["caleido","11","Caleidoscopio"],
    ["radar","12","Radar Táctico"],
    ["olas","13","Olas de Neón"],
    ["fractal","14","Cristal Fractal"],
    ["burbujas","15","Burbujas"],
    ["tormenta","16","Tormenta Eléctrica"],
    ["metal","17","Metal Líquido"],
    ["enjambre","18","Enjambre"],
    ["vitral","24","Vitral Mosaico"],
    ["moire","25","Interferencia"],
    ["lava","26","Lava Lamp"],
    ["starfield","27","Campo Estelar"],
    ["warp","28","Rejilla Gravedad"],
    ["tinta","29","Tinta sobre Papel","light"],
    ["pmesh","30","Malla Pastel","light"],
    ["topoc","31","Topografía Clara","light"],
    ["lunares","32","Lunares","light"],
    ["papel","33","Papel Embosado","light"],
    ["acuarela","34","Acuarela","light"],
    ["blueprintc","35","Blueprint Claro","light"],
    ["sedac","36","Seda Clara","light"],
    ["caustics","37","Caustics Piscina","light"],
    ["marmol","38","Mármol Blanco","light"],
    ["halftone","39","Halftone","light"],
    ["aurorap","40","Aurora Pastel","light"],
    ["olasp","41","Olas Pastel","light"],
    ["confeti","42","Confeti","light"],
    ["origami","43","Origami","light"],
    ["moirec","44","Interferencia Clara","light"],
    ["vitralc","45","Vitral Claro","light"],
    ["frost","46","Cristal Esmerilado","light"],
    ["zen","47","Ondas Zen","light"],
    ["suave","48","Gradiente Suave","light"],
  ];

  const NAMES = {};
  const LIGHT = new Set();
  EFFECTS.forEach((e) => { NAMES[e[0]] = [e[1], e[2]]; if (e.includes("light")) LIGHT.add(e[0]); });
  const DEFAULT = "swMesh";

  function applyTheme(opt) { document.body.classList.toggle("night", !LIGHT.has(opt)); }

  function buildPanel() {
    const hud = document.getElementById("hud");
    if (!hud) return;
    const segHTML = EFFECTS.map((e) => {
      const cls = e.slice(3).join(" ");
      return `<button data-opt="${e[0]}" class="${cls}" title="${e[2]}">${e[1]}</button>`;
    }).join("");
    hud.innerHTML = `
      <div class="hd" id="hudHead">
        <span class="d"></span>
        <svg class="pal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2C6.5 2 2 6 2 11c0 4 3 6 6 6 1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2c3 0 5-2 5-5 0-3.5-3.5-5-6-5z"/></svg>
        <b>Estilo del fondo</b>
        <span class="cur" id="hudCur"></span>
        <span class="min" id="hudMin">–</span>
      </div>
      <div class="body">
        <div class="hud-cat">54 efectos · arrastra para ver más</div>
        <div class="seg" id="seg">${segHTML}</div>
        <div class="optname" id="optName"></div>
        <div class="ctl"><div class="lr"><span>Velocidad</span><b id="vSpeed">1.0×</b></div><input id="sSpeed" type="range" min="0" max="3" step="0.05" value="1"></div>
        <div class="ctl"><div class="lr"><span>Intensidad</span><b id="vInt">1.0×</b></div><input id="sInt" type="range" min="0.3" max="2" step="0.05" value="1"></div>
        <div class="ctl"><div class="lr"><span>Parallax 3D</span><b id="vPar">1.0×</b></div><input id="sPar" type="range" min="0" max="2.5" step="0.05" value="1"></div>
        <div class="hud-hint">Mueve el <b>mouse</b> para inclinar la cámara · haz <b>click</b> en el fondo para un pulso. <b>S1–S6</b> y <b>19–23</b> son verdes SENA.</div>
      </div>`;

    const seg = document.getElementById("seg");
    const optName = document.getElementById("optName");
    const hudCur = document.getElementById("hudCur");

    function paint(opt) {
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.opt === opt));
      if (NAMES[opt]) { optName.innerHTML = `Activo: <b>${NAMES[opt][1]}</b>`; hudCur.textContent = NAMES[opt][0]; }
      applyTheme(opt);
    }

    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      window.RGShader.setOption(b.dataset.opt);
      paint(b.dataset.opt);
    });

    const sSpeed = document.getElementById("sSpeed"), sInt = document.getElementById("sInt"), sPar = document.getElementById("sPar");
    const vSpeed = document.getElementById("vSpeed"), vInt = document.getElementById("vInt"), vPar = document.getElementById("vPar");
    function bind(slider, label, key) {
      slider.addEventListener("input", () => { const v = parseFloat(slider.value); label.textContent = v.toFixed(1) + "×"; window.RGShader.set(key, v); });
    }
    bind(sSpeed, vSpeed, "speed"); bind(sInt, vInt, "intensity"); bind(sPar, vPar, "parallax");

    document.getElementById("hudHead").addEventListener("click", (e) => {
      if (e.target.id === "seg") return;
      const c = hud.classList.toggle("collapsed");
      document.getElementById("hudMin").textContent = c ? "+" : "–";
    });

    function init() {
      if (!window.RGShader) return setTimeout(init, 50);
      const s = window.RGShader.state;
      if (!localStorage.getItem("rg_opt")) window.RGShader.setOption(DEFAULT);
      const cur = window.RGShader.state.current;
      paint(cur);
      sSpeed.value = s.speed; vSpeed.textContent = s.speed.toFixed(1) + "×";
      sInt.value = s.intensity; vInt.textContent = s.intensity.toFixed(1) + "×";
      sPar.value = s.parallax; vPar.textContent = s.parallax.toFixed(1) + "×";
      if (LIGHT.has(cur) && s.intensity > 1.15) { window.RGShader.set("intensity", 1.0); sInt.value = 1.0; vInt.textContent = "1.0×"; }
    }
    init();
  }

  window.CertUI = { buildPanel, applyTheme, LIGHT, NAMES };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildPanel);
  else buildPanel();
})();
