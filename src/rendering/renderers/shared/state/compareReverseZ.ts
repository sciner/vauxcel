import type { DEPTH_COMPARE_MODE } from './const';

export function compareReverseZ(compareFunc: DEPTH_COMPARE_MODE, reverseDepth: boolean): GPUCompareFunction
{
    if (compareFunc[0] !== 'z')
    {
        return compareFunc as GPUCompareFunction;
    }
    if (compareFunc === 'z-near')
    {
        return reverseDepth ? 'greater' : 'less';
    }
    if (compareFunc === 'z-near-equal')
    {
        return reverseDepth ? 'greater-equal' : 'less-equal';
    }
    if (compareFunc === 'z-far')
    {
        return reverseDepth ? 'less' : 'greater';
    }

    return reverseDepth ? 'less-equal' : 'greater-equal';
}
