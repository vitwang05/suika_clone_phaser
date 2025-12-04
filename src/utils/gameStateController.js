/**
 * Game State Controller
 * Quản lý trạng thái game và ẩn/hiện các thành phần
 */

export const GameState = {
  MENU: "MENU",           // Trạng thái menu (hiển thị nút tap to play)
  PLAYING: "PLAYING",     // Đang chơi
  PAUSED: "PAUSED",       // Tạm dừng
  GAME_OVER: "GAME_OVER", // Game over
};

export class GameStateController {
  constructor(scene) {
    this.scene = scene;
    this.currentState = null; // Khởi tạo là null để cho phép setState lần đầu tiên
    this.components = {
      // UI Components
      tapToPlayButton: null,
      scoreText: null,
      leaderboardButton: null,
      gameOverTestButton: null,
      
      // Game Components
      preview: null,
      nextPreview: null,
      powerUpSlots: [],
      
      // Physics
      matterWorld: null,
    };
    
    this.stateHandlers = {
      [GameState.MENU]: this.handleMenuState.bind(this),
      [GameState.PLAYING]: this.handlePlayingState.bind(this),
      [GameState.PAUSED]: this.handlePausedState.bind(this),
      [GameState.GAME_OVER]: this.handleGameOverState.bind(this),
    };
  }

  /**
   * Đăng ký component để quản lý
   */
  registerComponent(key, component) {
    this.components[key] = component;
  }

  /**
   * Đăng ký nhiều components cùng lúc
   */
  registerComponents(components) {
    Object.assign(this.components, components);
  }

  /**
   * Chuyển đổi trạng thái
   */
  setState(newState) {
    if (this.currentState === newState) return;
    
    const oldState = this.currentState;
    this.currentState = newState;
    
    // Gọi handler cho trạng thái mới
    if (this.stateHandlers[newState]) {
      this.stateHandlers[newState](oldState);
    }
  }

  /**
   * Lấy trạng thái hiện tại
   */
  getState() {
    return this.currentState;
  }

  /**
   * Kiểm tra xem có đang ở trạng thái nào đó không
   */
  isState(state) {
    return this.currentState === state;
  }

  /**
   * Hiển thị/ẩn component
   */
  setComponentVisible(key, visible) {
    const component = this.components[key];
    if (!component) {
      console.warn(`Component "${key}" not found in state controller`);
      return;
    }
    
    if (Array.isArray(component)) {
      component.forEach((comp) => {
        if (comp && typeof comp.setVisible === "function") {
          comp.setVisible(visible);
        }
      });
    } else {
      if (typeof component.setVisible === "function") {
        component.setVisible(visible);
      }
    }
  }

  /**
   * Bật/tắt component
   */
  setComponentActive(key, active) {
    const component = this.components[key];
    if (component) {
      if (Array.isArray(component)) {
        component.forEach((comp) => {
          if (comp && typeof comp.setActive === "function") {
            comp.setActive(active);
          }
        });
      } else {
        if (typeof component.setActive === "function") {
          component.setActive(active);
        }
      }
    }
  }

  /**
   * Handler cho trạng thái MENU
   */
  handleMenuState(oldState) {
    // Hiển thị nút tap to play
    this.setComponentVisible("tapToPlayButton", true);
    
    // Ẩn các thành phần game
    this.setComponentVisible("preview", false);
    this.setComponentVisible("nextPreview", false);
    this.setComponentVisible("scoreText", false);
    this.setComponentVisible("leaderboardButton", true);
    this.setComponentVisible("gameOverTestButton", false);
    this.setComponentVisible("powerUpSlots", false);
    
    // Tạm dừng physics (nếu đã được khởi tạo)
    if (this.components.matterWorld && typeof this.components.matterWorld.pause === "function") {
      this.components.matterWorld.pause();
    }
  }

  /**
   * Handler cho trạng thái PLAYING
   */
  handlePlayingState(oldState) {
    // Ẩn nút tap to play
    this.setComponentVisible("tapToPlayButton", false);
    
    // Hiển thị các thành phần game
    this.setComponentVisible("preview", true);
    this.setComponentVisible("nextPreview", true);
    this.setComponentVisible("scoreText", true);
    this.setComponentVisible("leaderboardButton", true);
    this.setComponentVisible("gameOverTestButton", true);
    this.setComponentVisible("powerUpSlots", true);
    
    // Tiếp tục physics (nếu đã được khởi tạo)
    if (this.components.matterWorld && typeof this.components.matterWorld.resume === "function") {
      this.components.matterWorld.resume();
    }
  }

  /**
   * Handler cho trạng thái PAUSED
   */
  handlePausedState(oldState) {
    // Tạm dừng physics (nếu đã được khởi tạo)
    if (this.components.matterWorld && typeof this.components.matterWorld.pause === "function") {
      this.components.matterWorld.pause();
    }
  }

  /**
   * Handler cho trạng thái GAME_OVER
   */
  handleGameOverState(oldState) {
    // Ẩn các thành phần game
    this.setComponentVisible("preview", false);
    this.setComponentVisible("nextPreview", false);
    this.setComponentVisible("powerUpSlots", false);
    
    // Giữ lại score và leaderboard button
    this.setComponentVisible("scoreText", true);
    this.setComponentVisible("leaderboardButton", true);
    this.setComponentVisible("gameOverTestButton", false);
    
    // Tạm dừng physics (nếu đã được khởi tạo)
    if (this.components.matterWorld && typeof this.components.matterWorld.pause === "function") {
      this.components.matterWorld.pause();
    }
  }
}

