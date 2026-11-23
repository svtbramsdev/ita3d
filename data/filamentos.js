// ============================================================
//  MATERIAIS E ESTOQUE DE FILAMENTOS — edite pelo painel (admin.html), aba "Filamentos".
//
//  MATERIAIS: tipos de material. "disponivel": false mostra como "em breve".
//  FILAMENTOS: cada cor que você tem.
//    id: único, sem espaços  | material: igual a uma chave de MATERIAIS
//    hex: cor aproximada (para a prévia do carretel)
//    emEstoque: true/false   | obs: observação opcional
//    foto: opcional, ex.: "images/filamentos/pla-preto.jpg" (vazio = carretel desenhado)
//
//  FORMATO: o valor depois de "window.X =" precisa ser JSON válido
//  (aspas duplas em tudo, sem comentários dentro, sem vírgula sobrando).
// ============================================================

window.MATERIAIS = {
  "PLA": {
    "nome": "PLA",
    "disponivel": true,
    "descricao": "O material mais usado na impressão 3D. Ótimo acabamento e muitas cores.",
    "indicado": "Decoração, miniaturas, protótipos, organizadores, peças de uso interno.",
    "pontos": [
      "Melhor acabamento e mais detalhes",
      "Impressão consolidada",
      "Amolece com calor (evite carro no sol, água quente)"
    ]
  },
  "PETG": {
    "nome": "PETG",
    "disponivel": true,
    "descricao": "Mais resistente e um pouco flexível. Aguenta melhor calor, umidade e impacto.",
    "indicado": "Peças funcionais, suportes, encaixes, uso externo, peças que ficam no carro.",
    "pontos": [
      "Mais resistente a impacto e a calor que o PLA",
      "Bom para uso externo e em contato com água",
      "Acabamento um pouco mais brilhante e menos detalhado"
    ]
  },
  "TPU": {
    "nome": "TPU",
    "disponivel": false,
    "descricao": "Peças impressas em TPU apresentam as características desse material semelhante à borracha: elasticidade, absorção de impactos, resistência a choques, amortecimento de vibrações e capacidade de alongamento. O TPU é, ainda, um material bastante durável, com alta resistência à abrasão, a produtos químicos, a óleos e a baixas temperaturas, além de apresentar uma resistência moderada à água.",
    "indicado": "Peças flexíveis, semelhantes à borracha e resistentes a impactos, que filamentos rígidos como PLA ou ABS não conseguem produzir.",
    "pontos": [
      "Elasticidade e flexibilidade: O material pode ser esticado, dobrado e comprimido, retornando, em seguida, à sua forma original.",
      "Durabilidade: Apresenta alta resistência à abrasão, ao desgaste, a óleos e a graxas.",
      "Absorção de impactos: Amortece vibrações e absorve bem impactos físicos.",
      "Escalas de dureza: Geralmente medidas na escala Shore A (por exemplo, 85A, 90A, 95A), permitindo escolher graus de flexibilidade mais macios ou um pouco mais rígidos, conforme a necessidade."
    ]
  }
};

window.FILAMENTOS = [
  {
    "id": "pla-preto",
    "material": "PLA",
    "cor": "Preto",
    "hex": "#1d1d1f",
    "emEstoque": false
  },
  {
    "id": "pla-branco",
    "material": "PLA",
    "cor": "Branco",
    "hex": "#f4f4f2",
    "emEstoque": true
  },
  {
    "id": "pla-cinza",
    "material": "PLA",
    "cor": "Cinza",
    "hex": "#8a8d91",
    "emEstoque": true
  },
  {
    "id": "pla-vermelho",
    "material": "PLA",
    "cor": "Vermelho",
    "hex": "#c8102e",
    "emEstoque": false
  },
  {
    "id": "pla-azul",
    "material": "PLA",
    "cor": "Azul",
    "hex": "#1f4fbf",
    "emEstoque": false
  },
  {
    "id": "pla-laranja",
    "material": "PLA",
    "cor": "Laranja",
    "hex": "#f26b1d",
    "emEstoque": false
  },
  {
    "id": "petg-preto",
    "material": "PETG",
    "cor": "Branco",
    "hex": "#ffffff",
    "emEstoque": true
  },
  {
    "id": "petg-transp",
    "material": "PETG",
    "cor": "Transparente",
    "hex": "#cfe3ea",
    "emEstoque": false,
    "obs": "Translúcido: não fica 100% transparente como vidro."
  }
];

