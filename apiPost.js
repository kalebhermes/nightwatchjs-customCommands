process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var util = require('util');
var events = require('events');

var request = require('request')

/*
 * This custom command allows us to POST to the API. It requires 4 arguments.
 * 1. The URL of the endpoint you're POSTing to
 * 2. An API token
 * 3. A javascript object representing the payload to POST
 * 4. A callback function if you want the results of the POST call.
 * You can find documention at https://confluence.rocketfuel.com/display/AUTO/postAPI
 */

function apiPost() {
  events.EventEmitter.call(this);
}

util.inherits(apiPost, events.EventEmitter);

apiPost.prototype.command = function (url, token, dataArgs, callback) {

  var self = this;

  var j = request.jar();

  var options = {
    method: "GET",
    jar: j,
    url: "https://master.orion.rfiserve.net/api/orion/auth",
    headers: {
      'Content-Type': 'application/json',
      'token': token
    }
  };

  var optionsTwo = {
    method: "POST",
    jar: j,
    url: url,
    body: JSON.stringify(dataArgs),
    headers: {
      'token': token
    }
  };

  request(options, function(error, response, body){
    if(!error && response.statusCode === 200){
      request(optionsTwo, function(error, response, body){
        if(!error && response.statusCode === 201){
          callback(JSON.parse(body));
          self.client.assertion(true, 'Response was 201', 'Response was 201', 'Posted to API', true);
          self.emit('complete');
        } else {
          callback(body);
          self.client.assertion(false, 'Response was ' + response.statusCode, 'Response was 201', 'Unable to Post to API. Try logging the response.', true);
          self.emit('complete');
        };
      })
    }
  })

  return this;
};

module.exports = apiPost;
