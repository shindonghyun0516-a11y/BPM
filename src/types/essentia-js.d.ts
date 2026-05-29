declare module "essentia.js/dist/essentia.js-core.es.js" {
  export class Essentia {
    constructor(EssentiaWASM: unknown, isDebug?: boolean);
    version: string;
    arrayToVector(inputArray: Float32Array): unknown;
    vectorToArray(inputVector: unknown): Float32Array;
    RhythmExtractor2013(
      signal: unknown,
      maxTempo?: number,
      method?: string,
      minTempo?: number
    ): {
      bpm?: number;
      ticks?: unknown;
      confidence?: number;
      estimates?: unknown;
      bpmIntervals?: unknown;
    };
    shutdown(): void;
    delete(): void;
  }
}

declare module "essentia.js/dist/essentia-wasm.web.js" {
  const EssentiaWASM: Promise<unknown>;
  export default EssentiaWASM;
}
