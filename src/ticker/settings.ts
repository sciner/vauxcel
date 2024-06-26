import { settings } from '@pixi/settings/index.js';
import { deprecation } from '@pixi/utils/index.js';
import { Ticker } from './Ticker.js';

Object.defineProperties(settings, {
    /**
     * Target frames per millisecond.
     * @static
     * @name TARGET_FPMS
     * @memberof PIXI.settings
     * @type {number}
     * @deprecated since 7.1.0
     * @see PIXI.Ticker.targetFPMS
     */
    TARGET_FPMS: {
        get()
        {
            return Ticker.targetFPMS;
        },
        set(value: number)
        {
            // #if _DEBUG
            deprecation('7.1.0', 'settings.TARGET_FPMS is deprecated, use Ticker.targetFPMS');
            // #endif

            Ticker.targetFPMS = value;
        },
    },
});

export { settings };
