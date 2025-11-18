/**
 * Leaderboard Service sử dụng PlayFab SDK
 * Quản lý việc submit score và hiển thị leaderboard
 */
import { PLAYFAB_CONFIG } from "../config/playfabConfig.js";

class LeaderboardService {
  constructor() {
    this.isInitialized = false;
    this.playFabClient = null;
    this.playFab = null;
    this.playerId = null;
    this.displayName = null;
    this.localScores = []; // Lưu scores local cho fallback
    this.customId = this.getOrCreateCustomId();
    this.localStorageKey = `leaderboard_scores_${PLAYFAB_CONFIG.LEADERBOARD_NAME}`;
  }

  getOrCreateCustomId() {
    const storageKey = "playfab_custom_id";
    let id = localStorage.getItem(storageKey);
    if (!id) {
      id = `PF_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      localStorage.setItem(storageKey, id);
    }
    return id;
  }

  /**
   * Khởi tạo PlayFab SDK
   */
  async initialize() {
    const sdk =
      typeof globalThis.PlayFabClient !== "undefined"
        ? globalThis.PlayFabClient
        : typeof globalThis.PlayFabClientSDK !== "undefined"
        ? globalThis.PlayFabClientSDK
        : null;

    if (!sdk || typeof globalThis.PlayFab === "undefined") {
      console.warn("PlayFab SDK not loaded, using local storage fallback");
      return false;
    }

    try {
      this.playFabClient = sdk;
      this.playFab = globalThis.PlayFab;
      
      // Set TitleId
      if (!PLAYFAB_CONFIG.TITLE_ID || PLAYFAB_CONFIG.TITLE_ID === "YOUR_TITLE_ID_HERE") {
        console.warn("PlayFab TitleId not configured, using local storage fallback");
        return false;
      }

      this.playFab.settings.titleId = PLAYFAB_CONFIG.TITLE_ID;
      this.isInitialized = true;

      // Login anonymous để có thể sử dụng PlayFab services
      await this.loginAnonymous();

      console.log("PlayFab SDK initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize PlayFab SDK:", error);
      return false;
    }
  }

  /**
   * Login anonymous vào PlayFab
   */
  async loginAnonymous() {
    return new Promise((resolve, reject) => {
      const request = {
        TitleId: PLAYFAB_CONFIG.TITLE_ID,
        CreateAccount: true,
        CustomId: this.customId,
      };

      this.playFabClient.LoginWithCustomID(request, (result, error) => {
        if (error) {
          console.error("PlayFab login failed:", error);
          reject(error);
          return;
        }

        if (result && result.data) {
          this.playerId = result.data.PlayFabId;
          this.displayName =
            result.data.PlayerProfile?.DisplayName || `Player_${this.playerId.substring(0, 8)}`;
          console.log("PlayFab login successful:", this.displayName);
          resolve(result.data);
        } else {
          reject(new Error("Login failed: No data returned"));
        }
      });
    });
  }

  /**
   * Submit score lên PlayFab Statistics (API cũ, hỗ trợ free tier)
   * PlayFab sẽ tự động tạo Statistics nếu chưa tồn tại
   * @param {number} score - Điểm số
   * @param {string} statisticName - Tên statistic (optional)
   */
  async submitScore(score, statisticName = null) {
    const statName =  PLAYFAB_CONFIG.LEADERBOARD_NAME;

    // Luôn lưu local làm backup
    this.saveScoreLocally(score);

    if (!this.isInitialized || !this.playerId) {
      console.warn("PlayFab not initialized, saving score locally only");
      return false;
    }

    try {
      return new Promise((resolve) => {
        // Sử dụng UpdatePlayerStatistics - API cũ hỗ trợ free tier
        // PlayFab sẽ tự động tạo Statistics nếu chưa tồn tại
        // Aggregation method mặc định sẽ là Last (có thể đổi thành Max trong Game Manager sau)
        const request = {
          Statistics: [
            {
              StatisticName: statName,
              Value: score,
            },
          ],
        };

        this.playFabClient.UpdatePlayerStatistics(request, (result, error) => {
          if (error) {
            console.error("Failed to submit score to PlayFab:", error);
            // Không reject, vì đã lưu local
            resolve(false);
            return;
          }

          if (result && result.data) {
            console.log(`Score ${score} submitted to PlayFab statistic: ${statName}`);
            console.log("Note: If this is the first time, PlayFab will auto-create the statistic");
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error("Error submitting score:", error);
      return false;
    }
  }

  /**
   * Lưu score vào localStorage (fallback)
   * @param {number} score - Điểm số
   */
  saveScoreLocally(score) {
    try {
      const scores = this.getLocalScores();
      scores.push({
        score,
        timestamp: Date.now(),
        username: this.displayName || "Guest",
        playerId: this.playerId || `local_${Date.now()}`,
      });

      // Sắp xếp theo score giảm dần và chỉ giữ top 100
      scores.sort((a, b) => b.score - a.score);
      const topScores = scores.slice(0, 100);

      localStorage.setItem(this.localStorageKey, JSON.stringify(topScores));
      this.localScores = topScores;
    } catch (error) {
      console.error("Failed to save score locally:", error);
    }
  }

  /**
   * Lấy scores từ localStorage
   * @returns {Array} Mảng scores
   */
  getLocalScores() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get local scores:", error);
      return [];
    }
  }

  /**
   * Lấy leaderboard data từ PlayFab sử dụng GetLeaderboardAroundPlayer (API cũ, hỗ trợ free tier)
   * @param {string} leaderboardName - Tên statistic
   * @param {number} limit - Số lượng entries (default: 10)
   * @returns {Promise<Array>} Mảng leaderboard entries
   */
  /**
   * Lấy top leaderboard (global) bắt đầu từ vị trí 0
   */
  async getTopLeaderboard(limit = 10) {
    const boardName = PLAYFAB_CONFIG.LEADERBOARD_NAME;

    if (!this.isInitialized || !this.playFabClient) {
      const localScores = this.getLocalScores();
      return localScores.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        username: entry.username,
        playerId: entry.playerId,
        timestamp: entry.timestamp,
      }));
    }

    return new Promise((resolve) => {
      const request = {
        StatisticName: boardName,
        StartPosition: 0,
        MaxResultsCount: limit,
      };

      this.playFabClient.GetLeaderboard(request, (result, error) => {
        if (error) {
          console.error("Failed to get top leaderboard:", error);
          const localScores = this.getLocalScores();
          resolve(
            localScores.slice(0, limit).map((entry, index) => ({
              rank: index + 1,
              score: entry.score,
              username: entry.username,
              playerId: entry.playerId,
              timestamp: entry.timestamp,
            }))
          );
          return;
        }

        const leaderboard = (result?.data?.Leaderboard || []).map((entry) => ({
          rank: entry.Position + 1,
          score: entry.StatValue,
          username: entry.DisplayName || `Player_${entry.PlayFabId.substring(0, 8)}`,
          playerId: entry.PlayFabId,
          timestamp: null,
        }));
        resolve(leaderboard);
      });
    });
  }

  /**
   * Lấy leaderboard xung quanh player hiện tại (đồng thời dùng làm fallback cho rank)
   */
  async getLeaderboard(leaderboardName = null, limit = 10) {
    const boardName = PLAYFAB_CONFIG.LEADERBOARD_NAME;

    if (!this.isInitialized || !this.playFabClient || !this.playerId) {
      // Fallback: trả về local scores
      const localScores = this.getLocalScores();
      return localScores.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        username: entry.username,
        playerId: entry.playerId,
        timestamp: entry.timestamp,
      }));
    }

    try {
      return new Promise((resolve) => {
        // Sử dụng GetLeaderboardAroundPlayer - API cũ hỗ trợ free tier
        const request = {
          StatisticName: boardName,
          PlayFabId: this.playerId,
          MaxResultsCount: Math.min(limit, 10), // API này giới hạn tối đa 10
        };

        this.playFabClient.GetLeaderboardAroundPlayer(request, (result, error) => {
          if (error) {
            console.error("Failed to get leaderboard from PlayFab:", error);
            // Fallback to local scores
            const localScores = this.getLocalScores();
            resolve(
              localScores.slice(0, limit).map((entry, index) => ({
                rank: index + 1,
                score: entry.score,
                username: entry.username,
                playerId: entry.playerId,
                timestamp: entry.timestamp,
              }))
            );
            return;
          }

          if (result && result.data && result.data.Leaderboard) {
            const leaderboard = result.data.Leaderboard.map((entry) => ({
              rank: entry.Position + 1, // PlayFab uses 0-based position
              score: entry.StatValue,
              username: entry.DisplayName || `Player_${entry.PlayFabId.substring(0, 8)}`,
              playerId: entry.PlayFabId,
              timestamp: null, // PlayFab doesn't return timestamp
            }));

            resolve(leaderboard);
          } else {
            // Fallback to local scores
            const localScores = this.getLocalScores();
            resolve(
              localScores.slice(0, limit).map((entry, index) => ({
                rank: index + 1,
                score: entry.score,
                username: entry.username,
                playerId: entry.playerId,
                timestamp: entry.timestamp,
              }))
            );
          }
        });
      });
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      // Fallback to local scores
      const localScores = this.getLocalScores();
      return localScores.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        username: entry.username,
        playerId: entry.playerId,
        timestamp: entry.timestamp,
      }));
    }
  }

  /**
   * Lấy rank của player hiện tại
   * @param {number} score - Điểm số của player
   * @returns {Promise<number>} Rank (1-based)
   */
  async getUserRank(score) {
    const entry = await this.getCurrentPlayerRankEntry();
    if (entry?.rank) return entry.rank;

    const leaderboard = await this.getLeaderboard(null, 100);
    const rank = leaderboard.findIndex((e) => e.score < score) + 1;
    return rank || leaderboard.length + 1;
  }

  async getCurrentPlayerRankEntry() {
    const boardName = PLAYFAB_CONFIG.LEADERBOARD_NAME;

    if (!this.isInitialized || !this.playFabClient || !this.playerId) {
      const localScores = this.getLocalScores();
      const idx = localScores.findIndex((entry) => entry.playerId === this.playerId);
      if (idx >= 0) {
        return {
          rank: idx + 1,
          score: localScores[idx].score,
          username: localScores[idx].username,
          playerId: localScores[idx].playerId,
        };
      }
      return null;
    }

    return new Promise((resolve) => {
      const request = {
        StatisticName: boardName,
        PlayFabId: this.playerId,
        MaxResultsCount: 1,
      };

      this.playFabClient.GetLeaderboardAroundPlayer(request, (result, error) => {
        if (error) {
          console.error("Failed to get player rank:", error);
          resolve(null);
          return;
        }

        const entry = result?.data?.Leaderboard?.[0];
        if (!entry) {
          resolve(null);
          return;
        }
        resolve({
          rank: entry.Position + 1,
          score: entry.StatValue,
          username: entry.DisplayName || `Player_${entry.PlayFabId.substring(0, 8)}`,
          playerId: entry.PlayFabId,
        });
      });
    });
  }

  /**
   * Lấy thông tin player hiện tại
   * @returns {Object|null} Player info
   */
  getPlayerInfo() {
    return {
      playerId: this.playerId,
      displayName: this.displayName,
    };
  }

  /**
   * Kiểm tra xem SDK đã sẵn sàng chưa
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.playerId !== null;
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
