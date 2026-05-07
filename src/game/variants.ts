/**
 * @file variants.ts — Catalogue de toutes les variantes Ronda (الروندة).
 * Multi >1 joueur : socket+STUN/TURN+Jitsi via /room/create. Solo vs-ai sans socket.
 */

export type VariantKey =
  | 'ronda-marocaine-41' | 'ronda-express-11' | 'ronda-standard-21' | 'ronda-longue-31'
  | 'ronda-2p' | 'ronda-3p'
  | 'ronda-casa-sala' | 'ronda-double' | 'ronda-algerienne'
  | 'vs-ai';

export interface Variant {
  key: VariantKey;
  engine: 'ronda' | 'ronda-double' | 'vs-ai';
  emoji: string;
  name: string;
  shortDesc: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  winRate: string;
  duration: string;
  cards: number;
  rules: { title: string; body: string }[];
  available: boolean;
  options?: { players?: 2|3|4; targetScore?: number; multi?: boolean; handSize?: number; direction?: 'cw' | 'ccw'; bonusFigures?: boolean; coinche?: boolean };
}

export const VARIANTS: Variant[] = [
  {
    key: 'ronda-marocaine-41', engine: 'ronda', emoji: '🇲🇦', name: 'Ronda Marocaine',
    shortDesc: 'Officielle 41 points — 2v2 partenaires face-à-face.',
    difficulty: 3, winRate: '~50%', duration: '~45 min', cards: 40, available: true,
    options: { players: 4, targetScore: 41, multi: true, handSize: 3, direction: 'ccw' },
    rules: [
      { title: 'Objectif', body: 'Atteindre 41 points en cumulant captures, mesa, setentas, annonces.' },
      { title: 'Cartes', body: 'Baraja Española 40 cartes : 4 couleurs (Oros 💰, Copas 🏆, Espadas ⚔️, Bastos 🌳) × 10 valeurs (1-7 + Sota=10, Caballo=11, Rey=12). PAS de 8 ni 9.' },
      { title: 'Mise en place', body: '3 cartes par joueur (face cachée). 4 cartes au tapis (face visible). Antihoraire.' },
      { title: 'Capture par valeur', body: 'Joue une carte = capture une carte de même valeur sur le tapis (ou plusieurs si même valeur).' },
      { title: 'Tringla', body: 'Suite ascendante STRICTEMENT consécutive après capture. Ex: capture le 4 → prends aussi 5, 6, 7 si présents (s\'arrête au 1er saut). PAS de bouclage Rey→As.' },
      { title: 'Mesa / Bayda', body: 'Vidange complète du tapis = +1 point par adversaire (en 2v2 : +2). Annoncer "Mesa !" ou "Bayda !".' },
      { title: 'Setentas', body: 'Capture du 7 de Oros (7 d\'or) = +1 point.' },
      { title: 'Cartas', body: 'Majorité de cartes capturées (>20 sur 40) = +1 point.' },
      { title: 'Annonce Ronda', body: 'Paire en main initiale = +1 point par paire.' },
      { title: 'Annonce Tringla', body: '3+ cartes consécutives en main initiale = +1 par carte au-delà de 2.' },
      { title: 'Re-distribution', body: 'Quand toutes mains vides, 3 nouvelles cartes par joueur. Cartes du tapis restent.' },
      { title: 'Dernière capture', body: 'Le dernier joueur ayant capturé prend toutes les cartes restantes au tapis (pas une Mesa).' },
      { title: 'Victoire', body: 'Première équipe à 41 points.' },
    ],
  },
  {
    key: 'ronda-express-11', engine: 'ronda', emoji: '⚡', name: 'Ronda Express',
    shortDesc: '11 points, ~10 min, format rapide.',
    difficulty: 2, winRate: '~50%', duration: '10 min', cards: 40, available: true,
    options: { players: 4, targetScore: 11, multi: true, handSize: 3, direction: 'ccw' },
    rules: [{ title: 'Différence', body: 'Mêmes règles que Marocaine, mais score cible 11 points. Idéal pause.' }],
  },
  {
    key: 'ronda-standard-21', engine: 'ronda', emoji: '🎯', name: 'Ronda Standard',
    shortDesc: '21 points, ~25 min.',
    difficulty: 3, winRate: '~50%', duration: '25 min', cards: 40, available: true,
    options: { players: 4, targetScore: 21, multi: true, handSize: 3, direction: 'ccw' },
    rules: [{ title: 'Différence', body: 'Score cible 21 points.' }],
  },
  {
    key: 'ronda-longue-31', engine: 'ronda', emoji: '⏳', name: 'Ronda Longue',
    shortDesc: '31 points, ~35 min.',
    difficulty: 3, winRate: '~50%', duration: '35 min', cards: 40, available: true,
    options: { players: 4, targetScore: 31, multi: true, handSize: 3, direction: 'ccw' },
    rules: [{ title: 'Différence', body: 'Score cible 31 points.' }],
  },
  {
    key: 'ronda-2p', engine: 'ronda', emoji: '👤', name: 'Ronda 2 joueurs',
    shortDesc: 'Duel direct 1v1, 5 cartes en main.',
    difficulty: 3, winRate: '~50%', duration: '15 min', cards: 40, available: true,
    options: { players: 2, targetScore: 21, multi: true, handSize: 5, direction: 'ccw' },
    rules: [
      { title: 'Mode', body: '2 joueurs face-à-face, chacun pour soi.' },
      { title: 'Distribution', body: '5 cartes par joueur (au lieu de 3) pour plus de flexibilité.' },
    ],
  },
  {
    key: 'ronda-3p', engine: 'ronda', emoji: '👥', name: 'Ronda 3 joueurs',
    shortDesc: '3 joueurs chacun pour soi.',
    difficulty: 3, winRate: '~33%', duration: '30 min', cards: 40, available: true,
    options: { players: 3, targetScore: 21, multi: true, handSize: 3, direction: 'ccw' },
    rules: [
      { title: 'Mode', body: '3 joueurs individuels (pas d\'équipe).' },
      { title: 'Cartes capturées', body: 'Comptent individuellement.' },
    ],
  },
  {
    key: 'ronda-casa-sala', engine: 'ronda', emoji: '🏛️', name: 'Ronda Casa/Sala',
    shortDesc: 'Variante Casablanca/Rabat avec bonus figures + setentas étendues.',
    difficulty: 4, winRate: '~50%', duration: '~45 min', cards: 40, available: true,
    options: { players: 4, targetScore: 41, multi: true, handSize: 3, direction: 'ccw', bonusFigures: true },
    rules: [
      { title: 'Bonus figures', body: 'Capturer Sota+Caballo+Rey de la même couleur dans une manche = +2 points bonus.' },
      { title: 'Setentas étendues', body: '7 d\'Or = +1, mais aussi 7 de chaque autre couleur = +0.5 chacun.' },
      { title: 'Région', body: 'Joué surtout à Casablanca, Rabat, Salé.' },
    ],
  },
  {
    key: 'ronda-double', engine: 'ronda-double', emoji: '🎲', name: 'Ronda Double',
    shortDesc: 'Avec phase d\'enchères (×2/×4) façon Coinche.',
    difficulty: 5, winRate: '~50%', duration: '~50 min', cards: 40, available: true,
    options: { players: 4, targetScore: 41, multi: true, handSize: 3, coinche: true },
    rules: [
      { title: 'Mode enchères', body: 'Avant la manche, phase d\'enchères : annoncer un contrat.' },
      { title: 'Multiplicateur', body: '×2 si l\'adversaire conteste, ×4 si surenchère.' },
      { title: 'Stratégie', body: 'Plus stratégique mais plus longue.' },
    ],
  },
  {
    key: 'ronda-algerienne', engine: 'ronda', emoji: '🇩🇿', name: 'Ronda Algérienne',
    shortDesc: 'Sens horaire, annonces restrictives.',
    difficulty: 3, winRate: '~50%', duration: '~30 min', cards: 40, available: true,
    options: { players: 4, targetScore: 21, multi: true, handSize: 3, direction: 'cw' },
    rules: [
      { title: 'Différences', body: 'Distribution HORAIRE (vs antihoraire au Maroc).' },
      { title: 'Annonces', body: 'Restreintes : seules les paires comptent (pas de Tringla en main).' },
    ],
  },
  {
    key: 'vs-ai', engine: 'vs-ai', emoji: '🤖', name: 'Solo vs IA',
    shortDesc: 'Mode entraînement, 1 ou 3 IA, sans socket.',
    difficulty: 3, winRate: '~50%', duration: '~20 min', cards: 40, available: true,
    options: { players: 4, targetScore: 21, handSize: 3 },
    rules: [
      { title: 'Mode', body: 'Solo contre IA (1v1 ou 1v3 selon variante choisie).' },
      { title: 'Difficulté', body: 'IA suit la stratégie : capture optimale, mémoire des cartes passées, défense.' },
      { title: 'Hors-ligne', body: 'Pas de socket, idéal pour s\'entraîner.' },
    ],
  },
];

export const AVAILABLE_VARIANTS = VARIANTS.filter((v) => v.available);
export function findVariant(key: string): Variant | undefined {
  return VARIANTS.find((v) => v.key === key);
}
