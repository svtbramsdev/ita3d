// Funções compartilhadas por todas as páginas.
(function () {
  const C = window.CONFIG || {};
  const U = {};

  U.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  U.brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  U.waNumber = () => String(C.whatsapp || "").replace(/\D/g, "");
  U.waLink = (msg) => "https://wa.me/" + U.waNumber() + (msg ? "?text=" + encodeURIComponent(msg) : "");

  // "5531987654321" -> "(31) 98765-4321"
  U.fmtPhone = () => {
    let n = U.waNumber();
    if (n.startsWith("55")) n = n.slice(2);
    const ddd = n.slice(0, 2), rest = n.slice(2);
    const cut = rest.length - 4;
    return rest.length >= 8 ? "(" + ddd + ") " + rest.slice(0, cut) + "-" + rest.slice(cut) : n;
  };

  U.safeHex = (h) => (/^#[0-9a-f]{3,8}$/i.test(h || "") ? h : "#999999");

  // Imagem com substituto automático quando o arquivo ainda não existe.
  U.placeholder = (label) => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
      "<rect width='100%' height='100%' fill='#e9e3da'/>" +
      "<g fill='none' stroke='#b9afa3' stroke-width='6' transform='translate(352 210)'>" +
      "<rect x='0' y='0' width='96' height='76' rx='10'/><circle cx='30' cy='26' r='9'/>" +
      "<path d='M4 66 L36 40 L58 58 L72 46 L94 64'/></g>" +
      "<text x='50%' y='370' font-family='sans-serif' font-size='26' fill='#8a8178' text-anchor='middle'>" +
      U.esc(label || "Foto em breve") + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  U.fallback = (img) => {
    if (img.dataset.fallen) return;
    img.dataset.fallen = "1";
    img.src = U.placeholder("Foto em breve");
  };
  U.img = (src, alt, cls) => {
    const s = src ? U.esc(src) : U.placeholder("Foto em breve");
    return '<img src="' + s + '" alt="' + U.esc(alt) + '"' + (cls ? ' class="' + cls + '"' : "") +
      ' loading="lazy" data-fb>';
  };
  // Troca fotos que não existem pelo substituto. Sem código inline (exigido pela política de segurança).
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG" && t.hasAttribute("data-fb")) U.fallback(t);
  }, true);

  // Carretel desenhado na cor do filamento.
  U.spool = (hex) => {
    const c = U.safeHex(hex);
    let rings = "";
    for (let r = 22; r <= 38; r += 4) rings += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="1"/>';
    return '<svg class="spool" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="48" fill="#cfc8bd" stroke="rgba(0,0,0,.18)"/>' +
      '<circle cx="50" cy="50" r="41" fill="' + c + '" stroke="rgba(0,0,0,.2)"/>' + rings +
      '<path d="M22 30 A34 34 0 0 1 50 16" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="17" fill="#ece7df" stroke="rgba(0,0,0,.18)"/>' +
      '<circle cx="50" cy="50" r="7" fill="#6b6258"/></svg>';
  };
  // Foto do filamento se existir, senão o carretel desenhado.
  U.filVisual = (f) => (f && f.foto ? U.img(f.foto, f.material + " " + f.cor, "fil-photo") : U.spool(f && f.hex));

  U.fmtDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("pt-BR") : "";
  };

  window.Ita = U;

  document.addEventListener("DOMContentLoaded", () => {
    // Link ativo do menu
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a").forEach((a) => {
      if (a.getAttribute("href") === page) a.setAttribute("aria-current", "page");
    });
    // Rodapé
    document.querySelectorAll("[data-wa]").forEach((a) => { a.href = U.waLink("Olá, " + (C.nomeLoja || "Ita 3D") + "!"); a.target = "_blank"; a.rel = "noopener"; });
    document.querySelectorAll("[data-insta]").forEach((a) => {
      if (C.instagram) { a.href = "https://instagram.com/" + C.instagram.replace(/^@/, ""); a.target = "_blank"; a.rel = "noopener"; }
      else a.hidden = true;
    });
    document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  });
})();
