import { Dict } from './types/index.js';

export class FastArrayObject<T>
{
    inner_obj: Dict<T> = {};
    inner_arr: Array<T> = [];

    constructor(obj?: Dict<T>)
    {
        this.inner_obj = obj ?? {};
    }

    set(field_name: string, val: T)
    {
        this.inner_obj[field_name] = val;
        this.inner_arr.length = 0;
    }

    get(field_name: string)
    {
        return this.inner_obj[field_name];
    }
}

export class FastArrayObjectClass<T>
{
    field_by_name: Dict<number> = {};
    fields: Array<string> = [];
    def_values: Array<T | null> = [];

    registerField(field_name: string, def_value: T | null = null)
    {
        if (this.field_by_name[field_name])
        {
            return;
        }
        this.field_by_name[field_name] = this.fields.length;
        this.fields.push(field_name);
        this.def_values.push(def_value);
    }

    optimize(obj: FastArrayObject<T>)
    {
        const len = this.def_values.length;

        if (obj.inner_arr.length === len)
        {
            return;
        }
        const fields = this.fields;
        const arr = obj.inner_arr;

        arr.length = len;
        for (let i = 0; i < len; i++)
        {
            arr[i] = obj.inner_obj[fields[i]];
        }
    }
}
