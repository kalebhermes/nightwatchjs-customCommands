var util = require('util');
var events = require('events');

/*
 * This custom command allows us to locate an HTML element on the page and then wait until the element is both visible
 * and has a "disabled" state.  It clicks and then checkes the element state until either it evaluates to true.
 */

function ClickUntilElementDisabled(){
	events.EventEmitter.call(this);
}

util.inherits(ClickUntilElementDisabled, events.EventEmitter);

ClickUntilElementDisabled.prototype.command = function(element){

	console.log(element);

	var self = this;
	var message;

	this.clickElement(element, function(result){
		if (result){
			message = '@' + element + ' was clickable.';
		} else {
			message = '@' + element + ' was not clickable.';
		}
		self.client.assertion(result, 'not visible or disabled', 'visible and not disabled', message, true);
		self.emit('complete');
	});

	return this;
};

ClickUntilElementDisabled.prototype.clickElement = function(element, callback){
	var self = this;

	var promises =[];
	promises.push(new Promise(function(resolve){
		self.api.isVisible(element, function(result){
			resolve(result.status === 0 && result.value === true);
		});
	}));

	promises.push(new Promise(function(resolve){
		self.api.getAttribute(element, 'disabled', function(result){
			resolve(result.status === 0 && result.value === null);
		});	
	}));

	Promise.all(promises)
		.then(function(results){
			const visibleAndNotDisabled = !!results[0] && !!results[1];
			const visibleAndDisabled = !!results[0] && !results[1];
			if (visibleAndNotDisabled){
				self.api.click(element);
				setTimeout(function(){
					self.clickElement(element, callback);
				}, 500);
			} else if (visibleAndDisabled){
				callback(true);
			} else {
				callback(false);
			}
		})
		.catch(function(error){
			console.log(error);
			self.api.click(element);
			setTimeout(function(){
				self.clickElement(element, callback);
			}, 500);
		});
};

module.exports = ClickUntilElementDisabled;