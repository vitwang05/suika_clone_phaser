// Game Constants
export const GAME_CONFIG = {
  WIDTH: 720,
  HEIGHT: 1280,
  CENTER_X: 360,
  CENTER_Y: 640,
  BACKGROUND_COLOR: "#2d2d2d",
  GRAVITY: { y: 1 },
};

export const PREVIEW_POSITIONS = {
  CURRENT: { x: 360, y: 80 },
  NEXT: { x: 600, y: 140 },
  PREVIEW_MIN_X: 25,
  PREVIEW_MAX_X: 695,
};

export const PHYSICS_CONFIG = {
  RESTITUTION: 0.5,
  FRICTION: 0.1,
};

export const ANIMATION_DURATIONS = {
  MERGE_FADE: 100,
  FLASH: 200,
  SCREEN_SHAKE_MERGE: 80,
  SCREEN_SHAKE_GAMEOVER: 200,
  RESTART_DELAY: 2000,
};

export const FLASH_CONFIG = {
  ALPHA_START: 0.6,
  ALPHA_END: 0,
  SCALE_START: 1,
  SCALE_END: 1.8,
  SIZE_MULTIPLIER: 1.2,
  COLOR: 0xffffff,
};

// Interaction / flow timing
export const DROP_COOLDOWN_MS = 1800; // 1.8s (có thể chỉnh 1500-2000ms)

// Scoring
export const SCORE_VALUES = {
  DROP: 10,
  MERGE: 50,
};

