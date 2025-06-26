
var utils = {};
var useConsoleLog = true;
class Utils {
	constructor() {
		let missionPrefixStr = ''
		for (const missionInfoArgItem of arguments) {
			missionPrefixStr = missionPrefixStr + `[${missionInfoArgItem}]`
		}
		this.missionName = missionPrefixStr || '[UNDEFINED]'
	}
	log = function (...message) {
		if (useConsoleLog) {
			console.log(`${this.missionName}[LOG]: `, ...message);
		}
	}

	error = function (...error) {
		if (useConsoleLog) {
			console.error(`${this.missionName}[ERROR]: `, ...error);
		}
	}
}

utils = new Utils('UTILS')

module.exports = { Utils, utils };