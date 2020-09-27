const VAD = require('node-vad');
const {Transform} = require('stream');

//const VAD_MODE = VAD.Mode.NORMAL;
//const VAD_MODE = VAD.Mode.LOW_BITRATE;
const VAD_MODE = VAD.Mode.AGGRESSIVE;
//const VAD_MODE = VAD.Mode.VERY_AGGRESSIVE;

const detectVoice = (rate) => {

	const vad = new VAD(VAD_MODE);

	return new Transform({
		objectMode: true,
		async transform({meta, data}, encoding, callback) {
			const res = await vad.processAudio(data, 16000);
			const isVoice = res === VAD.Event.VOICE;
			const state = {
				data,
				meta: {
					...meta,
					isVoice
				}
			}
			callback(null, state);
		}
	});

};

module.exports = detectVoice;
