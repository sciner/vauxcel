import { isMobileLib } from './isMobileLib';
import type { isMobileResult } from './isMobileLib';

export const isMobile: isMobileResult = isMobileLib(globalThis.navigator);
