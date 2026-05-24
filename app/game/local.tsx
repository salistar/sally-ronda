/**
 * @file game/local.tsx
 * @description Local Ronda game screen (1 human vs 1 bot)
 * @project SallyCards - Ronda
 */

import React, { useReducer, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  GameState,
  GameAction,
  gameReducer,
  createInitialState,
  getCurrentPlayer,
  isPlayerTurn,
  createBots,
  botPlay,
  botShouldAnnounce,
  findCaptures,
} from '../../src/game/rondaEngine';
import {
  parseDifficulty,
  BOT_PRESETS,
  thinkDelay,
  shouldRandomize,
  difficultyBadge,
  difficultyColor,
} from '@sally/game-engine';
import { getCardImage, getCardBackImage } from '../../src/game/cardAssets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 58;
const CARD_HEIGHT = 87;

const PLAYER_ID = 'player-1';
const PLAYER_NAME = 'Vous';
const BRAND_COLOR = '#e74c3c';

export default function RondaLocalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ difficulty?: string }>();
  const difficulty = useMemo(() => parseDifficulty(params.difficulty), [params.difficulty]);
  const botConfig = BOT_PRESETS[difficulty];
  const [state, dispatch] = useReducer(gameReducer, createInitialState());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize game
  useEffect(() => {
    dispatch({ type: 'JOIN', playerId: PLAYER_ID, playerName: PLAYER_NAME });
    const bots = createBots(1);
    bots.forEach((action) => dispatch(action));
    const timer = setTimeout(() => dispatch({ type: 'START_GAME' }), 500);
    return () => {
      clearTimeout(timer);
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  // Handle announcing phase
  useEffect(() => {
    if (state.phase !== 'announcing') return;
    const current = getCurrentPlayer(state);
    if (!current) return;

    if (current.isBot) {
      botTimerRef.current = setTimeout(() => {
        if (botShouldAnnounce(current)) {
          dispatch({ type: 'ANNOUNCE_RONDA', playerId: current.id });
          setMessage(`${current.name} annonce Ronda!`);
        } else {
          dispatch({ type: 'SKIP_ANNOUNCE', playerId: current.id });
        }
      }, 800);
    } else {
      // Auto-skip announce for human (they can tap announce button)
      // Give them 3 seconds
      botTimerRef.current = setTimeout(() => {
        dispatch({ type: 'SKIP_ANNOUNCE', playerId: PLAYER_ID });
      }, 3000);
    }

    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, [state.phase, state.currentPlayerIndex]);

  // Bot play logic — délai dépendant du niveau + humanisation (shouldRandomize)
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const current = getCurrentPlayer(state);
    if (!current || !current.isBot) return;

    botTimerRef.current = setTimeout(() => {
      try {
        let move = botPlay(state);
        // Humanisation : en easy/medium le bot rate parfois la capture
        if (shouldRandomize(botConfig) && current.hand.length > 1) {
          const randomCard = current.hand[Math.floor(Math.random() * current.hand.length)];
          move = { cardId: randomCard.id, targetCardId: null } as any;
        }
        dispatch({
          type: 'PLAY_CARD',
          playerId: current.id,
          cardId: move.cardId,
          targetCardId: move.targetCardId,
        });
        if (move.targetCardId) {
          setMessage(`${current.name} capture!`);
        } else {
          setMessage(`${current.name} pose une carte`);
        }
      } catch {
        // Bot has no cards - should trigger redeal
      }
    }, thinkDelay(botConfig));

    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, [state.phase, state.currentPlayerIndex, botConfig]);

  // Clear message after delay
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleCardPress = useCallback((cardId: string) => {
    if (!isPlayerTurn(state, PLAYER_ID)) return;

    const player = state.players.find((p) => p.id === PLAYER_ID);
    if (!player) return;

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) return;

    // Check for possible captures
    const captures = findCaptures(card, state.table);

    if (captures.length > 0) {
      // Auto-capture (capture all matching)
      dispatch({
        type: 'PLAY_CARD',
        playerId: PLAYER_ID,
        cardId,
        targetCardId: captures[0].id,
      });
      setMessage('Capture!');
      setSelectedCardId(null);
    } else if (selectedCardId === cardId) {
      // Second tap: place on table
      dispatch({
        type: 'PLAY_CARD',
        playerId: PLAYER_ID,
        cardId,
      });
      setSelectedCardId(null);
    } else {
      setSelectedCardId(cardId);
    }
  }, [state, selectedCardId]);

  const handleAnnounce = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    dispatch({ type: 'ANNOUNCE_RONDA', playerId: PLAYER_ID });
    setMessage('Ronda annoncee!');
  }, []);

  const handleNewRound = useCallback(() => {
    dispatch({ type: 'NEW_ROUND' });
    setMessage('');
  }, []);

  const handlePlayAgain = useCallback(() => {
    dispatch({ type: 'RESET' });
    dispatch({ type: 'JOIN', playerId: PLAYER_ID, playerName: PLAYER_NAME });
    const bots = createBots(1);
    bots.forEach((action) => dispatch(action));
    setTimeout(() => dispatch({ type: 'START_GAME' }), 300);
  }, []);

  const humanPlayer = state.players.find((p) => p.id === PLAYER_ID);
  const botPlayer = state.players.find((p) => p.isBot);
  const isMyTurn = isPlayerTurn(state, PLAYER_ID);
  const isAnnouncing = state.phase === 'announcing' && getCurrentPlayer(state)?.id === PLAYER_ID;

  return (
    <LinearGradient colors={['#1a0a0a', '#2d1111', '#1a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ronda</Text>
          <View style={[styles.diffBadge, { backgroundColor: difficultyColor(difficulty), marginRight: 6 }]}>
            <Text style={styles.diffBadgeText}>{difficultyBadge(difficulty)}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Manche {state.roundNumber}</Text>
          </View>
        </View>

        {/* Opponent area */}
        <View style={styles.opponentArea}>
          <View style={styles.opponentInfo}>
            <Ionicons name="person-circle" size={28} color="#888" />
            <Text style={styles.opponentName}>{botPlayer?.name || 'Bot'}</Text>
            <Text style={styles.opponentScore}>Score: {botPlayer?.score || 0}</Text>
            <Text style={styles.cardCount}>{botPlayer?.hand.length || 0} cartes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opponentHand}>
            {botPlayer?.hand.map((_, i) => (
              <Image key={i} source={getCardBackImage()} style={styles.smallCard} />
            ))}
          </ScrollView>
        </View>

        {/* Table */}
        <View style={styles.tableArea}>
          <Text style={styles.tableLabel}>Table ({state.table.length} cartes)</Text>
          <View style={styles.tableCards}>
            {state.table.map((card) => (
              <Image key={card.id} source={getCardImage(card.id)} style={styles.tableCard} />
            ))}
            {state.table.length === 0 && (
              <Text style={styles.emptyTable}>Table vide</Text>
            )}
          </View>
          <View style={styles.deckInfo}>
            <Text style={styles.deckText}>Pioche: {state.deck.length}</Text>
          </View>
        </View>

        {/* Status / Message */}
        <View style={styles.statusBar}>
          {message ? (
            <Text style={styles.messageText}>{message}</Text>
          ) : state.phase === 'playing' ? (
            <Text style={styles.statusText}>
              {isMyTurn ? 'Votre tour - Tapez une carte' : `${getCurrentPlayer(state)?.name} joue...`}
            </Text>
          ) : state.phase === 'announcing' && isAnnouncing ? (
            <View style={styles.announceBar}>
              <Text style={styles.statusText}>Annoncer Ronda?</Text>
              <TouchableOpacity style={styles.announceButton} onPress={handleAnnounce}>
                <Text style={styles.announceButtonText}>RONDA!</Text>
              </TouchableOpacity>
            </View>
          ) : state.phase === 'round_end' ? (
            <View style={styles.roundEndBar}>
              <Text style={styles.statusText}>Manche terminee!</Text>
              <TouchableOpacity style={styles.actionButton} onPress={handleNewRound}>
                <Text style={styles.actionButtonText}>Manche suivante</Text>
              </TouchableOpacity>
            </View>
          ) : state.phase === 'game_over' ? (
            <View style={styles.gameOverBar}>
              <Text style={styles.gameOverText}>
                {state.winnerId === PLAYER_ID ? 'Vous avez gagne!' : `${state.players.find(p => p.id === state.winnerId)?.name} a gagne!`}
              </Text>
              <TouchableOpacity style={styles.actionButton} onPress={handlePlayAgain}>
                <Text style={styles.actionButtonText}>Rejouer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.statusText}>En attente...</Text>
          )}
        </View>

        {/* Captures count */}
        <View style={styles.capturesBar}>
          <Text style={styles.capturesText}>
            Vos captures: {humanPlayer?.captures.length || 0}
          </Text>
          <Text style={styles.capturesText}>Score: {humanPlayer?.score || 0}</Text>
        </View>

        {/* Player hand */}
        <View style={styles.handArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handContainer}
          >
            {humanPlayer?.hand.map((card) => {
              const isSelected = selectedCardId === card.id;
              const captures = findCaptures(card, state.table);
              const canCapture = captures.length > 0;

              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => handleCardPress(card.id)}
                  disabled={!isMyTurn}
                  activeOpacity={0.7}
                  style={[
                    styles.handCardWrapper,
                    isSelected && styles.selectedCard,
                    canCapture && isMyTurn && styles.capturableCard,
                  ]}
                >
                  <Image source={getCardImage(card.id)} style={styles.handCard} />
                  {canCapture && isMyTurn && (
                    <View style={styles.captureBadge}>
                      <Text style={styles.captureBadgeText}>!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  scoreContainer: {
    backgroundColor: `${BRAND_COLOR}22`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreLabel: { color: BRAND_COLOR, fontSize: 12, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  opponentArea: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  opponentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  opponentName: { color: '#ccc', fontSize: 14, fontWeight: '700' },
  opponentScore: { color: '#888', fontSize: 12 },
  cardCount: { color: '#666', fontSize: 11 },
  opponentHand: {
    flexDirection: 'row',
    gap: 2,
    paddingVertical: 4,
  },
  smallCard: {
    width: 32,
    height: 48,
    borderRadius: 4,
  },
  tableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tableLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tableCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    minHeight: CARD_HEIGHT + 10,
    alignItems: 'center',
  },
  tableCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTable: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  deckInfo: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  deckText: { color: '#888', fontSize: 11 },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  messageText: {
    color: BRAND_COLOR,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  announceBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  announceButton: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  announceButtonText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  roundEndBar: { alignItems: 'center', gap: 8 },
  gameOverBar: { alignItems: 'center', gap: 8 },
  gameOverText: { color: '#fbbf24', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  actionButton: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  capturesBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  capturesText: { color: '#888', fontSize: 11 },
  handArea: {
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  handContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  handCardWrapper: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#fbbf24',
    transform: [{ translateY: -8 }],
  },
  capturableCard: {
    borderColor: `${BRAND_COLOR}88`,
  },
  handCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
  },
  captureBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
