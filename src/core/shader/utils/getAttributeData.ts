import { mapSize } from './mapSize.js';
import { mapType } from './mapType.js';

import type { IAttributeData } from '../Program.js';

/**
 * returns the attribute data from the program
 * @private
 * @param {WebGLProgram} [program] - the WebGL program
 * @param {WebGLRenderingContext} [gl] - the WebGL context
 * @returns {object} the attribute data for this program
 */
export function getAttributeData(program: WebGLProgram, gl: WebGLRenderingContextBase): {[key: string]: IAttributeData}
{
    const attributes: {[key: string]: IAttributeData} = {};

    const totalAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (let i = 0; i < totalAttributes; i++)
    {
        const attribData = gl.getActiveAttrib(program, i);

        if (attribData.name.startsWith('gl_'))
        {
            continue;
        }

        const type = mapType(gl, attribData.type);
        const data = {
            type,
            name: attribData.name,
            size: mapSize(type),
            location: gl.getAttribLocation(program, attribData.name),
        };

        attributes[attribData.name] = data;
    }

    return attributes;
}
