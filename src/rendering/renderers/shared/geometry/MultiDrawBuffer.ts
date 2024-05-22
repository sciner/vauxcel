import { EventEmitter } from "../../../../utils";

export interface DrawInstanceParameters
{
    vertexPerInstance: number;
    indexPerInstance: number;
    instanced: boolean;
}

export class MultiDrawBuffer extends EventEmitter<{
    update: MultiDrawBuffer
}>
{
    offsets: Int32Array;
    counts: Int32Array;
    baseInstances: Uint32Array;
    instanceCounts: Int32Array;
    size: number;
    count = 0;
    params: DrawInstanceParameters = undefined;
    constructor(capacity = 64, params?: DrawInstanceParameters)
    {
        super();
        this.resize(capacity);
        this.params = params;
    }

    ensureSize(sz: number)
    {
        if (sz <= this.size)
        {
            return;
        }
        while (sz > this.size)
        {
            this.size *= 2;
        }
        this.resize(this.size);
    }

    update()
    {
        this.emit('update');
    }

    resize(sz: number, copyOldInfo = true)
    {
        const oldSize = this.size;
        const oldCnt = this.counts; const oldOff = this.offsets;
        const oldInst = this.instanceCounts; const oldBaseInst = this.baseInstances;

        this.size = sz;

        this.counts = new Int32Array(sz);
        this.offsets = new Int32Array(sz);
        this.instanceCounts = new Int32Array(sz);
        this.baseInstances = new Uint32Array(sz);

        if (copyOldInfo && oldCnt)
        {
            this.counts.set(oldCnt, 0);
            this.offsets.set(oldOff, 0);
            this.instanceCounts.set(oldInst, 0);
            this.baseInstances.set(oldBaseInst, 0);
        }

        if (this.params)
        {
            for (let i = oldSize; i < sz; i++)
            {
                this.counts[i] = this.params.vertexPerInstance;
            }
        }
    }

    convertInstancesToVertices(params?: DrawInstanceParameters)
    {
        params = params || this.params;
        // converts instance counts to offsets & counts
        if (params.instanced)
        {
            return;
        }

        const { offsets, counts, count } = this;

        if (params.indexPerInstance > 0)
        {
            for (let j = 0; j < count; j++)
            {
                offsets[j] *= params.indexPerInstance * 4;
                counts[j] *= params.indexPerInstance;
            }
        }
        else
        {
            for (let j = 0; j < count; j++)
            {
                offsets[j] *= params.vertexPerInstance;
                counts[j] *= params.vertexPerInstance;
            }
        }
    }
}
