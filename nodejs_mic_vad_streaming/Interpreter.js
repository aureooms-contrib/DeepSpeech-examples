const {
	EVENT_VOICE_START,
	EVENT_VOICE,
	EVENT_VOICE_END,
	EVENT_SILENCE
} = require('./events');

const Transcript = require('./Transcript');

const SILENCE_THRESHOLD = 500; // how many milliseconds of inactivity before finalizing the processing of the audio
const SIZE_BUFFER_SILENCE = 10;

class Interpreter {

	constructor ( model ) {
		this.model = model;
		this.transcript = null;
		this.silenceStart = null;
		this.silenceBuffers = [];
	}

	processVADOutput (data) {
		const isVoice = data.speech.state;
		const audio = data.audioData;
		return isVoice ? this.processVoice(audio) : this.processSilence(audio);
	}

	processSilence (data) {
		let type = EVENT_SILENCE;

		if (this.transcript) {

			let result = this.transcript.process(data);

			if (this.silenceStart === null) this.silenceStart = new Date();
			else if (new Date() - this.silenceStart > SILENCE_THRESHOLD) {
				// transcript is done if no voice has been heard for SILENCE_THRESHOLD milliseconds
				type = EVENT_VOICE_END;
				result = this.transcript.done();
				this.transcript = null;
				this.silenceStart = null;
			}

			return { type, result };
		}

		this.bufferSilence(data);
		return { type };
	}

	bufferSilence (data) {
		// VAD has a tendency to cut the beginning of voice data
		// we circumvent this by buffering the last few chunks
		// which we inject back once voice has been detected
		this.silenceBuffers.push(data);
		if (this.silenceBuffers.length >= SIZE_BUFFER_SILENCE) this.silenceBuffers.shift();
	}

	addBufferedSilence(data) {
		if (this.silenceBuffers.length === 0) return data;
		this.silenceBuffers.push(data);
		const audioBuffer = Buffer.concat(this.silenceBuffers);
		this.silenceBuffers = [];
		return audioBuffer;
	}

	processVoice(voice) {
		this.silenceStart = null;
		if (this.transcript) {
			const type = EVENT_VOICE;
			const result = this.transcript.process(voice);
			return {type, result};
		}
		else {
			const data = this.addBufferedSilence(voice);
			const pipeline = this.model.createStream();
			this.transcript = new Transcript(pipeline);
			const type = EVENT_VOICE_START;
			const result = this.transcript.process(data);
			return {type, result};
		}
	}

}

module.exports = Interpreter;
