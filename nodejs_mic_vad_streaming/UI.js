const ora = require('ora');
const { renderEvents } = require('./events');

class UI {

	constructor ( ) {
		this.spinner = null;
		this.events = null;
	}

	start ( ) {
		this.spinner = ora({spinner: 'dots', indent: 1}).start();
		this.events = [];
	}

	next ( failed ) {
		if (failed) this.spinner.fail();
		else this.spinner.succeed();
		this.start();
	}

	render (result) {
		if (this.events.length === 1) {
			this.spinner.stop();
			this.spinner = ora({spinner: 'toggle9', prefixText: '\n', interval: 200}).start();
		}
		this.spinner.prefixText = ` ${renderEvents(this.events)} ${result.duration}ms\n`;
		this.spinner.text = `${result.text || '...'} (processing: ${result.processingTime}ms)`;
	}

	update ( {type, result} ) {
		if (result) {
			this.events.push(type);
			this.render(result);
			if (result.done) {
				this.next(!result.text);
				if (result.text === 'quit') {
					this.stop();
				}
			}
		}
	}

	stop ( ) {
		this.spinner.info('quitting...');
		process.exit();
	}

}

module.exports = UI;
