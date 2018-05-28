const config = require("config");
const express = require("express");
var https = require('https');

const app = express();

function newWebhook(guid) {
	if (config.has('webhooks')) {
		var output = null;
		config.get('webhooks').forEach(webhook => {
			if (webhook.guid == guid) {
				output = webhook;
			}
		});

		return output;
	}
}

app.use(express.json()); 
app.post('/:guid', function(req, res) {
	var webhook = newWebhook(req.params.guid);
	if (webhook === null) {
		res.sendStatus(404);
	} else {
		var stackTrace = '\n| **Line** | **Code** |\n';
		var stackTrace = stackTrace + '|:----|:-----|\n';
		var code = req.body.error.stackTrace[0].code
		for (var lineNum in code) {
			stackTrace = stackTrace + '| ' + lineNum + ' | `' + code[lineNum] + '` |\n';
		}

		var payload = JSON.stringify({
			text: '##### [' + req.body.project.name + '](' + req.body.error.url + ')  ·  ' + req.body.trigger.message + '\n\n' +
					'**Error** '  + req.body.error.context + '\n' +
					'_' + req.body.error.message + '_\n' + 
					'_' + req.body.error.stackTrace[0].file + ': ' + req.body.error.stackTrace[0].lineNumber + '_\n' +
					stackTrace + 
					'#' + req.body.error.app.releaseStage + ' ' + '#' + req.body.trigger.type + ' #v' + req.body.error.app.version + 'b' + req.body.error.app.versionCode
		});

		var post_options = {
			host: webhook.host,
			port: webhook.port,
			path: webhook.path,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(payload)
			}
		};

		var post_req = https.request(post_options, function(res) {
			res.on('data', function (chunk) {
				console.log('Response: ' + chunk);
			});
		});

		post_req.end(payload);

		res.sendStatus(200);
	}
});

app.listen(8181);
