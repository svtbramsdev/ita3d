// Página "Meu pedido": consulta o código em data/pedidos.js.
(function () {
  const U = window.Ita, C = window.CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const form = $("#busca"), input = $("#codigo"), out = $("#resultado");

  const ETAPAS = [
    ["fila", "Na fila", "Seu pedido está confirmado e aguardando a vez na impressora."],
    ["imprimindo", "Imprimindo", "Sua peça está sendo impressa agora."],
    ["pronto", "Pronto", "Seu pedido está pronto!"],
    ["entregue", "Entregue", "Pedido entregue. Obrigado pela preferência!"]
  ];

  // "ita 7k3f", "ITA7K3F", "7k3f" -> "ITA-7K3F"
  function normalizar(s) {
    s = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.startsWith("ITA")) s = s.slice(3);
    return s ? "ITA-" + s : "";
  }

  function render(codigo) {
    const P = Array.isArray(window.PEDIDOS) ? window.PEDIDOS : [];
    const idx = P.findIndex((p) => String(p.codigo).toUpperCase() === codigo);
    const nome = C.nomeLoja || "Ita 3D";

    if (idx < 0) {
      out.innerHTML = '<div class="card order-card"><h3 style="margin:0 0 6px">Não encontramos o pedido ' + U.esc(codigo) + "</h3>" +
        '<p class="hint" style="margin:0 0 14px">Confira se digitou certo. Se o pedido foi confirmado há poucos minutos, ele pode demorar um pouquinho para aparecer aqui.</p>' +
        '<a class="btn btn-ghost" target="_blank" rel="noopener" href="' + U.esc(U.waLink("Olá, " + nome + "! Não encontrei meu pedido " + codigo + " no site.")) + '">Falar no WhatsApp</a></div>';
      return;
    }

    const p = P[idx];
    const cancelado = p.status === "cancelado";
    const atual = ETAPAS.findIndex((e) => e[0] === p.status);
    const naFrente = P.filter((x, i) => i < idx && (x.status === "fila" || x.status === "imprimindo")).length;

    let msg = cancelado ? "Este pedido foi cancelado. Se tiver alguma dúvida, fale com a gente." : (ETAPAS[atual] || ETAPAS[0])[2];
    if (p.status === "fila") {
      msg += naFrente === 0 ? " Ele é o próximo da fila!" : " Há " + naFrente + (naFrente === 1 ? " pedido" : " pedidos") + " na frente do seu.";
    }
    if (p.status === "pronto" && C.retirada) msg += " " + C.retirada;

    const timeline = cancelado ? "" : '<ol class="timeline">' + ETAPAS.map((e, i) =>
      '<li class="' + (i < atual ? "done" : i === atual ? "now" : "") + '"' + (i === atual ? ' aria-current="step"' : "") + ">" + e[1] + "</li>").join("") + "</ol>";

    const datas = [];
    if (p.previsao && !["entregue", "cancelado"].includes(p.status)) datas.push(["Previsão de entrega", U.fmtDate(p.previsao)]);
    if (p.criado) datas.push(["Pedido feito em", U.fmtDate(p.criado)]);
    if (p.atualizado) datas.push(["Última atualização", U.fmtDate(p.atualizado)]);

    out.innerHTML = '<div class="card order-card">' +
      '<div class="order-top"><span class="order-code">' + U.esc(p.codigo) + "</span>" +
      '<span class="badge ' + (cancelado ? "warn" : p.status === "pronto" || p.status === "entregue" ? "ok" : "warn") + '">' +
      (cancelado ? "Cancelado" : (ETAPAS[atual] || ETAPAS[0])[1]) + "</span></div>" +
      '<p class="order-desc">' + U.esc(p.descricao || "") + "</p>" +
      timeline +
      '<div class="status-msg' + (cancelado ? " off" : p.status === "pronto" ? " ready" : "") + '">' + U.esc(msg) + "</div>" +
      (datas.length ? '<dl class="order-dates">' + datas.map((d) => "<div><dt>" + d[0] + "</dt><dd>" + d[1] + "</dd></div>").join("") + "</dl>" : "") +
      '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + U.esc(U.waLink("Olá, " + nome + "! Tenho uma dúvida sobre o meu pedido " + p.codigo + ".")) + '">Falar sobre este pedido</a>' +
      "</div>";
  }

  function buscar(valor, atualizarUrl) {
    const codigo = normalizar(valor);
    if (!codigo) { out.innerHTML = ""; input.focus(); return; }
    input.value = codigo;
    if (atualizarUrl) history.replaceState(null, "", "?c=" + encodeURIComponent(codigo));
    render(codigo);
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); buscar(input.value, true); });

  // Carrega a lista sempre fresca (sem cache), para o status estar em dia
  function iniciar() {
    const c = new URLSearchParams(location.search).get("c");
    if (c) buscar(c, false); else input.focus();
  }
  const s = document.createElement("script");
  s.src = "data/pedidos.js?t=" + Date.now();
  s.onload = iniciar;
  s.onerror = () => { window.PEDIDOS = window.PEDIDOS || []; iniciar(); };
  document.body.appendChild(s);
})();
