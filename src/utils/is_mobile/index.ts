import { isMobileLib } from './isMobileLib.js';

import type { isMobileResult } from './isMobileLib.js';

export const isMobile: isMobileResult = isMobileLib(globalThis.navigator);
