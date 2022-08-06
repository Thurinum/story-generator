//**//DEV FLAGS//**//
const engine_enableDevMode = false; // Enable Dev Mode custom features you choose to include to your program
const engine_enableExperimental = false; // Place experimental features here
const debug_loggingLevel = 3; // 0: Don't generate logs. 1: Generate basic logs. 2: Generate detailed logs. 3: Generate full logs.

//**DEVMODE CONFIG//**//
const defaultMinimumLevel = 2; // Default value for logs without minimum
const defaultLogType = 0; // Default value for logs intensity
const enableTimestamps = true; // Display timestamps in logs
const useAccurateTimestamps = true; // Display miliseconds in timestamps
const useTimeElapsedStamps = true; // Display time elapsed in timestamps
const toggleKey = 96;
var DevModeEnabledFeatures = []; // Don't touch

//Calculate current time at startup
var date = new Date();
var initialHours = date.getHours();
var initialMinutes = date.getMinutes();
var initialSeconds = date.getSeconds();
var initialMilliseconds = date.getMilliseconds();

//**//CUSTOM DEVMODE FEATURES//**//
if (engine_enableDevMode) {

}

//**//EXPERIMENTAL FEATURES//**//
if (engine_enableExperimental) {

}

//**//INFO LOG TOOLTIPS//**//
const infoLogTooltips = {
	1: 'Example tooltip',
}

//**//DEFAULT DEV TOOLS//**//
//Logs stylesheet
const styleSheet = `
    body {
        background-color: black;
        color: #DDDDDD;
        white-space: pre-wrap;
        overflow-wrap: anywhere; 
        font-size: 19px;
        font-family: monospace;
    }
    details {
        display: inline;
        color: #6a73a2;
    }
    img {
        width: 24x;
        height: 24px;
    }
    span {
        display: flex;
        margin-bottom: 10px;
        transition: color 0.3s linear;
    }
`

//File structure
const debugLogFileStart = `
<!DOCTYPE html>
<html>
    <head>
      <title>Dynamic Tile Map Generator Debug Log</title>
      <meta charset="utf-8" />
      <style>
        body {
            background-color: black;
            color: #DDDDDD;
            white-space: pre-wrap;
            overflow-wrap: anywhere; 
            font-size: 19px;
            font-family: sans-serif;
        }
        details {
            display: inline;
            color: #7e93ff;
        }
        img {
            width: 24x;
            height: 24px;
        }
        span {
            display: flex;
        }
      </style>
    </head>
<body>`;

//Show extended logs
if (debug_loggingLevel > 0) {
	console.warn(`[Warning] Logging is enabled to level ${debug_loggingLevel}. How to use:\n\ndebug_generateLogs(false): View logs on current page.\ndebug_generateLogs(true): Download logs as .html.`);

	DevModeEnabledFeatures.push(`Logging Level ${debug_loggingLevel}`);
} else {
	console.info(`[Info] Extended logs are *disabled*. Enable in DevMode.js for debugging.\nType 'debug_help()' for help.`);
}

var infoLogContent = ``; // Debug log content (must be activated in DevMode.js)
var infoLogID = 1;

//Generated debug logs
function debug_generateLogs(download) {
	//Check if logging is disabled
	if (debug_loggingLevel === 0) {
		infoLogContent = "Logging is not enabled. You can enable it in DevMode.js."
	}

	//Detect empty log
	if (infoLogContent == "") {
		infoLogContent = "Debug log is empty! Add info to your program using the dm_log() function."
	}

	//Generate log
	if (download === true) {
		//Auto-download info log
		var link = document.createElement('a');
		link.setAttribute('href', `data:text/html;charset=utf-8,` + encodeURIComponent(debugLogFileStart + infoLogContent + `</body></html>`));
		link.setAttribute('download', "debugLog" + infoLogID + ".xlog");

		link.style.display = 'none';
		document.body.appendChild(link);

		link.click();
		document.body.removeChild(link);

		infoLogID++;
	} else {
		//Overwrite document with info log
		var win = window.open();

		win.document.body.innerHTML = `<!DOCTYPE html><html><head><title>Debug Log</title><style>${styleSheet}</style></head><body>` + infoLogContent + `</body></html>`;
	}

	console.info(`HOW TO USE\n==========\n\n- Click on an entry for more info.\n- There are 3 warning levels in DevMode.js\n- Click on spoilers to reveal more info`);
}

function dm_log(value, type, minimum, tooltip, console) {
	/*
		GENERATES LOG ENTRY
		==================
		value: Log message (string)
		minimum: Minimum error level to take log into account (integer 1 to 3)
		type: Log flag type (integer -2 to 3, or custom string)
		tooltip: Hover tooltip HTML for interactive logs (string)
		console: Should log be printed to browser's console (boolean)
	*/

	//If no minimum was set, set to 2 (detailed)
	if (!minimum) {
		minimum = defaultMinimumLevel;
	}

	//If no type was set, set to 0 (info)
	if (!type) {
		type = defaultLogType;
	}

	//Generate log entry
	if (debug_loggingLevel >= minimum) {
		var entry = ``;
		var timestamp = ``;
		var flag = ``;
		var tooltipContent = ``;
		var color = `ffffff`;

		//Detect tooltip if needed
		if (tooltip !== undefined) {
			tooltipContent = `onmouseenter="this.style.color = '#19ff9e';" onmouseleave="this.style.color = 'white'" onclick="alert('${infoLogTooltips[tooltip]}')"`;
		}

		//Create timestamps
		if (enableTimestamps) {
			var date = new Date();

			if (useTimeElapsedStamps) {
				var hours = initialHours - date.getHours();

				var minutes = initialMinutes - date.getMinutes();

				var seconds = initialSeconds - date.getSeconds();

				var milliseconds = initialMilliseconds - date.getMilliseconds();


				if (useAccurateTimestamps) {
					timestamp = `[${hours}:${minutes}:${seconds}:${milliseconds}] `;
				} else {
					timestamp = `[${hours}:${minutes}:${seconds}] `;
				}
			} else {
				if (useAccurateTimestamps) {
					timestamp = `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}] `;
				} else {
					timestamp = `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] `;
				}
			}
		}

		//Set content
		switch (type) {
			case -2:
				flag = `[Success]`;
				color = `00ea00`;
				break;
			case -1:
				flag = ``;
				break;
			case 0:
				flag = `[Info]`;
				break;
			case 1:
				flag = `[Warning]`;
				color = `f7f700`;
				break;
			case 2:
				flag = `[Error]`;
				color = `ff4500`;
				break;
			case 3:
				flag = `[Fatal]`;
				color = `f00f00`;
				break;
			default:
				if (type.slice(0, 2) == "1-") {
					flag = `[` + type.slice(2) + `]`;
					color = `f7f700`;
				} else if (type.slice(0, 2) == "2-") {
					flag = `[` + type.slice(2) + `]`;
					color = `ff4500`;
				} else if (type.slice(0, 2) == "3-") {
					flag = `[` + type.slice(2) + `]`;
					color = `f00f00`;
				} else {
					flag = `[` + type + `]`;
				}
				break;
		}

		infoLogContent += `<span ${tooltipContent} style="color:#${color}">${timestamp}${flag} ${value}</span>`;
	}
}

//Show banner
function dm_banner(text) {
	var banner = document.getElementById("ui_banner");
	banner.innerHTML += `<p>${text}</p>`;
	banner.style.top = 0;
	banner.style.opacity = 1;

	setTimeout(function () {
		banner.style.top = "-19%";
		banner.style.opacity = 0;
	}, 5000);
}

window.onerror = function () {
	dm_log(`Script error detected, see console for details.`, 1, 2);
};

window.onkeypress = function (e) {
	if (e.keyCode === toggleKey) {
		debug_generateLogs(false);
	}
}

if (DevModeEnabledFeatures.length > 0) {
	console.info(`[DevMode] The following Dev Mode features are enabled:\n\n${DevModeEnabledFeatures}`);
}