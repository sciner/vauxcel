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
    /** optional index buffer for this geometry */
    indexBuffer?: Buffer | TypedArray | number[];
    /** the topology of the geometry, defaults to 'triangle-list' */
    topology?: Topology;
    proto?: Geometry;

    instanceCount?: number;
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
    public indexBuffer: Buffer;
    public attributes: {[key: string]: Attribute};
    public attributeDirty = true;
    public id: number;
    /** Whether the geometry is instanced. */
    public instanced: boolean;
    /**
     * in case instance is virtual
     * those are params for multidraw
     */
    public vertexPerInstance = 1;
    public indexPerInstance = 1;

    private _attributeBaseCallback: AttributeBaseCallbackStruct;

    /**
     * Number of instances in this geometry, pass it to `GeometrySystem.draw()`.
     * @default 1
     */
    public instanceCount: number;
    public : string;

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
        const proto = this.proto = options.proto || null;

        this.indexBuffer = options.indexBuffer ? ensureIsBuffer(options.indexBuffer, true) : proto?.indexBuffer || null;
        this.instanceCount = options.instanceCount || 1;

        if (proto)
        {
            this.buffers = proto.buffers.slice(0);
            this.bufferStride = proto.bufferStride.slice(0);
            this.attributes = proto.attributes;
            this.topology = options.topology || proto.topology;
            this.instanced = proto.instanced;

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

            if (this.indexBuffer)
            {
                const ind = this.buffers.indexOf(proto.indexBuffer);

                if (ind >= 0)
                {
                    this.buffers[ind] = this.indexBuffer;
                }
            }
        }
        else
        {
            this.buffers = [];
            this.bufferStride = [];
            this.topology = options.topology || 'triangle-list';
            this.instanced = false;

            this.attributes = options.attributes as any;
            for (const i in options.attributes)
            {
                const attr = this.attributes[i]
                    = new Attribute(ensureIsAttribute(options.attributes[i]));

                attr.buffer_index = this.buffers.indexOf(attr.buffer);

                this.instanced = this.instanced || attr.instance;

                if (attr.buffer_index === -1)
                {
                    attr.buffer_index = this.buffers.length;

                    this.buffers.push(attr.buffer);

                    // two events here - one for a resize (new buffer change)
                    // and one for an update (existing buffer change)
                    // attribute.buffer.on('update', this.onBufferUpdate, this);
                    // attribute.buffer.on('change', this.onBufferUpdate, this);
                }
            }

            if (this.indexBuffer)
            {
                this.buffers.push(this.indexBuffer);
            }
        }

        this.id = UID++;
        this.disposeRunner = new Runner('disposeGeometry');
        this.refCount = 0;
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
