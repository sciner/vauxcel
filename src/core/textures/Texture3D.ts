import { BaseTexture } from './BaseTexture';
import { Texture3DLayout, TextureLayout3DOptions } from './Texture3DLayout';
import type { BufferType } from './resources/BufferResource';
import type { Buffer3DResource } from '@vaux/core';

let UID = 0;

export interface Texture3DOptions
{
    source?: BaseTexture;
    layout?: Texture3DLayout | TextureLayout3DOptions
    label?: string;
    data?: BufferType;
}
export class Texture3D
{
    public label?: string;
    public id = UID++;
    dirty = false;

    source: BaseTexture;
    layout: Texture3DLayout;
    data: BufferType;
    isEmpty = false;

    constructor({ source, layout, label, data = null }: Texture3DOptions)
    {
        this.label = label;
        this.data = null;
        if (!source && !layout)
        {
            throw Error('For Texture3D source or layout is needed');
        }
        this.source = source;
        if (layout)
        {
            if (layout instanceof Texture3DLayout)
            {
                this.layout = layout;
            }
            else
            {
                this.layout = new Texture3DLayout(layout);
            }
        }
        else
        {
            this.layout = new Texture3DLayout({
                size: source,
                offset: { x: 0, y: 0, z: 0 }
            });
        }
        if (data)
        {
            this.update(data);
        }
    }

    update(data: BufferType)
    {
        const rs = (this.source.resource as Buffer3DResource);

        if (!this.dirty && rs.useSubRegions)
        {
            rs.regionsToUpdate.push(this);
            this.source.update();
        }
        this.dirty = true;
        if (data)
        {
            this.data = data;
        }
    }

    castToBaseTexture()
    {
        return this.source;
    }
}
