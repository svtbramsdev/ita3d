// ============================================================
//  CATÁLOGO DE MODELOS E CARROSSEL — edite pelo painel (admin.html), aba "Modelos".
//
//  MODELOS:
//    status: "estoque"  -> já impresso, pronta entrega
//            "imprimir" -> imprimimos quando pedirem
//    precoAPartirDe: menor preço possível (o cliente escolhe cor/material/qualidade)
//    materiais: quais materiais podem ser usados neste modelo
//    foto: imagem em images/modelos/
//  DESTAQUES: fotos do carrossel da página inicial (images/impressoes/)
//
//  ATENÇÃO: só venda modelos seus ou com licença que permite uso comercial.
//
//  FORMATO: o valor depois de "window.X =" precisa ser JSON válido
//  (aspas duplas em tudo, sem comentários dentro, sem vírgula sobrando).
// ============================================================

window.MODELOS = [
  {
    "id": "suporte-celular",
    "nome": "Suporte de mangueira durável",
    "descricao": "Arco de 65 graus, orifícios e recortes para reforço otimizado quanto ao uso de filamento.",
    "precoAPartirDe": 20,
    "status": "imprimir",
    "materiais": [
      "PLA",
      "PETG"
    ],
    "foto": "images/modelos/suporte-celular-mwtp0jbu.jpg"
  },
  {
    "id": "chaveiro-nome",
    "nome": "10x Presilhas pequenas para saquinhos e outras embalagens",
    "descricao": "Usar isso principalmente para fechar saquinhos de ervas, mas também é útil para todo tipo de embalagem, como as de cereais matinais, pacotes de chá, etc.\n\nVem 10 presilhas.",
    "precoAPartirDe": 5,
    "status": "imprimir",
    "materiais": [
      "PLA"
    ],
    "foto": "images/modelos/chaveiro-nome-mwtpanrb.jpg"
  },
  {
    "id": "vaso-geometrico",
    "nome": "Descansos de copo trançados",
    "descricao": "O aspecto trançado deste porta-copos foi pensado para remeter ao visual de uma cesta. Graças a esse padrão de trançado, o copo fica posicionado cerca de 5 mm acima da base. Isso permite que qualquer condensação escorra facilmente para dentro da trama, mantendo o líquido longe da superfície da mesa.",
    "precoAPartirDe": 15,
    "status": "imprimir",
    "materiais": [
      "PLA",
      "PETG"
    ],
    "foto": "images/modelos/vaso-geometrico-mwtpgbcw.jpg"
  },
  {
    "id": "organizador-mesa",
    "nome": "Suporte invisível para controle Xbox One",
    "descricao": "Projetado para controles de Xbox Series X/S e Xbox One (mesmo com um acessório de teclado conectado), mas, com base no feedback e nos comentários dos usuários, este modelo também é compatível com controles de Xbox 360, DualSense e DualSense Edge para PlayStation 5, Nintendo Switch Pro Controller e controles da PowerA.",
    "precoAPartirDe": 3,
    "status": "imprimir",
    "materiais": [
      "PLA",
      "PETG"
    ],
    "foto": "images/modelos/organizador-mesa-mwtpstpf.jpg"
  },
  {
    "id": "suporte-headset",
    "nome": "Tigela de tricô",
    "descricao": "Esta tigela decorativa apresenta um aspecto de tricô. Tem aproximadamente o tamanho de uma tigela grande para cereais.",
    "precoAPartirDe": 15,
    "status": "imprimir",
    "materiais": [
      "PLA",
      "PETG"
    ],
    "foto": "images/modelos/suporte-headset-mwtpwjfp.jpg"
  }
];

window.DESTAQUES = [
  {
    "foto": "images/impressoes/destaque-mwtq2yjm.jpg",
    "legenda": "Organizador de tampas tupperware"
  },
  {
    "foto": "images/impressoes/destaque-mwtq35r6.jpg",
    "legenda": "Tripé universal"
  },
  {
    "foto": "images/impressoes/destaque-mwtq3gfa.jpg",
    "legenda": "Ganchos para roupas"
  }
];

