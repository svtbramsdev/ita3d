// Página de modelos: grade com filtro.
(function () {
  const U = window.Ita, M = window.MODELOS || [];
  const grid = document.getElementById("model-grid");
  const filtros = document.getElementById("filtros");
  let filtro = "todos";

  function card(m) {
    const est = m.status === "estoque";
    return '<article class="model">' +
      '<div class="thumb">' + U.img(m.foto, m.nome) + "</div>" +
      '<div class="body">' +
        '<span class="badge ' + (est ? "ok" : "warn") + '">' + (est ? "Em estoque" : "Para imprimir") + "</span>" +
        "<h3>" + U.esc(m.nome) + "</h3>" +
        '<p class="hint">' + U.esc(m.descricao || "") + "</p>" +
        '<div class="price"><small>a partir de</small>' + U.brl(m.precoAPartirDe) + "</div>" +
        '<a class="btn btn-primary" href="enviar.html?modelo=' + encodeURIComponent(m.id) + '">' +
          (est ? "Quero este" : "Personalizar e pedir") + "</a>" +
      "</div></article>";
  }

  function render() {
    const list = M.filter((m) => filtro === "todos" || m.status === filtro);
    grid.innerHTML = list.length ? list.map(card).join("") : '<p class="hint">Nenhum modelo nesta categoria por enquanto.</p>';
    filtros.querySelectorAll("[data-f]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === filtro)));
  }

  filtros.addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (b) { filtro = b.dataset.f; render(); }
  });
  render();
})();
