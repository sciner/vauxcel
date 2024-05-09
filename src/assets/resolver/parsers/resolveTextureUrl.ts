import { ExtensionType } from '../../../extensions.js';
import { loadTextures } from '../../loader/parsers/textures/loadTextures.js';
import { Resolver } from '../Resolver.js';

import type { UnresolvedAsset } from '../../types.js';
import type { ResolveURLParser } from '../types.js';

/**
 * A parser that will resolve a texture url
 * @memberof assets
 */
export const resolveTextureUrl = {
    extension: ExtensionType.ResolveParser,
    test: loadTextures.test,
    parse: (value: string): UnresolvedAsset =>
        ({
            resolution: parseFloat(Resolver.RETINA_PREFIX.exec(value)?.[1] ?? '1'),
            format: value.split('.').pop(),
            src: value,
        }),
} as ResolveURLParser;
