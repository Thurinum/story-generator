var xmlCache = document.getElementById("xmlCache");
var propertiesCache = [];
var valuesCache = [];

const xml = {
	currentTag: undefined,
	metadata: {},

	import(src) {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener("readystatechange", function () {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					console.info(`[XMLEngine] Successfully received target XML content at location '${src}'.`);
					try {
						xmlCache = xhr.responseXML.firstChild;
						currentTag = xmlCache;
					} catch (err) {
						console.exception(`[XMLEngine] Invalid XML file.`);
					}

				} else {
					if (xhr.status === 0) {
						console.warn(`[XMLEngine] Failed to gather XML content at location '${src}'.`);
						return false;
					}
				}
			}
		});

		//Send XHR
		xhr.open("GET", src);
		xhr.responseType = "document";
		xhr.send();
	},

	reset() {
		currentTag = xmlCache;
	},

	select(tag, attribute, value, useChildren) {
		//Validate xml cache
		if (xmlCache.innerHTML !== "") {
			//Get requested tag based on query type
			// if (useChildren) {
			// 	//Also search in children of the current parent
			// 	var target = currentTag.querySelectorAll(tag);
			// } else {
			// 	//Only search at current level of XML hierarchy
			// 	var target = xml.currentTag.querySelector(tag);
			// }
			var target = currentTag.querySelectorAll(tag);

			//Check if a value was specified without a property
			if (value && !attribute) {
				console.warn(`[XMLEngine] Specified an XML property value (${value}) without an attached attribute!`);
				return false;
			}

			//Detect if target is present
			var refinedTarget;

			if (target.length > 0) {
				if (value) {
					//Attempt to select tag based on attribute and value
					for (var i = 0; i < target.length; i++) {
						if (target[i].getAttribute(attribute) === value) {
							if (refinedTarget) {
								console.warn(`[XMLEngine] Found multiple tags of type "${tag}" with combination of attribute "${attribute}" and value "${value}".`);
								return false;
							} else {
								refinedTarget = target[i];
							}
						}
					}

					if (refinedTarget) {
						xml.currentTag = refinedTarget;
						return xml.currentTag;
					} else {
						console.warn(`[XMLEngine] Could not find any tag "${tag}" with attribute "${attribute}" and value "${value}" (but found ${target.length} tags without the latters).`);
						return false;
					}
				} else {
					if (attribute) {
						//Attempt to select tag based on an attribute only
						for (var i = 0; i < target.length; i++) {
							if (target[i].getAttribute(attribute) !== null) {
								if (refinedTarget) {
									console.warn(`[XMLEngine] Unable to select tag "${tag}" based on sole attribute "${attribute}". Please provide an associated value.`);
									return false;
								} else {
									refinedTarget = target[i];
								}
							}
						}

						if (refinedTarget) {
							xml.currentTag = refinedTarget;
							return xml.currentTag;
						} else {
							console.warn(`[XMLEngine] Could not find any tag "${tag}" with attribute "${attribute}" (but found ${target.length} tags without the latter).`);
							return false;
						}
					} else {
						if (target.length == 1) {
							xml.currentTag = target[0];
							return xml.currentTag;
						} else {
							console.warn(`[XMLEngine] Found multiple (${target.length}) "${tag}" tags. Please refine research.`);
							console.warn(target)
						}
					}
				}
			} else {
				console.warn(`[XMLEngine] Unable to find child tag "${tag}" in parent of type ${xml.currentTag.nodeName}.`);
				return false;
			}
		} else {
			console.warn("[XMLEngine] XML cache is empty. Please import a file before attempting to read into it.");
			return false;
		}
	},

	back() {
		xml.currentTag = xml.currentTag.parentElement;
	},

	parse(tag) {
		var name = tag.nodeName;
		var content = ``;

		function parseNodes(tag) {
			var nodes = tag.childNodes;
			var value = ``;

			for (var i = 0; i < nodes.length; i++) {
				if (nodes[i].nodeName === "#text") {
					//Check if node is not just empty text
					value += nodes[i].nodeValue;
				} else {
					//Parse special tags
					value += xml.parse(nodes[i]);
				}
			}

			return value;
		};

		if (name === "static") {
			if (tag.childElementCount > 0) {
				content = parseNodes(tag);
			} else {
				content = tag.innerHTML + " ";
			}
		} else if (name === "field") {
			var fieldType = tag.getAttribute("type");

			if (fieldType === "number") {
				content = utility_randomNumber(tag.getAttribute("min"), tag.getAttribute("max"), tag.getAttribute("roundlevel"));
			} else if (fieldType === "random") {
				content = utility_randomEntry(tag.getAttribute("source"));
			} else if (fieldType === "meta") {
				let key = tag.getAttribute("source");
				if (!(key in this.metadata))
					console.warn(`[XMLEngine] Unknown scenario metadata key "${key}".`);

				content = this.metadata[key];
			} else {
				console.warn(`[XMLEngine] Unknown field type "${fieldType}".`);
			}
		} else if (name === "variable") {
			var varName = tag.getAttribute("name");
			var index = propertiesCache.indexOf(varName);
			var value = valuesCache[index];
			var caseType = tag.getAttribute("casetype");

			switch (caseType) {
				case "upper":
					value = utility_toUpperCase(value);
					break;
			}

			if (!value) {
				console.warn(`[XMLEngine] No associated value found for cached variable property ${varName}.`);
				value = `<strong style="color:red">[VARIABLE NOT FOUND]</strong>`;
			}

			content = value;
		} else if (name === "dynamic") {
			var index = utility_randomChoice(tag.childElementCount) - 1;
			if (tag.children[index].childElementCount > 0) {
				if (tag.children[index].nodeName === "dynamic") {
					content = xml.parse(tag.children[index]);
				} else {
					content = parseNodes(tag.children[index]);
				}
			} else {
				content = xml.parse(tag.children[index]);
			}
		} else if (name === "event") {
			var type = tag.getAttribute("type");

			if (type == "conditional") {
				var conditions = tag.getElementsByTagName("condition");
				for (var i = 0; i < conditions.length; i++) {
					var target = conditions[i].getAttribute("value");
					var varName = conditions[i].getAttribute("name");
					var operator = conditions[i].getAttribute("operator")
					var index = propertiesCache.indexOf(varName);
					var value = valuesCache[index];
					var condition;

					if (conditions[i].getAttribute("slice")) {
						var slice1 = conditions[i].getAttribute("slice").slice(0, 1);
						var slice2 = conditions[i].getAttribute("slice").slice(1);

						value = value.slice(slice1, slice2);
					}

					if (conditions[i].getAttribute("numeral")) {
						target = parseInt(target);
						value = parseInt(value);
					}

					switch (operator) {
						case "=":
							condition = (value == target);
							break;
						case "]":
							condition = (value > target);
							break;
						case "[":
							condition = (value < target);
							break;
						case "]=":
							condition = (value >= target);
							break;
						case "[=":
							condition = (value <= target);
							break;
						default:
							console.warn(`[XMLEngine] Provided invalid operator for condition "${varName} ${operator} ${target}" (${err}).`);
							break;
					}

					if (condition == true) {
						if (conditions[i].childElementCount > 0) {
							content = parseNodes(conditions[i]);
						} else {
							content = conditions[i].children[0].innerHTML + " ";
						}
					}
				}

				if (!content) {
					console.info(`[XMLEngine] No condition evaluated to true for event "${varName} ${operator} ${target}", using default.`);
					content = xml.parse(tag.getElementsByTagName("default")[0].children[0]);
				}
			}
		} else {
			console.warn(`[XMLEngine] Unknown tag "${name}".`);
		}

		return content;
	},
};

//Set the first letter of a word upper/lower case
function utility_toUpperCase(string) {
	if (!string) {
		banner("Some input haven't been filled!");
		return undefined;
	}
	return string.charAt(0).toUpperCase() + string.slice(1);
}

//Set the scroll position to a specific element
function anchor(id) {
	var anchor = document.createElement("a")
	anchor.href = "#" + id;

	document.body.append(anchor);

	anchor.click();

	document.getElementById(id).style.border = "solid 3px red";
	setTimeout(function () {
		document.getElementById(id).style.border = "initial";
	}, 5000);

	anchor.remove();
}

function utility_detectGerund(string) {
	var index = string.indexOf(" ");
	if (index == -1) {

		if (string.slice(-3) == "ing") {
			return true;
		} else {
			return false;
		}
	} else {
		var word = string.slice(0, -(string.length - index));
		if (word.slice(-3) == "ing") {
			return true;
		} else {
			return false;
		}
	}
}

//Random choice between 2 selections
function utility_randomBoolean() {
	var random = Math.random();

	if (random <= 0.5) {
		return false;
	} else {
		return true;
	}
}

function utility_randomChoice(max) {
	var random = Math.random();
	var increment = 1 / max;
	var count = 0;
	var result;

	while (count <= 1) {
		if (count > random) {
			var result = Math.round(count * max);
			return result;
		} else {
			count += increment;
		}
	}
}

function utility_randomEntry(category) {
	var source;
	for (var i = 0; i < xmlCache.children[2].children.length; i++) {
		if (xmlCache.children[2].children[i].getAttribute("name") === category) {
			source = xmlCache.children[2].children[i];
		}
	}

	if (!source || source.length > 1) {
		console.warn("[Utilities] Invalid source or multiple duplicate tags herein.");
		return false;
	} else {
		var result = xml.parse(source);
		return result;
	}

}

function utility_randomNumber(min, max, round) {
	var random = Math.random();
	var result;

	min = parseInt(min);
	max = parseInt(max);
	round = parseInt(round);

	if (round !== null) {
		if (round == 0) {
			result = Math.round(min + ((max - min) * random));
		} else {
			result = (min + ((max - min) * random)).toFixed(round);
		}
	} else {
		result = min + ((max - min) * random);
	}

	return result;
}

//ANIMATIONS
window.onmousemove = function () {
	setTimeout(function () {
		document.getElementById("ui_mainMenuTitle").style.opacity = 1;
		document.getElementById("ui_mainMenuTitle").style.transform = "none";

		setTimeout(function () {
			document.getElementById("ui_mainMenuSubtitle").style.opacity = 1;
			document.getElementById("ui_mainMenuSubtitle").style.transform = "none";

			setTimeout(function () {
				document.getElementById("core_shortStory").style.opacity = 1;
				document.getElementById("core_shortStory").style.transform = "translate(0, 0)";
			}, 500);
		}, 500);
	}, 400);
}

//**//SHORT STORY CREATION//**//
document.getElementById('core_shortStory').addEventListener("click", function () {
	document.getElementById('ui_shortStoryInterface').style.display = "block";
	document.getElementById('ui_mainMenu').style.transform = "translate(-50%, -50%) scale(1.5)";
	document.getElementById('ui_mainMenu').style.opacity = 0;
	setTimeout(function () {
		document.getElementById('ui_mainMenu').style.display = "none";
		document.getElementById('ui_shortStoryInterface').style.opacity = 1;

		document.getElementById('ui_shortStoryInterface').style.transform = "scale(1) translate(-50%, -50%)";
	}, 500);
});

//**//DOWNLOAD GENERATED CONTENT//**//
document.getElementById("ui_download").onclick = function () {
	var link = document.createElement("a");
	link.setAttribute('href', 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8,' + encodeURIComponent(document.getElementById("ui_coverRightContent").innerHTML));
	link.setAttribute('download', "shortStory.docx");

	link.style.display = 'none';
	document.body.appendChild(link);

	link.click();
	document.body.removeChild(link);
}