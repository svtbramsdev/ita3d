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
    "nome": "Suporte de celular",
    "descricao": "Suporte de mesa com ângulo de leitura. Serve na maioria dos celulares.",
    "precoAPartirDe": 15,
    "status": "estoque",
    "materiais": ["PLA", "PETG"],
    "foto": "images/modelos/suporte-celular.jpg"
  },
  {
    "id": "chaveiro-nome",
    "nome": "Chaveiro com nome",
    "descricao": "Chaveiro personalizado com nome ou texto curto, em até 2 cores.",
    "precoAPartirDe": 8,
    "status": "imprimir",
    "materiais": ["PLA"],
    "foto": "images/modelos/chaveiro-nome.jpg"
  },
  {
    "id": "vaso-geometrico",
    "nome": "Vaso geométrico",
    "descricao": "Vaso decorativo para plantas pequenas ou flores secas.",
    "precoAPartirDe": 25,
    "status": "estoque",
    "materiais": ["PLA", "PETG"],
    "foto": "images/modelos/vaso-geometrico.jpg"
  },
  {
    "id": "organizador-mesa",
    "nome": "Organizador de mesa",
    "descricao": "Porta-canetas e objetos com divisórias.",
    "precoAPartirDe": 30,
    "status": "imprimir",
    "materiais": ["PLA", "PETG"],
    "foto": "images/modelos/organizador-mesa.jpg"
  },
  {
    "id": "suporte-headset",
    "nome": "Suporte de headset",
    "descricao": "Suporte firme para fones de ouvido grandes.",
    "precoAPartirDe": 35,
    "status": "imprimir",
    "materiais": ["PLA", "PETG"],
    "foto": "images/modelos/suporte-headset.jpg"
  },
  {
    "id": "porta-cartoes",
    "nome": "Porta-cartões",
    "descricao": "Porta-cartões de visita para balcão.",
    "precoAPartirDe": 12,
    "status": "estoque",
    "materiais": ["PLA"],
    "foto": "images/modelos/porta-cartoes.jpg"
  }
];

window.DESTAQUES = [
  { "foto": "images/impressoes/destaque-1.jpg", "legenda": "Peças funcionais em PETG" },
  { "foto": "images/impressoes/destaque-2.jpg", "legenda": "Impressão multicor" },
  { "foto": "images/impressoes/destaque-3.jpg", "legenda": "Decoração em PLA" },
  { "foto": "images/impressoes/destaque-4.jpg", "legenda": "Protótipos sob medida" }
];
