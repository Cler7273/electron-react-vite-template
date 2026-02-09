// electron/services/nasm-engine.js

// This class encapsulates the entire state and logic of a NASMFAG sequence.
class NASMEngine {
  constructor(config) {
    this._config = config;
    this._cache = {}; // Memoization for performance
    this._parseOperations();
  }

  // CRITICAL: A safe replacement for eval().
  _parseOperations() {
    this._safeOps = this._config.I.map(opPair => {
      const prefix = opPair[0];
      const suffix = opPair[1];
      // In a real scenario, this would be a proper AST parser.
      // For this example, we'll handle simple arithmetic safely.
      const op = suffix.charAt(0);
      const num = parseFloat(suffix.substring(1));
      if (isNaN(num)) throw new Error(`Invalid operation: ${suffix}`);

      return (val) => {
        switch (op) {
          case '+': return val + num;
          case '-': return val - num;
          case '*': return val * num;
          case '/': return val / num;
          default: throw new Error(`Unsupported operator: ${op}`);
        }
      };
    });
  }

  // The core recursive function `f(x)`.
  _f(x) {
    if (x < 0) return 0;
    if (this._cache[x] !== undefined) return this._cache[x];

    let result;
    const { starts, d, TC, minBound, maxBound } = this._config;

    if (x < d) {
      result = starts[x];
    } else {
      let ntc = 0;
      for (let v = 0; v < x - d; v++) ntc += TC[v % TC.length];
      const opIndex = (x - d + ntc) % this._safeOps.length;
      const operation = this._safeOps[opIndex];
      result = operation(this._f(x - d));
    }

    const range = maxBound - minBound;
    if (range <= 0) return minBound;
    let bounded = Math.floor(result);
    this._cache[x] = minBound + ((bounded - minBound) % range + range) % range;
    return this._cache[x];
  }

  // Generator function to produce the keystream byte by byte, saving memory.
  *keystream(length, intensity) {
    for (let i = 0; i < length; i++) {
      let value = i;
      for (let j = 0; j < intensity; j++) {
        value = this._f(value + j * length); // Add complexity
      }
      yield value % 256; // Output a single byte
    }
  }
}

// The public function that services will use.
function processBuffer(sourceBuffer, keyConfig, intensity, onProgress) {
  const engine = new NASMEngine(keyConfig);
  const resultBuffer = Buffer.alloc(sourceBuffer.length);
  const stream = engine.keystream(sourceBuffer.length, intensity);

  for (let i = 0; i < sourceBuffer.length; i++) {
    const keyByte = stream.next().value;
    resultBuffer[i] = sourceBuffer[i] ^ keyByte; // XOR encryption
    if (i % 4096 === 0) {
      onProgress(i / sourceBuffer.length);
    }
  }
  onProgress(1);
  return resultBuffer;
}

module.exports = { processBuffer };