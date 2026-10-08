// Quantum statevector simulator for 1 to 4 qubits

export interface Complex {
  re: number;
  im: number;
}

export interface CircuitGate {
  id: string;
  type: string; // 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'CX' | 'CZ' | 'SWAP' | 'M' | 'RX' | 'RY' | 'RZ'
  qubit: number; // Main qubit (for CX/CZ, this is the control; for SWAP, this is q1)
  target?: number; // Target qubit (for CX/CZ, this is the target; for SWAP, this is q2)
  angle?: number; // Configurable angle for rotation gates
}

export type TimeSlot = (CircuitGate | null)[];
export type Circuit = TimeSlot[];

// Complex helper functions
const zero = (): Complex => ({ re: 0, im: 0 });
const one = (): Complex => ({ re: 1, im: 0 });
const i_unit = (): Complex => ({ re: 0, im: 1 });

export const add = (c1: Complex, c2: Complex): Complex => ({
  re: c1.re + c2.re,
  im: c1.im + c2.im,
});

export const mul = (c1: Complex, c2: Complex): Complex => ({
  re: c1.re * c2.re - c1.im * c2.im,
  im: c1.re * c2.im + c1.im * c2.re,
});

export const mag2 = (c: Complex): number => c.re * c.re + c.im * c.im;

// Gate Unitaries
const H_MATRIX = [
  [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }],
  [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }],
];

const X_MATRIX = [
  [zero(), one()],
  [one(), zero()],
];

const Y_MATRIX = [
  [zero(), { re: 0, im: -1 }],
  [i_unit(), zero()],
];

const Z_MATRIX = [
  [one(), zero()],
  [zero(), { re: -1, im: 0 }],
];

const S_MATRIX = [
  [one(), zero()],
  [zero(), i_unit()],
];

const T_MATRIX = [
  [one(), zero()],
  [zero(), { re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) }],
];

const getGateMatrix = (type: string): Complex[][] => {
  switch (type) {
    case 'H': return H_MATRIX;
    case 'X': return X_MATRIX;
    case 'Y': return Y_MATRIX;
    case 'Z': return Z_MATRIX;
    case 'S': return S_MATRIX;
    case 'T': return T_MATRIX;
    default: return [[one(), zero()], [zero(), one()]];
  }
};

export const getRotationMatrix = (type: string, theta: number): Complex[][] => {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  if (type === 'RX') {
    return [
      [{ re: cos, im: 0 }, { re: 0, im: -sin }],
      [{ re: 0, im: -sin }, { re: cos, im: 0 }]
    ];
  } else if (type === 'RY') {
    return [
      [{ re: cos, im: 0 }, { re: -sin, im: 0 }],
      [{ re: sin, im: 0 }, { re: cos, im: 0 }]
    ];
  } else if (type === 'RZ') {
    return [
      [{ re: Math.cos(theta / 2), im: -Math.sin(theta / 2) }, zero()],
      [zero(), { re: Math.cos(theta / 2), im: Math.sin(theta / 2) }]
    ];
  }
  return [[one(), zero()], [zero(), one()]];
};

// State application operations
function applyOneQubitGate(state: Complex[], gate: Complex[][], target: number, numQubits: number): Complex[] {
  const nextState = Array.from({ length: 1 << numQubits }, () => zero());
  const mask = 1 << target;
  for (let i = 0; i < (1 << numQubits); i++) {
    if ((i & mask) === 0) {
      const i0 = i;
      const i1 = i | mask;
      const psi0 = state[i0];
      const psi1 = state[i1];
      nextState[i0] = add(mul(gate[0][0], psi0), mul(gate[0][1], psi1));
      nextState[i1] = add(mul(gate[1][0], psi0), mul(gate[1][1], psi1));
    }
  }
  return nextState;
}

function applyControlledOneQubitGate(
  state: Complex[],
  gate: Complex[][],
  control: number,
  target: number,
  numQubits: number
): Complex[] {
  const nextState = Array.from({ length: 1 << numQubits }, () => zero());
  const targetMask = 1 << target;
  const controlMask = 1 << control;

  for (let i = 0; i < (1 << numQubits); i++) {
    if ((i & targetMask) === 0) {
      const i0 = i;
      const i1 = i | targetMask;
      const psi0 = state[i0];
      const psi1 = state[i1];

      const isControl1 = (i & controlMask) !== 0;
      if (isControl1) {
        nextState[i0] = add(mul(gate[0][0], psi0), mul(gate[0][1], psi1));
        nextState[i1] = add(mul(gate[1][0], psi0), mul(gate[1][1], psi1));
      } else {
        nextState[i0] = psi0;
        nextState[i1] = psi1;
      }
    }
  }
  return nextState;
}

function applySwapGate(state: Complex[], q1: number, q2: number, numQubits: number): Complex[] {
  const nextState = [...state];
  const mask1 = 1 << q1;
  const mask2 = 1 << q2;
  for (let i = 0; i < (1 << numQubits); i++) {
    const bit1 = (i & mask1) !== 0;
    const bit2 = (i & mask2) !== 0;
    if (bit1 && !bit2) {
      const swappedIndex = (i & ~mask1) | mask2;
      const temp = nextState[i];
      nextState[i] = nextState[swappedIndex];
      nextState[swappedIndex] = temp;
    }
  }
  return nextState;
}

export interface SimulationResult {
  stateVector: Complex[];
  probabilities: number[]; // exact probability for each basis state
  shots: Record<string, number>; // counts for each basis state in 1024 runs
  qasm: string;
}

// Format index as binary string, e.g. 5 -> '0101' for 4 qubits
export const formatBinary = (value: number, numQubits: number): string => {
  return value.toString(2).padStart(numQubits, '0');
};

export function simulateCircuit(circuit: Circuit, numQubits: number): SimulationResult {
  const size = 1 << numQubits;
  let state: Complex[] = Array.from({ length: size }, () => zero());
  state[0] = one(); // Start in |0000> state

  // Process time slots
  circuit.forEach((slot) => {
    // Keep track of gates processed in this slot to avoid duplicates (e.g. CX control/target)
    const processedGateIds = new Set<string>();

    slot.forEach((gate) => {
      if (!gate || processedGateIds.has(gate.id)) return;
      processedGateIds.add(gate.id);

      switch (gate.type) {
        case 'H':
        case 'X':
        case 'Y':
        case 'Z':
        case 'S':
        case 'T':
          state = applyOneQubitGate(state, getGateMatrix(gate.type), gate.qubit, numQubits);
          break;
        case 'RX':
        case 'RY':
        case 'RZ':
          const theta = gate.angle !== undefined ? gate.angle : Math.PI / 2;
          state = applyOneQubitGate(state, getRotationMatrix(gate.type, theta), gate.qubit, numQubits);
          break;
        case 'CX':
          if (gate.target !== undefined) {
            state = applyControlledOneQubitGate(state, X_MATRIX, gate.qubit, gate.target, numQubits);
          }
          break;
        case 'CZ':
          if (gate.target !== undefined) {
            state = applyControlledOneQubitGate(state, Z_MATRIX, gate.qubit, gate.target, numQubits);
          }
          break;
        case 'SWAP':
          if (gate.target !== undefined) {
            state = applySwapGate(state, gate.qubit, gate.target, numQubits);
          }
          break;
        case 'M':
          // Simulation treats Measurement as a readout (we don't collapse mid-circuit for simplicity,
          // which is standard for pure statevector simulation of unitary circuits).
          break;
      }
    });
  });

  // Calculate probabilities
  const probabilities = state.map((c) => mag2(c));

  // Generate 1024 shots
  const shots: Record<string, number> = {};
  for (let i = 0; i < size; i++) {
    shots[formatBinary(i, numQubits)] = 0;
  }

  const numShots = 1024;
  for (let s = 0; s < numShots; s++) {
    const r = Math.random();
    let sum = 0;
    let selectedIndex = size - 1;
    for (let i = 0; i < size; i++) {
      sum += probabilities[i];
      if (r < sum) {
        selectedIndex = i;
        break;
      }
    }
    const binStr = formatBinary(selectedIndex, numQubits);
    shots[binStr] = (shots[binStr] || 0) + 1;
  }

  // Generate OpenQASM 2.0 Representation
  let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\n\nqreg q[${numQubits}];\ncreg c[${numQubits}];\n\n`;
  
  circuit.forEach((slot) => {
    const processedGateIds = new Set<string>();
    slot.forEach((gate) => {
      if (!gate || processedGateIds.has(gate.id)) return;
      processedGateIds.add(gate.id);

      switch (gate.type) {
        case 'H':
          qasm += `h q[${gate.qubit}];\n`;
          break;
        case 'RX':
          qasm += `rx(${gate.angle !== undefined ? gate.angle.toFixed(4) : '1.5708'}) q[${gate.qubit}];\n`;
          break;
        case 'RY':
          qasm += `ry(${gate.angle !== undefined ? gate.angle.toFixed(4) : '1.5708'}) q[${gate.qubit}];\n`;
          break;
        case 'RZ':
          qasm += `rz(${gate.angle !== undefined ? gate.angle.toFixed(4) : '1.5708'}) q[${gate.qubit}];\n`;
          break;
        case 'X':
          qasm += `x q[${gate.qubit}];\n`;
          break;
        case 'Y':
          qasm += `y q[${gate.qubit}];\n`;
          break;
        case 'Z':
          qasm += `z q[${gate.qubit}];\n`;
          break;
        case 'S':
          qasm += `s q[${gate.qubit}];\n`;
          break;
        case 'T':
          qasm += `t q[${gate.qubit}];\n`;
          break;
        case 'CX':
          qasm += `cx q[${gate.qubit}], q[${gate.target}];\n`;
          break;
        case 'CZ':
          qasm += `cz q[${gate.qubit}], q[${gate.target}];\n`;
          break;
        case 'SWAP':
          qasm += `swap q[${gate.qubit}], q[${gate.target}];\n`;
          break;
        case 'M':
          qasm += `measure q[${gate.qubit}] -> c[${gate.qubit}];\n`;
          break;
      }
    });
  });

  return {
    stateVector: state,
    probabilities,
    shots,
    qasm,
  };
}
