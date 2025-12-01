/**
 * Audio Service - Global audio management for incident alerts
 *
 * Handles:
 * - Persistent audio permissions (localStorage)
 * - Single AudioContext instance (singleton pattern)
 * - Automatic initialization on app load
 * - Alert sound generation
 */

class AudioService {
  private audioContext: AudioContext | null = null;
  private readonly STORAGE_KEY = 'audio_permission_enabled';

  constructor() {
    // Auto-initialize if permission was previously granted
    if (this.hasStoredPermission()) {
      this.initialize().catch(err => {
        console.warn('[AudioService] Auto-initialization failed:', err);
      });
    }
  }

  /**
   * Check if audio permission was previously granted
   */
  private hasStoredPermission(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  /**
   * Save audio permission to localStorage
   */
  private savePermission(enabled: boolean): void {
    localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Initialize AudioContext (call this on user interaction)
   * Returns true if successful, false otherwise
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[AudioService] ✅ AudioContext created');
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AudioService] ✅ AudioContext resumed');
      }

      this.savePermission(true);
      return true;
    } catch (err) {
      console.error('[AudioService] ❌ Initialization failed:', err);
      this.savePermission(false);
      return false;
    }
  }

  /**
   * Check if audio is enabled and ready
   */
  isEnabled(): boolean {
    return this.audioContext !== null &&
           this.audioContext.state === 'running' &&
           this.hasStoredPermission();
  }

  /**
   * Play alert sound (triple beep pattern repeated 4 times)
   * Returns true if sound was played, false if audio not initialized
   */
  playAlertSound(): boolean {
    if (!this.audioContext) {
      console.warn('[AudioService] ⚠️ AudioContext not initialized - call initialize() first');
      return false;
    }

    if (this.audioContext.state === 'suspended') {
      console.warn('[AudioService] ⚠️ AudioContext suspended - user interaction required');
      return false;
    }

    try {
      // Helper function to create a single beep
      const playBeep = (startTime: number, frequency: number, duration: number = 0.3) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'square'; // More attention-grabbing than sine

        // Louder volume
        gainNode.gain.setValueAtTime(0.6, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // CONTINUOUS ALERT PATTERN - Repeat the BIP-bip-BIP pattern 4 times
      const patternDuration = 1.2; // Duration of one BIP-bip-BIP cycle
      const pauseBetweenPatterns = 0.3; // Short pause between cycles
      const totalPatterns = 4; // Repeat 4 times

      for (let cycle = 0; cycle < totalPatterns; cycle++) {
        const cycleStart = this.audioContext.currentTime + (cycle * (patternDuration + pauseBetweenPatterns));

        // Triple beep pattern: HIGH-low-HIGH
        playBeep(cycleStart, 880, 0.3);           // High beep
        playBeep(cycleStart + 0.4, 440, 0.3);     // Low beep
        playBeep(cycleStart + 0.8, 880, 0.3);     // High beep
      }

      console.log('[AudioService] 🔊 Alert sound played successfully (4 cycles)');
      return true;
    } catch (err) {
      console.error('[AudioService] ❌ Error playing alert sound:', err);
      return false;
    }
  }

  /**
   * Test alert sound (initialize if needed, play sound, and confirm with user)
   */
  async testSound(): Promise<boolean> {
    const initialized = await this.initialize();

    if (!initialized) {
      return false;
    }

    const played = this.playAlertSound();

    if (played) {
      // Also trigger vibration if available
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    return played;
  }

  /**
   * Reset audio permission (for debugging/troubleshooting)
   */
  reset(): void {
    this.savePermission(false);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('[AudioService] 🔄 Audio service reset');
  }

  /**
   * Get current AudioContext state
   */
  getState(): string {
    if (!this.audioContext) return 'not-initialized';
    return this.audioContext.state;
  }
}

// Export singleton instance
export const audioService = new AudioService();
