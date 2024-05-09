import type { LoaderParser } from './parsers/LoaderParser.js';

/**
 * A promise and parser pair
 * @memberof assets
 */
export interface PromiseAndParser
{
    /** the promise that is loading the asset */
    promise: Promise<any>
    /** the parser that is loading the asset */
    parser: LoaderParser
}
