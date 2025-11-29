/**
 * Device Identifier Utility
 * Generates and manages a unique device identifier for this tablet/browser.
 */

const DEVICE_ID_KEY = 'condo_guard_device_id';

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gets or creates a unique device identifier.
 * The identifier is stored in localStorage and persists across sessions.
 */
export function getDeviceIdentifier(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
}

/**
 * Gets device metadata for registration
 */
export function getDeviceMetadata(): any {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
    };
}

/**
 * Clears the device identifier (for testing/reset purposes)
 */
export function clearDeviceIdentifier(): void {
    localStorage.removeItem(DEVICE_ID_KEY);
}
