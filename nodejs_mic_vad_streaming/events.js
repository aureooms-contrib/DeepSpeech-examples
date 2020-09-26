const EVENT_VOICE_START = 0;
const EVENT_VOICE = 1;
const EVENT_VOICE_END = 2;
const EVENT_SILENCE = -1;

const renderEvents = ( events ) => events.map(renderEvent).join('');

const renderEvent = ( event ) => {
	switch ( event ) {
		case EVENT_SILENCE:
			return '_';
		case EVENT_VOICE:
			return '+';
		case EVENT_VOICE_START:
			return '> ';
		case EVENT_VOICE_END:
			return ' |';
		default:
			return '?';
	}
};

module.exports = {
	EVENT_VOICE_END,
	EVENT_VOICE_START,
	EVENT_VOICE,
	EVENT_SILENCE,
	renderEvents,
	renderEvent
};
