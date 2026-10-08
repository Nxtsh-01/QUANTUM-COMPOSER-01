
import React, { useState, useMemo, useEffect, useRef } from 'react';
import './index.css';
import {
  simulateCircuit,
  formatBinary
} from './utils/simulator';
import type {
  Complex,
  CircuitGate,
  Circuit
} from './utils/simulator';



// Gate Matrix representations
const GATE_MATRICES: Record<string, string> = {
  H: '1/√2  [[ 1,  1 ],\n        [ 1, -1 ]]',
  X: '[[ 0, 1 ],\n [ 1, 0 ]]',
  Y: '[[ 0, -i ],\n [ i,  0 ]]',
  Z: '[[ 1,  0 ],\n [ 0, -1 ]]',
  S: '[[ 1, 0 ],\n [ 0, i ]]',
  T: '[[ 1, 0 ],\n [ 0, e^(iπ/4) ]]',
  RX: '[[ cos(θ/2),   -i sin(θ/2) ],\n [ -i sin(θ/2),  cos(θ/2)   ]]',
  RY: '[[ cos(θ/2),   -sin(θ/2)  ],\n [ sin(θ/2),    cos(θ/2)   ]]',
  RZ: '[[ e^(-iθ/2),  0          ],\n [ 0,           e^(iθ/2)   ]]',
  CX: '[[ 1, 0, 0, 0 ],\n [ 0, 1, 0, 0 ],\n [ 0, 0, 0, 1 ],\n [ 0, 0, 1, 0 ]]',
  CZ: '[[ 1, 0, 0, 0 ],\n [ 0, 1, 0, 0 ],\n [ 0, 0, 1, 0 ],\n [ 0, 0, 0, -1 ]]',
  SWAP: '[[ 1, 0, 0, 0 ],\n [ 0, 0, 1, 0 ],\n [ 0, 1, 0, 0 ],\n [ 0, 0, 0, 1 ]]',
  M: 'Projective Measurement\n|0⟩⟨0| or |1⟩⟨1|',
};

const getGateUnitaryString = (type: string, angle: number = Math.PI / 2): string => {
  const formatVal = (re: number, im: number): string => {
    if (Math.abs(re) < 1e-4 && Math.abs(im) < 1e-4) return "0";
    if (Math.abs(im) < 1e-4) return re.toFixed(3);
    if (Math.abs(re) < 1e-4) {
      if (im === 1) return "i";
      if (im === -1) return "-i";
      return im.toFixed(3) + "i";
    }
    const sign = im >= 0 ? "+" : "";
    const imStr = im === 1 ? "i" : im === -1 ? "-i" : im.toFixed(3) + "i";
    return `${re.toFixed(3)}${sign}${imStr}`;
  };

  const formatMatrix = (matrix: {re: number; im: number}[][]): string => {
    return matrix.map(row => "[ " + row.map(c => formatVal(c.re, c.im).padStart(8)).join(", ") + " ]").join("\n");
  };

  const cos = Math.cos(angle / 2);
  const sin = Math.sin(angle / 2);

  switch (type) {
    case 'H': {
      const val = 1 / Math.sqrt(2);
      return formatMatrix([
        [{ re: val, im: 0 }, { re: val, im: 0 }],
        [{ re: val, im: 0 }, { re: -val, im: 0 }]
      ]);
    }
    case 'X':
      return formatMatrix([
        [{ re: 0, im: 0 }, { re: 1, im: 0 }],
        [{ re: 1, im: 0 }, { re: 0, im: 0 }]
      ]);
    case 'Y':
      return formatMatrix([
        [{ re: 0, im: 0 }, { re: 0, im: -1 }],
        [{ re: 0, im: 1 }, { re: 0, im: 0 }]
      ]);
    case 'Z':
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: -1, im: 0 }]
      ]);
    case 'S':
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 1 }]
      ]);
    case 'T': {
      const tVal = 1 / Math.sqrt(2);
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: tVal, im: tVal }]
      ]);
    }
    case 'RX':
      return formatMatrix([
        [{ re: cos, im: 0 }, { re: 0, im: -sin }],
        [{ re: 0, im: -sin }, { re: cos, im: 0 }]
      ]);
    case 'RY':
      return formatMatrix([
        [{ re: cos, im: 0 }, { re: -sin, im: 0 }],
        [{ re: sin, im: 0 }, { re: cos, im: 0 }]
      ]);
    case 'RZ':
      return formatMatrix([
        [{ re: Math.cos(angle / 2), im: -Math.sin(angle / 2) }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: Math.cos(angle / 2), im: Math.sin(angle / 2) }]
      ]);
    case 'CX':
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 1 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 1, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }]
      ]);
    case 'CZ':
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 1 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: -1, im: 0 }]
      ]);
    case 'SWAP':
      return formatMatrix([
        [{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 1 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 1, im: 0 }]
      ]);
    default:
      return "Identity Matrix";
  }
};

const generateCircuitSummary = (circuit: Circuit, numQubits: number): string[] => {
  const steps: string[] = [];
  for (let slot = 0; slot < circuit.length; slot++) {
    const slotGates: CircuitGate[] = [];
    const seen = new Set<string>();
    for (let q = 0; q < numQubits; q++) {
      const g = circuit[slot][q];
      if (g && !seen.has(g.id)) {
        seen.add(g.id);
        slotGates.push(g);
      }
    }
    if (slotGates.length > 0) {
      const descriptions = slotGates.map((g) => {
        switch (g.type) {
          case 'H':
            return `superposition on q[${g.qubit}]`;
          case 'X':
            return `Pauli-X (NOT) on q[${g.qubit}]`;
          case 'Y':
            return `Pauli-Y on q[${g.qubit}]`;
          case 'Z':
            return `Pauli-Z (phase flip) on q[${g.qubit}]`;
          case 'S':
            return `Phase S (pi/2 shift) on q[${g.qubit}]`;
          case 'T':
            return `Phase T (pi/4 shift) on q[${g.qubit}]`;
          case 'RX':
            return `rotation around X axis by ${(g.angle !== undefined ? g.angle : Math.PI / 2).toFixed(4)} rad on q[${g.qubit}]`;
          case 'RY':
            return `rotation around Y axis by ${(g.angle !== undefined ? g.angle : Math.PI / 2).toFixed(4)} rad on q[${g.qubit}]`;
          case 'RZ':
            return `rotation around Z axis by ${(g.angle !== undefined ? g.angle : Math.PI / 2).toFixed(4)} rad on q[${g.qubit}]`;
          case 'CX':
            return `entangles control q[${g.qubit}] with target q[${g.target}] via CNOT`;
          case 'CZ':
            return `controlled-Phase flip between control q[${g.qubit}] and target q[${g.target}]`;
          case 'SWAP':
            return `swaps states of q[${g.qubit}] and q[${g.target}]`;
          case 'M':
            return `measurement on q[${g.qubit}]`;
          default:
            return `${g.type} gate on q[${g.qubit}]`;
        }
      });
      steps.push(`Step ${slot + 1}: Apply ${descriptions.join(', and ')}.`);
    }
  }
  if (steps.length === 0) {
    return ["No gates placed yet. Drag gates from the toolbox onto the qubit lines to build a circuit."];
  }
  return steps;
};

// Generate Qiskit Code according to user rules
const generateQiskitCode = (circuit: Circuit, numQubits: number): string => {
  let code = `from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(${numQubits})\n\n`;
  
  // Track step gates
  for (let slot = 0; slot < circuit.length; slot++) {
    const stepGates: CircuitGate[] = [];
    const seen = new Set<string>();
    
    for (let q = 0; q < numQubits; q++) {
      const g = circuit[slot][q];
      if (g && !seen.has(g.id)) {
        seen.add(g.id);
        stepGates.push(g);
      }
    }
    
    if (stepGates.length > 0) {
      code += `# Step ${slot + 1}\n`;
      stepGates.forEach((g) => {
        if (g.type === 'H') code += `qc.h(${g.qubit})\n`;
        else if (g.type === 'X') code += `qc.x(${g.qubit})\n`;
        else if (g.type === 'Y') code += `qc.y(${g.qubit})\n`;
        else if (g.type === 'Z') code += `qc.z(${g.qubit})\n`;
        else if (g.type === 'S') code += `qc.s(${g.qubit})\n`;
        else if (g.type === 'T') code += `qc.t(${g.qubit})\n`;
        else if (g.type === 'RX') code += `qc.rx(${g.angle !== undefined ? g.angle.toFixed(4) : '1.5708'}, ${g.qubit})\n`;
        else if (g.type === 'RY') code += `qc.ry(${g.angle !== undefined ? g.angle.toFixed(4) : '1.5708'}, ${g.qubit})\n`;
        else if (g.type === 'RZ') code += `qc.rz(${g.angle !== undefined ? g.angle.toFixed(4) : '1.5708'}, ${g.qubit})\n`;
        else if (g.type === 'CX') code += `qc.cx(${g.qubit}, ${g.target})\n`;
        else if (g.type === 'CZ') code += `qc.cz(${g.qubit}, ${g.target})\n`;
        else if (g.type === 'SWAP') code += `qc.swap(${g.qubit}, ${g.target})\n`;
        else if (g.type === 'M') code += `qc.measure_all()\n`;
      });
      code += `\n`;
    }
  }
  
  code += `print(qc.draw())`;
  return code;
};

// Syntax highlighter supporting keywords, functions, numbers, comments, punctuation
const highlightCode = (rawCode: string) => {
  const lines = rawCode.split('\n');
  return lines.map((line, lineIdx) => {
    let codePart = line;
    let commentPart = '';
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      codePart = line.substring(0, commentIdx);
      commentPart = line.substring(commentIdx);
    }
    
    // Tokenize
    const parts = codePart.split(/(\bfrom\b|\bimport\b|\bQuantumCircuit\b|\bprint\b|\bdraw\b|\bh\b|\bx\b|\by\b|\bz\b|\bs\b|\bt\b|\brx\b|\bry\b|\brz\b|\bcx\b|\bcz\b|\bswap\b|\bmeasure_all\b|\b\d+(?:\.\d+)?\b|[(),=.\[\]]|\s+)/g);
    
    const elements = parts.map((part, partIdx) => {
      if (!part) return null;
      
      // Keywords
      if (part === 'from' || part === 'import') {
        return <span key={partIdx} className="syntax-keyword">{part}</span>;
      }
      
      // Functions / methods
      if (
        part === 'QuantumCircuit' || 
        part === 'print' || 
        part === 'draw' || 
        ['h', 'x', 'y', 'z', 's', 't', 'rx', 'ry', 'rz', 'cx', 'cz', 'swap', 'measure_all'].includes(part)
      ) {
        return <span key={partIdx} className="syntax-function">{part}</span>;
      }
      
      // Numbers
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        return <span key={partIdx} className="syntax-number">{part}</span>;
      }
      
      // Punctuation
      if (/^[(),=.\[\]]$/.test(part)) {
        return <span key={partIdx} className="syntax-punctuation">{part}</span>;
      }
      
      // Default text
      return <span key={partIdx}>{part}</span>;
    });
    
    return (
      <div key={lineIdx} style={{ minHeight: '1.7em' }}>
        {elements}
        {commentPart && <span className="syntax-comment">{commentPart}</span>}
        {line === '' && '\u00A0'}
      </div>
    );
  });
};

// Bloch Sphere expectation helper
const getBlochVector = (stateVector: Complex[], qubitIdx: number) => {
  let x = 0;
  let y = 0;
  let z = 0;
  
  if (!stateVector || stateVector.length === 0) return { x, y, z };
  
  // Calculate expectations:
  // bit index: we match Qiskit's LSB first indexing
  const targetBit = qubitIdx;
  
  for (let j = 0; j < stateVector.length; j++) {
    const bitVal = (j >> targetBit) & 1;
    const jFlip = j ^ (1 << targetBit);
    
    const c_j = stateVector[j];
    const c_flip = stateVector[jFlip];
    
    // Z component: sum_j |c_j|^2 * (-1)^bitVal
    z += (c_j.re * c_j.re + c_j.im * c_j.im) * (bitVal === 0 ? 1 : -1);
    
    // X expectation: sum_j c_flip^* * c_j -> since we sum over all j, this covers all pairs
    x += (c_flip.re * c_j.re + c_flip.im * c_j.im);
    
    // Y expectation: sum_j c_flip^* * i * (-1)^bitVal * c_j
    // i * c_j = (-c_j.im) + i * c_j.re
    // c_flip^* * i * c_j = (c_flip.re - i*c_flip.im) * (-c_j.im + i*c_j.re)
    // Real part: -c_flip.re * c_j.im + c_flip.im * c_j.re
    const factor = bitVal === 0 ? 1 : -1;
    y += (-c_flip.re * c_j.im + c_flip.im * c_j.re) * factor;
  }
  
  return { x, y, z };
};

// Bloch Sphere Canvas drawing component
const BlochSphere: React.FC<{ stateVector: Complex[]; qubitIdx: number }> = ({ stateVector, qubitIdx }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { x, y, z } = useMemo(() => getBlochVector(stateVector, qubitIdx), [stateVector, qubitIdx]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and set sizes
    ctx.clearRect(0, 0, 60, 60);
    const cx = 30;
    const cy = 30;
    const r = 24;
    
    // Draw outer boundary circle
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw equator ellipse (XZ perspective projection)
    ctx.strokeStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw meridian ellipse
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.3, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // 3D Isometric projection of Bloch vector
    // x-axis goes down-left, y-axis goes right, z-axis goes up
    const px = cx + r * (y * 0.9 - x * 0.4);
    const py = cy - r * (z * 0.9 - x * 0.2);
    
    // Draw axes lines (Z axis)
    ctx.strokeStyle = '#161616';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    
    // Draw vector arrow line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    
    // Draw endpoint dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [x, y, z]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <canvas ref={canvasRef} width={60} height={60} style={{ display: 'block' }} />
      <span style={{ fontSize: '7px', color: '#666', fontFamily: 'var(--font-mono)' }}>
        x:{x.toFixed(1)} y:{y.toFixed(1)} z:{z.toFixed(1)}
      </span>
    </div>
  );
};

// Hilbert space phasor component
const HilbertPhasor: React.FC<{ amplitude: Complex; label: string }> = ({ amplitude, label }) => {
  const r = Math.sqrt(amplitude.re * amplitude.re + amplitude.im * amplitude.im);
  const theta = Math.atan2(amplitude.im, amplitude.re); // angle in radians
  
  // Coordinates
  const cx = 22;
  const cy = 22;
  const maxRadius = 18;
  
  const px = cx + maxRadius * r * Math.cos(theta);
  const py = cy - maxRadius * r * Math.sin(theta); // invert Y for SVG screen coordinates
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '56px', flexShrink: 0 }}>
      <svg width="44" height="44" style={{ background: '#050505', border: '1px solid #222222', borderRadius: '50%' }}>
        {/* Dashed outer boundary */}
        <circle cx={cx} cy={cy} r={maxRadius} fill="none" stroke="#333333" strokeDasharray="2,2" strokeWidth="1" />
        
        {/* Axis cross (faint) */}
        <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#1a1a1a" strokeWidth="1" />
        <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#1a1a1a" strokeWidth="1" />
        
        {/* Phase vector line */}
        {r > 0.01 && (
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#ffffff" strokeWidth="1.5" />
        )}
        
        {/* End point dot */}
        <circle cx={px} cy={py} r={r > 0.05 ? 2.5 : 1.5} fill="#ffffff" />
      </svg>
      <span style={{ fontSize: '9px', color: '#ffffff', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
        |{label}⟩
      </span>
      <span style={{ fontSize: '7.5px', color: '#888888', fontFamily: 'var(--font-mono)' }}>
        {r.toFixed(2)} ∠{(theta * 180 / Math.PI).toFixed(0)}°
      </span>
    </div>
  );
};

// Tooltip helper
const ToolboxItem: React.FC<{
  tool: { type: string; label: string; icon: string; desc: string; example: string };
  activeTool: string;
  onSelect: () => void;
  onDragStart: (type: string) => void;
}> = ({ tool, activeTool, onSelect, onDragStart }) => {
  const [hovered, setHovered] = useState(false);
  const matrix = GATE_MATRICES[tool.type] || '';
  
  return (
    <div 
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`gate-item ${activeTool === tool.type ? 'active' : ''}`}
        onClick={onSelect}
        draggable="true"
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', tool.type); onDragStart(tool.type); }}
      >
        <div className="gate-badge">{tool.icon}</div>
        <span style={{ fontSize: '9px' }}>{tool.label}</span>
      </button>
      
      {hovered && (
        <div style={{
          position: 'absolute',
          left: '144px',
          top: '0',
          zIndex: 1000,
          background: '#0a0a0a',
          border: '1px solid #1f1f1f',
          padding: '10px',
          borderRadius: '4px',
          color: '#ffffff',
          pointerEvents: 'none',
          boxShadow: '0px 0px 12px rgba(255,255,255,0.15)',
          width: '240px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ borderBottom: '1px solid #1f1f1f', paddingBottom: '4px', color: '#888888', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
            {tool.label}
          </div>
          <div style={{ color: '#ffffff', fontSize: '10px', whiteSpace: 'normal', lineHeight: '1.4', fontFamily: 'var(--font-sans)' }}>
            {tool.desc}
          </div>
          <div style={{ color: '#888888', fontSize: '9px', whiteSpace: 'normal', lineHeight: '1.3', fontFamily: 'var(--font-sans)' }}>
            <strong>Use Case:</strong> {tool.example}
          </div>
          {matrix && (
            <div style={{ marginTop: '4px', borderTop: '1px solid #1f1f1f', paddingTop: '6px' }}>
              <div style={{ color: '#888888', fontWeight: 'bold', fontSize: '8px', marginBottom: '4px', textTransform: 'uppercase' }}>
                Unitary Representation:
              </div>
              <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '8.5px', color: 'var(--accent)', whiteSpace: 'pre', lineHeight: '1.3' }}>
                {matrix}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function QuantumComposer() {
  const [draggedTool, setDraggedTool] = useState<string | null>(null);
  const [numQubits, setNumQubits] = useState<number>(3);
  
  // Initialize circuit grid
  const [numSlots, setNumSlots] = useState<number>(10);
    const [circuit, setCircuitState] = useState<Circuit>(() =>
    Array.from({ length: numSlots }, () => Array.from({ length: 4 }, () => null))
  );

  // Undo/Redo stack history states
  const [history, setHistory] = useState<Circuit[]>([
    Array.from({ length: numSlots }, () => Array.from({ length: 4 }, () => null))
  ]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  const [activeTool, setActiveTool] = useState<string>('pointer'); 
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string>('');
  const [qiskitCopied, setQiskitCopied] = useState<boolean>(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);
  
  // Toggle bottom state panel: 'vector' | 'chart' | 'hilbert'
  const [bottomViewToggle, setBottomViewToggle] = useState<'vector' | 'chart' | 'hilbert'>('vector');

  const [measurementResult, setMeasurementResult] = useState<number[] | null>(null);
  const [showAsPercentage, setShowAsPercentage] = useState<boolean>(false);

  // Clear measurement results when circuit or qubits change
  useEffect(() => {
    setMeasurementResult(null);
  }, [circuit, numQubits]);

  // Custom Wavefunction override states
  const [useCustomState, setUseCustomState] = useState<boolean>(false);
  const [customStateInput, setCustomStateInput] = useState<string>('');

  // Drag hover states
  const [dragHoverSlot, setDragHoverSlot] = useState<{ qubit: number; slot: number } | null>(null);

  // Sync custom state input default template with number of qubits
  useEffect(() => {
    const size = Math.pow(2, numQubits);
    const defaultValue = Array.from({ length: size }, (_, i) => (i === 0 ? '1' : '0')).join(', ');
    setCustomStateInput(defaultValue);
  }, [numQubits]);

  // Wrap setCircuit to push history
  const setCircuit = (newCircuit: Circuit) => {
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(newCircuit);
    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
    setCircuitState(newCircuit);
  };

  // Undo operation
  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setCircuitState(history[prevIdx]);
      setSelectedGateId(null);
      setRunMessage('Undo action applied.');
      setTimeout(() => setRunMessage(''), 2000);
    }
  };

  // Redo operation
  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setCircuitState(history[nextIdx]);
      setSelectedGateId(null);
      setRunMessage('Redo action applied.');
      setTimeout(() => setRunMessage(''), 2000);
    }
  };

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo / Redo checks
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Toolbar selection
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      
      const key = e.key.toLowerCase();
      if (key === 'h') setActiveTool('H');
      else if (key === 'x') setActiveTool('X');
      else if (key === 'y') setActiveTool('Y');
      else if (key === 'z') setActiveTool('Z');
      else if (key === 's') setActiveTool('S');
      else if (key === 't') setActiveTool('T');
      else if (key === 'c') setActiveTool('CX');
      else if (key === 'g') setActiveTool('CZ');
      else if (key === 'w') setActiveTool('SWAP');
      else if (key === 'm') setActiveTool('M');
      else if (key === 'e') setActiveTool('eraser');
      else if (e.key === 'Escape') setActiveTool('pointer');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIdx, history]);

  // Wavefunction parser for custom statevector inputs
  const parseWavefunction = (inputStr: string, size: number): Complex[] | null => {
    try {
      const parts = inputStr.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length !== size) return null;
      
      const result: Complex[] = [];
      for (const part of parts) {
        let clean = part.replace(/\s+/g, '');
        if (clean === '0') {
          result.push({ re: 0, im: 0 });
          continue;
        }
        
        let re = 0;
        let im = 0;
        
        if (clean === 'i' || clean === '+i') {
          im = 1;
        } else if (clean === '-i') {
          im = -1;
        } else if (clean.endsWith('i')) {
          const valWithoutI = clean.slice(0, -1);
          const plusIdx = valWithoutI.lastIndexOf('+');
          const minusIdx = valWithoutI.lastIndexOf('-');
          const splitIdx = Math.max(plusIdx, minusIdx);
          
          if (splitIdx > 0) {
            re = parseFloat(valWithoutI.substring(0, splitIdx));
            const imStr = valWithoutI.substring(splitIdx);
            im = parseFloat(imStr === '+' ? '1' : imStr === '-' ? '-1' : imStr);
          } else if (splitIdx === 0) {
            im = parseFloat(valWithoutI);
          } else {
            im = parseFloat(valWithoutI);
          }
        } else {
          re = parseFloat(clean);
        }
        
        if (isNaN(re) || isNaN(im)) return null;
        result.push({ re, im });
      }
      
      let sumMag2 = 0;
      for (const c of result) {
        sumMag2 += c.re * c.re + c.im * c.im;
      }
      if (sumMag2 === 0) return null;
      const factor = Math.sqrt(sumMag2);
      return result.map(c => ({ re: c.re / factor, im: c.im / factor }));
    } catch {
      return null;
    }
  };

  // Simulate circuit
  const simulationResult = useMemo(() => {
    const defaultRes = simulateCircuit(circuit, numQubits);
    if (useCustomState && customStateInput) {
      const size = Math.pow(2, numQubits);
      const parsed = parseWavefunction(customStateInput, size);
      if (parsed) {
        const probabilities = parsed.map(c => c.re * c.re + c.im * c.im);
        const shots: Record<string, number> = {};
        for (let i = 0; i < 1024; i++) {
          const r = Math.random();
          let accum = 0;
          let selected = 0;
          for (let j = 0; j < probabilities.length; j++) {
            accum += probabilities[j];
            if (r <= accum) {
              selected = j;
              break;
            }
          }
          const binStr = formatBinary(selected, numQubits);
          shots[binStr] = (shots[binStr] || 0) + 1;
        }

        return {
          stateVector: parsed,
          probabilities,
          shots,
          qasm: defaultRes.qasm
        };
      }
    }
    return defaultRes;
  }, [circuit, numQubits, useCustomState, customStateInput]);

  // Compute Qiskit code
  const qiskitCode = useMemo(() => {
    return generateQiskitCode(circuit, numQubits);
  }, [circuit, numQubits]);

  // Compute active topics
  const activeTopics = useMemo(() => {
    const topics = new Set<string>();
    for (let s = 0; s < numSlots; s++) {
      for (let q = 0; q < numQubits; q++) {
        const g = circuit[s][q];
        if (g) {
          if (g.type === 'H' || g.type === 'S' || g.type === 'T') {
            topics.add('superposition');
          } else if (g.type === 'CX' || g.type === 'CZ') {
            topics.add('entanglement');
          } else if (g.type === 'M') {
            topics.add('measurement');
          } else if (g.type === 'X' || g.type === 'Y' || g.type === 'Z') {
            topics.add('pauli gates');
          }
        }
      }
    }
    return Array.from(topics);
  }, [circuit, numQubits]);

  // Selected gate
  const selectedGate = useMemo(() => {
    if (!selectedGateId) return null;
    for (let s = 0; s < numSlots; s++) {
      for (let q = 0; q < numQubits; q++) {
        const g = circuit[s][q];
        if (g && g.id === selectedGateId) {
          return { gate: g, slot: s };
        }
      }
    }
    return null;
  }, [selectedGateId, circuit, numQubits]);

  // Slot click
  const handleSlotClick = (qubit: number, slot: number) => {
    if (activeTool === 'pointer') {
      const gate = circuit[slot][qubit];
      if (gate) {
        setSelectedGateId(gate.id);
      } else {
        setSelectedGateId(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      const gate = circuit[slot][qubit];
      if (gate) {
        deleteGate(gate.id);
      }
      return;
    }

    // Place gate
    let target: number | undefined = undefined;
    if (activeTool === 'CX' || activeTool === 'CZ') {
      target = qubit === numQubits - 1 ? qubit - 1 : qubit + 1;
      if (target < 0 || target >= numQubits) return;
    } else if (activeTool === 'SWAP') {
      target = qubit === numQubits - 1 ? qubit - 1 : qubit + 1;
      if (target < 0 || target >= numQubits) return;
    }

    const newGate: CircuitGate = {
      id: `gate-${Math.random().toString(36).substr(2, 9)}`,
      type: activeTool,
      qubit: qubit,
      target: target,
      angle: (activeTool === 'RX' || activeTool === 'RY' || activeTool === 'RZ') ? Math.PI / 2 : undefined
    };

    const newCircuit = circuit.map((s, sIdx) => {
      if (sIdx !== slot) return s;
      return s.map((g, qIdx) => {
        if (qIdx === qubit || (target !== undefined && qIdx === target)) {
          return null;
        }
        if (g && (g.qubit === qubit || g.target === qubit || (target !== undefined && (g.qubit === target || g.target === target)))) {
          return null;
        }
        return g;
      });
    });

    newCircuit[slot][qubit] = newGate;
      if (target !== undefined) {
        newCircuit[slot][target] = newGate;
      }

      setCircuit(newCircuit);
      setSelectedGateId(newGate.id);
    };

  // Delete gate
  const deleteGate = (gateId: string) => {
    const newCircuit = circuit.map((slot) =>
      slot.map((gate) => (gate && gate.id === gateId ? null : gate))
    );
    setCircuit(newCircuit);
    if (selectedGateId === gateId) {
      setSelectedGateId(null);
    }
  };

  // Update angle
  const handleUpdateAngle = (gateId: string, angle: number) => {
    const newCircuit = circuit.map((slot) => {
      return slot.map((g) => {
        if (g && g.id === gateId) {
          return { ...g, angle };
        }
        return g;
      });
    });
    setCircuit(newCircuit);
  };

  // Update control
  const handleUpdateControl = (gateId: string, newControl: number) => {
    let foundSlot = -1;
    let foundTarget = -1;
    for (let s = 0; s < numSlots; s++) {
      for (let q = 0; q < numQubits; q++) {
        const g = circuit[s][q];
        if (g && g.id === gateId && g.target === q) {
          foundSlot = s;
          foundTarget = q;
          break;
        }
      }
      if (foundSlot !== -1) break;
    }

    if (foundSlot === -1 || foundTarget === -1 || newControl === foundTarget) return;

    const newCircuit = circuit.map((slot, sIdx) => {
      if (sIdx !== foundSlot) return slot;
      return slot.map((g, qIdx) => {
        if (g && g.id === gateId) return null;
        if (qIdx === newControl) return null;
        return g;
      });
    });

    const oldGate = circuit[foundSlot].find((g) => g && g.id === gateId)!;
    const updatedGate: CircuitGate = {
      ...oldGate,
      qubit: newControl
    };

    newCircuit[foundSlot][newControl] = updatedGate;
    newCircuit[foundSlot][foundTarget] = updatedGate;
    setCircuit(newCircuit);
  };

  // Update target
  const handleUpdateTarget = (gateId: string, newTarget: number) => {
    let foundSlot = -1;
    let foundControl = -1;
    for (let s = 0; s < numSlots; s++) {
      for (let q = 0; q < numQubits; q++) {
        const g = circuit[s][q];
        if (g && g.id === gateId && g.qubit === q) {
          foundSlot = s;
          foundControl = q;
          break;
        }
      }
      if (foundSlot !== -1) break;
    }

    if (foundSlot === -1 || foundControl === -1 || newTarget === foundControl) return;

    const newCircuit = circuit.map((slot, sIdx) => {
      if (sIdx !== foundSlot) return slot;
      return slot.map((g, qIdx) => {
        if (g && g.id === gateId) return null;
        if (qIdx === newTarget) return null;
        return g;
      });
    });

    const oldGate = circuit[foundSlot].find((g) => g && g.id === gateId)!;
    const updatedGate: CircuitGate = {
      ...oldGate,
      target: newTarget
    };

    newCircuit[foundSlot][foundControl] = updatedGate;
    newCircuit[foundSlot][newTarget] = updatedGate;
    setCircuit(newCircuit);
  };

  const loadPreset = (presetName: string) => {
    setSelectedGateId(null);
    const emptyCircuit: Circuit = Array.from({ length: numSlots }, () =>
      Array.from({ length: 4 }, () => null)
    );
    
    if (presetName === 'bell') {
      setNumQubits(2);
      const hGate: CircuitGate = { id: 'bell-h', type: 'H', qubit: 0 };
      const cxGate: CircuitGate = { id: 'bell-cx', type: 'CX', qubit: 0, target: 1 };
      emptyCircuit[0][0] = hGate;
      emptyCircuit[1][0] = cxGate;
      emptyCircuit[1][1] = cxGate;
    } else if (presetName === 'ghz') {
      setNumQubits(3);
      const hGate: CircuitGate = { id: 'ghz-h', type: 'H', qubit: 0 };
      const cx1: CircuitGate = { id: 'ghz-cx1', type: 'CX', qubit: 0, target: 1 };
      const cx2: CircuitGate = { id: 'ghz-cx2', type: 'CX', qubit: 1, target: 2 };
      emptyCircuit[0][0] = hGate;
      emptyCircuit[1][0] = cx1;
      emptyCircuit[1][1] = cx1;
      emptyCircuit[2][1] = cx2;
      emptyCircuit[2][2] = cx2;
    } else if (presetName === 'superposition') {
      setNumQubits(3);
      for (let q = 0; q < 3; q++) {
        emptyCircuit[0][q] = { id: `super-h-${q}`, type: 'H', qubit: q };
      }
    }
    setCircuit(emptyCircuit);
  };

  // Clean circuit when qubit count changes
  const handleNumQubitsChange = (newVal: number) => {
    setNumQubits(newVal);
    setSelectedGateId(null);
    const cleanedCircuit = circuit.map((slot) =>
      slot.map((gate) => {
        if (!gate) return null;
        if (gate.qubit >= newVal || (gate.target !== undefined && gate.target >= newVal)) {
          return null;
        }
        return gate;
      })
    );
    setCircuit(cleanedCircuit);
  };

  // Clear composer
  const handleNewCircuit = () => {
    const emptyCircuit = Array.from({ length: numSlots }, () => Array.from({ length: 4 }, () => null));
    setCircuit(emptyCircuit);
    setSelectedGateId(null);
    setActiveTool('pointer');
    setRunMessage('');
  };

  // Re-run simulation
  const handleRunSimulation = () => {
    setCircuit([...circuit]); 
    
    const probs = simulationResult?.probabilities || [];
    if (probs.length > 0) {
      const r = Math.random();
      let accum = 0;
      let selectedIdx = probs.length - 1;
      for (let i = 0; i < probs.length; i++) {
        accum += probs[i];
        if (r <= accum) {
          selectedIdx = i;
          break;
        }
      }
      
      const binStr = formatBinary(selectedIdx, numQubits);
      const bits: number[] = [];
      for (let i = 0; i < numQubits; i++) {
        const char = binStr[numQubits - 1 - i];
        bits.push(char === '1' ? 1 : 0);
      }
      setMeasurementResult(bits);
    }
    
    setRunMessage('Run successful (1024 shots sampled).');
    setTimeout(() => setRunMessage(''), 3000);
  };

  // Copy OpenQASM
  const handleExport = () => {
    if (simulationResult) {
      navigator.clipboard.writeText(simulationResult.qasm);
      setRunMessage('OpenQASM copied.');
      setTimeout(() => setRunMessage(''), 2000);
    }
  };

  // Copy Qiskit code
  const handleCopyQiskit = () => {
    navigator.clipboard.writeText(qiskitCode);
    setQiskitCopied(true);
    setTimeout(() => setQiskitCopied(false), 2000);
  };

  // Export as PNG Canvas Image
  const handleExportPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 72 * numQubits + 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid wires
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let q = 0; q < numQubits; q++) {
      const y = 30 + q * 72;
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(620, y);
      ctx.stroke();

      // Qubit label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`q[${q}]`, 20, y + 4);
    }

    // Draw gates
    for (let s = 0; s < numSlots; s++) {
      const x = 90 + s * 52;
      for (let q = 0; q < numQubits; q++) {
        const gate = circuit[s][q];
        if (gate) {
          const y = 30 + q * 72;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          // Check single or double qubit
          if (gate.type === 'CX' || gate.type === 'CZ' || gate.type === 'SWAP') {
            // Only draw links and target structures
            if (gate.target !== undefined && gate.qubit === q) {
              const ty = 30 + gate.target * 72;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, ty);
              ctx.stroke();

              // Control node
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();

              // Target node
              if (gate.type === 'CX') {
                ctx.beginPath();
                ctx.arc(x, ty, 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - 8, ty); ctx.lineTo(x + 8, ty);
                ctx.moveTo(x, ty - 8); ctx.lineTo(x, ty + 8);
                ctx.stroke();
              } else if (gate.type === 'CZ') {
                ctx.beginPath();
                ctx.arc(x, ty, 4, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // SWAP crosses
                ctx.font = 'bold 14px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('×', x - 4, y + 4);
                ctx.fillText('×', x - 4, ty + 4);
              }
            }
          } else {
            // Standard single qubit box
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 16, y - 16, 32, 32);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(gate.type, x, y + 4);
          }
        }
      }
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = 'quantum-circuit.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const formatComplex = (c: Complex): string => {
    const re = c.re.toFixed(3);
    const im = Math.abs(c.im).toFixed(3);
    const sign = c.im >= 0 ? '+' : '-';
    return `${re} ${sign} ${im}i`;
  };

  // Composer properties & stats
  const stats = useMemo(() => {
    let gateCount = 0;
    let depth = 0;
    const seen = new Set<string>();

    for (let s = 0; s < numSlots; s++) {
      let slotHasGate = false;
      for (let q = 0; q < numQubits; q++) {
        const gate = circuit[s][q];
        if (gate && !seen.has(gate.id)) {
          seen.add(gate.id);
          gateCount++;
          slotHasGate = true;
        }
      }
      if (slotHasGate) depth++;
    }

    return { gateCount, depth };
  }, [circuit, numQubits]);

  const renderedConnections = useMemo(() => {
    const connections: React.ReactNode[] = [];
    const seenIds = new Set<string>();

    for (let s = 0; s < numSlots; s++) {
      for (let q = 0; q < numQubits; q++) {
        const gate = circuit[s][q];
        if (gate && (gate.type === 'CX' || gate.type === 'CZ' || gate.type === 'SWAP')) {
          if (!seenIds.has(gate.id) && gate.target !== undefined) {
            seenIds.add(gate.id);
            const c = gate.qubit;
            const t = gate.target;
            const minQ = Math.min(c, t);
            const maxQ = Math.max(c, t);
            
            const xPos = 180 + s * 52; 
            const yMin = minQ * 72 + 36;
            const yMax = maxQ * 72 + 36;
            const height = yMax - yMin;

            connections.push(
              <div
                key={gate.id}
                className="multi-qubit-link"
                style={{
                  left: `${xPos}px`,
                  top: `${yMin}px`,
                  height: `${height}px`,
                }}
              />
            );
          }
        }
      }
    }

    return connections;
  }, [circuit, numQubits]);

  const toolboxTools = [
    { type: 'pointer', label: 'Select', icon: 'P', desc: 'Select and inspect placed gates.', example: 'Click on any gate on the grid to open its properties in the Inspector.' },
    { type: 'eraser', label: 'Eraser', icon: 'E', desc: 'Remove placed gates from the circuit.', example: 'Click on a gate on the qubit lines to delete it.' },
    { type: 'H', label: 'Hadamard', icon: 'H', desc: 'Creates a superposition state.', example: 'Place on |0⟩ to obtain (|0⟩ + |1⟩)/√2.' },
    { type: 'X', label: 'Pauli-X', icon: 'X', desc: 'Flips the qubit state (NOT operation).', example: 'Converts |0⟩ to |1⟩, or |1⟩ to |0⟩.' },
    { type: 'Y', label: 'Pauli-Y', icon: 'Y', desc: 'Applies a Pauli-Y rotation and phase shift.', example: 'Rotates state around Y axis of the Bloch sphere.' },
    { type: 'Z', label: 'Pauli-Z', icon: 'Z', desc: 'Flips the phase of the qubit state.', example: 'Converts (|0⟩ + |1⟩)/√2 to (|0⟩ - |1⟩)/√2.' },
    { type: 'S', label: 'Phase S', icon: 'S', desc: 'Applies a π/2 phase shift (S gate).', example: 'Useful in quantum Fourier transform (QFT) circuits.' },
    { type: 'T', label: 'Phase T', icon: 'T', desc: 'Applies a π/4 phase shift (T gate).', example: 'Universal gate set component for fault-tolerant computing.' },
    { type: 'RX', label: 'RX Gate', icon: 'RX', desc: 'Rotates the qubit around the X axis.', example: 'Creates arbitrary state superpositions with controlled phases.' },
    { type: 'RY', label: 'RY Gate', icon: 'RY', desc: 'Rotates the qubit around the Y axis.', example: 'Transitions state along the longitudinal meridians of the Bloch sphere.' },
    { type: 'RZ', label: 'RZ Gate', icon: 'RZ', desc: 'Rotates the qubit around the Z axis.', example: 'Applies a continuous phase shift to the |1⟩ state.' },
    { type: 'CX', label: 'CNOT', icon: 'CX', desc: 'Entangles two qubits with a controlled-NOT gate.', example: 'Creates Bell states when combined with a Hadamard gate.' },
    { type: 'CZ', label: 'CZ', icon: 'CZ', desc: 'Controlled phase flip between two qubits.', example: 'Key component in cluster states and error-correcting codes.' },
    { type: 'SWAP', label: 'Swap', icon: 'SW', desc: 'Exchanges the states of two qubits.', example: 'Reorders qubits for local interactions in limited topologies.' },
    { type: 'M', label: 'Measure', icon: 'M', desc: 'Measures the qubit state (collapses to classical bit).', example: 'Readout of quantum state at the end of simulation.' },
  ];

  return (
    <div className="app-container">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo-container">
            <div className="topbar-logo">Q</div>
            <span className="topbar-title">QuantumComposer</span>
          </div>
          {runMessage && (
            <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '16px' }} className="glow-text">
              {runMessage}
            </span>
          )}
        </div>
        <div className="topbar-right">
          <button
            type="button"
            className="ghost-button"
            style={{ marginRight: '8px' }}
            onClick={handleExportPNG}
          >
            Copy PNG
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            style={{ marginRight: '8px' }}
          >
            {rightPanelCollapsed ? 'Show Code' : 'Hide Code'}
          </button>
          <button type="button" className="run-button" onClick={handleRunSimulation}>
            Run
          </button>
          <button type="button" className="ghost-button" style={{ marginLeft: '8px' }} onClick={handleExport}>
            Export
          </button>
          <button type="button" className="ghost-button" style={{ marginLeft: '8px' }} onClick={handleNewCircuit}>
            + New
          </button>
        </div>
      </header>
      <div className="divider-h" />

      {/* Main content */}
      <main className="main-content">
        
        {/* Column 1: Left - Toolbox & Presets */}
        <div className="column-left">
          <div className="section-title">Qubits</div>
          <div className="section-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleNumQubitsChange(Math.max(1, numQubits - 1))}
                style={{ flex: 1, padding: '8px 0', cursor: numQubits <= 1 ? 'not-allowed' : 'pointer', opacity: numQubits <= 1 ? 0.5 : 1 }}
                disabled={numQubits <= 1}
              >
                - Remove
              </button>
              <div style={{ padding: '0 12px', fontWeight: 'bold', fontSize: '14px' }}>{numQubits}</div>
              <button
                type="button"
                onClick={() => handleNumQubitsChange(Math.min(7, numQubits + 1))}
                style={{ flex: 1, padding: '8px 0', cursor: numQubits >= 7 ? 'not-allowed' : 'pointer', opacity: numQubits >= 7 ? 0.5 : 1 }}
                disabled={numQubits >= 7}
              >
                + Add
              </button>
            </div>
          </div>

          <div className="section-title">Toolbox</div>
          <div className="section-content">
            {toolboxTools.map((tool) => (
              <ToolboxItem
                key={tool.type}
                tool={tool}
                activeTool={activeTool}
                onSelect={() => {
                  setActiveTool(tool.type);
                  setSelectedGateId(null);
                }}
              />
            ))}
          </div>

          <div className="section-title">Presets</div>
          <div className="section-content">
            <button type="button" className="preset-button" onClick={() => loadPreset('bell')} style={{ width: '100%' }}>
              Bell State
            </button>
            <button type="button" className="preset-button" onClick={() => loadPreset('ghz')} style={{ width: '100%' }}>
              GHZ State
            </button>
            <button type="button" className="preset-button" onClick={() => loadPreset('superposition')} style={{ width: '100%' }}>
              Superposition
            </button>
          </div>

          <div className="section-title">Waveform Input</div>
          <div className="section-content" style={{ gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#888888', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={useCustomState}
                onChange={(e) => setUseCustomState(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#ffffff' }}
              />
              OVERRIDE STATE
            </label>
            {useCustomState && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  value={customStateInput}
                  onChange={(e) => setCustomStateInput(e.target.value)}
                  placeholder={numQubits === 1 ? '1, 0' : '0.707, 0, 0, 0.707'}
                  style={{
                    background: '#050505',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    padding: '6px 8px',
                    outline: 'none',
                    borderRadius: '4px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '7.5px', color: '#666666', lineHeight: '1.4', fontFamily: 'var(--font-sans)' }}>
                  Enter {Math.pow(2, numQubits)} complex amplitudes separated by commas (e.g. 1, 0 or 0.707, 0.707i).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Center - Interactive Grid & Bottom Panels */}
        <div className="column-center">
          
          {/* Depth Ruler above grid */}
          <div style={{
            position: 'relative',
            height: '24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-1)'
          }}>
            {Array.from({ length: numSlots }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${180 + idx * 52}px`,
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: '#444444',
                  lineHeight: '24px'
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          <div className="circuit-composer" style={{ position: 'relative', flex: 1 }}>
            
            {/* Visual multi-qubit connections */}
            {renderedConnections}

            {Array.from({ length: numQubits }).map((_, q) => (
              <div className="qubit-row" key={q}>
                <div className="qubit-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>q[{q}]</span>
                  <BlochSphere stateVector={simulationResult?.stateVector || []} qubitIdx={q} />
                </div>
                
                <div className="qubit-line-container">
                  <div className="qubit-wire" />
                  
                  <div className="circuit-slots">
                    {Array.from({ length: numSlots }).map((_, s) => {
                      const gate = circuit[s][q];
                      const isSelected = gate && selectedGateId === gate.id;
                      
                      // Active hover drag slot preview calculation
                      const isHoveredDrag = dragHoverSlot && dragHoverSlot.qubit === q && dragHoverSlot.slot === s;
                      
                      return (
                        <div
                          key={s}
                          className={`circuit-slot ${gate ? 'active-gate' : ''} ${
                            isSelected ? 'selected' : ''
                          }`}
                          style={{
                            opacity: isHoveredDrag && !gate ? 0.4 : 1,
                            borderStyle: isHoveredDrag && !gate ? 'solid' : 'dashed',
                            borderColor: isHoveredDrag && !gate ? '#ffffff' : undefined
                          }}
                          onMouseEnter={() => setDragHoverSlot({ qubit: q, slot: s })}
                          onMouseLeave={() => setDragHoverSlot(null)}
                          onClick={() => handleSlotClick(q, s)}
                        >
                          {gate && (
                            <>
                              {gate.type === 'CX' && (
                                <>
                                  {q === gate.qubit ? (
                                    <div
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: '#000000',
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>⊕</span>
                                  )}
                                </>
                              )}

                              {gate.type === 'CZ' && (
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#000000',
                                  }}
                                />
                              )}

                              {gate.type === 'SWAP' && (
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>×</span>
                              )}

                              {gate.type !== 'CX' && gate.type !== 'CZ' && gate.type !== 'SWAP' && (
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{gate.type}</span>
                              )}
                            </>
                          )}
                          {!gate && isHoveredDrag && activeTool !== 'pointer' && activeTool !== 'eraser' && (
                            <span style={{ fontSize: '9px', opacity: 0.5 }}>{activeTool}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Circuit Summary text box */}
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1f1f1f',
            borderRadius: '4px',
            padding: '12px',
            marginTop: '16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '9px',
              fontWeight: 'bold',
              color: '#888888',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Circuit Summary
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: '#ffffff',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {generateCircuitSummary(circuit, numQubits).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#888888' }}>›</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="divider-h" />
          {/* Restructured Bottom Dashboard */}
          <div className="bottom-dashboard">
            
            
            {/* Panel 2: Simulation State (Probabilities) */}
            <div className="dashboard-col" style={{ flex: 1.5 }}>
              <div className="section-title">
                <span>Simulation State</span>
              </div>
              <div className="section-content" style={{ overflowY: 'auto', flex: 1, gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Measurement Probabilities
                  </span>
                  <div className="bar-chart">
                    {simulationResult?.probabilities.map((prob, idx) => {
                      const binStr = formatBinary(idx, numQubits);
                      const pct = (prob * 100).toFixed(1);
                      const shotCount = simulationResult.shots[binStr] || 0;
                      return (
                        <div className="bar-row" key={idx}>
                          <div className="bar-label-container">
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>|{binStr}?</span>
                            <span>{pct}% ({shotCount} s)</span>
                          </div>
                          <div className="bar-bg">
                            <div className="bar-fill" style={{ width: (prob * 100) + '%' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
{/* Panel 3: OpenQASM 2.0 */}
            <div className="dashboard-col" style={{ flex: 1.2 }}>
              <div className="section-title">OpenQASM Output</div>
              <div className="section-content" style={{ flex: 1, padding: '12px' }}>
                <textarea
                  key={simulationResult?.qasm || ''}
                  className="code-reveal"
                  readOnly
                  value={simulationResult?.qasm || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    padding: '8px',
                    borderRadius: '4px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Column 3: Right - Qiskit Code Panel & Topic Chips */}
        <div className={`column-right ${rightPanelCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '10px', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Qiskit output
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={handleCopyQiskit}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                height: '24px'
              }}
            >
              {qiskitCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            
            {/* Syntax highlighted pre tag */}
            <pre 
              key={qiskitCode}
              className="code-reveal"
              style={{
                backgroundColor: '#050505',
                padding: '12px',
                fontSize: '10.5px',
                lineHeight: '1.7',
                borderRadius: '4px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {highlightCode(qiskitCode)}
            </pre>
            
            {/* Topic chips section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '9px', color: '#555', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Topics in this circuit
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeTopics.length > 0 ? (
                  activeTopics.map((topic) => (
                    <span key={topic} className="chip">
                      {topic}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '9px', color: 'var(--muted)' }}>none</span>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}


