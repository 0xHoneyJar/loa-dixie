/**
 * Adaptive Exploration — UCB1 & Epsilon-Greedy Model Selection.
 *
 * UCB1 (Upper Confidence Bound) as an opt-in alternative to epsilon-greedy.
 * UCB1 adaptively explores by computing an exploration bonus inversely
 * proportional to the number of observations: models with fewer observations
 * get a larger bonus, ensuring underexplored models are visited.
 *
 * Formula: score = mean_quality + c * sqrt(ln(total) / model_observations)
 * Default c = sqrt(2) (standard UCB1 constant).
 *
 * @since cycle-009 Sprint 5 — Tasks 5.1, 5.2, 5.3 (FR-9)
 */

export type ExplorationStrategy = 'epsilon-greedy' | 'ucb1';

export interface ExplorationConfig {
  strategy: ExplorationStrategy;
  /** For epsilon-greedy: exploration probability (0-1). Default: 0.1 */
  epsilon?: number;
  /** For UCB1: exploration constant. Default: sqrt(2) ≈ 1.414 */
  ucb1_c?: number;
  /** Seeded PRNG for deterministic tie-breaking. */
  seed?: number;
}

export interface ModelObservation {
  model_id: string;
  observation_count: number;
  mean_quality: number;
}

/**
 * Mulberry32 seeded PRNG — deterministic random number generator.
 * Matches the existing pattern from conviction-boundary.ts.
 *
 * @param seed - Integer seed value
 * @returns Function that returns pseudo-random numbers in [0, 1)
 */
export function createPRNG(seed?: number): () => number {
  let state = seed ?? Math.floor(Math.random() * 2 ** 32);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute UCB1 score for a model.
 *
 * Returns Infinity for unobserved models (always explore first).
 * Otherwise: mean_quality + c * sqrt(ln(total) / model_observations).
 *
 * @param model - Model observation data
 * @param totalObservations - Sum of all model observations
 * @param c - Exploration constant (default: sqrt(2))
 * @returns UCB1 score (higher = more worthy of selection)
 */
export function computeUCB1Score(
  model: ModelObservation,
  totalObservations: number,
  c: number = Math.SQRT2,
): number {
  if (model.observation_count === 0) return Infinity;
  if (totalObservations === 0) return Infinity;

  return (
    model.mean_quality +
    c * Math.sqrt(Math.log(totalObservations) / model.observation_count)
  );
}

/**
 * Select the best model according to the configured strategy.
 *
 * - epsilon-greedy: with probability epsilon, select random; otherwise best
 * - ucb1: select model with highest UCB1 score; PRNG tie-breaking
 *
 * @param models - Available model observations
 * @param config - Exploration configuration
 * @param prng - Seeded PRNG for randomness
 * @returns model_id of the selected model
 */
export function selectModel(
  models: ModelObservation[],
  config: ExplorationConfig,
  prng: () => number,
): string {
  if (models.length === 0) {
    throw new Error('Cannot select from empty model list');
  }

  if (models.length === 1) {
    return models[0].model_id;
  }

  if (config.strategy === 'epsilon-greedy') {
    return selectEpsilonGreedy(models, config.epsilon ?? 0.1, prng);
  }

  return selectUCB1(models, config.ucb1_c ?? Math.SQRT2, prng);
}

function selectEpsilonGreedy(
  models: ModelObservation[],
  epsilon: number,
  prng: () => number,
): string {
  // Explore: random selection with probability epsilon
  if (prng() < epsilon) {
    const idx = Math.floor(prng() * models.length);
    return models[idx].model_id;
  }

  // Exploit: select highest mean quality, break ties with PRNG
  let best = models[0];
  for (let i = 1; i < models.length; i++) {
    if (
      models[i].mean_quality > best.mean_quality ||
      (models[i].mean_quality === best.mean_quality && prng() < 0.5)
    ) {
      best = models[i];
    }
  }
  return best.model_id;
}

function selectUCB1(
  models: ModelObservation[],
  c: number,
  prng: () => number,
): string {
  const totalObs = models.reduce((sum, m) => sum + m.observation_count, 0);

  let bestScore = -Infinity;
  let bestModel = models[0];

  for (const model of models) {
    const score = computeUCB1Score(model, totalObs, c);
    if (
      score > bestScore ||
      (score === bestScore && prng() < 0.5)
    ) {
      bestScore = score;
      bestModel = model;
    }
  }

  return bestModel.model_id;
}
