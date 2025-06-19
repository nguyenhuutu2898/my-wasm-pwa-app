export async function runWasmSum(data: number[]): Promise<number> {
    const response = await fetch("/sum.wasm");
    const wasmBinary = await response.arrayBuffer();
    const memory = new WebAssembly.Memory({ initial: 1 });

    const wasmArray = new Int32Array(data);
    const buffer = new Uint8Array(memory.buffer);
    const ptr = 0;
    buffer.set(new Uint8Array(wasmArray.buffer), ptr);

    const wasmModule = await WebAssembly.instantiate(wasmBinary, {
        env: { memory },
    });

    const sumFn = wasmModule.instance.exports.sum as CallableFunction;
    const result = sumFn(ptr, data.length);
    return result;
}
