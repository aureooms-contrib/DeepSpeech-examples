'use strict';

const DeepSpeech = require('deepspeech');
const mic = require('mic');
const fs = require('fs');
const {Transform} = require('stream');

const UI = require('./UI');
const Interpreter = require('./Interpreter');
const detectVoice = require('./detectVoice');
const {Throttle} = require('stream-throttle');

//const debug = true;
const debug = false;

const DEEPSPEECH_MODEL = process.env.DEEPSPEECH_MODEL || __dirname + '/deepspeech-0.8.0-models';

const device = 'default';

const audioMilliSeconds = (byteLength, {rate, bitwidth, channels}) => Math.round((byteLength / bitwidth / channels * 8) * (1 / rate) * 1000);

const addDuration = (encodingOptions) => new Transform({
	objectMode: true,
	transform({meta, data}, encoding, callback) {
		if (!meta.transcript) {
			callback(null, {meta, data});
			return;
		}
		const duration = audioMilliSeconds(meta.transcript.byteLength, encodingOptions);
		const state = {
			data,
			meta: {
				...meta,
				transcript: {
					...meta.transcript,
					duration
				}
			}
		};
		callback(null, state);
	}
});

const objectify = () => new Transform({
	writableObjectMode: false,
	readableObjectMode: true,
	transform(data, encoding, callback) {
		const state = {meta: {}, data};
		callback(null, state);
	}
});

const createModel = (modelDir) => {
	const modelPath = modelDir + '.pbmm';
	const scorerPath = modelDir + '.scorer';
	if (debug) console.debug({modelPath, scorerPath});
	const model = new DeepSpeech.Model(modelPath);
	model.enableExternalScorer(scorerPath);
	return model;
};

const getSource = (encodingOptions) => {

	const microphone = mic({
		...encodingOptions,
		device,
		debug,
		fileType: 'wav'
	});

	microphone.start();

	const source = microphone.getAudioStream();

	//const {rate, bitwidth, channels} = encodingOptions;
	//const bps = rate * (bitwidth / 8) * channels;
	//const chunksize = bps / 4;
	//const throttle = new Throttle({rate: bps, chunksize});
	//const source = fs.createReadStream('test2.wav')
		//.pipe(throttle);

	return source;

};

const interpretVoice = (model) => new Interpreter(model).stream();

const main = () => {

	const model = createModel(DEEPSPEECH_MODEL);
	const rate = model.sampleRate();

	const ui = new UI();
	ui.start();

	const encodingOptions = {
		rate,
		channels: '1',
		encoding: 'signed-integer',
		bitwidth: 16,
		endian: 'little'
	};

	const source = getSource(encodingOptions);

	source
		.pipe(objectify())
		.pipe(detectVoice(rate))
		.pipe(interpretVoice(model))
		.pipe(addDuration(encodingOptions))
		.on('data', (state) => {
			ui.update(state);
		});

}

main();
