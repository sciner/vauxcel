import { settings } from '../settings.js';

let supported: boolean | undefined;

/**
 * Helper for checking for WebGL support.
 * @memberof PIXI.utils
 * @function isWebGLSupported
 * @returns {boolean} Is WebGL supported.
 */
export function isWebGLSupported(): boolean
{
    if (typeof supported === 'undefined')
    {
        supported = (function supported(): boolean
        {
            const contextOptions = {
                stencil: true,
                failIfMajorPerformanceCaveat: settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT,
            };

            try
            {
                if (!settings.ADAPTER.getWebGLRenderingContext())
                {
                    return false;
                }

                const canvas = settings.ADAPTER.createCanvas();
                let gl = (
                    canvas.getContext('webgl2', contextOptions)
                ) as WebGL2RenderingContext | null;

                const success = !!gl?.getContextAttributes()?.stencil;

                if (gl)
                {
                    const loseContext = gl.getExtension('WEBGL_lose_context');

                    if (loseContext)
                    {
                        loseContext.loseContext();
                    }
                }

                gl = null;

                return success;
            }
            catch (e)
            {
                return false;
            }
        })();
    }

    return supported;
}
