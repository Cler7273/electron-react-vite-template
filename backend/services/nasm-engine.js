
//electron/services/nasm-engine.js
// This class encapsulates the entire state and logic of a NASMFAG sequence.
/*class NASMEngine {
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
*/
// The public function that services will use.
/*function processBuffer(sourceBuffer, keyConfig, intensity, onProgress) {
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

module.exports = { processBuffer };*/

const crypto = require('crypto');

// TABULA CHAOS: A pre-calculated non-linear substitution box.
// This replaces Math.sin/cos with a deterministic integer equivalent.
// (Generated using Math.sin(i) * 255 for values 0-255)
const TABULA_CHAOS = new Uint8Array([
   99, 124, 119, 123, 242, 107, 111, 197,  48,   1, 103,  43, 254, 215, 171, 118,
  202, 130, 201, 125, 250,  89,  71, 240, 173, 212, 162, 175, 156, 164, 114, 192,
  183, 253, 147,  38,  54,  63, 247, 204,  52, 165, 229, 241, 113, 216,  49,  21,
    4, 199,  35, 195,  24, 150,   5, 154,   7,  18, 128, 226, 235,  39, 178, 117,
    9, 131,  44,  26,  27, 110,  90, 160,  82,  59, 214, 179,  41, 227,  47, 132,
   83, 209,   0, 237,  32, 252, 177,  91, 106, 203, 190,  57,  74,  76,  88, 207,
  208, 239, 170, 251,  67,  77,  51, 133,  69, 249,   2, 127,  80,  60, 159, 168,
   81, 163,  64, 143, 146, 157,  56, 245, 188, 182, 218,  33,  16, 255, 243, 210,
  205,  12,  19, 236,  95, 151,  68,  23, 196, 167, 126,  61, 100,  93,  25, 115,
   96, 129,  79, 220,  34,  42, 144, 136,  70, 238, 184,  20, 222,  94,  11, 219,
  224,  50,  58,  10,  73,   6,  36,  92, 194, 211, 172,  98, 145, 149, 228, 121,
  231, 200,  55, 109, 141, 213,  78, 169, 108,  86, 244, 234, 101, 122, 174,   8,
  186, 120,  37,  46,  28, 166, 180, 198, 232, 221, 116,  31,  75, 189, 139, 138,
  112,  62, 181, 102,  72,   3, 246,  14,  97,  53,  87, 185, 134, 193,  29, 158,
  225, 248, 152,  17, 105, 217, 142, 148, 155,  30, 135, 233, 206,  85,  40, 223,
  140, 161, 137,  13, 191, 230,  66, 104,  65, 153,  45,  15, 176,  84, 187,  22
]);

class NASMEngineAeternitas {
  /**
   * @param {Object} constitutio - Config
   * @param {Buffer} initiumVector - IV (16 bytes)
   * @param {Number} tempus - Timestamp (Integer, e.g., Date.now())
   */
  constructor(constitutio, initiumVector, tempus) {
    this._constitutio = constitutio;
    this._memoria = Int32Array.from(constitutio.starts);
    this._caput = this._memoria.length;
    this._indexCycli = 0;

    // 1. MIX TEMPUS (Time) INTO MEMORY
    // We treat the timestamp as a "Salt" that shifts the entire state universe.
    // Use bitwise ops to ensure 32-bit integer safety.
    const tempusHigh = Math.floor(tempus / 0xFFFFFFFF) | 0;
    const tempusLow = (tempus & 0xFFFFFFFF) | 0;

    for (let i = 0; i < this._memoria.length; i++) {
      // Mix IV
      if (i < initiumVector.length) this._memoria[i] ^= initiumVector[i];
      
      // Mix Time (Mutation based on when encryption happened)
      this._memoria[i] ^= (i % 2 === 0) ? tempusLow : tempusHigh;
    }

    this._parareOperationes();
  }

  // Same robust operation parser as v3
  _parareOperationes() {
    this._operationesTutum = this._constitutio.I.map(parOp => {
      const suffix = parOp[1];
      const signum = suffix.charAt(0);
      const numerusRaw = parseFloat(suffix.substring(1));
      const numerus = Math.floor(numerusRaw) | 0; 
      return (pretium) => {
        pretium = pretium | 0;
        switch (signum) {
          case '+': return (pretium + numerus) | 0;
          case '-': return (pretium - numerus) | 0;
          case '*': return Math.imul(pretium, numerus) | 0;
          case '/': return pretium ^ numerus; // XOR is safer than division
          default: return (pretium + numerus) | 0;
        }
      };
    });
  }

  // SUBSTITUTIO: The replacement for "Math.sin"
  // Maps an integer input to a chaotic integer output using the Table
  _substitutio(val) {
    // Map value to 0-255 range
    const index = Math.abs(val) & 0xFF;
    return TABULA_CHAOS[index];
  }

  _statusProximus() {
    const { d, TC, minBound, maxBound } = this._constitutio;
    const ambitus = (maxBound - minBound) | 0;
    if (ambitus <= 0) return minBound;

    // A. FETCH HISTORY
    const indexHistoriae = (this._caput - d + this._memoria.length) % this._memoria.length;
    let pretium = this._memoria[indexHistoriae];

    // B. CYCLE MUTATION
    const valorCycli = TC[this._indexCycli % TC.length];
    this._indexCycli++;

    // C. OPERATION SELECTION
    const indexOp = Math.abs((this._caput + pretium + valorCycli)) % this._operationesTutum.length;
    pretium = this._operationesTutum[indexOp](pretium);

    // --- NEW: NON-LINEAR CHAOS LAYER (Replaces Sin/Cos/Log) ---
    // Instead of linear math, we substitute the value through the S-Box.
    // This destroys linear relationships (solving x + y = z).
    const chaos = this._substitutio(pretium);
    
    // Mix the chaos back into the price using XOR and Rotation
    pretium = (pretium ^ chaos) | 0;
    pretium = (pretium << 7) | (pretium >>> 25); // Rotate Left 7
    // -----------------------------------------------------------

    // D. FEEDBACK (CBC)
    const indexPrev = (this._caput - 1 + this._memoria.length) % this._memoria.length;
    pretium ^= this._memoria[indexPrev];

    // E. BOUND
    const result = minBound + (Math.abs(pretium) % ambitus);
    
    // F. STORE
    this._memoria[this._caput % this._memoria.length] = result;
    this._caput++;

    return result;
  }

  *keystream(len, intensity) {
    for (let i = 0; i < len; i++) {
      let val = 0;
      const rounds = intensity > 0 ? intensity : 1;
      for (let j = 0; j < rounds; j++) val = this._statusProximus();
      yield val & 0xFF;
    }
  }
}

// ---------------------------------------------------------
// PUBLIC API (Updated for Timestamp)
// ---------------------------------------------------------

/**
 * Output Structure:
 * [0-15]  : IV (16 bytes)
 * [16-23] : Tempus (8 bytes / 64-bit Timestamp)
 * [24...] : Encrypted Data
 */
function processBuffer(sourceBuffer, keyConfig, intensity, onProgress) {
  const initiumVector = crypto.randomBytes(16);
  
  // 1. CAPTURE TIME
  const tempus = Date.now(); // Milliseconds since epoch
  
  // Alloc: Source + 16 (IV) + 8 (Time)
  const receptaculum = Buffer.alloc(sourceBuffer.length + 16 + 8);
  
  initiumVector.copy(receptaculum, 0);
  
  // 2. WRITE TIME TO HEADER (Big Int 64-bit)
  receptaculum.writeBigInt64LE(BigInt(tempus), 16);

  const machina = new NASMEngineAeternitas(keyConfig, initiumVector, tempus);
  const fluxus = machina.keystream(sourceBuffer.length, intensity);

  for (let i = 0; i < sourceBuffer.length; i++) {
    receptaculum[i + 24] = sourceBuffer[i] ^ fluxus.next().value;
    if (onProgress && i % 4096 === 0) onProgress(i / sourceBuffer.length);
  }

  if (onProgress) onProgress(1);
  return receptaculum;
}

function restoreBuffer(cipherBuffer, keyConfig, intensity, onProgress) {
  if (cipherBuffer.length < 24) throw new Error("Fractus Data: Header missing.");

  const initiumVector = cipherBuffer.slice(0, 16);
  
  // 1. READ TIME FROM HEADER
  const tempusBig = cipherBuffer.readBigInt64LE(16);
  const tempus = Number(tempusBig); // Convert back to number for Engine

  const dataVera = cipherBuffer.slice(24);
  const receptaculum = Buffer.alloc(dataVera.length);
  
  const machina = new NASMEngineAeternitas(keyConfig, initiumVector, tempus);
  const fluxus = machina.keystream(dataVera.length, intensity);

  for (let i = 0; i < dataVera.length; i++) {
    receptaculum[i] = dataVera[i] ^ fluxus.next().value;
    if (onProgress && i % 4096 === 0) onProgress(i / dataVera.length);
  }

  if (onProgress) onProgress(1);
  return receptaculum;
}

module.exports = { processBuffer, restoreBuffer };
// ---------------------------------------------------------