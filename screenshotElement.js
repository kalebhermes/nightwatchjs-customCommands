var util = require('util');
var events = require('events');
var gm = require('gm');

function ScreenshotElement(){
	events.EventEmitter.call(this);
}

util.inherits(ScreenshotElement, events.EventEmitter);

ScreenshotElement.prototype.command = function(element, name, filePath, callback){
	var self = this;
	var message;

	this.execute(element, name, filePath, function(result){
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

ScreenshotElement.prototype.execute = function(element, name, filePath, callback){
	var self = this;

	var promises =[];
	promises.push(new Promise(function(resolve){
		self.api.element('xpath', element, function(result){
			self.api.elementIdLocation(result.value.ELEMENT, function(location){
				self.api.elementIdSize(result.value.ELEMENT, function(size){
					resolve([result.value.ELEMENT, location, size]);
				});
			});
		});
	}));

	Promise.all(promises)
		.then(function(results){
			self.api.saveScreenshot(filePath, function(screenshot){
				gm(filePath)
					.crop(results[0][2].value.width, results[0][2].value.height, results[0][1].value.x, results[0][1].value.y)
					.write(filePath, function(err){
						if (err){
							console.log(err);
						}
						callback(screenshot);
					});

			});
		})
		.catch(function(error){
			console.log(error);
		});
};

module.exports = ScreenshotElement;