// Página inicial: carrossel, fila e filamentos.
(function () {
  const U = window.Ita, C = window.CONFIG || {};

  // ---- Carrossel ----
  const D = window.DESTAQUES || [];
  const track = document.getElementById("carousel-track");
  const dots = document.getElementById("carousel-dots");
  const box = document.getElementById("carousel");
  if (track && D.length) {
    track.innerHTML = D.map((d) =>
      '<figure class="slide">' + U.img(d.foto, d.legenda || "Impressão Ita 3D") +
      (d.legenda ? "<figcaption>" + U.esc(d.legenda) + "</figcaption>" : "") + "</figure>"
    ).join("");
    dots.innerHTML = D.map((_, i) => '<button type="button" aria-label="Foto ' + (i + 1) + '" data-i="' + i + '"></button>').join("");

    let i = 0, timer = null;
    const go = (n) => {
      i = (n + D.length) % D.length;
      track.style.transform = "translateX(-" + i * 100 + "%)";
      dots.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const restart = () => {
      clearInterval(timer);
      if (!reduce && D.length > 1) timer = setInterval(() => go(i + 1), 5000);
    };
    dots.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { go(+b.dataset.i); restart(); } });
    box.querySelector(".prev").addEventListener("click", () => { go(i - 1); restart(); });
    box.querySelector(".next").addEventListener("click", () => { go(i + 1); restart(); });
    if (D.length < 2) box.querySelectorAll(".carousel-nav").forEach((b) => (b.hidden = true));
    go(0);
    restart();
  } else if (box) {
    box.parentElement.hidden = true;
  }

  // ---- Fila ----
  const f = C.fila || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  // Se existe a lista de pedidos (data/pedidos.js), a fila é contada automaticamente
  const P = Array.isArray(window.PEDIDOS) ? window.PEDIDOS : null;
  const naFila = P ? P.filter((p) => p.status === "fila" || p.status === "imprimindo").length : f.pedidos;
  let atualizado = f.atualizado || "";
  if (P) P.forEach((p) => { if (p.atualizado && p.atualizado > atualizado) atualizado = p.atualizado; });
  set("fila-pedidos", naFila != null ? naFila : "–");
  set("fila-prazo", f.prazo || "–");
  set("fila-atualizado", U.fmtDate(atualizado) || "–");

  // ---- Filamentos ----
  const grid = document.getElementById("fil-grid");
  if (grid) {
    const list = (window.FILAMENTOS || []).slice().sort((a, b) =>
      (b.emEstoque - a.emEstoque) || a.material.localeCompare(b.material) || a.cor.localeCompare(b.cor));
    grid.innerHTML = list.map((x) =>
      '<div class="fil' + (x.emEstoque ? "" : " out") + '">' + U.filVisual(x) +
      '<div><div class="name">' + U.esc(x.cor) + '</div><div class="mat">' + U.esc(x.material) + "</div></div></div>"
    ).join("") || '<p class="hint">Estoque sendo atualizado.</p>';
  }
})();
