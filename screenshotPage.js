var util = require('util');
var events = require('events');

function ScreenshotPage(){
	events.EventEmitter.call(this);
}

util.inherits(ScreenshotPage, events.EventEmitter);

ScreenshotPage.prototype.command = function(name, filePath, callback){
	var self = this;
	var message;

	this.execute(name, filePath, function(result){
		if(result){
			message = 'Screenshot for ' + name + ' taken.';
		} else {
			message = 'There was an error';
		}
		callback(result);
		self.client.assertion(result, '', '', message, true);
		self.emit('complete');
	});

	return this;
};

ScreenshotPage.prototype.execute = function(name, filePath, callback){
	var self = this;

	self.api.saveScreenshot(filePath, function(screenshot){
		callback(screenshot);
	});
};

module.exports = ScreenshotPage;