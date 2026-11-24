// ============================================================
//  PREÇOS E FÓRMULA DA ESTIMATIVA — edite pelo painel (admin.html), aba "Preços".
//
//  gramas  = material da casca (paredes) + material do preenchimento, + suportes
//  tempo   = material ÷ velocidade de extrusão + extra por camada + aquecimento
//  preço   = (custo do filamento + custo da máquina) × margem + taxa fixa
//            (nunca abaixo do preço mínimo; multicor ganha um adicional)
//
//  materiais: precoKg (R$/kg), densidade (g/cm³), fatorVelocidade (relativo ao PLA)
//  precoHora: R$ por hora de máquina | margem: 2 = cobra o dobro do custo
//  taxaFixa / precoMinimo: R$        | faixa: preço mostrado de 90% a 115%
//  multicor.adicional: 0.3 = +30%
//  camadas (mm) e fluxo (mm³/s) por resolução
//  segundosPorCamada, segundosPreparo, larguraLinha (mm), fatorSuporte (1.1 = +10%)
//  qualidade: paredes e preenchimento (0.15 = 15%) de cada tipo de peça
//  mesa: tamanho máximo em mm (Bambu Lab A1: 256)
//
//  DICA: use o simulador do painel e compare com o Bambu Studio.
//
//  FORMATO: o valor depois de "window.X =" precisa ser JSON válido
//  (aspas duplas em tudo, sem comentários dentro, sem vírgula sobrando).
// ============================================================

window.PRECOS = {
  "materiais": {
    "PLA": {
      "precoKg": 110,
      "densidade": 1.24,
      "fatorVelocidade": 1
    },
    "PETG": {
      "precoKg": 80,
      "densidade": 1.27,
      "fatorVelocidade": 0.8
    },
    "TPU": {
      "precoKg": 120,
      "densidade": 1.25,
      "fatorVelocidade": 1
    }
  },
  "precoHora": 1.5,
  "margem": 1.6,
  "taxaFixa": 3,
  "precoMinimo": 5,
  "faixa": [
    0.8,
    1.05
  ],
  "multicor": {
    "adicional": 0.3
  },
  "camadas": {
    "alta": 0.12,
    "media": 0.2,
    "baixa": 0.28
  },
  "fluxo": {
    "alta": 5.5,
    "media": 6.5,
    "baixa": 12
  },
  "segundosPorCamada": 4,
  "segundosPreparo": 360,
  "larguraLinha": 0.42,
  "fatorSuporte": 1.1,
  "qualidade": {
    "ornamental": {
      "paredes": 2,
      "preenchimento": 0.15
    },
    "funcional": {
      "paredes": 4,
      "preenchimento": 0.25
    },
    "esboco": {
      "paredes": 2,
      "preenchimento": 0.1
    }
  },
  "mesa": 256
};

