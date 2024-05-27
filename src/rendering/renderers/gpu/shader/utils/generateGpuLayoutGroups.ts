import { ShaderStage } from '../../../shared/shader/const';

import type { ProgramPipelineLayoutDescription } from '../GpuProgram';
import type { StructsAndGroups } from './extractStructAndGroups';

const mapParamToSampleType: Record<string, GPUTextureSampleType> = {
    'f32': 'float',
    'i32': 'sint',
    'u32': 'uint'
};

export function generateGpuLayoutGroups({ groups }: StructsAndGroups): ProgramPipelineLayoutDescription
{
    const layout: ProgramPipelineLayoutDescription = [];

    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];

        if (!layout[group.group])
        {
            layout[group.group] = [];
        }

        if (group.isUniform)
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform'
                }
            });
        }
        else if (group.type === 'sampler')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.FRAGMENT,
                sampler: {
                    type: 'filtering'
                }
            });
        }
        else if (group.type === 'texture_2d')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.FRAGMENT | ShaderStage.VERTEX,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d',
                    multisampled: false,
                }
            });
        }
        else if (group.type === 'texture_3d')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.FRAGMENT | ShaderStage.VERTEX,
                texture: {
                    sampleType: mapParamToSampleType[group.typeParam],
                    viewDimension: '3d',
                    multisampled: false,
                }
            });
        }
        else if (group.type === 'texture_2d_array')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.FRAGMENT | ShaderStage.VERTEX,
                texture: {
                    sampleType: 'float',
                    viewDimension: '2d-array',
                    multisampled: false,
                }
            });
        }
    }

    return layout;
}
