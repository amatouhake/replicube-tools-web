import { Synthesizer } from './Synthesizer';
import type { WorkerCommand, WorkerResponse } from './types';

let activeSynthesizer: Synthesizer | null = null;
let isRunning = false;

self.onmessage = async (e: MessageEvent<WorkerCommand>) => {
	const data = e.data;

	if (data.cmd === 'START') {
		isRunning = true;
		let lastProgress = 0;

		activeSynthesizer = new Synthesizer(
			data.cases,
			data.config,
			(depth: number, pct: number) => {
				const now = Date.now();
				// Throttle messages to reporting
				if (now - lastProgress > 100) {
					self.postMessage({
						type: 'PROGRESS',
						depth,
						candidatesExplored: pct
					} as WorkerResponse);
					lastProgress = now;
				}
			},
			() => !isRunning // cancellation check
		);

		try {
			for await (const result of activeSynthesizer.solve()) {
				if (!isRunning) break;

				self.postMessage({
					type: 'FOUND',
					solution: result
				} as WorkerResponse);
			}

			if (isRunning) {
				self.postMessage({ type: 'DONE', reason: 'exhausted' } as WorkerResponse);
			} else {
				self.postMessage({ type: 'DONE', reason: 'stopped' } as WorkerResponse);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			self.postMessage({
				type: 'ERROR',
				message: err.message
			} as WorkerResponse);
		} finally {
			isRunning = false;
		}
	} else if (data.cmd === 'STOP') {
		isRunning = false;
		// We cannot force interrupt the synchronous execution of the current depth step in Synthesizer,
		// but it will stop at the next yield point.
		// If the worker needs hard termination, the main thread should use worker.terminate().
	}
};

export {};
