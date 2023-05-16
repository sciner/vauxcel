// general

declare module '*.frag' {
    const value: string;

    export default value;
}

declare module '*.vert' {
    const value: string;

    export default value;
}

// utils

declare namespace GlobalMixins
{
    interface Settings
    {
        FAIL_IF_MAJOR_PERFORMANCE_CAVEAT: boolean;
        RETINA_PREFIX: RegExp;
    }
}
