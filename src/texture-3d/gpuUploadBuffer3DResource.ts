import type { GPU } from '../rendering/renderers/gpu/GpuDeviceSystem';
import type { Buffer3DSource } from "./Buffer3DSource";

export const gpuUploadBuffer3DResource = {

    type: '3d',

    upload(source: Buffer3DSource, gpuTexture: GPUTexture, gpu: GPU)
    {
        const data = source.data;

        if (source.useSubRegions)
        {
            this.uploadSubs(source, gpuTexture, gpu);

            return;
        }
        if (!data)
        {
            return;
        }

        const total = (source.pixelWidth | 0) * (source.pixelHeight | 0) * source.depth;
        const bytesPerPixel = data.byteLength / total;

        gpu.device.queue.writeTexture(
            { texture: gpuTexture },
            data,
            {
                offset: 0,
                rowsPerImage: source.pixelHeight,
                bytesPerRow: source.pixelHeight * bytesPerPixel,
            },
            {
                width: source.pixelWidth,
                height: source.pixelHeight,
                depthOrArrayLayers: source.depth,
            }
        );
    },

    uploadSubs(source: Buffer3DSource, gpuTexture: GPUTexture, gpu: GPU)
    {
        const { regionsToUpdate } = source;

        for (let i = 0; i < regionsToUpdate.length; i++)
        {
            const region = regionsToUpdate[i];

            if (!region.dirty)
            {
                continue;
            }

            region.dirty = false;
            if (region.isEmpty)
            {
                continue;
            }
            const layout = region.layout;
            const total = layout.width * layout.height * layout.depth;
            const bytesPerPixel = region.data.byteLength / total;

            gpu.device.queue.writeTexture(
                { texture: gpuTexture, origin: layout },
                region.data,
                {
                    offset: 0,
                    rowsPerImage: layout.height,
                    bytesPerRow: layout.width * bytesPerPixel,
                },
                {
                    width: layout.width,
                    height: layout.height,
                    depthOrArrayLayers: layout.depth,
                }
            );
            region.data = null;
        }
        regionsToUpdate.length = 0;
    }
};

