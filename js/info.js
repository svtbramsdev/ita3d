// Página de informações: tabela de materiais e contatos.
(function () {
  const U = window.Ita, C = window.CONFIG || {}, MAT = window.MATERIAIS || {}, FIL = window.FILAMENTOS || [];
  const nome = C.nomeLoja || "Ita 3D";

  const tb = document.getElementById("mat-table");
  tb.innerHTML = Object.keys(MAT).map((k) => {
    const m = MAT[k];
    const n = FIL.filter((f) => f.material === k && f.emEstoque).length;
    const sit = !m.disponivel ? '<span class="badge warn">Em breve</span>'
      : n ? '<span class="badge ok">' + n + (n === 1 ? " cor" : " cores") + "</span>"
      : '<span class="badge warn">Sem estoque</span>';
    return "<tr><td><strong>" + U.esc(m.nome || k) + "</strong></td><td>" + U.esc(m.indicado || m.descricao || "") + "</td><td>" + sit + "</td></tr>";
  }).join("");

  const items = [["WhatsApp", U.fmtPhone()]];
  if (C.instagram) items.push(["Instagram", "@" + C.instagram.replace(/^@/, "")]);
  if (C.email) items.push(["E-mail", C.email]);
  if (C.cidade) items.push(["Cidade", C.cidade]);
  if (C.horario) items.push(["Atendimento", C.horario]);
  document.getElementById("contact-list").innerHTML = items.map((i) => "<li><strong>" + i[0] + "</strong>" + U.esc(i[1]) + "</li>").join("");

  if (C.retirada) document.getElementById("retirada-txt").textContent = C.retirada;
  document.getElementById("contato-wa").href = U.waLink("Olá, " + nome + "! Tenho uma dúvida.");
  document.getElementById("reclamacao-btn").href = U.waLink(
    "Olá, " + nome + "! Quero fazer uma reclamação / pedir suporte.\n\n*Data do pedido:* \n*O que aconteceu:* \n\n(vou enviar fotos)");
})();
