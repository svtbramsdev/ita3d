// ============================================================
//  Painel administrativo da Ita 3D
//  Lê e grava os arquivos de data/ em um destes lugares:
//    - GitHub (repositório do site, via token pessoal)
//    - Pasta no computador (Chrome/Edge)
//    - Demonstração (só leitura)
// ============================================================
(function () {
  const U = window.Ita;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $("#app");

  // ---------- Arquivos gerenciados ----------
  const FILES = {
    pedidos:    { path: "data/pedidos.js",    vars: ["PEDIDOS"],                titulo: "Pedidos" },
    filamentos: { path: "data/filamentos.js", vars: ["MATERIAIS", "FILAMENTOS"], titulo: "Materiais e filamentos" },
    modelos:    { path: "data/modelos.js",    vars: ["MODELOS", "DESTAQUES"],   titulo: "Catálogo e carrossel" },
    precos:     { path: "data/precos.js",     vars: ["PRECOS"],                 titulo: "Preços" },
    config:     { path: "data/config.js",     vars: ["CONFIG"],                 titulo: "Dados da loja" }
  };
  const DEFAULTS = { PEDIDOS: [], MATERIAIS: {}, FILAMENTOS: [], MODELOS: [], DESTAQUES: [], PRECOS: {}, CONFIG: { fila: {} } };
  const STATUS = [["fila", "Na fila"], ["imprimindo", "Imprimindo"], ["pronto", "Pronto p/ retirada"], ["entregue", "Entregue"], ["cancelado", "Cancelado"]];
  const ATIVOS = ["fila", "imprimindo", "pronto"];
  const RES = [["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]];
  const QUAL = [["ornamental", "Ornamental"], ["funcional", "Funcional"], ["esboco", "Esboço"]];

  let backend = null;
  const D = {};        // dados em edição
  const saved = {};    // última versão salva (JSON) de cada arquivo
  let uploads = [];    // fotos para enviar: { path, blob }
  const previews = {}; // path -> URL temporária da foto nova
  let tab = "pedidos", filtroPed = "ativos", simStats = null, simMat = "PLA", simNome = "", simCliente = false, busy = false;

  // ---------- Utilidades ----------
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const hoje = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const ssGet = (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* idem */ } };

  function toast(msg, erro) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast" + (erro ? " err" : "");
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.hidden = true), erro ? 8000 : 4000);
  }
  function novoCodigo() {
    const A = "ACDEFGHJKMNPQRTUVWXY3479";
    const usados = new Set(D.pedidos.PEDIDOS.map((p) => p.codigo));
    for (;;) {
      const r = crypto.getRandomValues(new Uint8Array(4));
      const c = "ITA-" + Array.from(r, (x) => A[x % A.length]).join("");
      if (!usados.has(c)) return c;
    }
  }

  // base64 <-> texto/bytes (UTF-8)
  function bytesToB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const textToB64 = (t) => bytesToB64(new TextEncoder().encode(t));
  const blobToB64 = async (b) => bytesToB64(new Uint8Array(await b.arrayBuffer()));
  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

  // ---------- Backends ----------
  function githubBackend(o) {
    const api = "https://api.github.com/repos/" + encodeURIComponent(o.owner) + "/" + encodeURIComponent(o.repo);
    const headers = { Authorization: "Bearer " + o.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const shas = {};
    async function call(url, opts) {
      opts = opts || {};
      const r = await fetch(url, { method: opts.method || "GET", body: opts.body, cache: "no-store",
        headers: Object.assign({}, headers, opts.body ? { "Content-Type": "application/json" } : {}) });
      if (r.status === 404) return null;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.message || "HTTP " + r.status), { status: r.status });
      return j;
    }
    const url = (path) => api + "/contents/" + path.split("/").map(encodeURIComponent).join("/");
    return {
      nome: "GitHub · " + o.owner + "/" + o.repo,
      remoto: true,
      async testar() {
        const j = await call(api);
        if (!j) throw new Error("Repositório não encontrado, ou o token não tem acesso a ele.");
        if (j.permissions && !j.permissions.push) throw new Error("O token não tem permissão de escrita (Contents: Read and write).");
      },
      async read(path) {
        const j = await call(url(path) + "?ref=" + encodeURIComponent(o.branch));
        if (!j) return null;
        shas[path] = j.sha;
        return { text: b64ToText(j.content || "") };
      },
      async write(path, data, msg) {
        const content = typeof data === "string" ? textToB64(data) : await blobToB64(data);
        if (!(path in shas)) {
          const j = await call(url(path) + "?ref=" + encodeURIComponent(o.branch));
          if (j) shas[path] = j.sha;
        }
        const body = { message: msg, content, branch: o.branch };
        if (shas[path]) body.sha = shas[path];
        const j = await call(url(path), { method: "PUT", body: JSON.stringify(body) });
        shas[path] = j.content.sha;
      }
    };
  }

  async function pastaBackend() {
    const dir = await window.showDirectoryPicker({ id: "ita3d-site", mode: "readwrite" });
    async function handle(path, create) {
      const parts = path.split("/");
      let d = dir;
      for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i], { create });
      return d.getFileHandle(parts[parts.length - 1], { create });
    }
    try { await handle("data/config.js", false); }
    catch (e) { throw new Error("Essa pasta não parece ser a do site. Escolha a pasta que tem o index.html e a pasta data."); }
    return {
      nome: "Pasta: " + dir.name,
      async read(path) {
        try { const fh = await handle(path, false); return { text: await (await fh.getFile()).text() }; }
        catch (e) { if (e.name === "NotFoundError") return null; throw e; }
      },
      async write(path, data) {
        const fh = await handle(path, true);
        const w = await fh.createWritable();
        await w.write(data);
        await w.close();
      }
    };
  }

  const demoBackend = {
    nome: "Demonstração (não salva nada)",
    demo: true,
    async read(path) {
      const r = await fetch(path + "?t=" + Date.now(), { cache: "no-store" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("HTTP " + r.status);
      return { text: await r.text() };
    },
    async write() { /* nada */ }
  };

  // ---------- Leitura e gravação dos arquivos de dados ----------
  // Lê "window.X = <JSON>;" SEM executar o arquivo (a política de segurança proíbe eval).
  // Os comentários do topo do arquivo são guardados e regravados igual.
  const cabecalhos = {};
  function parseData(text, vars, path) {
    const parts = text.split(/^window\.([A-Za-z_]\w*)\s*=\s*/m);
    const achados = {};
    for (let i = 1; i < parts.length; i += 2) {
      const corpo = parts[i + 1].replace(/(\s*\n\s*\/\/[^\n]*)+\s*$/, "").trim().replace(/;\s*$/, "");
      try { achados[parts[i]] = JSON.parse(corpo); }
      catch (e) {
        throw new Error("O arquivo " + path + " tem um erro de formato em window." + parts[i] + " (" + e.message + "). " +
          "Ele precisa ser JSON válido: aspas duplas em tudo, sem comentários dentro, sem vírgula sobrando.");
      }
    }
    const o = {};
    vars.forEach((v) => (o[v] = achados[v] !== undefined ? achados[v] : clone(DEFAULTS[v])));
    return { dados: o, cabecalho: parts[0].trim() };
  }
  function serialize(id) {
    const f = FILES[id];
    let s = cabecalhos[id] ||
      "// " + f.titulo + " — Ita 3D\n// Arquivo gerado pelo painel (admin.html). Dá para editar à mão, mas mantenha o formato JSON." +
      (id === "pedidos" ? "\n// ATENÇÃO: este arquivo é público. Não coloque nome, telefone ou endereço de clientes." : "");
    s += "\n\n";
    f.vars.forEach((v) => { s += "window." + v + " = " + JSON.stringify(D[id][v], null, 2) + ";\n\n"; });
    return s;
  }
  function normalizar() {
    // garante que todo material tenha preço e que a fila exista
    const P = D.precos.PRECOS;
    P.materiais = P.materiais || {};
    Object.keys(D.filamentos.MATERIAIS).forEach((k) => {
      if (!P.materiais[k]) P.materiais[k] = { precoKg: 120, densidade: 1.25, fatorVelocidade: 1 };
    });
    D.config.CONFIG.fila = D.config.CONFIG.fila || {};
  }
  async function carregarTudo() {
    for (const id of Object.keys(FILES)) {
      const f = FILES[id];
      const r = await backend.read(f.path);
      if (r) {
        const p = parseData(r.text, f.vars, f.path);
        D[id] = p.dados;
        cabecalhos[id] = p.cabecalho;
      } else {
        D[id] = f.vars.reduce((o, v) => ((o[v] = clone(DEFAULTS[v])), o), {});
        cabecalhos[id] = "";
      }
    }
    normalizar();
    Object.keys(FILES).forEach((id) => (saved[id] = JSON.stringify(D[id])));
    uploads = [];
    window.PRECOS = D.precos.PRECOS;
  }
  const alterados = () => Object.keys(FILES).filter((id) => JSON.stringify(D[id]) !== saved[id]);

  async function publicar() {
    if (busy) return;
    if (backend.demo) { toast("Modo demonstração: nada foi salvo. Conecte ao GitHub ou à pasta para salvar."); return; }
    if (alterados().includes("pedidos")) D.config.CONFIG.fila.atualizado = hoje();
    busy = true;
    renderPub("Salvando…");
    try {
      while (uploads.length) {
        const u = uploads[0];
        await backend.write(u.path, u.blob, "Painel: foto " + u.path);
        uploads.shift();
      }
      for (const id of alterados()) {
        await backend.write(FILES[id].path, serialize(id), "Painel: " + FILES[id].titulo);
        saved[id] = JSON.stringify(D[id]);
      }
      toast(backend.remoto ? "Publicado! O site atualiza em cerca de 1 minuto." : "Salvo na pasta do site.");
    } catch (e) {
      const m = e.status === 401 ? "o token é inválido ou expirou. Saia e conecte de novo."
        : e.status === 409 || e.status === 422 ? "o arquivo mudou no GitHub (editado em outro lugar?). Recarregue a página e refaça a alteração."
        : e.message;
      toast("Erro ao salvar: " + m, true);
    }
    busy = false;
    renderPub();
  }
  function descartar() {
    if (!confirm("Descartar todas as alterações não publicadas?")) return;
    alterados().forEach((id) => (D[id] = JSON.parse(saved[id])));
    uploads = [];
    window.PRECOS = D.precos.PRECOS;
    renderTab();
    renderPub();
  }

  // ---------- Ligação entre campos e dados ----------
  //  data-f="arquivo.VAR.indice.campo"   data-t = num | pct | bool | lines (padrão: texto)
  const getPath = (p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), D);
  function setPath(p, v) {
    const ks = p.split("."), last = ks.pop();
    ks.reduce((o, k) => o[k], D)[last] = v;
  }
  function lerCampo(el) {
    const t = el.dataset.t, n = parseFloat(String(el.value).replace(",", "."));
    if (t === "bool") return el.checked;
    if (t === "num") return isNaN(n) ? 0 : n;
    if (t === "pct") return isNaN(n) ? 0 : Math.round(n * 1e4) / 1e6;
    if (t === "lines") return el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    return el.value;
  }
  function valCampo(p, t) {
    const v = getPath(p);
    if (t === "pct") return v == null ? "" : +(v * 100).toFixed(2);
    if (t === "lines") return (v || []).join("\n");
    return v == null ? "" : v;
  }
  const E = U.esc;
  const inp = (p, o) => {
    o = o || {};
    return '<input type="' + (o.type || "text") + '" data-f="' + E(p) + '"' + (o.t ? ' data-t="' + o.t + '"' : "") +
      ' value="' + E(valCampo(p, o.t)) + '" ' + (o.attrs || "") + ">";
  };
  const num = (p, attrs) => inp(p, { type: "number", t: "num", attrs: 'step="any" inputmode="decimal" ' + (attrs || "") });
  const comUnidade = (ctrl, u) => '<span class="unit">' + ctrl + "<i>" + u + "</i></span>";
  const pct = (p) => comUnidade(inp(p, { type: "number", t: "pct", attrs: 'step="any" inputmode="decimal"' }), "%");
  const chk = (p, label) => '<label class="toggle"><input type="checkbox" data-f="' + E(p) + '" data-t="bool"' + (getPath(p) ? " checked" : "") + "><span>" + label + "</span></label>";
  const sel = (p, opts) => '<select data-f="' + E(p) + '">' + opts.map((o) => '<option value="' + E(o[0]) + '"' + (getPath(p) === o[0] ? " selected" : "") + ">" + E(o[1]) + "</option>").join("") + "</select>";
  const area = (p, t, attrs) => '<textarea data-f="' + E(p) + '"' + (t ? ' data-t="' + t + '"' : "") + " " + (attrs || "") + ">" + E(valCampo(p, t)) + "</textarea>";
  const fld = (label, ctrl, cls, help) => '<label class="fld ' + (cls || "") + '"><span>' + label + "</span>" + ctrl + (help ? "<small>" + help + "</small>" : "") + "</label>";
  const imgSrc = (path) => previews[path] || path;

  function onCampo(e) {
    const el = e.target;
    if (!el.dataset) return;
    // Caixas de materiais do modelo (lista)
    if (el.dataset.lista && e.type === "change") {
      const arr = getPath(el.dataset.lista);
      const i = arr.indexOf(el.value);
      if (el.checked && i < 0) arr.push(el.value);
      if (!el.checked && i >= 0) arr.splice(i, 1);
      return depois();
    }
    if (el.dataset.upload && e.type === "change") return enviarFoto(el);
    if (el.id === "sim-file" && e.type === "change") return simCarregar(el.files[0]);
    if (el.id === "sim-mat") { simMat = el.value; return simAtualizar(); }
    if (el.id === "sim-cliente") { simCliente = el.checked; return simAtualizar(); }
    const p = el.dataset.f;
    if (!p) return;
    const viaChange = el.type === "checkbox" || el.tagName === "SELECT" || el.type === "date";
    if ((e.type === "input") === viaChange) return;
    setPath(p, lerCampo(el));
    if (el.type === "color") {
      const row = el.closest(".fil-row");
      if (row) row.querySelector(".spool-mini").innerHTML = U.spool(el.value);
    }
    const m = /^pedidos\.PEDIDOS\.(\d+)\.(status|previsao|descricao)$/.exec(p);
    if (m) {
      D.pedidos.PEDIDOS[+m[1]].atualizado = hoje();
      if (m[2] === "status") renderTab();
    }
    if (/^filamentos\.FILAMENTOS\.\d+\.(emEstoque|material)$/.test(p)) renderTab();
    depois();
  }
  function depois() {
    renderPub();
    if (tab === "precos") simAtualizar();
  }

  async function reduzirFoto(file, max) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  }
  async function enviarFoto(el) {
    const f = el.files[0];
    if (!f) return;
    try {
      const blob = await reduzirFoto(f, 1400);
      const path = el.dataset.dir + "/" + el.dataset.nome + "-" + Date.now().toString(36) + ".jpg";
      uploads.push({ path, blob });
      previews[path] = URL.createObjectURL(blob);
      setPath(el.dataset.upload, path);
      renderTab();
      depois();
    } catch (e) {
      toast("Não consegui abrir essa imagem. Use JPG ou PNG.", true);
    }
  }

  // ---------- Ações (botões) ----------
  const ACOES = {
    tab: (b) => { tab = b.dataset.v; renderTabs(); renderTab(); window.scrollTo(0, 0); },
    sair: () => {
      if (alterados().length && !confirm("Há alterações não publicadas. Sair mesmo assim?")) return;
      lsSet("ita-admin-token", null); ssSet("ita-admin-token", null); lsSet("ita-admin-modo", null);
      backend = null; renderConectar();
    },
    publicar, descartar,

    // Pedidos
    "novo-pedido": () => {
      const desc = $("#novo-desc").value.trim();
      if (!desc) { $("#novo-desc").focus(); return toast("Escreva uma descrição para o pedido.", true); }
      const p = { codigo: novoCodigo(), descricao: desc, status: "fila", criado: hoje(), atualizado: hoje() };
      const prev = $("#novo-prev").value;
      if (prev) p.previsao = prev;
      D.pedidos.PEDIDOS.push(p);
      filtroPed = "ativos";
      renderTab(); depois();
      copiar(msgCliente(p.codigo), "Pedido " + p.codigo + " criado! Mensagem com o código e o link copiada: cole no WhatsApp do cliente. Lembre de publicar.");
    },
    "filtro-ped": (b) => { filtroPed = b.dataset.v; renderTab(); },
    copiar: (b) => copiar(b.dataset.v, "Código " + b.dataset.v + " copiado."),
    "copiar-msg": (b) => copiar(msgCliente(b.dataset.v), "Mensagem do pedido " + b.dataset.v + " copiada."),
    "del-pedido": (b) => {
      const p = D.pedidos.PEDIDOS[+b.dataset.i];
      if (confirm("Excluir o pedido " + p.codigo + "?")) { D.pedidos.PEDIDOS.splice(+b.dataset.i, 1); renderTab(); depois(); }
    },
    "limpar-antigos": () => {
      const lim = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      const antes = D.pedidos.PEDIDOS.length;
      D.pedidos.PEDIDOS = D.pedidos.PEDIDOS.filter((p) => ATIVOS.includes(p.status) || (p.atualizado || "") >= lim);
      const n = antes - D.pedidos.PEDIDOS.length;
      toast(n ? n + " pedido(s) antigo(s) removido(s)." : "Nenhum pedido finalizado há mais de 30 dias.");
      renderTab(); depois();
    },

    // Filamentos e materiais
    "add-fil": (b) => {
      const mat = b.dataset.v, cor = "Nova cor";
      const ids = new Set(D.filamentos.FILAMENTOS.map((f) => f.id));
      let id = slug(mat + "-" + cor), n = 2;
      while (ids.has(id)) id = slug(mat + "-" + cor) + "-" + n++;
      D.filamentos.FILAMENTOS.push({ id, material: mat, cor, hex: "#888888", emEstoque: true });
      renderTab(); depois();
      const rows = app.querySelectorAll('.fil-row input[data-f$=".cor"]');
      const last = Array.from(rows).find((r) => r.dataset.f === "filamentos.FILAMENTOS." + (D.filamentos.FILAMENTOS.length - 1) + ".cor");
      if (last) { last.focus(); last.select(); }
    },
    "del-fil": (b) => {
      const f = D.filamentos.FILAMENTOS[+b.dataset.i];
      if (confirm("Remover " + f.material + " " + f.cor + " da lista?")) { D.filamentos.FILAMENTOS.splice(+b.dataset.i, 1); renderTab(); depois(); }
    },
    "add-mat": () => {
      const k = ($("#novo-mat").value || "").trim().toUpperCase();
      if (!/^[A-Z0-9-]{2,20}$/.test(k)) return toast("Use só letras, números e hífen. Ex.: ABS, TPU, PETG-CF", true);
      if (D.filamentos.MATERIAIS[k]) return toast(k + " já existe.", true);
      D.filamentos.MATERIAIS[k] = { nome: k, disponivel: false, descricao: "", indicado: "", pontos: [] };
      normalizar(); renderTab(); depois();
    },
    "del-mat": (b) => {
      const k = b.dataset.v;
      if (confirm("Remover o material " + k + "?")) { delete D.filamentos.MATERIAIS[k]; delete D.precos.PRECOS.materiais[k]; renderTab(); depois(); }
    },

    // Modelos e carrossel
    "add-modelo": () => {
      D.modelos.MODELOS.push({ id: "modelo-" + Date.now().toString(36), nome: "Novo modelo", descricao: "", precoAPartirDe: 0, status: "imprimir", materiais: ["PLA"], foto: "" });
      renderTab(); depois();
      const all = app.querySelectorAll(".model-admin .item");
      const last = all[all.length - 1];
      if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); const i = last.querySelector('input[type="text"]'); if (i) { i.focus(); i.select(); } }
    },
    "del-modelo": (b) => {
      const m = D.modelos.MODELOS[+b.dataset.i];
      if (confirm('Remover "' + m.nome + '" do catálogo?')) { D.modelos.MODELOS.splice(+b.dataset.i, 1); renderTab(); depois(); }
    },
    "mover-modelo": (b) => mover(D.modelos.MODELOS, +b.dataset.i, +b.dataset.d),
    "add-dest": () => { D.modelos.DESTAQUES.push({ foto: "", legenda: "" }); renderTab(); depois(); },
    "del-dest": (b) => { if (confirm("Remover esta foto do carrossel?")) { D.modelos.DESTAQUES.splice(+b.dataset.i, 1); renderTab(); depois(); } },
    "mover-dest": (b) => mover(D.modelos.DESTAQUES, +b.dataset.i, +b.dataset.d)
  };
  function mover(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    renderTab(); depois();
  }
  // Link direto para a página "Meu pedido" (funciona quando o painel está aberto no site publicado)
  function linkPedido(c) {
    if (!/^https?:$/.test(location.protocol)) return "";
    return location.href.replace(/admin\.html.*$/, "").replace(/[?#].*$/, "") + "pedido.html?c=" + encodeURIComponent(c);
  }
  function msgCliente(c) {
    const l = linkPedido(c);
    return "Seu pedido na " + (D.config.CONFIG.nomeLoja || "Ita 3D") + " foi confirmado! Código: *" + c + "*" +
      (l ? "\nAcompanhe o andamento aqui: " + l : "\nAcompanhe na página \"Meu pedido\" do nosso site.");
  }
  function copiar(txt, msg) {
    const ok = () => toast(msg);
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => toast("Código: " + txt));
    else toast("Código: " + txt);
  }

  // ---------- Abas ----------
  const TABS = [["pedidos", "Pedidos"], ["filamentos", "Filamentos"], ["modelos", "Modelos"], ["precos", "Preços"], ["loja", "Loja"]];

  function abaPedidos() {
    const P = D.pedidos.PEDIDOS;
    const c = (s) => P.filter((p) => p.status === s).length;
    const lista = P.map((p, i) => ({ p, i })).reverse().filter(({ p }) => filtroPed === "todos" || ATIVOS.includes(p.status));
    const fmt = (d) => (d ? U.fmtDate(d) : "–");
    return '<div class="stats-row">' +
        '<div class="stat"><div class="num">' + c("fila") + '</div><div class="lbl">na fila</div></div>' +
        '<div class="stat hl"><div class="num">' + c("imprimindo") + '</div><div class="lbl">imprimindo</div></div>' +
        '<div class="stat"><div class="num">' + c("pronto") + '</div><div class="lbl">prontos p/ retirar</div></div>' +
      "</div>" +
      '<section class="card"><h2>Novo pedido</h2>' +
        '<p class="hint">Os pedidos ficam públicos (o cliente vai consultar pelo código). <strong>Não escreva nome, telefone ou endereço</strong>: só o que vai ser impresso.</p>' +
        '<div class="form-grid">' +
          '<label class="fld full"><span>Descrição</span><input type="text" id="novo-desc" maxlength="120" placeholder="Ex.: Suporte de celular, PLA preto, 2 unidades"></label>' +
          '<label class="fld"><span>Previsão de entrega (opcional)</span><input type="date" id="novo-prev"></label>' +
          '<div class="fld"><button type="button" class="btn btn-primary" data-a="novo-pedido">Criar pedido e copiar mensagem</button></div>' +
        "</div></section>" +
      '<section class="card"><div class="card-head"><h2>Pedidos</h2>' +
        '<div class="seg"><button type="button" data-a="filtro-ped" data-v="ativos" aria-pressed="' + (filtroPed === "ativos") + '">Em andamento</button>' +
        '<button type="button" data-a="filtro-ped" data-v="todos" aria-pressed="' + (filtroPed === "todos") + '">Todos (' + P.length + ")</button></div></div>" +
        '<div class="items">' + (lista.length ? lista.map(({ p, i }) => {
          const b = "pedidos.PEDIDOS." + i;
          return '<div class="item pedido st-' + E(p.status) + '">' +
            '<div class="item-head"><button type="button" class="code" data-a="copiar" data-v="' + E(p.codigo) + '" title="Copiar código">' + E(p.codigo) + "</button>" +
            '<div class="grow">' + inp(b + ".descricao", { attrs: 'maxlength="120" aria-label="Descrição"' }) + "</div>" +
            '<button type="button" class="icon-btn" data-a="copiar-msg" data-v="' + E(p.codigo) + '" title="Mensagem com código e link para o cliente">Copiar mensagem</button>' +
            '<button type="button" class="icon-btn danger" data-a="del-pedido" data-i="' + i + '">Excluir</button></div>' +
            '<div class="form-grid">' + fld("Situação", sel(b + ".status", STATUS)) + fld("Previsão de entrega", inp(b + ".previsao", { type: "date" })) +
            '<div class="fld"><span class="meta">Criado em ' + fmt(p.criado) + "<br>Atualizado em " + fmt(p.atualizado) + "</span></div></div></div>";
        }).join("") : '<div class="empty">' + (filtroPed === "ativos" ? "Nenhum pedido em andamento." : "Nenhum pedido ainda.") + "</div>") + "</div>" +
        '<div class="btn-row" style="margin-top:14px"><button type="button" class="icon-btn" data-a="limpar-antigos">Remover entregues/cancelados há mais de 30 dias</button></div>' +
      "</section>" +
      '<section class="card"><h2>Fila na página inicial</h2>' +
        '<p class="hint">O número de pedidos na fila é contado automaticamente (na fila + imprimindo). Aqui você escreve o prazo que aparece para quem vai pedir agora.</p>' +
        '<div class="form-grid">' + fld("Prazo estimado para um pedido novo", inp("config.CONFIG.fila.prazo", { attrs: 'placeholder="Ex.: 2 a 4 dias"' })) + "</div></section>";
  }

  function abaFilamentos() {
    const M = D.filamentos.MATERIAIS, F = D.filamentos.FILAMENTOS;
    const matOpts = Object.keys(M).map((k) => [k, M[k].nome || k]);
    const grupos = Object.keys(M).map((k) => {
      const itens = F.map((f, i) => ({ f, i })).filter(({ f }) => f.material === k);
      const emEst = itens.filter(({ f }) => f.emEstoque).length;
      return '<div class="group-title"><span>' + E(M[k].nome || k) + ' <span class="meta">· ' + emEst + " em estoque</span></span>" +
        '<button type="button" class="icon-btn" data-a="add-fil" data-v="' + E(k) + '">+ Adicionar cor</button></div>' +
        '<div class="items">' + (itens.length ? itens.map(({ f, i }) => {
          const b = "filamentos.FILAMENTOS." + i;
          return '<div class="fil-row' + (f.emEstoque ? "" : " out") + '">' +
            '<span class="spool-mini" style="width:36px;height:36px;display:block">' + U.spool(f.hex) + "</span>" +
            inp(b + ".cor", { attrs: 'aria-label="Nome da cor"' }) +
            '<span class="unit">' + inp(b + ".hex", { type: "color", attrs: 'aria-label="Cor"' }) + "</span>" +
            chk(b + ".emEstoque", "Em estoque") +
            '<span class="wide">' + inp(b + ".obs", { attrs: 'placeholder="Observação (opcional)" aria-label="Observação"' }) + "</span>" +
            '<span class="btn-row">' + sel(b + ".material", matOpts) +
            '<button type="button" class="icon-btn danger" data-a="del-fil" data-i="' + i + '">Remover</button></span></div>';
        }).join("") : '<div class="empty">Nenhuma cor de ' + E(k) + ".</div>") + "</div>";
    }).join("");

    const mats = Object.keys(M).map((k) => {
      const b = "filamentos.MATERIAIS." + k, usado = F.some((f) => f.material === k);
      return '<div class="item"><div class="item-head"><strong>' + E(k) + "</strong>" + chk(b + ".disponivel", "Disponível (desligado = “em breve”)") +
        '<span class="grow"></span><button type="button" class="icon-btn danger" data-a="del-mat" data-v="' + E(k) + '"' +
        (usado ? ' disabled title="Remova as cores deste material antes"' : "") + ">Remover</button></div>" +
        '<div class="form-grid">' + fld("Nome exibido", inp(b + ".nome")) + fld("Indicado para", inp(b + ".indicado"), "full") +
        fld("Descrição", area(b + ".descricao"), "full") + fld("Pontos (um por linha)", area(b + ".pontos", "lines"), "full") + "</div></div>";
    }).join("");

    return '<section class="card"><h2>Cores em estoque</h2><p class="hint">Desligue “Em estoque” quando acabar: a cor some do pedido e aparece apagada na página inicial.</p>' + grupos + "</section>" +
      '<section class="card"><h2>Materiais</h2><p class="hint">Textos mostrados no pedido e na página de informações. O preço de cada material fica na aba Preços.</p>' +
      '<div class="items">' + mats + "</div>" +
      '<div class="form-grid" style="margin-top:14px"><label class="fld"><span>Novo material</span><input type="text" id="novo-mat" placeholder="Ex.: TPU" maxlength="20"></label>' +
      '<div class="fld"><button type="button" class="btn btn-ghost" data-a="add-mat">Adicionar material</button></div></div></section>';
  }

  function abaModelos() {
    const M = D.modelos.MODELOS, mats = Object.keys(D.filamentos.MATERIAIS), DS = D.modelos.DESTAQUES;
    const cards = M.map((m, i) => {
      const b = "modelos.MODELOS." + i;
      return '<div class="item"><div class="thumb-edit">' + U.img(imgSrc(m.foto), m.nome) +
        '<label class="file-btn">Trocar foto<input type="file" accept="image/*" data-upload="' + b + '.foto" data-dir="images/modelos" data-nome="' + E(slug(m.id)) + '"></label></div>' +
        fld("Nome", inp(b + ".nome")) + fld("Descrição", area(b + ".descricao", "", 'rows="2"')) +
        '<div class="form-grid">' + fld("A partir de", comUnidade(num(b + ".precoAPartirDe", 'min="0"'), "R$")) +
        fld("Situação", sel(b + ".status", [["estoque", "Em estoque"], ["imprimir", "Para imprimir"]])) + "</div>" +
        '<div class="fld"><span>Materiais permitidos</span><div class="checks">' + mats.map((k) =>
          '<label><input type="checkbox" data-lista="' + b + '.materiais" value="' + E(k) + '"' + ((m.materiais || []).includes(k) ? " checked" : "") + ">" + E(k) + "</label>").join("") + "</div></div>" +
        '<div class="btn-row"><button type="button" class="icon-btn" data-a="mover-modelo" data-i="' + i + '" data-d="-1"' + (i ? "" : " disabled") + ">← Antes</button>" +
        '<button type="button" class="icon-btn" data-a="mover-modelo" data-i="' + i + '" data-d="1"' + (i < M.length - 1 ? "" : " disabled") + ">Depois →</button>" +
        '<span class="grow"></span><button type="button" class="icon-btn danger" data-a="del-modelo" data-i="' + i + '">Remover</button></div></div>';
    }).join("");
    const dest = DS.map((d, i) => {
      const b = "modelos.DESTAQUES." + i;
      return '<div class="item dest-row"><div class="thumb-edit">' + U.img(imgSrc(d.foto), d.legenda || "Foto") +
        '<label class="file-btn">Foto<input type="file" accept="image/*" data-upload="' + b + '.foto" data-dir="images/impressoes" data-nome="destaque"></label></div>' +
        fld("Legenda", inp(b + ".legenda", { attrs: 'maxlength="60"' })) +
        '<div class="btn-row"><button type="button" class="icon-btn" data-a="mover-dest" data-i="' + i + '" data-d="-1"' + (i ? "" : " disabled") + ">↑</button>" +
        '<button type="button" class="icon-btn" data-a="mover-dest" data-i="' + i + '" data-d="1"' + (i < DS.length - 1 ? "" : " disabled") + ">↓</button>" +
        '<button type="button" class="icon-btn danger" data-a="del-dest" data-i="' + i + '">Remover</button></div></div>';
    }).join("");
    return '<section class="card"><div class="card-head"><h2>Catálogo (' + M.length + ')</h2><button type="button" class="btn btn-primary btn-sm" data-a="add-modelo">+ Novo modelo</button></div>' +
      '<p class="hint">As fotos são reduzidas automaticamente antes de enviar. Lembre: só venda modelos seus ou com licença comercial.</p>' +
      '<div class="model-admin">' + (cards || '<div class="empty">Nenhum modelo.</div>') + "</div></section>" +
      '<section class="card"><div class="card-head"><h2>Carrossel da página inicial</h2><button type="button" class="btn btn-ghost btn-sm" data-a="add-dest">+ Adicionar foto</button></div>' +
      '<div class="items">' + (dest || '<div class="empty">Nenhuma foto.</div>') + "</div></section>";
  }

  function abaPrecos() {
    const b = "precos.PRECOS", P = D.precos.PRECOS, mats = Object.keys(P.materiais || {});
    const linhaMat = mats.map((k) => "<tr><th>" + E(k) + "</th><td>" + comUnidade(num(b + ".materiais." + k + ".precoKg", 'min="0"'), "R$/kg") +
      "</td><td>" + comUnidade(num(b + ".materiais." + k + ".densidade", 'min="0"'), "g/cm³") +
      "</td><td>" + comUnidade(num(b + ".materiais." + k + ".fatorVelocidade", 'min="0.1"'), "× PLA") + "</td></tr>").join("");
    const linhaRes = RES.map(([k, n]) => "<tr><th>" + n + "</th><td>" + comUnidade(num(b + ".camadas." + k, 'min="0.04"'), "mm") +
      "</td><td>" + comUnidade(num(b + ".fluxo." + k, 'min="0.5"'), "mm³/s") + "</td></tr>").join("");
    const linhaQual = QUAL.map(([k, n]) => "<tr><th>" + n + "</th><td>" + comUnidade(num(b + ".qualidade." + k + ".paredes", 'min="1" step="1"'), "paredes") +
      "</td><td>" + pct(b + ".qualidade." + k + ".preenchimento") + "</td></tr>").join("");
    const matSel = Object.keys(P.materiais || {}).map((k) => '<option value="' + E(k) + '"' + (k === simMat ? " selected" : "") + ">" + E(k) + "</option>").join("");
    return '<section class="card"><h2>Simulador</h2>' +
        '<p class="hint">Carregue um STL que você já fatiou no Bambu Studio e compare. Os valores mudam na hora enquanto você ajusta os campos abaixo.</p>' +
        '<div class="sim"><div class="sim-drop"><div class="viewer" id="sim-viewer"><div class="viewer-msg" id="sim-msg">' + (simStats ? "Carregue de novo para ver em 3D" : "Nenhum arquivo") + "</div></div>" +
        '<input type="file" id="sim-file" accept=".stl,.3mf,.obj"><label class="fld"><span>Material</span><select id="sim-mat">' + matSel + "</select></label>" +
          '<label class="toggle"><input type="checkbox" id="sim-cliente"' + (simCliente ? " checked" : "") + '><span>Visão para o cliente (esconde custo e lucro, para tirar print)</span></label></div>' +
        '<div id="sim-out"><div class="empty">Escolha um arquivo STL, 3MF ou OBJ.</div></div></div></section>' +
      '<section class="card"><h2>Preço</h2><div class="form-grid">' +
        fld("Hora de máquina", comUnidade(num(b + ".precoHora", 'min="0"'), "R$/h"), "", "Energia, desgaste, bico, mesa") +
        fld("Margem", comUnidade(num(b + ".margem", 'min="1"'), "×"), "", "2 = cobra o dobro do custo") +
        fld("Taxa fixa por pedido", comUnidade(num(b + ".taxaFixa", 'min="0"'), "R$")) +
        fld("Preço mínimo", comUnidade(num(b + ".precoMinimo", 'min="0"'), "R$")) +
        fld("Faixa: de", pct(b + ".faixa.0"), "", "do valor calculado") +
        fld("Faixa: até", pct(b + ".faixa.1")) +
        fld("Adicional multicor", pct(b + ".multicor.adicional")) +
      "</div></section>" +
      '<section class="card"><h2>Filamento</h2><div class="tbl"><table><thead><tr><th>Material</th><th>Preço do rolo</th><th>Densidade</th><th>Velocidade</th></tr></thead><tbody>' + linhaMat + "</tbody></table></div></section>" +
      '<section class="card"><h2>Tempo</h2><p class="hint">Se o site estima menos tempo que o Bambu Studio, diminua a velocidade (mm³/s) daquela resolução.</p>' +
        '<div class="tbl"><table><thead><tr><th>Resolução</th><th>Altura da camada</th><th>Velocidade média</th></tr></thead><tbody>' + linhaRes + "</tbody></table></div>" +
        '<div class="form-grid" style="margin-top:14px">' +
          fld("Extra por camada", comUnidade(num(b + ".segundosPorCamada", 'min="0"'), "s")) +
          fld("Aquecimento e calibração", comUnidade(num(b + ".segundosPreparo", 'min="0"'), "s")) +
          fld("Largura da linha", comUnidade(num(b + ".larguraLinha", 'min="0.1"'), "mm")) +
          fld("Suportes e extras", comUnidade(num(b + ".fatorSuporte", 'min="1"'), "×"), "", "1,1 = +10% de material") +
          fld("Tamanho da mesa", comUnidade(num(b + ".mesa", 'min="50" step="1"'), "mm")) +
        "</div></section>" +
      '<section class="card"><h2>Paredes e preenchimento</h2><div class="tbl"><table><thead><tr><th>Tipo de peça</th><th>Paredes</th><th>Preenchimento</th></tr></thead><tbody>' + linhaQual + "</tbody></table></div></section>";
  }

  function abaLoja() {
    const b = "config.CONFIG";
    return '<section class="card"><h2>Contato</h2><div class="form-grid">' +
        fld("Nome da loja", inp(b + ".nomeLoja")) +
        fld("WhatsApp", inp(b + ".whatsapp", { attrs: 'inputmode="numeric" placeholder="5531987654321"' }), "", "55 + DDD + número, só números") +
        fld("Instagram", inp(b + ".instagram", { attrs: 'placeholder="sem @ (vazio = esconde)"' })) +
        fld("E-mail", inp(b + ".email", { attrs: 'placeholder="vazio = esconde"' })) +
        fld("Cidade", inp(b + ".cidade")) +
        fld("Horário de atendimento", inp(b + ".horario")) +
        fld("Retirada / entrega", area(b + ".retirada", "", 'rows="2"'), "full") +
      "</div></section>" +
      '<section class="card"><h2>Impressora</h2><div class="form-grid">' +
        fld("Máximo de cores no multicor", num(b + ".maxCoresMulticor", 'min="2" max="16" step="1"'), "", "AMS lite: 4") +
        fld("Prazo estimado para um pedido novo", inp(b + ".fila.prazo")) +
      "</div></section>";
  }

  // ---------- Simulador ----------
  function simCarregar(file) {
    if (!file) return;
    const msg = $("#sim-msg");
    msg.hidden = false;
    msg.textContent = "Lendo o modelo…";
    window.ItaEstimativa.analisar(file, $("#sim-viewer")).then((a) => {
      simStats = a;
      simNome = file.name.replace(/\.[^.]+$/, "");
      msg.hidden = true;
      window.ItaEstimativa.setCor("#e8611a");
      simAtualizar();
    }).catch(() => { msg.textContent = "Não consegui ler este arquivo."; });
  }
  function simAtualizar() {
    const out = $("#sim-out");
    if (!out || !simStats) return;
    window.PRECOS = D.precos.PRECOS;
    const Est = window.ItaEstimativa, s = simStats.size;
    const linha = (res, fin, esboco, rotulo) => {
      const r = Est.calcular(simStats, { material: simMat, resolucao: res, finalidade: fin, esboco, multicor: false, qtd: 1, escala: 100 });
      if (!r) return "";
      if (simCliente) {
        return "<tr><th>" + rotulo + '</th><td class="num-cell">' + Math.round(r.gramas) + ' g</td><td class="num-cell">' +
          Est.fmtTempo(r.segundos) + '</td><td class="num-cell preco-cliente">' + U.brl(r.preco) + "</td></tr>";
      }
      const lucro = r.preco - r.custo;
      const pctLucro = r.preco > 0 ? Math.round((lucro / r.preco) * 100) : 0;
      return "<tr><th>" + rotulo + '</th><td class="num-cell">' + r.gramas.toFixed(1).replace(".", ",") + ' g</td><td class="num-cell">' +
        Est.fmtTempo(r.segundos) + '</td><td class="num-cell">' + U.brl(r.custo) +
        '<div class="meta">fil. ' + U.brl(r.custoFilamento) + " · máq. " + U.brl(r.custoMaquina) + "</div>" +
        '</td><td class="num-cell">' + U.brl(r.preco) + '<div class="meta">site: ' + U.brl(r.min) + " – " + U.brl(r.max) + "</div>" +
        '</td><td class="num-cell ' + (lucro >= 0 ? "lucro" : "prejuizo") + '">' + U.brl(lucro) + '<div class="meta">' + pctLucro + "% do preço</div></td></tr>";
    };
    let rows = "";
    RES.forEach(([rk, rn]) => QUAL.slice(0, 2).forEach(([qk, qn]) => { rows += linha(rk, qk, false, rn + " · " + qn); }));
    rows += linha("baixa", "ornamental", true, "Esboço");
    const medidas = s.map((x) => Math.round(x)).join(" × ") + " mm";
    if (simCliente) {
      const loja = (D.config && D.config.CONFIG && D.config.CONFIG.nomeLoja) || "Ita 3D";
      out.innerHTML = '<div class="orcamento"><div class="orc-head"><img src="images/logo/marca.svg?v=2" alt="" width="40" height="40"><div><strong>Orçamento · ' + E(loja) + "</strong>" +
        '<div class="meta">' + (simNome ? E(simNome) + " · " : "") + medidas + " · " + E(simMat) + "</div></div></div>" +
        '<div class="tbl"><table><thead><tr><th>Qualidade</th><th>Filamento</th><th>Tempo de impressão</th><th>Preço</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<p class="meta" style="margin:8px 0 0">Valores para 1 unidade. Ornamental: peça decorativa, mais leve. Funcional: paredes e preenchimento reforçados para uso. O prazo de entrega é combinado pelo WhatsApp.</p></div>';
      return;
    }
    out.innerHTML = '<p class="meta" style="margin:0 0 8px">' + s.map((x) => x.toFixed(1).replace(".", ",")).join(" × ") + " mm · " +
      (simStats.volume / 1000).toFixed(1).replace(".", ",") + " cm³ · 1 unidade, incluindo aquecimento</p>" +
      '<div class="tbl"><table><thead><tr><th>Configuração</th><th>Filamento</th><th>Tempo</th><th>Custo</th><th>Preço</th><th>Lucro</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<p class="hint" style="margin:8px 0 0">Custo de fabricação = filamento gasto + horas de máquina (energia, desgaste). Lucro = preço − custo, já com a taxa fixa e o preço mínimo.</p>';
  }

  // ---------- Renderização ----------
  function renderConectar(erro) {
    const gh = lsGet("ita-admin-gh") || {};
    const temPasta = typeof window.showDirectoryPicker === "function";
    app.innerHTML = '<div class="container connect">' +
      '<div><h1>Painel <span style="color:var(--accent)">Ita 3D</span></h1><p class="hint">Escolha onde estão os dados do site.</p></div>' +
      (erro ? '<div class="alert err">' + E(erro) + "</div>" : "") +
      '<section class="card"><h2>GitHub</h2><p class="hint">Para quando o site já estiver publicado. Funciona em qualquer aparelho, até no celular.</p>' +
        '<form id="gh-form" class="form-grid" autocomplete="off">' +
          '<label class="fld"><span>Usuário do GitHub</span><input type="text" name="owner" required value="' + E(gh.owner || "") + '"></label>' +
          '<label class="fld"><span>Repositório</span><input type="text" name="repo" required value="' + E(gh.repo || "") + '" placeholder="ita3d"></label>' +
          '<label class="fld"><span>Branch</span><input type="text" name="branch" value="' + E(gh.branch || "main") + '"></label>' +
          '<label class="fld full"><span>Token de acesso</span><input type="password" name="token" required autocomplete="off" spellcheck="false"></label>' +
          '<label class="toggle full"><input type="checkbox" name="lembrar"><span>Lembrar neste aparelho (só em aparelhos seus)</span></label>' +
          '<div class="full"><button class="btn btn-primary" type="submit">Conectar</button></div>' +
        "</form>" +
        "<details><summary>Como criar o token (uma vez só)</summary><ol>" +
          '<li>Entre no GitHub e abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained tokens → Generate new token</a>.</li>' +
          "<li>Nome: <em>Painel Ita 3D</em>. Expiração: até 1 ano (depois é só gerar outro).</li>" +
          "<li>Repository access: <strong>Only select repositories</strong> → escolha o repositório do site.</li>" +
          "<li>Permissions → Repository permissions → <strong>Contents: Read and write</strong>. Nada mais.</li>" +
          "<li>Clique em <strong>Generate token</strong>, copie e cole aqui.</li>" +
        "</ol><p class=\"hint\">Quem tiver o token pode alterar o site. Não mande para ninguém. Se vazar, apague ele no GitHub e gere outro.</p></details>" +
      "</section>" +
      '<section class="card"><h2>Pasta no computador</h2><p class="hint">Edita os arquivos direto na pasta do site. Depois é só enviar a pasta para o GitHub.' +
        (temPasta ? "" : " <strong>Este navegador não permite: use Chrome ou Edge no computador.</strong>") + "</p>" +
        '<button type="button" class="btn btn-ghost" id="pasta-btn"' + (temPasta ? "" : " disabled") + ">Escolher a pasta do site</button></section>" +
      '<section class="card"><h2>Só olhar</h2><p class="hint">Abre os dados do site sem salvar nada. Bom para conhecer o painel.</p>' +
        '<button type="button" class="btn btn-ghost" id="demo-btn">Abrir demonstração</button></section>' +
      "</div>";

    $("#gh-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const o = { owner: f.get("owner").trim(), repo: f.get("repo").trim(), branch: f.get("branch").trim() || "main", token: f.get("token").trim() };
      lsSet("ita-admin-gh", { owner: o.owner, repo: o.repo, branch: o.branch });
      if (f.get("lembrar")) lsSet("ita-admin-token", o.token); else ssSet("ita-admin-token", o.token);
      conectar(githubBackend(o), "github");
    });
    $("#pasta-btn").addEventListener("click", async () => {
      try { conectar(await pastaBackend(), "pasta"); }
      catch (e) { if (e.name !== "AbortError") renderConectar(e.message); }
    });
    $("#demo-btn").addEventListener("click", () => conectar(demoBackend, "demo"));
  }

  async function conectar(b, modo) {
    app.innerHTML = '<p class="container section hint">Conectando…</p>';
    try {
      if (b.testar) await b.testar();
      backend = b;
      await carregarTudo();
      if (modo === "github") lsSet("ita-admin-modo", "github");
      renderPainel();
    } catch (e) {
      backend = null;
      if (modo === "github" && (e.status === 401 || e.status === 403)) { lsSet("ita-admin-token", null); ssSet("ita-admin-token", null); }
      renderConectar(e.status === 401 ? "Token inválido ou expirado." : (e.message || "Não foi possível conectar.") +
        (modo === "demo" && location.protocol === "file:" ? " (A demonstração só funciona com o site publicado.)" : ""));
    }
  }

  function renderPainel() {
    app.innerHTML =
      '<header class="admin-top"><div class="container admin-top-inner">' +
        '<div><div class="admin-brand">Ita <span>3D</span> · Painel</div><div class="hint">' + E(backend.nome) + "</div></div>" +
        '<div class="top-actions"><a href="index.html" target="_blank" rel="noopener">Ver site</a><button type="button" class="link-btn" data-a="sair">Sair</button></div>' +
      "</div></header>" +
      '<div class="tabs-wrap"><nav class="container tabs" role="tablist" id="tabs"></nav></div>' +
      (backend.demo ? '<div class="container" style="padding-top:16px"><div class="alert">Modo demonstração: dá para mexer em tudo, mas nada é salvo.</div></div>' : "") +
      '<main class="container admin-main" id="tab-body"></main>' +
      '<div class="publish-bar" id="pub" hidden></div>';
    renderTabs();
    renderTab();
    renderPub();
  }
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(([k, n]) =>
      '<button type="button" role="tab" data-a="tab" data-v="' + k + '" aria-selected="' + (tab === k) + '">' + n + "</button>").join("");
  }
  function renderTab() {
    const body = $("#tab-body");
    if (!body) return;
    body.innerHTML = { pedidos: abaPedidos, filamentos: abaFilamentos, modelos: abaModelos, precos: abaPrecos, loja: abaLoja }[tab]();
    if (tab === "precos") simAtualizar();
  }
  function renderPub(estado) {
    const el = $("#pub");
    if (!el) return;
    const f = alterados(), n = f.length + uploads.length;
    el.hidden = !n && !estado;
    if (el.hidden) { el.innerHTML = ""; return; }
    const partes = f.map((id) => FILES[id].titulo);
    if (uploads.length) partes.push(uploads.length + (uploads.length > 1 ? " fotos" : " foto"));
    el.innerHTML = '<div class="container pub-inner"><span class="txt">' +
      (estado ? "<strong>" + estado + "</strong>" : "<strong>Não publicado:</strong> " + E(partes.join(", "))) + "</span>" +
      '<span class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-a="descartar"' + (estado ? " disabled" : "") + ">Descartar</button>" +
      '<button type="button" class="btn btn-primary btn-sm" data-a="publicar"' + (estado ? " disabled" : "") + ">" +
      (backend.demo ? "Publicar (demonstração)" : backend.remoto ? "Publicar no site" : "Salvar na pasta") + "</button></span></div>";
  }

  // ---------- Eventos globais ----------
  app.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (b && !b.disabled && ACOES[b.dataset.a]) ACOES[b.dataset.a](b);
  });
  app.addEventListener("input", onCampo);
  app.addEventListener("change", onCampo);
  app.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "novo-desc") ACOES["novo-pedido"]();
    if (e.key === "Enter" && e.target.id === "novo-mat") ACOES["add-mat"]();
  });
  window.addEventListener("beforeunload", (e) => {
    if (backend && (alterados().length || uploads.length)) { e.preventDefault(); e.returnValue = ""; }
  });

  // Para testes: permite trocar o backend pelo console
  window.ItaAdmin = { conectar, githubBackend, get dados() { return D; }, serialize };

  // ---------- Início ----------
  const gh = lsGet("ita-admin-gh"), token = lsGet("ita-admin-token") || ssGet("ita-admin-token");
  if (lsGet("ita-admin-modo") === "github" && gh && token) conectar(githubBackend(Object.assign({}, gh, { token })), "github");
  else renderConectar();
})();
