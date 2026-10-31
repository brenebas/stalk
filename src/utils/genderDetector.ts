/**
 * Utilitário de detecção de gênero e perfil de busca do Instagram
 * Identifica o gênero com base em nome próprio, bio e pronomes (PT/BR e EN)
 */

const FEMALE_NAMES = new Set([
  'mariana', 'maria', 'ana', 'carolina', 'carol', 'camila', 'beatriz', 'bia', 'amanda',
  'larissa', 'lari', 'bruna', 'gabriela', 'gabi', 'fernanda', 'fer', 'jessica',
  'isabella', 'isabela', 'isa', 'nathalia', 'natalia', 'vitoria', 'vitória', 'luana',
  'rafaela', 'rafa', 'juliana', 'ju', 'leticia', 'letícia', 'let', 'vanessa', 'patricia',
  'aline', 'daniela', 'dani', 'rebeca', 'bianca', 'alicia', 'alice', 'claudia', 'renata',
  'monique', 'thais', 'thaís', 'helena', 'marina', 'barbara', 'bárbara', 'debora', 'débora',
  'sabrina', 'giovanna', 'paloma', 'lorena', 'livia', 'lívia', 'yasmin', 'isadora', 'milena',
  'priscila', 'taina', 'tainá', 'tais', 'taís', 'flavia', 'flávia', 'samara', 'tamires',
  'pamela', 'pâmela', 'karina', 'carina', 'elisa', 'stella', 'estela', 'clarice', 'clara',
  'sophia', 'sofia', 'eduarda', 'duda', 'lorena', 'valentina', 'cecilia', 'cecília', 'maite',
  'maitê', 'joana', 'mirella', 'mirela', 'manuela', 'manu'
]);

const MALE_NAMES = new Set([
  'lucas', 'rodrigo', 'matheus', 'mateus', 'gabriel', 'pedro', 'guilherme', 'gui',
  'leonardo', 'leo', 'wesley', 'felipe', 'carlos', 'bruno', 'thiago', 'tiago',
  'rafael', 'daniel', 'marcos', 'marcelo', 'joao', 'joão', 'gustavo', 'andre', 'andré',
  'victor', 'vitor', 'diego', 'eduardo', 'dudu', 'alexandre', 'alex', 'caio', 'vinicius',
  'vinícius', 'vini', 'arthur', 'artur', 'renan', 'igor', 'danilo', 'ricardo', 'samuel',
  'fábio', 'fabio', 'henrique', 'leandro', 'otavio', 'otávio', 'neymar', 'cristiano', 'ronaldo',
  'felipe', 'bernardo', 'davi', 'david', 'lorenzo', 'theo', 'théo', 'heitor', 'enzo', 'murilo',
  'benicio', 'benício', 'caio', 'breno', 'cauã', 'cauan', 'lucca', 'yuri', 'erick', 'eric'
]);

/**
 * Detecta se uma pessoa tem gênero feminino ou masculino
 */
export function detectGender(name?: string, bio?: string, handle?: string): 'female' | 'male' {
  const text = `${name || ''} ${bio || ''} ${handle || ''}`.toLowerCase();

  // 1. Pronomes e substantivos de gênero explícitos
  if (/\b(ela|dela|she|her|mulher|garota|menina|advogada|médica|engenheira|arquiteta|mãe|mae|esposa|namorada|princesa|queen|girl|woman|babe)\b/i.test(text)) {
    return 'female';
  }
  if (/\b(ele|dele|he|him|homem|garoto|menino|advogado|médico|medico|engenheiro|arquiteto|pai|esposo|namorado|príncipe|principe|king|boy|man|guy)\b/i.test(text)) {
    return 'male';
  }

  // 2. Primeiro nome
  const rawFirst = (name || handle || '').trim().split(/[\s._-]+/)[0]?.toLowerCase() || '';
  const firstName = rawFirst.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (FEMALE_NAMES.has(rawFirst) || FEMALE_NAMES.has(firstName)) return 'female';
  if (MALE_NAMES.has(rawFirst) || MALE_NAMES.has(firstName)) return 'male';

  // 3. Sufixos típicos em língua portuguesa
  if (firstName.endsWith('a') && !['lucas', 'luca', 'joshua', 'elias', 'jonas', 'matias', 'alexa'].includes(firstName)) {
    return 'female';
  }
  if (firstName.endsWith('o') || firstName.endsWith('os') || firstName.endsWith('or') || firstName.endsWith('el')) {
    return 'male';
  }

  // Fallback determinístico
  return firstName.charCodeAt(0) % 2 === 0 ? 'female' : 'male';
}
