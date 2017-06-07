var util = require('util');
var events = require('events');

/*
 * This custom command allows us to locate an HTML element on the page and then wait until the element is both visible
 * and has a "disabled" state.  It clicks and then checkes the element state until either it evaluates to true.
 */

function ClickUntilElementNotPresent() {
  events.EventEmitter.call(this);
}

util.inherits(ClickUntilElementNotPresent, events.EventEmitter);

ClickUntilElementNotPresent.prototype.command = function (element) {

  console.log(element);

  var self = this;
  var message;

  this.clickElement(element, function (result) {
    if (result) {
      message = '@' + element + ' was clicked until not present.';
    } else {
      message = '@' + element + ' was not but is still present.';
    }
    self.client.assertion(result, 'clicked until not present', 'clicked and still present', message, true);
    self.emit('complete');
  });

  return this;
};

ClickUntilElementNotPresent.prototype.clickElement = function (element, callback) {
  var self = this;

  var promises =[];

  promises.push(new Promise(function(resolve) {
    self.api.element(element.locateStrategy, element.selector, function(result) {
      resolve(result.status != -1);
    });
  }));

  Promise.all(promises)
    .then(function(results) {
      const visibleAndPresent = !!results[0];
      if (visibleAndPresent) {
        self.api.click(element);
        setTimeout(function() {
          self.clickElement(element, callback);
        }, 500);
      } else if (visibleAndPresent == false) {
        callback(true);
      } else {
        callback(false);
      }
    })
    .catch(function(error) {
      self.api.click(element);
      setTimeout(function () {
        self.clickElement(element, callback);
      }, 500);
    });
};

module.exports = ClickUntilElementNotPresent;