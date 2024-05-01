import type { ColorSource } from '@pixi/core/index.js';
import type { TextStyleAlign } from '@pixi/text/index.js';

export interface IBitmapTextStyle
{
    fontName: string;
    fontSize: number;
    tint: ColorSource;
    align: TextStyleAlign;
    letterSpacing: number;
    maxWidth: number;
}

export interface IBitmapTextFontDescriptor
{
    name: string;
    size: number;
}
