// Página "Enviar": monta o pedido e abre o WhatsApp com a mensagem pronta.
(function () {
  const U = window.Ita, C = window.CONFIG || {}, E = window.ItaEstimativa;
  const MAT = window.MATERIAIS || {}, FIL = window.FILAMENTOS || [], MOD = window.MODELOS || [];
  const MAX = C.maxCoresMulticor || 4;
  const $ = (s) => document.querySelector(s);

  // Ajuste os textos de qualidade aqui, se quiser.
  const RES = {
    alta:  { nome: "Alta",  camada: "0,12 mm", desc: "Detalhes finos e superfície mais lisa. Demora mais para imprimir." },
    media: { nome: "Média", camada: "0,20 mm", desc: "Equilíbrio entre qualidade e tempo. Serve para a maioria das peças." },
    baixa: { nome: "Baixa", camada: "0,28 mm", desc: "Camadas mais visíveis. Impressão mais rápida e mais barata." }
  };
  const FIN = {
    ornamental: { nome: "Peça ornamental", desc: "Preenchimento leve (cerca de 10–15%). Para decoração, miniaturas e protótipos visuais." },
    funcional:  { nome: "Peça funcional",  desc: "Mais paredes e preenchimento (cerca de 30–40%). Para suportes, encaixes e peças que sofrem esforço." }
  };
  const ESBOCO = "camada grossa e pouco preenchimento, só para ver formato, tamanho e encaixe.";
  const EXT_OK = ["stl", "3mf", "obj", "step", "stp"];

  const st = {
    origem: null, arquivo: null, modeloId: "",
    material: null, modo: "unica", cor: null, cores: [],
    resolucao: "media", finalidade: "ornamental", esboco: false,
    qtd: 1, nome: "", obs: "",
    escala: 100, analise: null
  };
  const fmtNum = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const brl0 = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const stockOf = (m) => FIL.filter((f) => f.material === m && f.emEstoque);
  const fil = (id) => FIL.find((f) => f.id === id);
  const modelo = () => MOD.find((m) => m.id === st.modeloId);
  const allowedMats = () => {
    const m = st.origem === "modelo" && modelo();
    return m && m.materiais && m.materiais.length ? m.materiais : null;
  };
  const matUsable = (k) => MAT[k].disponivel && stockOf(k).length > 0 && (!allowedMats() || allowedMats().includes(k));
  const setPressed = (box, attr, val) =>
    box.querySelectorAll("[" + attr + "]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === val)));
  const fmtSize = (b) => (b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB");

  // ---------- 1. Origem ----------
  $("#origem").addEventListener("click", (e) => {
    const b = e.target.closest("[data-origem]");
    if (b) setOrigem(b.dataset.origem);
  });
  function setOrigem(o) {
    st.origem = o;
    setPressed($("#origem"), "data-origem", o);
    ["arquivo", "modelo", "ideia"].forEach((k) => ($("#origem-" + k).hidden = k !== o));
    ensureMaterial();
    renderAll();
  }

  const inp = $("#arquivo"), dz = $("#dropzone");
  inp.addEventListener("change", () => setArquivo(inp.files[0]));
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) setArquivo(f); });

  function setArquivo(f) {
    st.arquivo = f ? { nome: f.name, tamanho: f.size } : null;
    const a = st.arquivo;
    $("#arquivo-nome").textContent = a ? a.nome + " (" + fmtSize(a.tamanho) + ")" : "Clique para escolher o arquivo";
    dz.classList.toggle("has-file", !!a);
    const ext = a ? a.nome.split(".").pop().toLowerCase() : "";
    $("#arquivo-aviso").textContent = a && !EXT_OK.includes(ext)
      ? "Formato incomum. Trabalhamos melhor com STL, 3MF, OBJ ou STEP, mas pode mandar que a gente olha." : "";
    analisarArquivo(f, ext);
    renderResumo();
  }

  // ---------- Estimativa automática (v2) ----------
  let analiseToken = 0;
  function analisarArquivo(f, ext) {
    const token = ++analiseToken;
    st.analise = null;
    st.escala = 100;
    $("#escala").value = 100;
    $("#dims").innerHTML = "";
    $("#analise-aviso").textContent = "";
    const box = $("#analise"), msg = $("#viewer-msg");
    if (!f || !E) { box.hidden = true; return; }
    if (!E.suportado(ext)) {
      box.hidden = true;
      if (ext === "step" || ext === "stp") {
        $("#arquivo-aviso").textContent = "Arquivos STEP não têm estimativa automática no site, mas pode enviar: orçamos pelo WhatsApp.";
      }
      return;
    }
    box.hidden = false;
    msg.hidden = false;
    msg.textContent = "Lendo o modelo…";
    E.analisar(f, $("#viewer")).then((a) => {
      if (token !== analiseToken) return;
      st.analise = a;
      msg.hidden = true;
      atualizarCorViewer();
      renderAnalise();
      renderResumo();
    }).catch((err) => {
      if (token !== analiseToken) return;
      msg.hidden = false;
      msg.textContent = err.code === "cdn" ? "Não foi possível carregar o visualizador 3D. Verifique sua internet."
        : err.code === "grande" ? "Arquivo grande demais para analisar no navegador."
        : "Não conseguimos ler este arquivo.";
      $("#analise-aviso").textContent = "Sem estimativa automática para este arquivo, mas você pode enviar o pedido normalmente: orçamos pelo WhatsApp." +
        (ext === "3mf" ? " Dica: exportar como STL costuma resolver." : "");
      renderResumo();
    });
  }

  function dimsAtuais() {
    const s = st.escala / 100;
    return st.analise.size.map((x) => x * s);
  }
  function renderAnalise() {
    const a = st.analise;
    if (!a) return;
    const s = st.escala / 100, d = dimsAtuais();
    $("#dims").innerHTML =
      '<span class="dim-chip">' + d.map(fmtNum).join(" × ") + " mm</span>" +
      '<span class="dim-chip">' + fmtNum((a.volume * s * s * s) / 1000) + " cm³</span>";
    const avisos = [], mesa = E.mesa();
    if (d.some((x) => x > mesa)) avisos.push("A peça passa de " + mesa + " mm, o máximo da impressora. Dá para reduzir a escala ou dividir em partes: combinamos no WhatsApp.");
    if (Math.max.apply(null, d) < 5) avisos.push("A peça ficou muito pequena (menos de 5 mm). O arquivo pode estar em metros ou polegadas: ajuste a escala ou confirme no WhatsApp.");
    if (a.malhaSuspeita) avisos.push("O modelo parece ter falhas na malha, então a estimativa pode variar.");
    $("#analise-aviso").textContent = avisos.join(" ");
    E.setEscala(s);
  }
  $("#escala").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    st.escala = v > 0 ? Math.min(v, 10000) : 100;
    renderAnalise();
    renderResumo();
  });

  function atualizarCorViewer() {
    if (!E || !st.analise) return;
    const f = fil(st.modo === "unica" ? st.cor : st.cores[0]);
    if (f) E.setCor(U.safeHex(f.hex));
  }

  function estimativa() {
    if (!E || st.origem !== "arquivo" || !st.analise || !st.material || !(st.qtd >= 1)) return null;
    return E.calcular(st.analise, {
      material: st.material, resolucao: st.resolucao, finalidade: st.finalidade,
      esboco: st.esboco, multicor: st.modo === "multi", qtd: st.qtd, escala: st.escala
    });
  }

  const ms = $("#modelo-select");
  ms.innerHTML = '<option value="">Selecione um modelo…</option>' + MOD.map((m) =>
    '<option value="' + U.esc(m.id) + '">' + U.esc(m.nome) + " — a partir de " + U.brl(m.precoAPartirDe) + "</option>").join("");
  ms.addEventListener("change", () => { st.modeloId = ms.value; ensureMaterial(); renderAll(); });

  function renderModeloCard() {
    const m = modelo();
    $("#modelo-card").innerHTML = m
      ? '<div class="mini-model">' + U.img(m.foto, m.nome) + "<div><strong>" + U.esc(m.nome) + "</strong><br>" +
        '<span class="hint">' + U.esc(m.descricao || "") + "</span><br>" +
        '<span class="hint">a partir de</span> <strong>' + U.brl(m.precoAPartirDe) + "</strong></div></div>"
      : "";
  }

  // ---------- 2. Material ----------
  function ensureMaterial() {
    if (!st.material || !matUsable(st.material)) {
      st.material = Object.keys(MAT).find(matUsable) || null;
      st.cor = null; st.cores = [];
    }
  }
  function renderMateriais() {
    const allowed = allowedMats();
    $("#materiais").innerHTML = Object.keys(MAT).map((k) => {
      const m = MAT[k], n = stockOf(k).length;
      const sub = !m.disponivel ? "em breve"
        : !n ? "sem estoque"
        : allowed && !allowed.includes(k) ? "não p/ este modelo"
        : n + (n === 1 ? " cor" : " cores");
      return '<button type="button" class="opt" data-mat="' + U.esc(k) + '" aria-pressed="' + (st.material === k) + '"' +
        (matUsable(k) ? "" : " disabled") + ">" + U.esc(m.nome || k) + "<small>" + sub + "</small></button>";
    }).join("");
    const m = MAT[st.material];
    $("#mat-info").innerHTML = m
      ? "<p><strong>" + U.esc(m.nome) + ":</strong> " + U.esc(m.descricao) + "</p>" +
        (m.pontos && m.pontos.length ? "<ul>" + m.pontos.map((p) => "<li>" + U.esc(p) + "</li>").join("") + "</ul>" : "")
      : "<p>Nenhum material disponível no momento. Fale com a gente pelo WhatsApp.</p>";
  }
  $("#materiais").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mat]");
    if (!b || b.disabled) return;
    if (st.material !== b.dataset.mat) { st.material = b.dataset.mat; st.cor = null; st.cores = []; }
    renderAll();
  });

  // ---------- 3. Cor ----------
  $("#multi-max").textContent = "até " + MAX + " cores";
  $("#modo-cor").addEventListener("click", (e) => {
    const b = e.target.closest("[data-modo]");
    if (b) { st.modo = b.dataset.modo; renderCores(); renderResumo(); }
  });
  function renderCores() {
    setPressed($("#modo-cor"), "data-modo", st.modo);
    const area = $("#cor-area");
    const list = stockOf(st.material);
    if (!list.length) { area.innerHTML = ""; return; }

    if (st.modo === "unica") {
      if (!st.cor || !list.some((f) => f.id === st.cor)) st.cor = list[0].id;
      const f = fil(st.cor);
      area.innerHTML = '<div class="color-row"><div class="preview">' + U.filVisual(f) + "</div>" +
        '<div class="grow"><label class="lbl" for="cor-select">Filamento</label><select id="cor-select">' +
        list.map((x) => '<option value="' + U.esc(x.id) + '"' + (x.id === st.cor ? " selected" : "") + ">" +
          U.esc(x.material + " " + x.cor) + "</option>").join("") +
        "</select>" + (f.obs ? '<p class="hint">' + U.esc(f.obs) + "</p>" : "") + "</div></div>";
      $("#cor-select").addEventListener("change", (e) => { st.cor = e.target.value; renderCores(); renderResumo(); });
    } else {
      st.cores = st.cores.filter((id) => list.some((f) => f.id === id));
      area.innerHTML = '<p class="hint" style="margin:14px 0 0">Escolha de 2 a ' + MAX + " cores (" + st.cores.length + "/" + MAX +
        "). Nas observações, diga qual parte vai em cada cor.</p>" +
        '<div class="color-chips">' + list.map((x) => {
          const on = st.cores.includes(x.id), dis = !on && st.cores.length >= MAX;
          return '<button type="button" class="cchip" data-cor="' + U.esc(x.id) + '" aria-pressed="' + on + '"' + (dis ? " disabled" : "") +
            '><span class="dot" style="background:' + U.safeHex(x.hex) + '"></span>' + U.esc(x.cor) + "</button>";
        }).join("") + "</div>" +
        '<div class="preview multi">' + st.cores.map((id) => U.spool(fil(id).hex)).join("") + "</div>";
      area.querySelectorAll("[data-cor]").forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.cor;
        st.cores = st.cores.includes(id) ? st.cores.filter((x) => x !== id) : st.cores.concat(id);
        renderCores(); renderResumo();
      }));
    }
    atualizarCorViewer();
  }

  // ---------- 4. Qualidade ----------
  function renderQualidade() {
    const resAtual = st.esboco ? "baixa" : st.resolucao;
    $("#resolucao").innerHTML = Object.keys(RES).map((k) =>
      '<button type="button" class="opt" data-res="' + k + '" aria-pressed="' + (resAtual === k) + '"' + (st.esboco ? " disabled" : "") + ">" +
      RES[k].nome + "<small>" + RES[k].camada + "</small></button>").join("");
    $("#finalidade").innerHTML = Object.keys(FIN).map((k) =>
      '<button type="button" class="opt" data-fin="' + k + '" aria-pressed="' + (st.finalidade === k) + '">' + FIN[k].nome + "</button>").join("");
    const r = RES[resAtual], f = FIN[st.finalidade];
    $("#qual-info").innerHTML = (st.esboco
      ? "<p><strong>Esboço rápido:</strong> " + ESBOCO + "</p>"
      : "<p><strong>Resolução " + r.nome + " (" + r.camada + "):</strong> " + r.desc + "</p>") +
      '<p style="margin-top:6px"><strong>' + f.nome + ":</strong> " + f.desc + "</p>";
  }
  $("#resolucao").addEventListener("click", (e) => {
    const b = e.target.closest("[data-res]");
    if (b && !b.disabled) { st.resolucao = b.dataset.res; renderQualidade(); renderResumo(); }
  });
  $("#finalidade").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fin]");
    if (b) { st.finalidade = b.dataset.fin; renderQualidade(); renderResumo(); }
  });
  $("#esboco").addEventListener("change", (e) => { st.esboco = e.target.checked; renderQualidade(); renderResumo(); });

  // ---------- 5. Detalhes ----------
  $("#qtd").addEventListener("input", (e) => { st.qtd = parseInt(e.target.value, 10) || 0; renderResumo(); });
  $("#nome").addEventListener("input", (e) => { st.nome = e.target.value; });
  $("#obs").addEventListener("input", (e) => { st.obs = e.target.value; });

  // ---------- Resumo e envio ----------
  function origemTxt() {
    if (st.origem === "arquivo") return st.arquivo ? st.arquivo.nome : "Arquivo (não escolhido)";
    if (st.origem === "modelo") return modelo() ? modelo().nome : "Modelo (não escolhido)";
    if (st.origem === "ideia") return "Só a ideia";
    return "—";
  }
  function corTxt() {
    if (st.modo === "unica") { const f = fil(st.cor); return f ? f.cor : "—"; }
    return st.cores.length ? st.cores.map((id) => fil(id).cor).join(", ") : "—";
  }
  function resTxt() {
    return st.esboco ? "Esboço rápido" : RES[st.resolucao].nome + " (" + RES[st.resolucao].camada + ")";
  }
  function renderResumo() {
    const rows = [
      ["Pedido", origemTxt()],
      ["Material", st.material ? MAT[st.material].nome || st.material : "—"],
      [st.modo === "multi" ? "Cores" : "Cor", corTxt()],
      ["Resolução", resTxt()],
      ["Tipo", FIN[st.finalidade].nome],
      ["Quantidade", st.qtd || "—"]
    ];
    const m = st.origem === "modelo" && modelo();
    if (m && st.qtd > 0) rows.push(["A partir de", U.brl(m.precoAPartirDe * st.qtd)]);
    $("#resumo").innerHTML = rows.map((r) => "<dt>" + r[0] + "</dt><dd>" + U.esc(r[1]) + "</dd>").join("");
    $("#erros").innerHTML = "";
    $("#aviso").hidden = true; // o pedido mudou: o aviso anterior não vale mais

    const est = estimativa();
    $("#estimativa").hidden = !est;
    $("#sem-estimativa").hidden = !!est;
    if (est) {
      $("#est-preco").textContent = brl0(est.min) + " – " + brl0(est.max);
      $("#est-peso").textContent = "≈ " + Math.max(1, Math.round(est.gramas)) + " g";
      $("#est-tempo").textContent = E.fmtTempo(est.segundos);
      $("#est-extra").textContent = est.multicor
        ? "Multicor: já inclui um adicional pelas trocas de cor. O tempo extra das trocas depende do modelo."
        : "";
    }
  }

  function validar() {
    const e = [];
    if (!st.origem) e.push("Escolha o que vamos imprimir (passo 1).");
    if (st.origem === "arquivo" && !st.arquivo) e.push("Escolha o arquivo do modelo (passo 1).");
    if (st.origem === "modelo" && !modelo()) e.push("Selecione um modelo do catálogo (passo 1).");
    if (st.origem === "ideia" && st.obs.trim().length < 10) e.push("Descreva sua ideia em Observações (passo 5).");
    if (!st.material) e.push("Escolha um material (passo 2).");
    if (st.material && st.modo === "unica" && !st.cor) e.push("Escolha uma cor (passo 3).");
    if (st.material && st.modo === "multi" && st.cores.length < 2) e.push("No multicor, escolha pelo menos 2 cores (passo 3).");
    if (!(st.qtd >= 1)) e.push("Informe a quantidade (passo 5).");
    return e;
  }

  function mensagem() {
    const L = [];
    L.push("Olá, " + (C.nomeLoja || "Ita 3D") + "! Gostaria de um orçamento de impressão 3D.");
    L.push("");
    if (st.origem === "arquivo") L.push("*Arquivo:* " + st.arquivo.nome + " (vou anexar aqui na conversa)");
    if (st.origem === "modelo") L.push("*Modelo do catálogo:* " + modelo().nome + " (a partir de " + U.brl(modelo().precoAPartirDe) + ")");
    if (st.origem === "ideia") L.push("*Pedido:* ainda não tenho o arquivo, só a ideia (vou mandar fotos/medidas)");
    L.push("*Material:* " + (MAT[st.material].nome || st.material));
    L.push(st.modo === "multi" ? "*Cores (multicor):* " + corTxt() : "*Cor:* " + corTxt());
    L.push("*Resolução:* " + (st.esboco ? "Esboço, o mais rápido possível" : resTxt()));
    L.push("*Tipo de peça:* " + FIN[st.finalidade].nome);
    L.push("*Quantidade:* " + st.qtd);
    if (st.origem === "arquivo" && st.analise) {
      L.push("*Medidas:* " + dimsAtuais().map(fmtNum).join(" × ") + " mm" + (st.escala !== 100 ? " (escala " + fmtNum(st.escala) + "%)" : ""));
    }
    const est = estimativa();
    if (est) {
      L.push("*Estimativa do site:* " + brl0(est.min) + " – " + brl0(est.max) + " · ≈ " + Math.max(1, Math.round(est.gramas)) +
        " g · " + E.fmtTempo(est.segundos) + " de máquina");
    }
    if (st.obs.trim()) L.push("*Observações:* " + st.obs.trim());
    if (st.nome.trim()) { L.push(""); L.push("Meu nome: " + st.nome.trim()); }
    return L.join("\n");
  }

  $("#enviar-btn").addEventListener("click", () => {
    const e = validar();
    const aviso = $("#aviso");
    if (e.length) {
      $("#erros").innerHTML = "<ul>" + e.map((x) => "<li>" + U.esc(x) + "</li>").join("") + "</ul>";
      aviso.hidden = true;
      return;
    }
    window.open(U.waLink(mensagem()), "_blank", "noopener");
    aviso.innerHTML = st.origem === "arquivo"
      ? "<strong>Quase lá!</strong> Envie a mensagem no WhatsApp e depois <strong>anexe o arquivo " + U.esc(st.arquivo.nome) +
        "</strong> na conversa (clipe → Documento)."
      : st.origem === "ideia"
        ? "<strong>Quase lá!</strong> Envie a mensagem no WhatsApp e mande fotos ou medidas da sua ideia."
        : "<strong>Quase lá!</strong> Envie a mensagem no WhatsApp e aguarde a nossa confirmação.";
    aviso.hidden = false;
  });

  function renderAll() { renderModeloCard(); renderMateriais(); renderCores(); renderQualidade(); renderResumo(); }

  // Início: abre direto no modelo quando vem da página Modelos (?modelo=id)
  const pm = new URLSearchParams(location.search).get("modelo");
  if (pm && MOD.some((m) => m.id === pm)) { st.modeloId = pm; ms.value = pm; setOrigem("modelo"); }
  else { ensureMaterial(); renderAll(); }
})();
