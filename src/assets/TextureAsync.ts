import { Assets } from './Assets.js';

import type { Texture } from '@pixi/core/index.js';

export interface TextureHolder
{
    texture?: Texture
    textureAsync?: TextureAsync
}

export class TextureAsync<T extends TextureHolder = TextureHolder>
{
    url: string = null;
    promise: Promise<Texture> = null;
    loaded_tex: Texture = null;
    elements: Array<T> = [];

    constructor(url?: string)
    {
        if (url)
        {
            this.load(url);
        }
    }

    load(url: string)
    {
        this.url = url;
        if (!this.promise)
        {
            this.promise = Assets.load(url).then((tex: Texture) =>
            {
                this.loaded_tex = tex;
                tex.source.autoGarbageCollect = true;

                return tex;
            });
        }
    }

    setTo(elem: T): T
    {
        elem.textureAsync = this;
        this.elements.push(elem);
        this.promise.then((tex: Texture) =>
        {
            if (elem.textureAsync === this)
            {
                elem.texture = tex;
                elem.textureAsync = null;
            }
        });

        return elem;
    }
}
