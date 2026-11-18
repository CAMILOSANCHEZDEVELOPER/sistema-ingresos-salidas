/* ============================================================
   Sistema de Ingresos y Salidas — lógica del MVP
   Persistencia: localStorage (capa temporal para la demo).
   TODO: migrar a una base de datos (p. ej. PostgreSQL) cuando se apruebe el diseño.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#39a900" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 0-7 2-7 6 0 5 7 12 7 12s7-7 7-12c0-4-3-6-7-6z"/><path d="M12 3c3 3 3 8 0 12"/></svg>';

  /* ---------------- Estado / DB ---------------- */
  const KEY = "isv_db";
  const DEFAULT_DB = {
    title: "Sistema de Ingresos y Salidas",
    adminPass: "6868",
    variant: "v1",
    startTime: "08:00",
    employees: [],
    records: [],
  };

  function seed() {
    // 1 admin + 6 colaboradores, contraseñas por defecto 1234
    const emp = [
      ["1099887766", "Laura", "Gómez Ríos", "admin"],
      ["1001234567", "Carlos", "Pérez Díaz", "colab"],
      ["1002345678", "María", "López Sánchez", "colab"],
      ["1003456789", "Andrés", "Ramírez Cano", "colab"],
      ["1004567890", "Diana", "Torres Vega", "colab"],
      ["1005678901", "Julián", "Castro Mora", "colab"],
      ["1006789012", "Paola", "Núñez Silva", "colab"],
    ].map(([ced, nombre, apellidos, role]) => ({
      ced, nombre, apellidos, role, pass: "1234", fp: role === "colab" ? true : false,
    }));

    // registros de los últimos 10 días laborales
    const recs = [];
    const now = new Date();
    for (let d = 0; d < 10; d++) {
      const day = new Date(now); day.setDate(now.getDate() - d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      emp.filter(e => e.role === "colab").forEach((e, i) => {
        const late = Math.max(0, Math.round((Math.sin(d * 1.7 + i * 2.3) * 22 + i * 4 - 6)));
        const inH = 8, inM = late; // 08:00 esperada
        const din = new Date(day); din.setHours(inH, inM, Math.floor(Math.random() * 59), 0);
        const dout = new Date(day); dout.setHours(17, 5 + Math.floor(Math.random() * 40), 0, 0);
        recs.push({ ced: e.ced, tipo: "entrada", ts: din.toISOString(), lateMin: late });
        recs.push({ ced: e.ced, tipo: "salida", ts: dout.toISOString(), lateMin: 0 });
      });
    }
    return { ...DEFAULT_DB, employees: emp, records: recs };
  }

  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (_) { db = null; }
    if (!db || !db.employees || !db.employees.length) { db = seed(); save(); }
    if (!db.adminPass) { db.adminPass = "6868"; save(); } // migración desde versiones con gate
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

  /* ---------------- Sesión ---------------- */
  let session = null; // {role, ced}
  let selectedRole = "colab";

  /* ---------------- Utilidades ---------------- */
  function empByCed(ced) { return db.employees.find(e => e.ced === ced); }
  function fullName(e) { return e ? `${e.nombre} ${e.apellidos}` : "—"; }
  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function toast(title, sub) {
    const host = $("#toastHost");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="tic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
    host.appendChild(el);
    setTimeout(() => el.classList.add("hide"), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------------- Navegación de pantallas ---------------- */
  function show(id) {
    ["screen-login", "screen-colab", "screen-admin"].forEach(s => $("#" + s).classList.toggle("hidden", s !== id));
    const isAdmin = id === "screen-admin";
    $("#hud").classList.toggle("hidden", !isAdmin);   // panel de fondo solo para admin
    $("#vswitch").classList.remove("hidden");          // selector de diseño siempre visible
  }

  /* ---------------- Título / variante ---------------- */
  function applyTitle() {
    document.title = db.title;
    $$(".app-title").forEach(el => el.textContent = db.title);
  }
  function applyVariant() {
    document.body.classList.remove("v1", "v2", "v3");
    document.body.classList.add(db.variant);
    $$("#vswitch .vs-opt").forEach(b => b.classList.toggle("on", b.dataset.v === db.variant));
  }

  /* ---------------- LOGIN ---------------- */
  function updateRoleUI() {
    const admin = selectedRole === "admin";
    $("#cedRow").classList.toggle("hidden", admin); // el admin no pide cédula, solo clave
    $("#loginPass").placeholder = admin ? "Clave de administrador" : "Contraseña";
  }
  function initLogin() {
    $$("#roleTabs button").forEach(b => b.onclick = () => {
      selectedRole = b.dataset.role;
      $$("#roleTabs button").forEach(x => x.classList.toggle("on", x === b));
      $("#loginErr").textContent = "";
      updateRoleUI();
    });
    const go = () => {
      const pass = $("#loginPass").value;
      if (selectedRole === "admin") {
        if (pass !== db.adminPass) { $("#loginErr").textContent = "Clave incorrecta."; return; }
        $("#loginErr").textContent = ""; $("#loginPass").value = "";
        session = { role: "admin", ced: null };
        openAdmin({ nombre: "Administrador", apellidos: "", ced: "—", role: "admin" });
        return;
      }
      const ced = $("#loginCed").value.trim();
      const e = empByCed(ced);
      if (!e || e.pass !== pass) { $("#loginErr").textContent = "Cédula o contraseña incorrecta."; return; }
      if (e.role !== "colab") { $("#loginErr").textContent = "Este usuario no es colaborador."; return; }
      $("#loginErr").textContent = ""; $("#loginPass").value = "";
      session = { role: "colab", ced: e.ced };
      openColab(e);
    };
    $("#loginBtn").onclick = go;
    $("#loginPass").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
    updateRoleUI();
  }

  function logout() {
    session = null; selectedRole = "colab";
    $$("#roleTabs button").forEach(x => x.classList.toggle("on", x.dataset.role === "colab"));
    $("#loginCed").value = ""; $("#loginPass").value = ""; $("#loginErr").textContent = "";
    updateRoleUI(); show("screen-login");
  }

  /* ---------------- COLABORADOR ---------------- */
  let colabSort = { key: "ts", dir: -1 };
  function openColab(e) {
    show("screen-colab");
    $("#colabName").textContent = fullName(e);
    $("#colabCed").textContent = "CC " + e.ced;
    $("#colabAv").textContent = (e.nombre[0] || "C").toUpperCase();
    renderColab();
  }
  function colabFilters() {
    return {
      tipo: $("#cfTipo").value, from: $("#cfFrom").value, to: $("#cfTo").value,
      min: parseInt($("#cfMin").value, 10) || 0,
    };
  }
  function renderColab() {
    const f = colabFilters();
    let rows = db.records.filter(r => r.ced === session.ced);
    rows = applyRecordFilters(rows, f);
    rows = sortRecords(rows, colabSort);
    const late = rows.filter(r => r.tipo === "entrada").reduce((a, r) => a + r.lateMin, 0);
    const nEnt = rows.filter(r => r.tipo === "entrada").length;
    $("#colabKpis").innerHTML = kpi("Registros", rows.length) + kpi("Entradas", nEnt) + kpi("Salidas", rows.length - nEnt) + kpi("Min. tarde (total)", late);
    $("#colabTable").innerHTML = recordTableHTML(rows, colabSort, false);
    wireSort("#colabTable", colabSort, renderColab);
  }

  /* ---------------- ADMIN ---------------- */
  let admSort = { key: "lateMin", dir: -1 };
  function openAdmin(e) {
    show("screen-admin");
    $("#adminName").textContent = fullName(e).trim() || "Administrador";
    $("#adminCed").textContent = "Sesión de administrador";
    navTo("registros");
    renderAdmin(); renderEmployees(); fillConfig();
  }
  function navTo(page) {
    $$("#admNav a").forEach(a => a.classList.toggle("on", a.dataset.page === page));
    $$("#screen-admin .page").forEach(p => p.classList.toggle("on", p.dataset.page === page));
  }
  function admFilters() {
    return {
      ced: $("#afCed").value.trim(), nom: $("#afNom").value.trim().toLowerCase(), ape: $("#afApe").value.trim().toLowerCase(),
      tipo: $("#afTipo").value, from: $("#afFrom").value, to: $("#afTo").value, min: parseInt($("#afMin").value, 10) || 0,
    };
  }
  function adminRows() {
    const f = admFilters();
    let rows = db.records.map(r => { const e = empByCed(r.ced); return { ...r, nombre: e ? e.nombre : "", apellidos: e ? e.apellidos : "" }; });
    if (f.ced) rows = rows.filter(r => r.ced.includes(f.ced));
    if (f.nom) rows = rows.filter(r => r.nombre.toLowerCase().includes(f.nom));
    if (f.ape) rows = rows.filter(r => r.apellidos.toLowerCase().includes(f.ape));
    rows = applyRecordFilters(rows, f);
    return sortRecords(rows, admSort);
  }
  function renderAdmin() {
    const rows = adminRows();
    const late = rows.filter(r => r.tipo === "entrada").reduce((a, r) => a + r.lateMin, 0);
    const nEnt = rows.filter(r => r.tipo === "entrada").length;
    const tarde = rows.filter(r => r.tipo === "entrada" && r.lateMin > 0).length;
    $("#admKpis").innerHTML = kpi("Registros", rows.length) + kpi("Entradas", nEnt) + kpi("Llegadas tarde", tarde) + kpi("Min. tarde (total)", late);
    $("#admTable").innerHTML = recordTableHTML(rows, admSort, true);
    wireSort("#admTable", admSort, renderAdmin);
  }

  /* ---------------- Filtros / orden compartidos ---------------- */
  function applyRecordFilters(rows, f) {
    if (f.tipo) rows = rows.filter(r => r.tipo === f.tipo);
    if (f.from) { const t = new Date(f.from).getTime(); rows = rows.filter(r => new Date(r.ts).getTime() >= t); }
    if (f.to) { const t = new Date(f.to).getTime(); rows = rows.filter(r => new Date(r.ts).getTime() <= t); }
    if (f.min > 0) rows = rows.filter(r => r.lateMin >= f.min);
    return rows;
  }
  function sortRecords(rows, s) {
    return rows.slice().sort((a, b) => {
      let va = a[s.key], vb = b[s.key];
      if (s.key === "ts") { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); return va < vb ? -s.dir : va > vb ? s.dir : 0; }
      return (va - vb) * s.dir;
    });
  }

  function kpi(lbl, val) { return `<div class="card kpi"><div class="lbl">${lbl}</div><div class="val">${val}</div></div>`; }

  function recordTableHTML(rows, s, withEmp) {
    const cols = withEmp
      ? [["ced", "Cédula"], ["nombre", "Nombre"], ["apellidos", "Apellidos"], ["ts", "Fecha y hora"], ["tipo", "Tipo"], ["lateMin", "Min. tarde"]]
      : [["ts", "Fecha y hora"], ["tipo", "Tipo"], ["lateMin", "Min. tarde"]];
    const head = cols.map(([k, l]) => {
      const act = s.key === k ? "act" : "";
      const arr = s.key === k ? (s.dir === 1 ? "▲" : "▼") : "↕";
      return `<th class="sortable ${act}" data-k="${k}">${l} <span class="arr">${arr}</span></th>`;
    }).join("");
    if (!rows.length) return `<thead><tr>${head}</tr></thead><tbody><tr><td colspan="${cols.length}" class="tbl-empty">Sin registros para los filtros aplicados.</td></tr></tbody>`;
    const body = rows.map(r => {
      const tipo = r.tipo === "entrada" ? `<span class="pill in">Entrada</span>` : `<span class="pill out">Salida</span>`;
      const lm = r.tipo === "entrada"
        ? (r.lateMin > 0 ? `<span class="pill late">${r.lateMin} min</span>` : `<span class="pill ok">A tiempo</span>`)
        : `<span style="color:var(--faint)">—</span>`;
      const cells = withEmp
        ? [esc(r.ced), esc(r.nombre), esc(r.apellidos), fmt(r.ts), tipo, lm]
        : [fmt(r.ts), tipo, lm];
      return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
    }).join("");
    return `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
  }
  function wireSort(sel, s, rerender) {
    $$(sel + " th.sortable").forEach(th => th.onclick = () => {
      const k = th.dataset.k;
      if (s.key === k) s.dir *= -1; else { s.key = k; s.dir = (k === "lateMin" || k === "ts") ? -1 : 1; }
      rerender();
    });
  }

  /* ---------------- Empleados ---------------- */
  let editCed = null, fpCaptured = false;
  function renderEmployees() {
    const rows = db.employees.map(e => `<tr>
      <td>${esc(e.ced)}</td><td>${esc(e.nombre)}</td><td>${esc(e.apellidos)}</td>
      <td>${e.role === "admin" ? `<span class="pill in">Admin</span>` : `<span class="pill out">Colaborador</span>`}</td>
      <td>${e.fp ? `<span class="pill ok">Registrada</span>` : `<span class="pill late">Pendiente</span>`}</td>
      <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-edit="${e.ced}">Editar</button> <button class="btn btn-ghost btn-sm" data-del="${e.ced}">Eliminar</button></td>
    </tr>`).join("");
    $("#empTable").innerHTML = `<thead><tr><th>Cédula</th><th>Nombre</th><th>Apellidos</th><th>Rol</th><th>Huella</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody>`;
    $$("#empTable [data-edit]").forEach(b => b.onclick = () => editEmployee(b.dataset.edit));
    $$("#empTable [data-del]").forEach(b => b.onclick = () => delEmployee(b.dataset.del));
    fillConfigWho();
  }
  function setFp(state) {
    fpCaptured = state;
    const box = $("#fpBox");
    box.classList.toggle("done", state);
    $("#fpState").textContent = state ? "Huella registrada ✓" : "Huella sin registrar";
  }
  function editEmployee(ced) {
    const e = empByCed(ced); if (!e) return;
    editCed = ced;
    $("#empFormTitle").textContent = "Editar empleado";
    $("#eCed").value = e.ced; $("#eNom").value = e.nombre; $("#eApe").value = e.apellidos; $("#ePass").value = e.pass; $("#eRole").value = e.role;
    setFp(!!e.fp);
    $("#empCancel").style.display = "";
    navTo("empleados");
  }
  function resetEmpForm() {
    editCed = null;
    $("#empFormTitle").textContent = "Nuevo empleado";
    $("#eCed").value = ""; $("#eNom").value = ""; $("#eApe").value = ""; $("#ePass").value = "1234"; $("#eRole").value = "colab";
    setFp(false); $("#empCancel").style.display = "none";
  }
  function saveEmployee() {
    const ced = $("#eCed").value.trim();
    const nombre = $("#eNom").value.trim(), apellidos = $("#eApe").value.trim();
    if (!ced || !nombre || !apellidos) { toast("Faltan datos", "Cédula, nombres y apellidos son obligatorios."); return; }
    const dup = db.employees.find(e => e.ced === ced && e.ced !== editCed);
    if (dup) { toast("Cédula duplicada", "Ya existe un empleado con esa cédula."); return; }
    const data = { ced, nombre, apellidos, role: $("#eRole").value, pass: $("#ePass").value || "1234", fp: fpCaptured };
    if (editCed) { const i = db.employees.findIndex(e => e.ced === editCed); db.employees[i] = data; }
    else db.employees.push(data);
    save(); renderEmployees(); resetEmpForm();
    toast(editCed ? "Empleado actualizado" : "Empleado creado", fullName(data));
  }
  function delEmployee(ced) {
    if (ced === session.ced) { toast("Acción no permitida", "No puedes eliminar tu propio usuario."); return; }
    db.employees = db.employees.filter(e => e.ced !== ced);
    save(); renderEmployees(); toast("Empleado eliminado", "CC " + ced);
  }

  /* ---------------- Config ---------------- */
  function fillConfig() {
    $("#cfgTitle").value = db.title;
    $("#cfgAccess").value = db.adminPass;
    $("#cfgStart").value = db.startTime;
    fillConfigWho();
  }
  function fillConfigWho() {
    const sel = $("#cfgWho"); if (!sel) return;
    sel.innerHTML = db.employees.map(e => `<option value="${e.ced}">${esc(fullName(e))} · CC ${esc(e.ced)}</option>`).join("");
  }

  /* ---------------- Reportes ---------------- */
  function reportData() {
    return adminRows().map(r => ({
      Cedula: r.ced, Nombre: r.nombre, Apellidos: r.apellidos,
      "Fecha y hora": fmt(r.ts), Tipo: r.tipo === "entrada" ? "Entrada" : "Salida",
      "Minutos tarde": r.tipo === "entrada" ? r.lateMin : "",
    }));
  }
  function exportExcel() {
    // Tabla HTML con MIME de Excel (abre nativo en Excel) — sin dependencias.
    const data = reportData();
    const cols = Object.keys(data[0] || { Cedula: "", Nombre: "", Apellidos: "", "Fecha y hora": "", Tipo: "", "Minutos tarde": "" });
    const rows = data.map(o => `<tr>${cols.map(c => `<td>${esc(o[c])}</td>`).join("")}</tr>`).join("");
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
      <table border="1"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
    downloadBlob(blob, `reporte-empleados-${dateTag()}.xls`);
    toast("Excel generado", `${data.length} registros`);
  }
  function exportPDF() {
    // Vista de impresión + "Guardar como PDF" del navegador — sin librerías.
    const data = reportData();
    const cols = Object.keys(data[0] || { Cedula: "", Nombre: "", Apellidos: "", "Fecha y hora": "", Tipo: "", "Minutos tarde": "" });
    const rows = data.map(o => `<tr>${cols.map(c => `<td>${esc(o[c])}</td>`).join("")}</tr>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Reporte de empleados</title><style>
      body{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#15251a;padding:28px;}
      h1{font-size:20px;margin:0 0 4px;} .sub{color:#6c7d72;font-size:12px;margin-bottom:18px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#39a900;color:#fff;text-align:left;padding:8px 10px;}
      td{padding:7px 10px;border-bottom:1px solid #e2e8e0;}
      tr:nth-child(even) td{background:#f5f8f3;}
    </style></head><body>
      <h1>${esc(db.title)} — Reporte de empleados</h1>
      <div class="sub">Generado el ${new Date().toLocaleString("es-CO")} · ${data.length} registros</div>
      <table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
    toast("PDF listo", "Elige 'Guardar como PDF' en el diálogo de impresión.");
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function dateTag() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; }

  /* ---------------- Wiring ---------------- */
  function initWiring() {
    // logos svg
    const bl = $("#brandLogo2"); if (bl) bl.innerHTML = LOGO_SVG;
    $$(".logo").forEach(l => { if (!l.innerHTML) l.innerHTML = LOGO_SVG; });

    initLogin();
    $("#colabLogout").onclick = logout;
    $("#adminLogout").onclick = logout;
    $$("#admNav a").forEach(a => a.onclick = () => navTo(a.dataset.page));

    // filtros colaborador
    ["cfTipo", "cfFrom", "cfTo", "cfMin"].forEach(id => $("#" + id).addEventListener("input", renderColab));
    $("#cfClear").onclick = () => { ["cfTipo", "cfFrom", "cfTo", "cfMin"].forEach(id => $("#" + id).value = ""); renderColab(); };

    // filtros admin
    ["afCed", "afNom", "afApe", "afTipo", "afFrom", "afTo", "afMin"].forEach(id => $("#" + id).addEventListener("input", renderAdmin));
    $("#afClear").onclick = () => { ["afCed", "afNom", "afApe", "afTipo", "afFrom", "afTo", "afMin"].forEach(id => $("#" + id).value = ""); renderAdmin(); };

    // empleados
    $("#fpBtn").onclick = () => {
      const box = $("#fpBox"); box.classList.add("scan"); $("#fpState").textContent = "Leyendo huella…";
      setTimeout(() => { box.classList.remove("scan"); setFp(true); toast("Huella capturada", "Registro simulado (sin huellero)"); }, 1100);
    };
    $("#empSave").onclick = saveEmployee;
    $("#empCancel").onclick = resetEmpForm;

    // reportes
    $("#btnPdf").onclick = exportPDF;
    $("#btnXlsx").onclick = exportExcel;

    // config
    $("#cfgSaveGeneral").onclick = () => {
      db.title = $("#cfgTitle").value.trim() || db.title;
      db.startTime = $("#cfgStart").value || db.startTime;
      save(); applyTitle(); toast("Configuración guardada");
    };
    $("#cfgSaveAccess").onclick = () => {
      const v = $("#cfgAccess").value.trim();
      if (!v) { toast("Clave vacía", "Ingresa una clave válida."); return; }
      db.adminPass = v; save(); toast("Clave de administrador actualizada");
    };
    $("#cfgResetPass").onclick = () => {
      const ced = $("#cfgWho").value, np = $("#cfgNewPass").value || "1234";
      const e = empByCed(ced); if (!e) return;
      e.pass = np; save(); renderEmployees(); toast("Contraseña restablecida", fullName(e));
    };

    // selector de variantes
    $("#vsToggle").onclick = () => $("#vswitch").classList.toggle("open");
    $$("#vswitch .vs-opt").forEach(b => b.onclick = () => {
      db.variant = b.dataset.v; save(); applyVariant(); $("#vswitch").classList.remove("open");
      toast("Diseño aplicado", b.querySelector("b").textContent);
    });
  }

  /* ---------------- Arranque ---------------- */
  load();
  applyTitle();
  applyVariant();
  initWiring();
  show("screen-login");
})();
