const mem = require('mem');

const maxAge = 400;

class Transcript {

	constructor (pipeline) {
		this.pipeline = pipeline;
		this.byteLength = 0;
		this.intermediate = mem(() => this.pipeline.intermediateDecode(), {maxAge});
	}

	process (chunk) {
		this.byteLength += chunk.length;
		const start = new Date();
		this.pipeline.feedAudioContent(chunk);
		const text = this.intermediate();
		const processingTime = new Date() - start;
		return {
			text,
			processingTime,
			byteLength: this.byteLength,
			done: false
		};
	}

	done () {
		const start = new Date();
		const text = this.pipeline.finishStream();
		const processingTime = new Date() - start;
		return {
			text,
			processingTime,
			byteLength: this.byteLength,
			done: true
		};
	}
}

module.exports = Transcript;
