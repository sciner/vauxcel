import { IRenderingContext } from '../../IRenderer.js';
import { BufferSystem } from '../BufferSystem.js';
import { getAttributeInfoFromFormat } from './getAttributeInfoFromFormat.js';
import { getGlTypeFromFormat } from './getGlTypeFromFormat.js';

import type { Attribute } from '../Attribute.js';
import type { Buffer } from '../Buffer.js';
import type { Geometry } from '../Geometry.js';

export type AttributeBaseCallback = (gl: IRenderingContext, locations: number[], baseInstance: number,
    bufferSystem?: BufferSystem, buffers?: Buffer[], lastBuffer?: Buffer)
=> Buffer;

export type AttributeBaseCallbackStruct = { syncFunc: AttributeBaseCallback, bufSyncCount: number,
    bufFirstIndex: number, stride: number};

export const attribSyncCache: Record<string, AttributeBaseCallbackStruct> = {};

export function generateAttributesSignature(attributes: Attribute[])
{
    let s = '';

    for (let i = 0; i < attributes.length; i++)
    {
        const attr = attributes[i];

        if (i > 0)
        {
            s += '|';
        }
        s += `${attr.buffer}/${attr.format}/${attr.stride}/${attr.offset}`;
    }

    return s;
}

export function generateAttributeSync(attributes: Attribute[], genBuffers: boolean): AttributeBaseCallbackStruct
{
    const funcFragments = [];
    let lastBuffer = -1;
    let bufSyncCount = 0;

    for (let i = 0; i < attributes.length; i++)
    {
        const attr = attributes[i];
        const bufInd = attr.buffer_index;

        if (genBuffers && lastBuffer !== bufInd)
        {
            lastBuffer = bufInd;
            funcFragments.push(`
if (lastBuffer !== buffers[${bufInd}]) {
    lastBuffer = buffers[${bufInd}];
    bufferSystem.bind(lastBuffer);
}`);
            bufSyncCount++;
        }

        const attr_info = getAttributeInfoFromFormat(attr.format);
        const type = getGlTypeFromFormat(attr.format);

        if (attr.format.substring(1, 4) === 'int')
        {
            // eslint-disable-next-line max-len
            funcFragments.push(`gl.vertexAttribIPointer(locations[${i}], ${attr_info.size}, ${type}, ${attr.stride}, instOffset * ${attr.stride} + ${attr.offset})`);
        }
        else
        {
            // eslint-disable-next-line max-len
            funcFragments.push(`gl.vertexAttribPointer(locations[${i}], ${attr_info.size}, ${type}, ${attr_info.normalised}, ${attr.stride}, instOffset * ${attr.stride} + ${attr.offset})\n`);
        }
    }
    let syncFunc: AttributeBaseCallback;

    if (genBuffers)
    {
        funcFragments.push(`return lastBuffer;`);
        // eslint-disable-next-line no-new-func
        syncFunc = new Function('gl', 'locations', 'instOffset',
            'bufferSystem', 'buffers', 'lastBuffer', funcFragments.join('\n')) as AttributeBaseCallback;
    }
    else
    {
        // eslint-disable-next-line no-new-func,max-len
        syncFunc = new Function('gl', 'locations', 'instOffset', funcFragments.join('\n')) as AttributeBaseCallback;
    }

    return {
        syncFunc,
        bufSyncCount,
        bufFirstIndex: attributes[0].buffer_index,
        stride: attributes[0].stride
    };
}

export function generateAttribSyncForGeom(geom: Geometry)
{
    const { attributes } = geom;
    let firstBuf = -1;
    let genBuffers = false;
    const instAttribs: Attribute[] = [];

    for (const i in attributes)
    {
        const attr = attributes[i];

        if (attr.instance)
        {
            instAttribs.push(attr);
            if (firstBuf !== attr.buffer_index)
            {
                if (firstBuf !== -1)
                {
                    genBuffers = true;
                }
                else
                {
                    firstBuf = attr.buffer_index;
                }
            }
        }
    }

    const sign = generateAttributesSignature(instAttribs);

    let val = attribSyncCache[sign];

    if (!val)
    {
        val = attribSyncCache[sign] = generateAttributeSync(instAttribs, genBuffers);
    }

    return val;
}
