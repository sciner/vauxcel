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

    let compute_flag = ShaderStage.VERTEX | ShaderStage.FRAGMENT;

    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];

        if (group.writable)
        {
            compute_flag = ShaderStage.COMPUTE;
        }
    }

    for (let i = 0; i < groups.length; i++)
    {
        const group = groups[i];
        let sampleType = mapParamToSampleType[group.typeParam];

        if (compute_flag === ShaderStage.COMPUTE && sampleType === 'float')
        {
            sampleType = 'unfilterable-float';
        }

        if (!layout[group.group])
        {
            layout[group.group] = [];
        }

        if (group.isUniform)
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                buffer: {
                    type: 'uniform'
                }
            });
        }
        else if (group.isStorage)
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                buffer: {
                    type: group.writable ? 'storage' : 'read-only-storage'
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
        else if (group.type === 'sampler_comparison')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: ShaderStage.FRAGMENT,
                sampler: {
                    type: 'comparison'
                }
            });
        }
        else if (group.type === 'texture_2d')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                texture: {
                    sampleType: sampleType,
                    viewDimension: '2d',
                    multisampled: false,
                }
            });
        }
        else if (group.type === 'texture_depth_2d')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                texture: {
                    sampleType: 'depth',
                    viewDimension: '2d',
                    multisampled: false,
                }
            });
        }
        else if (group.type === 'texture_3d')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                texture: {
                    sampleType: sampleType,
                    viewDimension: '3d',
                    multisampled: false,
                }
            });
        }
        else if (group.type === 'texture_2d_array')
        {
            layout[group.group].push({
                binding: group.binding,
                visibility: compute_flag,
                texture: {
                    sampleType: sampleType,
                    viewDimension: '2d-array',
                    multisampled: false,
                }
            });
        }
    }

    return layout;
}
