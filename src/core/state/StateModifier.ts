import { Renderer } from '@vaux/core';
import { FastArrayObject } from '@vaux/utils';

export class StateModifier
{
    enable(_render: Renderer): void
    {
        // set the shader, static textures, whatever
    }

    disable(_render: Renderer): void
    {
        // drop it
    }
}

export class StateModifierObject extends FastArrayObject<StateModifier>
{

}
