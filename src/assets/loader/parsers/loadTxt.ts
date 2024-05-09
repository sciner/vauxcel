import { ExtensionType } from '../../../extensions.js';
import { checkDataUrl } from '../../utils/checkDataUrl.js';
import { checkExtension } from '../../utils/checkExtension.js';
import { LoaderParserPriority } from './LoaderParser.js';

import type { LoaderParser } from './LoaderParser.js';

const validTXTExtension = '.txt';
const validTXTMIME = 'text/plain';

/**
 * A simple loader plugin for loading text data
 * @memberof assets
 */
export const loadTxt = {

    name: 'loadTxt',

    extension: {
        type: ExtensionType.LoadParser,
        priority: LoaderParserPriority.Low,
    },

    test(url: string): boolean
    {
        return checkDataUrl(url, validTXTMIME) || checkExtension(url, validTXTExtension);
    },

    async load(url: string): Promise<string>
    {
        const response = await window.fetch(url);

        const txt = await response.text();

        return txt;
    },
} as LoaderParser;
