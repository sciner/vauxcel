import { BUFFER_TYPE, Topology } from '@pixi/constants.js';
import { Runner } from '@pixi/runner.js';
import { Attribute, AttributesOption, ensureIsAttribute } from './Attribute.js';
import { Buffer, ensureIsBuffer, TypedArray } from './Buffer.js';
import {
    AttributeBaseCallbackStruct,
    generateAttribSyncForGeom
} from './utils/generateAttributeSync';
import { getAttributeInfoFromFormat } from './utils/getAttributeInfoFromFormat.js';

import type { Program } from '../shader/Program.js';
import type { IArrayBuffer } from './Buffer.js';

let UID = 0;

export class GeometryPerGL
{
    /**
     * 0 or 1 whether buffers are ref-counted
     */
    bufRefCount = 0;
    lastGPS: GeometryPerShader = null;
    lastProgram: Program = null;
    lastSignature: string = null;
    hasSecondInstance = false;
    bySignature: {[key: string]: GeometryPerShader} = {};

    constructor(public CONTEXT_UID: number)
    {

    }
}

export class GeometryPerShader
{
    vao: WebGLVertexArrayObject;
    instLocations: number[] = null;
    emulateBaseInstance = 0;

    constructor(vao: WebGLVertexArrayObject)
    {
        this.vao = vao;
    }
}

export type IndexBufferArray = Uint16Array | Uint32Array;

/**
 * the interface that describes the structure of the geometry
 * @memberof rendering
 */
export interface GeometryDescriptor
{
    /** an optional label to easily identify the geometry */
    label?: string;
    /** the attributes that make up the geometry */
    attributes: Record<string, AttributesOption>;
    vertexBuffer?: Buffer | TypedArray | number[];
    /** optional index buffer for this geometry */
    indexBuffer?: Buffer | TypedArray | number[];
    /** the topology of the geometry, defaults to 'triangle-list' */
    topology?: Topology;
    proto?: Geometry;

    instanced?: boolean;
    strideFloats?: number;
    instanceCount?: number;
    vertexPerInstance?: number;
    indexPerInstance?: number;

}

/* eslint-disable max-len */

/**
 * The Geometry represents a model. It consists of two components:
 * - GeometryStyle - The structure of the model such as the attributes layout
 * - GeometryData - the data of the model - this consists of buffers.
 * This can include anything from positions, uvs, normals, colors etc.
 *
 * Geometry can be defined without passing in a style or data if required (thats how I prefer!)
 * @example
 * import { Geometry } from 'pixi.js';
 *
 * const geometry = new Geometry();
 *
 * geometry.addAttribute('positions', [0, 0, 100, 0, 100, 100, 0, 100], 2);
 * geometry.addAttribute('uvs', [0, 0, 1, 0, 1, 1, 0, 1], 2);
 * geometry.addIndex([0, 1, 2, 1, 3, 2]);
 * @memberof PIXI
 */
export class Geometry
{
    public topology: Topology;
    public proto: Geometry;
    public buffers: Array<Buffer>;
    public bufferStride: Array<number>;
    public vertexBuffer: Buffer = null;
    public indexBuffer: Buffer = null;
    public attributes: {[key: string]: Attribute};
    public id: number;
    /** Whether the geometry is instanced. */
    public instanced: boolean;
    /**
     * in case instance is virtual
     * those are params for multidraw
     */
    public vertexPerInstance = 1;
    public indexPerInstance = 1;
    public strideFloats = 0;
    public stride = 0;

    private _attributeBaseCallback: AttributeBaseCallbackStruct;

    /**
     * Number of instances in this geometry, pass it to `GeometrySystem.draw()`.
     * @default 1
     */
    public instanceCount: number;

    /**
     * A map of renderer IDs to webgl VAOs
     * @type {object}
     */
    glVertexArrayObjects: {[key: number]: GeometryPerGL} = {};
    disposeRunner: Runner;
    /**
     * stores invalid vao's
     */
    invalidVao: Array<number>;

    /** Count of existing (not destroyed) meshes that reference this geometry. */
    refCount: number;

    constructor(options: GeometryDescriptor = { attributes: {} })
    {
        this.instanceCount = options.instanceCount || 1;

        if (options.vertexBuffer)
        {
            this.vertexBuffer = ensureIsBuffer(options.vertexBuffer, false);
        }
        if (options.indexBuffer)
        {
            this.indexBuffer = ensureIsBuffer(options.indexBuffer, true);
        }

        if (options.proto)
        {
            this.initFromProto(options);
        }
        else
        {
            this.initFromAttributes(options);
        }

        this.id = UID++;
        this.disposeRunner = new Runner('disposeGeometry');
        this.refCount = 0;
    }

    private initFromProto(options: GeometryDescriptor)
    {
        const proto = this.proto = options.proto;

        this.buffers = proto.buffers.slice(0);
        this.bufferStride = proto.bufferStride.slice(0);
        this.attributes = proto.attributes;
        this.topology = options.topology || proto.topology;
        this.instanced = proto.instanced;
        this.vertexPerInstance = proto.vertexPerInstance;
        this.indexPerInstance = proto.indexPerInstance;
        this.strideFloats = proto.strideFloats;
        this.stride = proto.stride;

        if (this.vertexBuffer)
        {
            this.buffers[0] = this.vertexBuffer;
        }
        if (this.indexBuffer)
        {
            const ind = this.buffers.indexOf(proto.indexBuffer);

            if (ind >= 0)
            {
                this.buffers[ind] = this.indexBuffer;
            }
            else
            {
                // WTF
            }
        }
        for (const i in options.attributes)
        {
            const attr = options.attributes[i];

            if (this.attributes[i])
            {
                const buf_ind = this.attributes[i].buffer_index;

                if (attr instanceof Buffer)
                {
                    this.buffers[buf_ind] = attr;

                    // attr.on('update', this.onBufferUpdate, this);
                    // attr.on('change', this.onBufferUpdate, this);
                }
            }
            else
            {
                // WTF
            }
        }
    }

    private initFromAttributes(options: GeometryDescriptor)
    {
        this.buffers = [];
        this.bufferStride = [];
        this.topology = options.topology || 'triangle-list';
        this.vertexPerInstance = options.vertexPerInstance || 1;
        this.indexPerInstance = options.indexPerInstance || 1;
        this.strideFloats = options.strideFloats || 0;

        if (this.vertexBuffer)
        {
            this.buffers[0] = this.vertexBuffer;
        }

        this.attributes = {};
        this.instanced = false;
        for (const i in options.attributes)
        {
            this.attributes[i] = new Attribute(ensureIsAttribute(options.attributes[i], this.vertexBuffer, options.instanced));
        }

        this.checkAttributes();

        if (this.indexBuffer)
        {
            this.buffers.push(this.indexBuffer);
        }
    }

    private checkAttributes()
    {
        const buffers = this.buffers;
        const attributes = this.attributes;
        const bufferStride = this.bufferStride;

        for (const j in attributes)
        {
            const attr = attributes[j];
            let buf_index = attr.buffer_index = this.buffers.indexOf(attr.buffer);

            this.instanced = this.instanced || attr.instance;

            if (buf_index === -1)
            {
                buf_index = attr.buffer_index = this.buffers.length;
                buffers.push(attr.buffer);
                bufferStride[buf_index] = 0;
                // two events here - one for a resize (new buffer change)
                // and one for an update (existing buffer change)
                // attribute.buffer.on('update', this.onBufferUpdate, this);
                // attribute.buffer.on('change', this.onBufferUpdate, this);
            }

            const attr_info = getAttributeInfoFromFormat(attributes[j].format);

            if (attr.offset === undefined)
            {
                attr.offset = bufferStride[buf_index];
            }

            bufferStride[buf_index] = Math.max(bufferStride[buf_index], attr.offset + attr_info.stride);
        }

        if (this.vertexBuffer)
        {
            if (this.strideFloats)
            {
                this.bufferStride[0] = this.strideFloats;
            }
            else
            {
                this.strideFloats = this.bufferStride[0];
            }
        }

        for (const j in attributes)
        {
            const attribute = attributes[j];

            if (attribute.stride === undefined)
            {
                attribute.stride = bufferStride[attribute.buffer_index];
            }
        }
        this.stride = this.strideFloats * 4;
    }

    /**
     * Returns the requested attribute.
     * @param id - The name of the attribute required
     * @returns - The attribute requested.
     */
    getAttribute(id: string): Attribute
    {
        return this.attributes[id];
    }

    /**
     * Returns the requested buffer.
     * @param id - The name of the buffer required.
     * @returns - The buffer requested.
     */
    getBuffer(id: string): Buffer
    {
        return this.buffers[this.getAttribute(id).buffer_index];
    }

    /**
     *
     * Adds an index buffer to the geometry
     * The index buffer contains integers, three for each triangle in the geometry, which reference the various attribute buffers (position, colour, UV coordinates, other UV coordinates, normal, …). There is only ONE index buffer.
     * @param {PIXI.Buffer|number[]} [buffer] - The buffer that holds the data of the index buffer. You can also provide an Array and a buffer will be created from it.
     * @returns - Returns self, useful for chaining.
     */
    addIndex(buffer?: Buffer | IArrayBuffer | number[]): Geometry
    {
        if (!(buffer instanceof Buffer))
        {
            // its an array!
            if (buffer instanceof Array)
            {
                buffer = new Uint16Array(buffer);
            }

            buffer = new Buffer(buffer);
        }

        buffer.type = BUFFER_TYPE.ELEMENT_ARRAY_BUFFER;

        this.indexBuffer = buffer;

        if (!this.buffers.includes(buffer))
        {
            this.buffers.push(buffer);
        }

        return this;
    }

    /**
     * Returns the index buffer
     * @returns - The index buffer.
     */
    getIndex(): Buffer
    {
        return this.indexBuffer;
    }

    /** Get the size of the geometries, in vertices. */
    getSize(): number
    {
        for (const i in this.attributes)
        {
            const attribute = this.attributes[i];
            const buffer = this.buffers[attribute.buffer_index];
            const attr_info = getAttributeInfoFromFormat(attribute.format);

            return (buffer.data as any).length / ((attribute.stride / 4) || attr_info.size);
        }

        return 0;
    }

    /** Disposes WebGL resources that are connected to this geometry. */
    dispose(): void
    {
        this.disposeRunner.emit(this, false);
    }

    /** Destroys the geometry. */
    destroy(): void
    {
        this.dispose();

        this.buffers = null;
        this.indexBuffer = null;
        this.attributes = null;
    }

    detachBuffers()
    {
        const { buffers } = this;

        for (const uid in this.glVertexArrayObjects)
        {
            const glGeom = this.glVertexArrayObjects[uid];

            if (glGeom.bufRefCount > 0)
            {
                for (let i = 0; i < buffers.length; i++)
                {
                    buffers[i]._glBuffers[uid].refCount -= glGeom.bufRefCount;
                }
                glGeom.bufRefCount = 0;
            }
        }
    }

    swapBuffer(ind: number, newBuffer: Buffer)
    {
        const { buffers } = this;

        if (!buffers[ind])
        {
            throw new Error('buffer not found');
        }
        this.detachBuffers();
        if (this.vertexBuffer === this.buffers[ind])
        {
            this.vertexBuffer = newBuffer;
        }
        this.buffers[ind] = newBuffer;
    }

    getAttributeBaseCallback()
    {
        if (!this._attributeBaseCallback)
        {
            this._attributeBaseCallback = generateAttribSyncForGeom(this);
        }

        return this._attributeBaseCallback;
    }

    getInstancedAttributes()
    {
        const instAttribs: Attribute[] = [];

        for (const i in this.attributes)
        {
            const attr = this.attributes[i];

            if (attr.instance)
            {
                instAttribs.push(attr);
            }
        }

        return instAttribs;
    }

    getInstancedAttributeNames()
    {
        const instAttribs: string[] = [];

        for (const i in this.attributes)
        {
            const attr = this.attributes[i];

            if (attr.instance)
            {
                instAttribs.push(i);
            }
        }

        return instAttribs;
    }

    /**
     * if buffer is used in instanced attribs, returns 1
     * otherwise, returns number of vertices per instance
     * @param buf_ind
     */
    getVertexPerInstance(buf_ind: number)
    {
        if (this.vertexPerInstance === 1)
        {
            return 1;
        }
        for (const key in this.attributes)
        {
            if (this.attributes[key].buffer_index === buf_ind)
            {
                if (!this.attributes[key].instance)
                {
                    return this.vertexPerInstance;
                }
            }
        }

        return 1;
    }

    getInstanceBufferStride(bufInd: number)
    {
        return this.bufferStride[bufInd] * this.getVertexPerInstance(bufInd);
    }
}
