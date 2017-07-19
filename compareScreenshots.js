/* eslint-disable */
var util = require('util');
var events = require('events');
var fs = require('fs');
var resemble = require('node-resemble-js');

/*
 * This custom command allows us to locate an HTML element on the page and then wait until the element is both visible
 * and has a "disabled" state.  It clicks and then checkes the element state until either it evaluates to true.
 */

function CompareScreenshots(){
	events.EventEmitter.call(this);
}

util.inherits(CompareScreenshots, events.EventEmitter);

CompareScreenshots.prototype.command = function(element, name, callback){
	var self = this;
	//Handle the callback and name if there is no element
	//element must be an xpath
	if(element.indexOf('//') === -1){
		if(name){
			callback = name;
		}
		name = element;
		element = false;
	}

	name = this.cleanName(name);
	self.initGlobal();
	self.initGlobalModule(); 
	//Check if the current 'name' has a screenshot already this session. If so, skip it. 
	if(self.trackCurrentShot(name) === true){
		self.api.perform(function(){
			var message = 'Compare Screenshots: A screenshot has already been taken for ' + name + ' this session. This shot will be skipped.';
			self.client.assertion(true, true, true, message, true);
			self.emit('complete');
		});
	} else {
		var testFilePath = this.buildTestFilePath(name);
		var refFilePath = this.buildRefFilePath(name);

		//Attempt to read the Reference Image from the File System
		try {
			var image = fs.readFileSync(refFilePath);
		} catch (err){
		//If the Reference Image isn't there, take one.
			if (err.code === 'ENOENT'){
				if(element){
					self.api.screenshotElement(element, name, refFilePath, function(screenshot){
						self.markTestNew(name, refFilePath);
						self.writeJSON();
						if(callback){
							callback(screenshot);
						}
						self.client.assertion(true, screenshot, screenshot, 'Compare Screenshots: New reference screenshot taken.', true);
						self.emit('complete');
					});
				} else {
					self.api.screenshotPage(name, refFilePath, function(screenshot){
						self.markTestNew(name, refFilePath);
						self.writeJSON();
						if(callback){
							callback(screenshot);
						}
						self.client.assertion(true, screenshot, screenshot, 'Compare Screenshots: New reference screenshot taken.', true);
						self.emit('complete');
					});
				}
			} else {
				//Callback if the error was for some reason other than 'Unable to find Reference Image file.'
				if(callback){
					callback('There was an error: ' + err);
				}
				throw err;
			}
		}

		//If we found the image, take a new screenshot, so we can compair them.
		if(image){
			if(element){
				this.api.screenshotElement(element, name, testFilePath, function(screenshot){
					self.compareShots(name, image, testFilePath, refFilePath, function(result){
						self.writeJSON();
						if(result.passed){
							self.client.assertion(true, result.message, result.message, 'Compare Screenshots:' + result.message, true);
						} else if (!result.passed){
							self.client.assertion(true, result.passMessage, result.failureMessage, 'Compare Screenshots: ' + result.failureMessage, true);
						} else{
							console.log('I don\'t know what happened.');
						}
						self.emit('complete');
					});
				});
			} else {
				this.api.screenshotPage(name, testFilePath, function(screenshot){
					self.compareShots(name, image, testFilePath, refFilePath, function(result){
						self.writeJSON();
						if(result.passed){
							self.client.assertion(true, result.message, result.message, 'Compare Screenshots:' + result.message, true);
						} else if (!result.passed){
							self.client.assertion(true, result.passMessage, result.failureMessage, 'Compare Screenshots: ' + result.failureMessage, true);
						} else{
							console.log('I don\'t know what happened.');
						}
						self.emit('complete');
					});
				});
			}
		}

		return this;
	}
};

CompareScreenshots.prototype.compareShots = function(name, image, testFilePath, refFilePath, callback){
	var self = this;

	try{
		var screenshot = fs.readFileSync(testFilePath);
	} catch(error){
		console.log(error);
	}


	resemble(image)
		.compareTo(screenshot)
		.onComplete(function(data){
			if (Number(data.misMatchPercentage) <= 0.01){
				self.markTestPassed(name, testFilePath, refFilePath);
				if(callback){
					var result = {
						passed: true,
						message: name + ' compairson passed!'
					};
					callback(result);
				}
			} else {
				var diffFilePath = testFilePath + '_diff.png';
				data.getDiffImage().pack().pipe(fs.createWriteStream(diffFilePath));
				self.markTestFailed(name, testFilePath, refFilePath, diffFilePath);
				if(callback){
					var result = {
						passed: false,
						failureMessage: name + ' screenshots differ ' + data.misMatchPercentage + '%',
						passMessage: name + ' compairson passed!'
					};
					callback(result);
				}
			}
			return this;
		});
};

CompareScreenshots.prototype.buildTestFilePath = function(name){
	var self = this;
	var subTestName = this.stripTestName();
	var fileName = global.currentStatus.testDate + '/' + self.api.currentTest.module + '/' + subTestName + '/' + name + '.png';

	return __base + 'style_regression/test/' + fileName;
};

CompareScreenshots.prototype.buildRefFilePath = function(name){
	var self = this;
	var subTestName = this.stripTestName();
	var fileName = self.api.currentTest.module + '/' + subTestName + '/' + name + '.png';

	return __base + 'style_regression/refs/' + fileName;
};

CompareScreenshots.prototype.stripTestName = function(){
	return this.api.currentTest.name.substr((this.api.currentTest.name.indexOf(': ') + 2), 5);
};

CompareScreenshots.prototype.cleanName = function(name){
	return name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
};

CompareScreenshots.prototype.markTestPassed = function(name, testFilePath, refFilePath){
	var self = this;
	var module = self.api.currentTest.module;
	var testName = self.stripTestName(self.api.currentTest.name);

	var temp = {
		ref_path: refFilePath,
		test_path: testFilePath,
		status: 'passed'
	};

	global.currentStatus[module][testName][name] = temp;
};

CompareScreenshots.prototype.markTestFailed = function(name, testFilePath, refFilePath, diffFilePath){
	var self = this;
	var module = self.api.currentTest.module;
	var testName = self.stripTestName(self.api.currentTest.name);

	var temp = {
		ref_path: refFilePath,
		test_path: testFilePath,
		diff_path: diffFilePath,
		status: 'failed'
	};

	global.currentStatus[module][testName][name] = temp;
};

CompareScreenshots.prototype.markTestNew = function(name, refFilePath){
	var self = this;
	var module = self.api.currentTest.module;
	var testName = self.stripTestName(self.api.currentTest.name);

	var temp = {
		ref_path: refFilePath,
		status: 'new'
	};

	global.currentStatus[module][testName][name] = temp;
};

CompareScreenshots.prototype.initGlobal = function(){
	var date = new Date();
	var newDate = date.getMonth()+1 + '.' + date.getDate() + '.' + date.getFullYear() + '_' + date.getHours() + '.' + date.getMinutes();

	if(!global.currentStatus){
		global.currentStatus = {};
		global.currentStatus.testDate = newDate;
		global.shotList = {};
	}
};

CompareScreenshots.prototype.initGlobalModule = function(){
	var self = this;
	var module = self.api.currentTest.module;
	var testName = self.stripTestName(self.api.currentTest.name);

	if(!global.currentStatus[module]){
		global.currentStatus[module] = {};
	}
	if(global.currentStatus[module] && !global.currentStatus[module][testName]){
		global.currentStatus[module][testName] = {};
	}
};

CompareScreenshots.prototype.trackCurrentShot = function(name){
	if(global.shotList[name]){
		return true;
	} else {
		global.shotList[name] = true;
		return false;
	}
};

CompareScreenshots.prototype.writeJSON = function(){
	var json = JSON.stringify(global.currentStatus);
	try{
		fs.writeFileSync(__base + 'style_regression/test/data.json', json);
	} catch(err){
		console.log(err);
	}
};

module.exports = CompareScreenshots;