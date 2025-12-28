export interface DomainSpec {
	x: [number, number]; // [min, max]
	y: [number, number];
	z: [number, number];
	t: [number, number]; // Added t for temporal functions
}

export type ConditionType = 'specific' | 'range' | 'set' | 'mod' | 'bit';

export interface UserConstraint {
	id: string;
	conditionType: ConditionType;
	targetInputs: string;
	outputRequirement: OutputRequirement;
}

export type OutputRequirement =
	| { type: 'value'; val: number }
	| { type: 'set'; values: number[] }
	| { type: 'range'; min: number; max: number } // Inclusive
	| { type: 'mod'; divisor: number; remainder: number }
	| { type: 'blank' }; // Replicube specific: <= 0

export interface InputTuple {
	x: number;
	y: number;
	z: number;
	t: number;
}

export interface TestCase {
	input: InputTuple;
	expected: OutputRequirement;
}

export interface SearchConfig {
	maxDepth: number;
	variables: string[]; // ['x', 'y']
	ops: string[]; // ['+', '%', '==']
	targetComplexity?: number;
	extraConstants?: number[];
	bankLimit?: number;
}

export interface SynthesisResult {
	code: string;
	score: number; // Length
	complexity: number; // Operator count
}

// Worker Messages
export type WorkerCommand =
	| { cmd: 'START'; config: SearchConfig; cases: TestCase[] }
	| { cmd: 'STOP' };

export type WorkerResponse =
	| { type: 'PROGRESS'; depth: number; candidatesExplored: number }
	| { type: 'FOUND'; solution: SynthesisResult }
	| { type: 'DONE'; reason: 'exhausted' | 'stopped' | 'timeout' }
	| { type: 'ERROR'; message: string };
