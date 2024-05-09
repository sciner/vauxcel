import { ExtensionType } from '../../../extensions.js';
import { checkDataUrl } from '../../utils/checkDataUrl.js';
import { checkExtension } from '../../utils/checkExtension.js';
import { LoaderParserPriority } from './LoaderParser.js';

import type { LoaderParser } from './LoaderParser.js';

const validJSONExtension = '.json';
const validJSONMIME = 'application/json';

/**
 * A simple loader plugin for loading json data
 * @memberof assets
 */
export const loadJson = {
    extension: {
        type: ExtensionType.LoadParser,
        priority: LoaderParserPriority.Low,
    },

    name: 'loadJson',

    test(url: string): boolean
    {
        return checkDataUrl(url, validJSONMIME) || checkExtension(url, validJSONExtension);
    },

    async load<T>(url: string): Promise<T>
    {
        const response = await window.fetch(url);

        const json = await response.json();

        return json as T;
    },
} as LoaderParser;
