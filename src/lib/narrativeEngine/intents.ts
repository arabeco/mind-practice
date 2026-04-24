export type OptionIntent =
  | 'confronto_publico'
  | 'confronto_privado'
  | 'retirada'
  | 'adesao'
  | 'contra_movimento'
  | 'investigacao'
  | 'provocacao'
  | 'protecao';

export const OPTION_INTENTS: OptionIntent[] = [
  'confronto_publico',
  'confronto_privado',
  'retirada',
  'adesao',
  'contra_movimento',
  'investigacao',
  'provocacao',
  'protecao',
];

export const OPTION_INTENT_LABELS: Record<OptionIntent, string> = {
  confronto_publico: 'Confronto publico',
  confronto_privado: 'Confronto privado',
  retirada: 'Retirada',
  adesao: 'Adesao',
  contra_movimento: 'Contra-movimento',
  investigacao: 'Investigacao',
  provocacao: 'Provocacao',
  protecao: 'Protecao',
};
