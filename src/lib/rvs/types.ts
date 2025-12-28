export type ParameterConfig = {
	name: string;
	maxSize: number;
};

export type Condition = {
	rawExpression: string; // e.g. "2 <= x <= 4", "x == 10"
	expectedType: 'color' | 'number';
	expectedValue: number | 'blank';
};

export type RvsConfig = {
	template: string;
	parameters: ParameterConfig[];
	conditions: Condition[];
	options: {
		treatMinusOneAsBlank: boolean;
		floorOutput: boolean;
		preferFewerColors: boolean;
	};
};

export type RvsResult = {
	expression: string;
	parameters: Record<string, number>;
	rawParameters?: Record<string, string>; // Store exact string (e.g. ".01")
	score: number;
	size: number;
	colors: number[];
	mismatchCount: number;
};
