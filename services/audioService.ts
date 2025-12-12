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
  private fallbackAudio: HTMLAudioElement | null = null;

  constructor() {
    // Auto-initialize if permission was previously granted
    if (this.hasStoredPermission()) {
      this.initialize().catch(err => {
        console.warn('[AudioService] Auto-initialization failed:', err);
      });
    }

    // Create fallback HTML5 Audio element with data URI
    this.createFallbackAudio();
  }

  /**
   * Create fallback HTML5 audio element (works even if AudioContext fails)
   */
  private createFallbackAudio(): void {
    try {
      // Create a simple beep sound using data URI
      // This is a 440Hz sine wave tone
      const audioDataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGA0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAg+ltryxnYpBSh+zPHaizsIGGS56+mjUhALTKXh8LBfGQc3kdby0H8vBSJ1xvDglEcLElyx6OyrXBoJP5ra8sd4LQUmfM3y2Ys5CBdivOrmpVQRDEyk4vC0YhwGNY/W8tGAMQUjdMXw4JhICxFYr+ftrGMcCECY2PLJeDEFJXvL8N6NOAcVXrTp66pYFQxLo+HwsmEcBzaQ1vLQfzAFInXF8OCYSQwSV7Dn7axkGwhAl9nyynkxBSR6y/HejDoHE1yz6eyrWxYMSqPi8LFhGwc0j9by0X8xBSF0xPDgmUoNElew6O2tZhwIP5fZ88p6MwUje8rx3o08BxJctOnxpFQSDEqj4vC0YhwHNI/W8tGAMgUgc8Tw4JpKDRFXsOjurWgcCT+W2fPKejQFInnK8d6NPQgRXLPp8aRVEgxJouLwtGMcBzOP1vLSgTMFIHLF8OCaSw0RV7Do7q1oHQo/ltnzyn4xBSF6yvLejj0IEFuz6fGkVRINSaLi8LRjHAcyj9by04I0BSBxxPDgmkkNEFew6O2taRwLP5XY88t/MgUgecnx3o4+BxBatOrxpVUSEEmi4fC1ZBsHMY/W8dOCNAUfcMPw4JhIDg9WrujtrWgbCj+W2fTLgDQGH3jI8N+ORAgQWLPp8aRWEQ1JouHwtWQcCDGP1vHTgzUFHnHE8N+YSw4QVq7o7axnGwo+ldjyyoA0Bx94yO7fjUEIDViz6vGlVRIMSKLh8LVlGwcxjtbx04I1BR5xxPDfmUwOEFau6OWsZhoLP5XZ88qBNQYeeMfu34xBCA1Xs+rxpVYRDEih4fC1ZRoGMo7X8dODNQYdccPw35lNDhBWrerlq2cZCz+U2PLKgjUFHnnG7+CMQAgOV7Tp8aVWEQxIoeDwtWYbBzGO1/HTgzYGHXHD8N+ZTw0RV67p5atnGwg/lNjzy4I2Bh54xu/gjEAIEFez6fGlVhEMSKHg8LVnGwYxjtfy04M2Bh1xw+/fmU4OEVav6OWraBsIP5TX88qDNwYeeMbu34tBBw5Xs+nxpVYRDEig4PC1aBwGMY7X8dOEOAYdccPw35pODhFWr+flq2gbCT+U1/PKhDcGHnnG7t+LQggNV7Pp8qVXEQxHoODwtWgbBzCO1/PTgzYGHXDD8d+aTQ4RVa/n5axpGwk/lNn0yoQ4Bh14xu7fjT4HEFez6fOlWBELR6Dg8LVoHAYwjtfy04Q5Bh1ww/DfmlAOEFWv5+WsaRwJP5PZ88qEOQYdeMbu349CBg5Vs+nypVgSC0ef4O+1aRwHMI7X8tSEOQYecMPv35pPDhBVr+jlq2ocCj+T2fTKhDkFHnjH7t+NPQcQVbPq8aVZEgtHn+DwtWgcBi+O1/LUhDkGHnDD8N+ZUQ0PVbDo5atrHAk+ldnzyoQ6Bh14x+7fjT4HEFSz6vKlWhILRp/g77VpGwcvjtfx1IQ5Bh5ww+/fmVENEFWv6OWra';

      this.fallbackAudio = new Audio(audioDataUri);
      this.fallbackAudio.volume = 1.0;
      console.log('[AudioService] ✅ Fallback HTML5 Audio created');
    } catch (err) {
      console.error('[AudioService] ❌ Failed to create fallback audio:', err);
    }
  }

  /**
   * Play fallback beep sound using HTML5 Audio
   */
  private playFallbackSound(): boolean {
    if (!this.fallbackAudio) {
      console.warn('[AudioService] ⚠️ Fallback audio not available');
      return false;
    }

    try {
      // Reset and play
      this.fallbackAudio.currentTime = 0;
      const playPromise = this.fallbackAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[AudioService] 🔊 Fallback sound played successfully');

            // Play 3 more times with delay
            setTimeout(() => {
              if (this.fallbackAudio) {
                this.fallbackAudio.currentTime = 0;
                this.fallbackAudio.play();
              }
            }, 400);

            setTimeout(() => {
              if (this.fallbackAudio) {
                this.fallbackAudio.currentTime = 0;
                this.fallbackAudio.play();
              }
            }, 800);

            setTimeout(() => {
              if (this.fallbackAudio) {
                this.fallbackAudio.currentTime = 0;
                this.fallbackAudio.play();
              }
            }, 1200);
          })
          .catch(err => {
            console.error('[AudioService] ❌ Fallback sound play failed:', err);
          });
      }

      return true;
    } catch (err) {
      console.error('[AudioService] ❌ Error playing fallback sound:', err);
      return false;
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
    console.log('[AudioService] 🔊 playAlertSound() called');
    console.log('[AudioService] AudioContext state:', this.audioContext?.state || 'null');
    console.log('[AudioService] Has stored permission:', this.hasStoredPermission());

    if (!this.audioContext) {
      console.warn('[AudioService] ⚠️ AudioContext not initialized - attempting to initialize now...');
      // Try to initialize on-the-fly
      this.initialize().then(success => {
        if (success) {
          console.log('[AudioService] ✅ Auto-initialization successful, retrying sound...');
          this.playAlertSound();
        }
      });
      return false;
    }

    if (this.audioContext.state === 'suspended') {
      console.warn('[AudioService] ⚠️ AudioContext suspended - attempting to resume...');
      this.audioContext.resume().then(() => {
        console.log('[AudioService] ✅ AudioContext resumed, retrying sound...');
        this.playAlertSound();
      });
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

      console.log('[AudioService] 🔊 Alert sound played successfully (4 cycles - Web Audio API)');
      return true;
    } catch (err) {
      console.error('[AudioService] ❌ Error playing Web Audio API alert, trying fallback...', err);
      // Try fallback HTML5 Audio
      return this.playFallbackSound();
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
