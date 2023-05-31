import { TYPES } from '@vaux/constants';
import type { Attribute } from '../Attribute';
import type { Buffer } from '../Buffer';
import type { Geometry } from '../Geometry';
import { IRenderingContext } from '../../IRenderer';

export type AttributeBaseCallback = (gl: IRenderingContext, locations: number[], byteOffset: number, buffers?: Buffer[], lastBuffer?: Buffer)
=> Buffer;

export type AttributeBaseCallbackStruct = { syncFunc: AttributeBaseCallback, bufSyncCount: number };

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
        s += `${attr.buffer}/${attr.size}${attr.type}/${attr.stride}/${attr.start}`;
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
        const bufInd = attr.buffer;

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

        const type = attr.type || TYPES.FLOAT;

        if (attr.int)
        {
            // eslint-disable-next-line max-len
            funcFragments.push(`gl.vertexAttribIPointer(locations[i], ${attr.size}, ${type}, ${attr.stride}, byteOffset + ${attr.start})`);
        }
        else
        {
            // eslint-disable-next-line max-len
            funcFragments.push(`gl.vertexAttribPointer(locations[i], ${attr.size}, ${type}, ${attr.normalized}, ${attr.stride}, byteOffset + ${attr.start})\n`);
        }
    }
    let syncFunc: AttributeBaseCallback;

    if (genBuffers)
    {
        funcFragments.push(`return lastBuffer;`);
        // eslint-disable-next-line no-new-func
        syncFunc = new Function('gl', 'locations', 'byteOffset', funcFragments.join('\n')) as AttributeBaseCallback;
    }
    else
    {
        // eslint-disable-next-line no-new-func,max-len
        syncFunc = new Function('gl', 'locations', 'byteOffset', 'buffers', 'lastBuffer', funcFragments.join('\n')) as AttributeBaseCallback;
    }

    return {
        syncFunc,
        bufSyncCount
    };
}

export function generateAttribSyncForGeom(geom: Geometry)
{
    const { attributes } = geom;
    let lastBuf = -1;
    let genBuffers = false;
    const instAttribs: Attribute[] = [];

    for (const i in attributes)
    {
        const attr = attributes[i];

        if (attr.instance)
        {
            instAttribs.push(attr);
            if (lastBuf !== attr.buffer)
            {
                if (lastBuf !== -1)
                {
                    genBuffers = true;
                }
                lastBuf = attr.buffer;
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
