import { extensions, ExtensionType } from '@pixi/extensions.js';
import { ensurePrecision } from './program/ensurePrecision.js';
import { setProgramName } from './program/setProgramName.js';
import { setProgramVersion } from './program/setProgramVersion.js';
import { generateProgram } from './utils/generateProgram.js';
import { generateUniformBufferSync } from './utils/generateUniformBufferSync.js';
import { generateUniformsSync, unsafeEvalSupported } from './utils/index.js';

import type { ExtensionMetadata } from '@pixi/extensions.js';
import type { Dict } from '@pixi/utils/index.js';
import type { IRenderingContext } from '../IRenderer.js';
import type { Renderer } from '../Renderer.js';
import type { ISystem } from '../system/ISystem.js';
import type { GLProgram } from './GLProgram.js';
import type { Program } from './Program.js';
import type { Shader } from './Shader.js';
import type { UniformGroup } from './UniformGroup.js';
import type { UniformsSyncCallback } from './utils/index.js';

let UID = 0;
// default sync data so we don't create a new one each time!
const defaultSyncData = { textureCount: 0, uboCount: 0 };

/**
 * System plugin to the renderer to manage shaders.
 * @memberof PIXI
 */
export class ShaderSystem implements ISystem
{
    /** @ignore */
    static extension: ExtensionMetadata = {
        type: ExtensionType.RendererSystem,
        name: 'shader',
    };

    processes: Record<string, ((source: string, options: any, isFragment?: boolean) => string)> = {
        ensurePrecision,
        setProgramName,
        setProgramVersion,
    };

    options: Record<string, any> = {
        ensurePrecision: {
            requestedPrecision: 'highp',
            maxSupportedPrecision: 'highp',
        },
        setProgramName: {
        },
        fallbackFlat: {
            disable: false
        },
        setProgramVersion: {
            version: '300 es',
        }
    };

    /**
     * The current WebGL rendering context.
     * @member {WebGLRenderingContext}
     */
    protected gl: IRenderingContext;

    public shader: Shader;
    public program: Program;
    public id: number;
    public destroyed = false;

    /** Cache to holds the generated functions. Stored against UniformObjects unique signature. */
    private cache: Dict<UniformsSyncCallback>;
    private _uboCache: Dict<{size: number, syncFunc: UniformsSyncCallback}>;
    private renderer: Renderer;

    /** @param renderer - The renderer this System works for. */
    constructor(renderer: Renderer)
    {
        this.renderer = renderer;

        // Validation check that this environment support `new Function`
        this.systemCheck();

        this.gl = null;

        this.shader = null;
        this.program = null;

        this.cache = {};
        this._uboCache = {};

        this.id = UID++;
    }

    /**
     * Overrideable function by `@pixi/unsafe-eval` to silence
     * throwing an error if platform doesn't support unsafe-evals.
     * @private
     */
    private systemCheck(): void
    {
        if (!unsafeEvalSupported())
        {
            throw new Error('Current environment does not allow unsafe-eval, '
                + 'please use @pixi/unsafe-eval module to enable support.');
        }
    }

    protected contextChange(gl: IRenderingContext): void
    {
        this.gl = gl;
        this.reset();

        const provokeExt = gl.getExtension('WEBGL_provoking_vertex');

        if (provokeExt)
        {
            provokeExt.provokingVertexWEBGL(provokeExt.FIRST_VERTEX_CONVENTION_WEBGL);
        }
    }

    /**
     * Changes the current shader to the one given in parameter.
     * @param shader - the new shader
     * @param dontSync - false if the shader should automatically sync its uniforms.
     * @returns the glProgram that belongs to the shader.
     */
    bind(shader: Shader, dontSync?: boolean): GLProgram
    {
        shader.disposeRunner.add(this);

        shader.uniforms.globals = this.renderer.globalUniforms;

        const program = shader.program;
        const glProgram = program.glPrograms[this.renderer.CONTEXT_UID] || this.generateProgram(shader);

        this.shader = shader;

        // TODO - some current Pixi plugins bypass this.. so it not safe to use yet..
        if (this.program !== program)
        {
            this.program = program;
            this.gl.useProgram(glProgram.program);
        }

        if (!dontSync)
        {
            defaultSyncData.textureCount = 0;
            defaultSyncData.uboCount = 0;

            shader.manualSync?.(glProgram.uniformData, this.renderer, defaultSyncData);
            this.syncUniformGroup(shader.uniformGroup, defaultSyncData);
        }

        return glProgram;
    }

    /**
     * Uploads the uniforms values to the currently bound shader.
     * @param uniforms - the uniforms values that be applied to the current shader
     */
    setUniforms(uniforms: Dict<any>): void
    {
        const shader = this.shader.program;
        const glProgram = shader.glPrograms[this.renderer.CONTEXT_UID];

        shader.syncUniforms(glProgram.uniformData, uniforms, this.renderer);
    }

    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    /**
     * Syncs uniforms on the group
     * @param group - the uniform group to sync
     * @param syncData - this is data that is passed to the sync function and any nested sync functions
     */
    syncUniformGroup(group: UniformGroup, syncData?: any): void
    {
        const glProgram = this.getGlProgram();

        if (!group.static || group.dirtyId !== glProgram.uniformDirtyGroups[group.id])
        {
            glProgram.uniformDirtyGroups[group.id] = group.dirtyId;

            this.syncUniforms(group, glProgram, syncData);
        }
    }

    /**
     * Overrideable by the @pixi/unsafe-eval package to use static syncUniforms instead.
     * @param group
     * @param glProgram
     * @param syncData
     */
    syncUniforms(group: UniformGroup, glProgram: GLProgram, syncData: any): void
    {
        const syncFunc = group.syncUniforms[this.shader.program.id] || this.createSyncGroups(group);

        group.manualSync?.(glProgram.uniformData, group.uniforms, this.renderer, syncData);

        syncFunc(glProgram.uniformData, group.uniforms, this.renderer, syncData);
    }

    createSyncGroups(group: UniformGroup): UniformsSyncCallback
    {
        const id = this.getSignature(group, this.shader.program.uniformData, 'u');

        if (!this.cache[id])
        {
            this.cache[id] = generateUniformsSync(group, this.shader.program.uniformData);
        }

        group.syncUniforms[this.shader.program.id] = this.cache[id];

        return group.syncUniforms[this.shader.program.id];
    }

    /**
     * Syncs uniform buffers
     * @param group - the uniform buffer group to sync
     * @param name - the name of the uniform buffer
     */
    syncUniformBufferGroup(group: UniformGroup, name?: string)
    {
        const glProgram = this.getGlProgram();
        const { uniformBufferBindings } = glProgram;
        let boundIndex = uniformBufferBindings[name];

        if (boundIndex === undefined || !glProgram.uniformGroups[group.id])
        {
            this.createSyncBufferGroup(group, glProgram, name);
            boundIndex = uniformBufferBindings[name];
        }
        else

            if (!group.autoManage || (group.static && group.uboUpdateId === group.dirtyId))
            {
                this.renderer.buffer.update(group.buffer);
                if (group.uboSize > 0)
                {
                    this.renderer.buffer.bindBufferRange(group.buffer, boundIndex, group.uboOffset, group.uboSize);
                }
                else
                {
                    this.renderer.buffer.bindBufferBase(group.buffer, boundIndex);
                }

                return;
            }

        group.manualSync?.(glProgram.uniformData, group.uniforms, this.renderer, defaultSyncData);

        const syncFunc = glProgram.uniformGroups[group.id];

        group.uboUpdateId = group.dirtyId;
        group.buffer.update();

        syncFunc(glProgram.uniformData,
            group.uniforms,
            this.renderer,
            defaultSyncData,
            group.buffer
        );

        this.renderer.buffer.bindBufferBase(group.buffer, boundIndex);
    }

    /**
     * Will create a function that uploads a uniform buffer using the STD140 standard.
     * The upload function will then be cached for future calls
     * If a group is manually managed, then a simple upload function is generated
     * @param group - the uniform buffer group to sync
     * @param glProgram - the gl program to attach the uniform bindings to
     * @param name - the name of the uniform buffer (must exist on the shader)
     */
    protected createSyncBufferGroup(group: UniformGroup, glProgram: GLProgram, name: string): UniformsSyncCallback
    {
        const { gl } = this.renderer;

        this.renderer.buffer.bind(group.buffer);

        if (!glProgram.uniformBufferBindings[name])
        {
            // bind them...
            const uniformBlockIndex = this.gl.getUniformBlockIndex(glProgram.program, name);

            glProgram.uniformBufferBindings[name] = glProgram.uniformBindCount;
            gl.uniformBlockBinding(glProgram.program, uniformBlockIndex, glProgram.uniformBindCount);
            glProgram.uniformBindCount++;
        }

        const id = this.getSignature(group, this.shader.program.uniformData, 'ubo');

        let uboData = this._uboCache[id];

        if (!uboData)
        {
            uboData = this._uboCache[id] = generateUniformBufferSync(group, this.shader.program.uniformData);
        }

        if (group.autoManage)
        {
            const data = new Float32Array(uboData.size / 4);

            group.buffer.update(data);
        }

        glProgram.uniformGroups[group.id] = uboData.syncFunc;

        return glProgram.uniformGroups[group.id];
    }

    /**
     * Takes a uniform group and data and generates a unique signature for them.
     * @param group - The uniform group to get signature of
     * @param group.uniforms
     * @param uniformData - Uniform information generated by the shader
     * @param preFix
     * @returns Unique signature of the uniform group
     */
    private getSignature(group: {uniforms: Dict<any>}, uniformData: Dict<any>, preFix: string): string
    {
        const uniforms = group.uniforms;

        const strings = [`${preFix}-`];

        for (const i in uniforms)
        {
            strings.push(i);

            if (uniformData[i])
            {
                strings.push(uniformData[i].type);
            }
        }

        return strings.join('-');
    }

    /**
     * Returns the underlying GLShade rof the currently bound shader.
     *
     * This can be handy for when you to have a little more control over the setting of your uniforms.
     * @returns The glProgram for the currently bound Shader for this context
     */
    getGlProgram(): GLProgram
    {
        if (this.shader)
        {
            return this.shader.program.glPrograms[this.renderer.CONTEXT_UID];
        }

        return null;
    }

    /**
     * Generates a glProgram version of the Shader provided.
     * @param shader - The shader that the glProgram will be based on.
     * @returns A shiny new glProgram!
     */
    generateProgram(shader: Shader): GLProgram
    {
        const gl = this.gl;
        const program = shader.program;

        if (!program.vertexProcessed)
        {
            const { processes, options } = this;
            let { vertex, fragment } = program;

            Object.keys(processes).forEach((processKey) =>
            {
                let processOptions = options[processKey] ?? {};

                if (program.options[processKey])
                {
                    processOptions = Object.assign({}, processOptions, program.options[processKey]);
                }
                vertex = processes[processKey](vertex, processOptions, false);
                fragment = processes[processKey](fragment, processOptions, true);
            });

            program.vertexProcessed = vertex;
            program.fragmentProcessed = fragment;
        }

        const glProgram = generateProgram(gl, program);

        program.glPrograms[this.renderer.CONTEXT_UID] = glProgram;

        return glProgram;
    }

    /** Resets ShaderSystem state, does not affect WebGL state. */
    reset(): void
    {
        this.program = null;
        this.shader = null;
    }

    /**
     * Disposes shader.
     * If disposing one equals with current shader, set current as null.
     * @param shader - Shader object
     */
    disposeShader(shader: Shader): void
    {
        if (this.shader === shader)
        {
            this.shader = null;
        }
    }

    /** Destroys this System and removes all its textures. */
    destroy(): void
    {
        this.renderer = null;
        // TODO implement destroy method for ShaderSystem
        this.destroyed = true;
    }
}

extensions.add(ShaderSystem);
