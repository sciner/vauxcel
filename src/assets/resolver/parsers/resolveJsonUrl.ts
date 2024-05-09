import { ExtensionType } from '../../../extensions.js';
import { Resolver } from '../Resolver.js';
import { resolveTextureUrl } from './resolveTextureUrl.js';

import type { ResolveURLParser } from '../types';

/**
 * A parser that will resolve a json urls resolution for spritesheets
 * e.g. `assets/spritesheet@1x.json`
 * @memberof assets
 */
export const resolveJsonUrl = {
    extension: ExtensionType.ResolveParser,
    test: (value: string): boolean =>
        Resolver.RETINA_PREFIX.test(value) && value.endsWith('.json'),
    parse: resolveTextureUrl.parse,
} as ResolveURLParser;
