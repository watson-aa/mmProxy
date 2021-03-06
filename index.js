const config = require("config");
const express = require("express");
const https = require('https');

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
	const webhook = newWebhook(req.params.guid);
	if (webhook === null) {
		res.sendStatus(404);
	} else if (req.body.error.app.releaseStage == 'development') {
		res.sendStatus(204);
	} else {
		var code = req.body.error.stackTrace[0].code
		var stackTrace = '';
		if (code.length > 0) {
			stackTrace = '\n| **Line** | **Code** |\n';
			stackTrace = stackTrace + '|:----|:-----|\n';
			for (var lineNum in code) {
				var codeLine = '';
				if (code[lineNum] != '') {
					codeLine = '`' + code[lineNum] + '`';
				}
				stackTrace = stackTrace + '| ' + lineNum + ' | ' + codeLine + ' |\n';
			}
		}

		var payload = JSON.stringify({
			text: '##### ' + req.body.project.name + ' :beetle: ' + req.body.trigger.message + ' :beetle: [View on Bugsnag](' + req.body.error.url + ')' + '\n\n' +
					'**Error** '  + req.body.error.context + '\n' +
					'_' + req.body.error.message + '_\n' + 
					'_' + req.body.error.stackTrace[0].file + ': ' + req.body.error.stackTrace[0].lineNumber + '_\n' +
					stackTrace + 
					'#' + req.body.error.app.releaseStage + ' ' + '#' + req.body.trigger.type + ' #v' + req.body.error.app.version + 'b' + req.body.error.app.versionCode,
			user: webhook.user,
			icon_url: webhook.icon_url,
			channel: webhook.channel
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

app.listen(process.env.NODE_PORT || 8181);
