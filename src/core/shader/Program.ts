import { PRECISION } from '@vaux/constants';
import { isMobile, ProgramCache } from '@vaux/utils';
import defaultFragment from './defaultProgram.frag';
import defaultVertex from './defaultProgram.vert';

import type { GLProgram } from './GLProgram';

import { ensurePrecision } from './program/ensurePrecision';
import { setProgramName } from './program/setProgramName';
import { setProgramVersion } from './program/setProgramVersion';

let UID = 0;

export interface IAttributeData
{
    type: string;
    size: number;
    location: number;
    name: string;
}

export interface IUniformData
{
    index: number;
    type: string;
    size: number;
    isArray: boolean;
    value: any;
    name: string;
}

export interface IProgramExtraData
{
    transformFeedbackVaryings?: {
        names: string[],
        bufferMode: 'separate' | 'interleaved'
    }
}

const processes: Record<string, ((source: string, options: any, flag?: boolean) => string)> = {
    ensurePrecision,
    setProgramName,
    setProgramVersion
};

export interface GlProgramOptions
{
    fragment?: string;
    vertex?: string;
    name?: string;
}

/**
 * Helper class to create a shader program.
 * @memberof PIXI
 */
export class Program
{
    /**
     * Default specify float precision in vertex shader.
     * @static
     * @type {PIXI.PRECISION}
     * @default PIXI.PRECISION.HIGH
     */
    public static defaultVertexPrecision: PRECISION = PRECISION.HIGH;

    /**
     * Default specify float precision in fragment shader.
     * iOS is best set at highp due to https://github.com/pixijs/pixijs/issues/3742
     * @static
     * @type {PIXI.PRECISION}
     * @default PIXI.PRECISION.MEDIUM
     */
    public static defaultFragmentPrecision: PRECISION = isMobile.apple.device
        ? PRECISION.HIGH
        : PRECISION.MEDIUM;

    public id: number;

    /** Source code for the vertex shader. */
    public vertex: string;

    /** Source code for the fragment shader. */
    public fragment: string;

    protected key: string;

    nameCache: any;
    glPrograms: { [ key: number ]: GLProgram};
    syncUniforms: any;

    /** Assigned when a program is first bound to the shader system. */
    attributeData: { [key: string]: IAttributeData};

    /** Assigned when a program is first bound to the shader system. */
    uniformData: {[key: string]: IUniformData};

    extra: IProgramExtraData = {};

    /**
     * @param vertexSrc - The source of the vertex shader.
     * @param fragmentSrc - The source of the fragment shader.
     * @param name - Name for shader
     * @param extra - Extra data for shader
     */
    constructor({ fragment, vertex, name }: GlProgramOptions, extra: IProgramExtraData = {})
    {
        this.id = UID++;

        const options: Record<string, any> = {
            ensurePrecision: {
                requestedPrecision: 'highp',
                maxSupportedPrecision: 'highp',
            },
            setProgramName: {
                name,
            },
            setProgramVersion: {
                version: '300 es',
            }
        };

        Object.keys(processes).forEach((processKey) =>
        {
            const processOptions = options[processKey] ?? {};

            fragment = processes[processKey](fragment, processOptions, true);
            vertex = processes[processKey](vertex, processOptions, false);
        });

        this.fragment = fragment;
        this.vertex = vertex;

        this.key = `${this.vertex}:${this.fragment}`;

        this.vertex = vertex || Program.defaultVertexSrc;
        this.fragment = fragment || Program.defaultFragmentSrc;

        this.extra = extra;

        // currently this does not extract structs only default types
        // this is where we store shader references..
        this.glPrograms = {};

        this.syncUniforms = null;
    }

    getLocationListByAttributes(names: Array<string>)
    {
        // returns locations
        const res: Array<number> = [];

        for (let i = 0; i < names.length; i++)
        {
            const attribData = this.attributeData[names[i]];

            if (attribData)
            {
                res.push(attribData.location);
            }
        }

        return res;
    }

    /**
     * The default vertex shader source.
     * @readonly
     */
    static get defaultVertexSrc(): string
    {
        return defaultVertex;
    }

    /**
     * The default fragment shader source.
     * @readonly
     */
    static get defaultFragmentSrc(): string
    {
        return defaultFragment;
    }

    /**
     * A short hand function to create a program based of a vertex and fragment shader.
     *
     * This method will also check to see if there is a cached program.
     * @param vertexSrc - The source of the vertex shader.
     * @param fragmentSrc - The source of the fragment shader.
     * @param name - Name for shader
     * @returns A shiny new PixiJS shader program!
     */
    static from(vertexSrc?: string, fragmentSrc?: string, name?: string): Program
    {
        const key = `${vertexSrc}:${fragmentSrc}`;

        let program = ProgramCache[key];

        if (!program)
        {
            ProgramCache[key] = program = new Program({ vertex: vertexSrc, fragment: fragmentSrc, name });
        }

        return program;
    }
}
