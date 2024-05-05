import { VertexFormat } from '@pixi/constants.js';
import { Buffer, BufferOption, ensureIsBuffer, TypedArray } from './Buffer.js';

/* eslint-disable max-len */

/**
 * The attribute options used by the constructor for adding geometries attributes
 * extends {@link rendering.Attribute} but allows for the buffer to be a typed or number array
 * @memberof rendering
 */
export type AttributesOption = Omit<IAttribute, 'buffer'> & { buffer?: BufferOption } | BufferOption | VertexFormat;

export type IAttribute = Partial<Attribute>;

/**
 * Holds the information for a single attribute structure required to render geometry.
 *
 * This does not contain the actual data, but instead has a buffer id that maps to a {@link PIXI.Buffer}
 * This can include anything from positions, uvs, normals, colors etc.
 * @memberof PIXI
 */
export class Attribute
{
    buffer: Buffer;
    buffer_index = -1;
    /** the format of the attribute */
    format: VertexFormat;
    /** set where the shader location is for this attribute */
    location: number;
    /** the stride of the data in the buffer*/
    stride: number;
    /** the offset of the attribute from the buffer, defaults to 0 */
    offset: number | undefined;
    /** is this an instanced buffer? (defaults to false) */
    instance: boolean;
    /**
     * The starting vertex in the geometry to start drawing from. If not specified,
     *  drawing will start from the first vertex.
     */
    start: number;

    constructor(attr: IAttribute)
    {
        this.buffer = attr.buffer || null;
        this.format = attr.format || 'float32';
        this.stride = attr.stride || undefined;
        this.offset = attr.offset || undefined;
        this.instance = attr.instance || undefined;
        this.location = attr.location || -1;
    }
}

export function ensureIsAttribute(attribute: AttributesOption, default_buffer?: Buffer, default_instance?: boolean): IAttribute
{
    if (attribute instanceof Buffer || Array.isArray(attribute) || (attribute as TypedArray).BYTES_PER_ELEMENT)
    {
        attribute = {
            buffer: attribute as Buffer | TypedArray | number[],
        };
    }
    else if (typeof attribute === 'string')
    {
        attribute = {
            buffer: default_buffer,
            format: attribute as VertexFormat
        };
    }

    if (attribute.buffer)
    {
        (attribute as Attribute).buffer = ensureIsBuffer(attribute.buffer as Buffer | TypedArray | number[], false);
    }
    else
    {
        (attribute as Attribute).buffer = default_buffer;
        (attribute as Attribute).instance = default_instance;
    }

    return attribute as Attribute;
}
