import { Renderer } from '../Renderer.js';
import { Program } from './Program.js';
import { UniformGroup } from './UniformGroup.js';
import { Runner } from '@vaux/runner.js';

import type { Dict } from '@vaux/utils/index.js';

/**
 * A helper class for shaders.
 * @memberof PIXI
 */
export class Shader
{
    /** Program that the shader uses. */
    public program: Program;
    public uniformGroup: UniformGroup;

    disposeRunner: Runner;

    manualSync?: (ud: Dict<any>, renderer: Renderer, syncData: any) => void = null;

    /**
     * @param program - The program the shader will use.
     * @param uniforms - Custom uniforms to use to augment the built-in ones.
     */
    constructor(program: Program, uniforms?: Dict<any>)
    {
        this.program = program;

        // lets see whats been passed in
        // uniforms should be converted to a uniform group
        if (uniforms)
        {
            if (uniforms instanceof UniformGroup)
            {
                this.uniformGroup = uniforms;
            }
            else
            {
                this.uniformGroup = new UniformGroup(uniforms);
            }
        }
        else
        {
            this.uniformGroup = new UniformGroup({});
        }

        this.disposeRunner = new Runner('disposeShader');
    }

    // TODO move to shader system..
    checkUniformExists(name: string, group: UniformGroup): boolean
    {
        if (group.uniforms[name])
        {
            return true;
        }

        for (const i in group.uniforms)
        {
            const uniform = group.uniforms[i];

            if (uniform.isGroup)
            {
                if (this.checkUniformExists(name, uniform))
                {
                    return true;
                }
            }
        }

        return false;
    }

    destroy(): void
    {
        // usage count on programs?
        // remove if not used!
        this.uniformGroup = null;

        this.disposeRunner.emit(this);
        this.disposeRunner.destroy();
    }

    /**
     * Shader uniform values, shortcut for `uniformGroup.uniforms`.
     * @readonly
     */
    get uniforms(): Dict<any>
    {
        return this.uniformGroup.uniforms;
    }

    /**
     * A short hand function to create a shader based of a vertex and fragment shader.
     * @param vertexSrc - The source of the vertex shader.
     * @param fragmentSrc - The source of the fragment shader.
     * @param uniforms - Custom uniforms to use to augment the built-in ones.
     * @returns A shiny new PixiJS shader!
     */
    static from(vertexSrc?: string, fragmentSrc?: string, uniforms?: Dict<any>): Shader
    {
        const program = Program.from(vertexSrc, fragmentSrc);

        return new Shader(program, uniforms);
    }
}
