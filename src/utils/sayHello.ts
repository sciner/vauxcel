import { DOMAdapter } from '../environment/adapter';

let saidHello = false;

export const VERSION = '$_VERSION';

/**
 * Prints out the version and renderer information for this running instance of PixiJS.
 * @param type - The name of the renderer this instance is using.
 * @returns {void}
 */
export function sayHello(type: string): void
{
    if (saidHello)
    {
        return;
    }

    if (DOMAdapter.get().getNavigator().userAgent.toLowerCase().indexOf('chrome') > -1)
    {
        const args = [
            `%c  %c  %c  %c  %c Vauxcel %c v${VERSION} (${type}) https://www.pixijs.com/ https://tesera.io/\n\n`,
            'background: #E72264; padding:5px 0;',
            'background: #6CA2EA; padding:5px 0;',
            'background: #B5D33D; padding:5px 0;',
            'background: #FED23F; padding:5px 0;',
            'color: #FFFFFF; background: #E72264; padding:5px 0;',
            'color: #E72264; background: #FFFFFF; padding:5px 0;',
        ];

        globalThis.console.log(...args);
    }
    else if (globalThis.console)
    {
        globalThis.console.log(`Vauxcel ${VERSION} - ${type} - http://www.pixijs.com/ https://tesera.io/`);
    }

    saidHello = true;
}
