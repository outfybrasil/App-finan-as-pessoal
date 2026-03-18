
/**
 * Triggers haptic feedback if available on the device.
 * @param type 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy'
 */
export const triggerHaptic = (type: 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
            switch (type) {
                case 'success':
                    window.navigator.vibrate([10, 30, 10]); // Short double tap
                    break;
                case 'warning':
                    window.navigator.vibrate([30, 50, 10]);
                    break;
                case 'error':
                    window.navigator.vibrate([50, 50, 50]); // Triple buzz
                    break;
                case 'light':
                    window.navigator.vibrate(10); // Very subtle click
                    break;
                case 'medium':
                    window.navigator.vibrate(40);
                    break;
                case 'heavy':
                    window.navigator.vibrate(70);
                    break;
                default:
                    window.navigator.vibrate(10);
            }
        } catch (e) {
            // Ignore if haptics fail or permissions derived denied (rare in browsers)
            console.warn('Haptic feedback failed', e);
        }
    }
};
