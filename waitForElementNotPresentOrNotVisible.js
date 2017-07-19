var util = require('util');
var events = require('events');

/*
 * This custom command allows us to locate an HTML element on the page and then wait until the element is both visible
 * and has a "disabled" state.  It clicks and then checkes the element state until either it evaluates to true.
 */

function WaitForElementNotPresentOrNotVisible() {
  events.EventEmitter.call(this);
}

util.inherits(WaitForElementNotPresentOrNotVisible, events.EventEmitter);

WaitForElementNotPresentOrNotVisible.prototype.command = function (element, timeout) {

  var self = this;
  var message;

  if(!timeout){
    timeout = 10000;
  }

  this.execute(element, timeout, function (result) {
    if (result) {
      message = '@' + element + ' is not present or is not visible.';
    } else {
      message = '@' + element + ' is present or is visible.';
    }
    self.client.assertion(result, 'is not present and is not visible', 'is present or is visible', message, true);
    self.emit('complete');
  });

  return this;
};

WaitForElementNotPresentOrNotVisible.prototype.execute = function (element, timeout, callback) {
  var self = this;

  var promises =[];

  promises.push(new Promise(function(resolve) {
    self.api.element('css selector', element, function(result){
      if(result.status == -1){
        resolve(false);
      } else {
        self.api.elementIdDisplayed(result.value.ELEMENT, function(secondResult){
          if(secondResult.value == true){
            resolve(true);
          } else {
            resolve(false);
          }
        });
      }
    });
  }));

  Promise.all(promises)
    .then(function(results) {
      const presentOrVisible = !!results[0];
      if (presentOrVisible) {
        setTimeout(function() {
          self.execute(element, (timeout - 100), callback);
        }, 100);
      } else if (presentOrVisible == false) {
        callback(true);
      } else if(timeout == 0){
        callback(false);
      } else {
        callback(false);
      }
    })
    .catch(function(error) {
      setTimeout(function () {
        self.execute(element, (timeout - 100), callback);
      }, 100);
    });
};

module.exports = WaitForElementNotPresentOrNotVisible;
