import {
    BUFFER_BITS,
    ExtensionMetadata, extensions,
    ExtensionType,
    ISystem,
    Renderer
} from '@vaux/core';
import { LayerPass } from '@vaux/layers/LayerPass';

export class PassSystem implements ISystem
{
    /** @ignore */
    static extension: ExtensionMetadata = {
        type: ExtensionType.RendererSystem,
        name: 'pass',
    };

    renderer: Renderer;

    stack: Array<LayerPass> = [];

    // renderers scene graph!
    constructor(renderer: Renderer)
    {
        this.renderer = renderer;
    }

    begin(pass: LayerPass)
    {
        const { renderer } = this;

        if (pass.active)
        {
            throw new Error('PassSystem: using one pass two times!');
        }

        pass.textureCache.pushTexture(renderer);

        if (pass.clearColor || pass.clearDepth)
        {
            renderer.framebuffer.clear(pass.bgColor[0], pass.bgColor[1], pass.bgColor[2], pass.bgColor[3],
                (Number(pass.clearColor) * BUFFER_BITS.COLOR) | (Number(pass.clearDepth) * BUFFER_BITS.DEPTH));
        }

        pass.active = true;
        this.stack.push(pass);
    }

    end(pass?: LayerPass)
    {
        const lastPass = this.stack[this.stack.length - 1];

        if (pass && pass !== lastPass)
        {
            throw new Error('PassSystem: stack is wrong!');
        }

        lastPass.textureCache.popTexture(this.renderer);
        lastPass.active = false;
        this.stack.pop();
    }

    destroy(): void
    {
        // ka pow!
        this.renderer = null;
    }
}

extensions.add(PassSystem);
