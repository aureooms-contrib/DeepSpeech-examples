'use strict';

const DeepSpeech = require('deepspeech');
const VAD = require('node-vad');
const mic = require('mic');
const fs = require('fs');
const ora = require('ora');

const Interpreter = require('./Interpreter');
const { renderEvents } = require('./events');

//const debug = true;
const debug = false;

const DEEPSPEECH_MODEL = process.env.DEEPSPEECH_MODEL || __dirname + '/deepspeech-0.8.0-models';

//const VAD_MODE = VAD.Mode.NORMAL;
//const VAD_MODE = VAD.Mode.LOW_BITRATE;
const VAD_MODE = VAD.Mode.AGGRESSIVE;
//const VAD_MODE = VAD.Mode.VERY_AGGRESSIVE;

const device = 'default';

const audioMilliSeconds = (byteLength, {rate, bitwidth, channels}) => Math.round((byteLength / bitwidth / channels * 8) * (1 / rate) * 1000);

class UI {

	constructor ( ) {
		this.spinner = null;
		this.events = [];
	}

	start ( ) {
		this.spinner = ora({spinner: 'dots'}).start();
	}

	render (result) {
		const duration = audioMilliSeconds(result.byteLength, encodingOptions);
		this.spinner.prefixText = ` ${renderEvents(this.events)} ${duration}ms\n`;
		this.spinner.spinner = 'toggle9';
		this.spinner.text = `${result.text || '...'} (processing: ${result.processingTime}ms)`;
	}

	update ( {type, result} ) {
		if (result) {
			this.events.push(type);
			this.render(result);
			if (result.done) {
				this.spinner.stopAndPersist();
				this.spinner = ora({spinner: 'dots'}).start();
				if (debug) console.debug(result);
				if (result.text === 'quit') {
					this.stop();
				}
			}
		}
		else {
			this.events = [];
		}
	}

	stop ( ) {
		console.log('quitting...');
		process.exit();
	}

}

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
		ui.update(state);
	});

	//source.on('data', (data) => {
		//const state = interpreter.processVoice(data);
		//ui.update(state);
	//});

	microphone.start();
}

main();
