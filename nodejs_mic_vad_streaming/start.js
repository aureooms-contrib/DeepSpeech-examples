'use strict';

const DeepSpeech = require('deepspeech');
const VAD = require('node-vad');
const mic = require('mic');
const fs = require('fs');

const UI = require('./UI');
const Interpreter = require('./Interpreter');

//const debug = true;
const debug = false;

const DEEPSPEECH_MODEL = process.env.DEEPSPEECH_MODEL || __dirname + '/deepspeech-0.8.0-models';

//const VAD_MODE = VAD.Mode.NORMAL;
//const VAD_MODE = VAD.Mode.LOW_BITRATE;
const VAD_MODE = VAD.Mode.AGGRESSIVE;
//const VAD_MODE = VAD.Mode.VERY_AGGRESSIVE;

const device = 'default';

const audioMilliSeconds = (byteLength, {rate, bitwidth, channels}) => Math.round((byteLength / bitwidth / channels * 8) * (1 / rate) * 1000);

const addDuration = ({type, result}, encodingOptions) => {
	if (!result) return {type};
	const duration = audioMilliSeconds(result.byteLength, encodingOptions);
	return {type, result: {...result, duration}};
};

const createModel = (modelDir) => {
	const modelPath = modelDir + '.pbmm';
	const scorerPath = modelDir + '.scorer';
	if (debug) console.debug({modelPath, scorerPath});
	const model = new DeepSpeech.Model(modelPath);
	model.enableExternalScorer(scorerPath);
	return model;
};

const model = createModel(DEEPSPEECH_MODEL);
const rate = model.sampleRate();

const encodingOptions = {
	rate,
	channels: '1',
	encoding: 'signed-integer',
	bitwidth: 16,
	endian: 'little'
};

const main = () => {

	const ui = new UI();
	ui.start();

	const microphone = mic({
		...encodingOptions,
		device,
		debug,
		fileType: 'wav'
	});

	const source = microphone.getAudioStream();

	//const source = fs.createReadStream('test2.wav');

	const vadStream = VAD.createStream({
		mode: VAD_MODE,
		audioFrequency: rate,
		debounceTime: 0
	});

	const interpreter = new Interpreter(model);

	source.pipe(vadStream).on('data', (data) => {
		const state = interpreter.processVADOutput(data);
		ui.update(addDuration(state, encodingOptions));
	});

	//source.on('data', (data) => {
		//const state = interpreter.processVoice(data);
		//ui.update(addDuration(state, encodingOptions));
	//});

	microphone.start();
}

main();
