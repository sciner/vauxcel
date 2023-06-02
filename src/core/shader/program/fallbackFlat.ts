const pattern_flat = /flat (in|out) (int|ivec3|float|vec2|vec3|vec4) (\w+);/g;

/**
 * swaps "flat" varyings for regular
 */
export function fallbackFlat(
    src: string,
    options?: { disable: boolean },
    isFragment?: boolean
): string
{
    if (options?.disable)
    {
        return src;
    }
    if (isFragment)
    {
        return flatFrag(src);
    }

    return flatVert(src);
}

const intToFloat: Record<string, string> = {
    int: 'float',
    ivec2: 'vec2',
    ivec3: 'vec3',
    ivec4: 'vec4',
};

function flatVert(src: string)
{
    const encode: string[] = [];

    src = src.replaceAll(pattern_flat, (_, inout, type, name, _offset, _string) =>
    {
        const type2 = intToFloat[type];
        const name2 = `${name}_fallback`;

        if (type2)
        {
            encode.push(`${name2} = ${type2}(${name});`);

            return `${type} ${name}; ${inout} ${type2} ${name2};`;
        }

        return `${inout} ${type} ${name};`;
    });
    if (encode.length === 0)
    {
        return src;
    }
    encode.push('');

    const ind = src.lastIndexOf('}');

    src = src.substring(0, ind) + encode.join('\n') + src.substring(ind);

    return src;
}

function flatFrag(src: string)
{
    const decode: string[] = [];

    src = src.replaceAll(pattern_flat, (_, inout, type, name, _offset, _string) =>
    {
        const type2 = intToFloat[type];
        const name2 = `${name}_fallback`;

        if (type2)
        {
            decode.push(`${name} = ${type}(round(${name2}));`);

            return `${type} ${name}; ${inout} ${type2} ${name2};`;
        }

        return `${inout} ${type} ${name};`;
    });
    if (decode.length === 0)
    {
        return src;
    }
    decode.push('');

    let ind = src.indexOf('main()');

    if (!ind)
    {
        throw new Error('main method of shader not found');
    }
    ind += 6;
    while (ind < src.length)
    {
        if (src[ind] === '{')
        {
            break;
        }
        ind++;
    }
    ind++;
    if (ind >= src.length)
    {
        throw new Error('main method of shader not found');
    }

    if (src[ind] === '\n') ind++;
    src = src.substring(0, ind) + decode.join('\n') + src.substring(ind);

    return src;
}
