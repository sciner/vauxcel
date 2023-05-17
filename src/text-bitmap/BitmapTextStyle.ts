import type { ColorSource } from '@vaux/core';
import type { TextStyleAlign } from '@vaux/text';

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
