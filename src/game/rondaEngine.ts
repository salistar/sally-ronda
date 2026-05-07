/**
 * RondaEngine - Moteur de jeu Ronda marocain
 * Jeu de capture de cartes utilisant le paquet espagnol de 40 cartes
 *
 * Regles:
 * - 2 a 4 joueurs
 * - Paquet espagnol: 4 couleurs (bastos, copas, espadas, oros) x valeurs (1-7, 10-12)
 * - Chaque joueur recoit 7 cartes, 4 cartes sont placees face visible sur la table
 * - A son tour, un joueur joue une carte
 * - CAPTURE: si la carte jouee correspond a la valeur d'une carte sur la table, les deux sont capturees
 * - RONDA: 2+ cartes de meme valeur en main au debut = bonus
 * - TRINGA: 3+ cartes de meme valeur = bonus plus grand
 * - Si aucune capture possible, la carte est placee sur la table
 * - Quand les mains sont vides, redistribuer depuis le reste du paquet
 * - La partie se termine quand le paquet est vide
 * - Score: plus de cartes=1pt, plus d'oros=1pt, 7 d'oros(settebello)=1pt, plus de 7=1pt, bonus ronda/tringa
 * - Premier a 21 points gagne
 */

// ============================================================
// TYPES
// ============================================================

export type Suit = 'bastos' | 'copas' | 'espadas' | 'oros';
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string; // e.g. "07-copas"
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  captures: Card[];
  score: number;
  isBot: boolean;
  announcedRonda: boolean;
  announcedTringa: boolean;
}

export type GamePhase =
  | 'waiting'
  | 'dealing'
  | 'announcing'    // Phase d'annonce ronda/tringa au debut
  | 'playing'
  | 'round_end'
  | 'game_over';

export interface Announcement {
  playerId: string;
  type: 'ronda' | 'tringa';
  value: CardValue;
  count: number;
}

export interface RoundScore {
  playerId: string;
  mostCards: boolean;
  mostOros: boolean;
  settebello: boolean;
  mostSevens: boolean;
  rondaBonus: number;
  tringaBonus: number;
  total: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  table: Card[];
  deck: Card[];
  announcements: Announcement[];
  roundNumber: number;
  lastCapture: { playerId: string; cards: Card[] } | null;
  winnerId: string | null;
  targetScore: number;
  dealCount: number; // how many deals have occurred this round
}

export type GameAction =
  | { type: 'JOIN'; playerId: string; playerName: string; isBot?: boolean }
  | { type: 'START_GAME' }
  | { type: 'ANNOUNCE_RONDA'; playerId: string }
  | { type: 'SKIP_ANNOUNCE'; playerId: string }
  | { type: 'PLAY_CARD'; playerId: string; cardId: string; targetCardId?: string }
  | { type: 'NEXT_DEAL' }
  | { type: 'NEW_ROUND' }
  | { type: 'RESET' };

// ============================================================
// CONSTANTS
// ============================================================

export const SUITS: Suit[] = ['bastos', 'copas', 'espadas', 'oros'];
export const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export const SUIT_NAMES: Record<Suit, string> = {
  bastos: 'Batons',
  copas: 'Coupes',
  espadas: 'Epees',
  oros: 'Deniers',
};

export const VALUE_NAMES: Record<CardValue, string> = {
  1: 'As',
  2: 'Deux',
  3: 'Trois',
  4: 'Quatre',
  5: 'Cinq',
  6: 'Six',
  7: 'Sept',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const CARDS_PER_PLAYER = 7;
export const TABLE_CARDS = 4;
export const DEFAULT_TARGET_SCORE = 21;
export const RONDA_BONUS = 1;
export const TRINGA_BONUS = 2;

// ============================================================
// DECK
// ============================================================

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      const valueStr = value.toString().padStart(2, '0');
      deck.push({
        suit,
        value,
        id: `${valueStr}-${suit}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// DEALING
// ============================================================

export function dealInitial(
  players: Player[],
  deck: Card[]
): { players: Player[]; table: Card[]; remainingDeck: Card[] } {
  const shuffled = shuffleDeck(deck);
  let idx = 0;

  const updatedPlayers = players.map((player) => {
    const hand = shuffled.slice(idx, idx + CARDS_PER_PLAYER);
    idx += CARDS_PER_PLAYER;
    return {
      ...player,
      hand,
      captures: [],
      announcedRonda: false,
      announcedTringa: false,
    };
  });

  const table = shuffled.slice(idx, idx + TABLE_CARDS);
  idx += TABLE_CARDS;
  const remainingDeck = shuffled.slice(idx);

  return { players: updatedPlayers, table, remainingDeck };
}

export function dealMore(
  players: Player[],
  deck: Card[]
): { players: Player[]; remainingDeck: Card[] } {
  const cardsEach = Math.min(CARDS_PER_PLAYER, Math.floor(deck.length / players.length));
  if (cardsEach === 0) return { players, remainingDeck: deck };

  let idx = 0;
  const updatedPlayers = players.map((player) => {
    const newCards = deck.slice(idx, idx + cardsEach);
    idx += cardsEach;
    return {
      ...player,
      hand: [...player.hand, ...newCards],
    };
  });

  return { players: updatedPlayers, remainingDeck: deck.slice(idx) };
}

// ============================================================
// RONDA/TRINGA DETECTION
// ============================================================

export function detectRondaTringa(hand: Card[]): Announcement[] {
  const valueCounts: Partial<Record<CardValue, number>> = {};
  for (const card of hand) {
    valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
  }

  const announcements: Announcement[] = [];
  for (const [valStr, count] of Object.entries(valueCounts)) {
    const val = Number(valStr) as CardValue;
    if (count! >= 3) {
      announcements.push({ playerId: '', type: 'tringa', value: val, count: count! });
    } else if (count! >= 2) {
      announcements.push({ playerId: '', type: 'ronda', value: val, count: count! });
    }
  }
  return announcements;
}

// ============================================================
// CAPTURE LOGIC
// ============================================================

export function findCaptures(card: Card, table: Card[]): Card[] {
  return table.filter((t) => t.value === card.value);
}

export function performCapture(
  player: Player,
  playedCard: Card,
  capturedCards: Card[],
  table: Card[]
): { updatedPlayer: Player; updatedTable: Card[] } {
  const newHand = player.hand.filter((c) => c.id !== playedCard.id);
  const newCaptures = [...player.captures, playedCard, ...capturedCards];
  const newTable = table.filter((c) => !capturedCards.some((cc) => cc.id === c.id));

  return {
    updatedPlayer: { ...player, hand: newHand, captures: newCaptures },
    updatedTable: newTable,
  };
}

export function placeOnTable(
  player: Player,
  card: Card,
  table: Card[]
): { updatedPlayer: Player; updatedTable: Card[] } {
  const newHand = player.hand.filter((c) => c.id !== card.id);
  return {
    updatedPlayer: { ...player, hand: newHand },
    updatedTable: [...table, card],
  };
}

// ============================================================
// SCORING
// ============================================================

export function calculateRoundScores(players: Player[]): RoundScore[] {
  // Count per player
  const counts = players.map((p) => ({
    playerId: p.id,
    totalCards: p.captures.length,
    orosCount: p.captures.filter((c) => c.suit === 'oros').length,
    hasSettebello: p.captures.some((c) => c.id === '07-oros'),
    sevensCount: p.captures.filter((c) => c.value === 7).length,
    rondaBonus: p.announcedRonda ? RONDA_BONUS : 0,
    tringaBonus: p.announcedTringa ? TRINGA_BONUS : 0,
  }));

  const maxCards = Math.max(...counts.map((c) => c.totalCards));
  const maxOros = Math.max(...counts.map((c) => c.orosCount));
  const maxSevens = Math.max(...counts.map((c) => c.sevensCount));

  // Check for ties (no point awarded if tied)
  const cardsTied = counts.filter((c) => c.totalCards === maxCards).length > 1;
  const orosTied = counts.filter((c) => c.orosCount === maxOros).length > 1;
  const sevensTied = counts.filter((c) => c.sevensCount === maxSevens).length > 1;

  return counts.map((c) => {
    const mostCards = !cardsTied && c.totalCards === maxCards;
    const mostOros = !orosTied && c.orosCount === maxOros;
    const mostSevens = !sevensTied && c.sevensCount === maxSevens;
    const settebello = c.hasSettebello;

    const total =
      (mostCards ? 1 : 0) +
      (mostOros ? 1 : 0) +
      (settebello ? 1 : 0) +
      (mostSevens ? 1 : 0) +
      c.rondaBonus +
      c.tringaBonus;

    return {
      playerId: c.playerId,
      mostCards,
      mostOros,
      settebello,
      mostSevens,
      rondaBonus: c.rondaBonus,
      tringaBonus: c.tringaBonus,
      total,
    };
  });
}

export function getWinner(state: GameState): Player | null {
  const winner = state.players.find((p) => p.score >= state.targetScore);
  return winner || null;
}

// ============================================================
// TURN MANAGEMENT
// ============================================================

export function getNextPlayerIndex(
  currentIndex: number,
  players: Player[]
): number {
  return (currentIndex + 1) % players.length;
}

export function allHandsEmpty(players: Player[]): boolean {
  return players.every((p) => p.hand.length === 0);
}

// ============================================================
// BOT AI
// ============================================================

export function botPlay(
  state: GameState
): { cardId: string; targetCardId?: string } {
  const bot = state.players[state.currentPlayerIndex];
  if (!bot || bot.hand.length === 0) {
    throw new Error('Bot has no cards');
  }

  // Priority: capture oros, capture 7s, capture anything, place lowest value
  let bestCard: Card | null = null;
  let bestTarget: Card | null = null;
  let bestPriority = -1;

  for (const card of bot.hand) {
    const captures = findCaptures(card, state.table);
    if (captures.length > 0) {
      for (const target of captures) {
        let priority = 1;
        // Prefer capturing oros
        if (target.suit === 'oros') priority += 3;
        if (card.suit === 'oros') priority += 1;
        // Prefer capturing 7s
        if (target.value === 7) priority += 2;
        if (card.value === 7 && card.suit === 'oros') priority -= 5; // don't waste settebello
        // Prefer settebello
        if (target.id === '07-oros') priority += 5;

        if (priority > bestPriority) {
          bestPriority = priority;
          bestCard = card;
          bestTarget = target;
        }
      }
    }
  }

  if (bestCard && bestTarget) {
    return { cardId: bestCard.id, targetCardId: bestTarget.id };
  }

  // No captures possible: play lowest value card (preserve 7s and oros)
  const sorted = [...bot.hand].sort((a, b) => {
    // Keep 7s, especially 7 of oros
    if (a.id === '07-oros') return 1;
    if (b.id === '07-oros') return -1;
    if (a.value === 7 && b.value !== 7) return 1;
    if (b.value === 7 && a.value !== 7) return -1;
    if (a.suit === 'oros' && b.suit !== 'oros') return 1;
    if (b.suit === 'oros' && a.suit !== 'oros') return -1;
    return a.value - b.value;
  });

  return { cardId: sorted[0].id };
}

export function botShouldAnnounce(bot: Player): boolean {
  const announcements = detectRondaTringa(bot.hand);
  return announcements.length > 0;
}

// ============================================================
// GAME STATE MANAGEMENT
// ============================================================

export function initGame(
  playerNames: string[],
  botCount: number,
  targetScore: number = DEFAULT_TARGET_SCORE
): GameState {
  const state = createInitialState(targetScore);
  let current = state;

  // Add human players
  for (let i = 0; i < playerNames.length; i++) {
    current = gameReducer(current, {
      type: 'JOIN',
      playerId: `player-${i + 1}`,
      playerName: playerNames[i],
      isBot: false,
    });
  }

  // Add bots
  const botNames = ['Hamza', 'Fatima', 'Youssef', 'Amina'];
  for (let i = 0; i < botCount; i++) {
    current = gameReducer(current, {
      type: 'JOIN',
      playerId: `bot-${i + 1}`,
      playerName: botNames[i % botNames.length],
      isBot: true,
    });
  }

  current = gameReducer(current, { type: 'START_GAME' });
  return current;
}

export function createInitialState(
  targetScore: number = DEFAULT_TARGET_SCORE
): GameState {
  return {
    phase: 'waiting',
    players: [],
    currentPlayerIndex: 0,
    table: [],
    deck: [],
    announcements: [],
    roundNumber: 0,
    lastCapture: null,
    winnerId: null,
    targetScore,
    dealCount: 0,
  };
}

export function createBots(count: number): GameAction[] {
  const botNames = ['Hamza', 'Fatima', 'Youssef', 'Amina'];
  return Array.from({ length: Math.min(count, botNames.length) }, (_, i) => ({
    type: 'JOIN' as const,
    playerId: `bot-${i + 1}`,
    playerName: botNames[i],
    isBot: true,
  }));
}

// ============================================================
// REDUCER
// ============================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'JOIN': {
      if (state.phase !== 'waiting') return state;
      if (state.players.length >= MAX_PLAYERS) return state;
      if (state.players.find((p) => p.id === action.playerId)) return state;

      const newPlayer: Player = {
        id: action.playerId,
        name: action.playerName,
        hand: [],
        captures: [],
        score: 0,
        isBot: action.isBot || false,
        announcedRonda: false,
        announcedTringa: false,
      };

      return {
        ...state,
        players: [...state.players, newPlayer],
      };
    }

    case 'START_GAME': {
      if (state.players.length < MIN_PLAYERS) return state;

      const deck = createDeck();
      const { players, table, remainingDeck } = dealInitial(state.players, deck);

      return {
        ...state,
        phase: 'announcing',
        players,
        table,
        deck: remainingDeck,
        currentPlayerIndex: 0,
        announcements: [],
        roundNumber: state.roundNumber + 1,
        lastCapture: null,
        dealCount: 1,
      };
    }

    case 'ANNOUNCE_RONDA': {
      if (state.phase !== 'announcing') return state;
      const pIdx = state.players.findIndex((p) => p.id === action.playerId);
      if (pIdx === -1) return state;

      const player = state.players[pIdx];
      const detected = detectRondaTringa(player.hand);

      if (detected.length === 0) return state;

      const newAnnouncements: Announcement[] = detected.map((a) => ({
        ...a,
        playerId: player.id,
      }));

      const hasTringa = detected.some((a) => a.type === 'tringa');
      const updatedPlayers = [...state.players];
      updatedPlayers[pIdx] = {
        ...player,
        announcedRonda: true,
        announcedTringa: hasTringa,
      };

      const nextIdx = getNextPlayerIndex(pIdx, state.players);
      const allDone = nextIdx <= pIdx; // wrapped around

      return {
        ...state,
        phase: allDone ? 'playing' : 'announcing',
        players: updatedPlayers,
        currentPlayerIndex: allDone ? 0 : nextIdx,
        announcements: [...state.announcements, ...newAnnouncements],
      };
    }

    case 'SKIP_ANNOUNCE': {
      if (state.phase !== 'announcing') return state;
      const pIdx = state.players.findIndex((p) => p.id === action.playerId);
      if (pIdx === -1) return state;

      const nextIdx = getNextPlayerIndex(pIdx, state.players);
      const allDone = nextIdx <= pIdx;

      return {
        ...state,
        phase: allDone ? 'playing' : 'announcing',
        currentPlayerIndex: allDone ? 0 : nextIdx,
      };
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state;

      const playerIndex = state.players.findIndex((p) => p.id === action.playerId);
      if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return state;

      const player = state.players[playerIndex];
      const playedCard = player.hand.find((c) => c.id === action.cardId);
      if (!playedCard) return state;

      const updatedPlayers = [...state.players];
      let newTable = state.table;
      let lastCapture = state.lastCapture;

      if (action.targetCardId) {
        // Attempt capture
        const targetCard = state.table.find((c) => c.id === action.targetCardId);
        if (!targetCard || targetCard.value !== playedCard.value) {
          // Invalid capture, just place on table
          const result = placeOnTable(player, playedCard, state.table);
          updatedPlayers[playerIndex] = result.updatedPlayer;
          newTable = result.updatedTable;
        } else {
          // Capture all matching cards on the table
          const allMatches = findCaptures(playedCard, state.table);
          const result = performCapture(player, playedCard, allMatches, state.table);
          updatedPlayers[playerIndex] = result.updatedPlayer;
          newTable = result.updatedTable;
          lastCapture = { playerId: player.id, cards: [playedCard, ...allMatches] };
        }
      } else {
        // No target: check if there's a possible capture
        const possibleCaptures = findCaptures(playedCard, state.table);
        if (possibleCaptures.length > 0) {
          // Auto-capture all matching
          const result = performCapture(player, playedCard, possibleCaptures, state.table);
          updatedPlayers[playerIndex] = result.updatedPlayer;
          newTable = result.updatedTable;
          lastCapture = { playerId: player.id, cards: [playedCard, ...possibleCaptures] };
        } else {
          // Place on table
          const result = placeOnTable(player, playedCard, state.table);
          updatedPlayers[playerIndex] = result.updatedPlayer;
          newTable = result.updatedTable;
        }
      }

      // Check if all hands are empty
      if (allHandsEmpty(updatedPlayers)) {
        // Check if deck has more cards to deal
        if (state.deck.length > 0) {
          return {
            ...state,
            phase: 'playing',
            players: updatedPlayers,
            table: newTable,
            lastCapture,
            currentPlayerIndex: getNextPlayerIndex(playerIndex, updatedPlayers),
          };
        }

        // Last player to capture gets remaining table cards
        if (lastCapture && newTable.length > 0) {
          const lastCapturer = updatedPlayers.findIndex((p) => p.id === lastCapture!.playerId);
          if (lastCapturer !== -1) {
            updatedPlayers[lastCapturer] = {
              ...updatedPlayers[lastCapturer],
              captures: [...updatedPlayers[lastCapturer].captures, ...newTable],
            };
            newTable = [];
          }
        }

        // Calculate scores
        const scores = calculateRoundScores(updatedPlayers);
        const scoredPlayers = updatedPlayers.map((p) => {
          const s = scores.find((sc) => sc.playerId === p.id);
          return { ...p, score: p.score + (s?.total || 0) };
        });

        const winner = scoredPlayers.find((p) => p.score >= state.targetScore);

        if (winner) {
          return {
            ...state,
            phase: 'game_over',
            players: scoredPlayers,
            table: newTable,
            lastCapture,
            winnerId: winner.id,
          };
        }

        return {
          ...state,
          phase: 'round_end',
          players: scoredPlayers,
          table: newTable,
          lastCapture,
        };
      }

      // Check if hands empty but deck has cards -> need re-deal
      if (allHandsEmpty(updatedPlayers) && state.deck.length > 0) {
        const { players: redealt, remainingDeck } = dealMore(updatedPlayers, state.deck);
        return {
          ...state,
          phase: 'playing',
          players: redealt,
          deck: remainingDeck,
          table: newTable,
          lastCapture,
          currentPlayerIndex: getNextPlayerIndex(playerIndex, redealt),
          dealCount: state.dealCount + 1,
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        table: newTable,
        lastCapture,
        currentPlayerIndex: getNextPlayerIndex(playerIndex, updatedPlayers),
      };
    }

    case 'NEXT_DEAL': {
      if (state.deck.length === 0) return state;

      const { players: redealt, remainingDeck } = dealMore(state.players, state.deck);
      return {
        ...state,
        players: redealt,
        deck: remainingDeck,
        currentPlayerIndex: 0,
        dealCount: state.dealCount + 1,
      };
    }

    case 'NEW_ROUND': {
      if (state.phase !== 'round_end') return state;

      const deck = createDeck();
      const resetPlayers = state.players.map((p) => ({
        ...p,
        hand: [],
        captures: [],
        announcedRonda: false,
        announcedTringa: false,
      }));
      const { players, table, remainingDeck } = dealInitial(resetPlayers, deck);

      return {
        ...state,
        phase: 'announcing',
        players,
        table,
        deck: remainingDeck,
        currentPlayerIndex: 0,
        announcements: [],
        roundNumber: state.roundNumber + 1,
        lastCapture: null,
        dealCount: 1,
      };
    }

    case 'RESET': {
      return createInitialState(state.targetScore);
    }

    default:
      return state;
  }
}

// ============================================================
// HELPERS
// ============================================================

export function getCurrentPlayer(state: GameState): Player | null {
  if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) {
    return null;
  }
  return state.players[state.currentPlayerIndex];
}

export function isPlayerTurn(state: GameState, playerId: string): boolean {
  const current = getCurrentPlayer(state);
  return current?.id === playerId && state.phase === 'playing';
}

export function formatCard(card: Card): string {
  return `${VALUE_NAMES[card.value]} de ${SUIT_NAMES[card.suit]}`;
}
