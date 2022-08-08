let xmlCache = document.getElementById("xmlCache");
let propertiesCache = [];
let valuesCache = [];
let gendersCache = [];

const xml = {
	currentTag: undefined,
	wordbanks: {},
	metadata: {},

	import(src) {
		const xhr = new XMLHttpRequest();
		xhr.addEventListener("readystatechange", function () {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					console.info(`Successfully received XML content from location '${src}'.`);
					try {
						xmlCache = xhr.responseXML.firstChild;
						currentTag = xmlCache;
					} catch (err) {
						console.error(`Invalid XML file '${src}'.`);
					}

				} else {
					if (xhr.status === 0) {
						console.error(`Failed to gather XML content from location '${src}'.`);
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
		currentTag = xmlCache.getRootNode().documentElement;
	},

	select(tag, attribute, value) {
		//Validate xml cache
		if (xmlCache.innerHTML !== "") {
			if (!currentTag)
				console.warn("Cannot select, current tag is not defined!");

			const target = currentTag.querySelectorAll(tag);

			//Check if a value was specified without a property
			if (value && !attribute) {
				console.warn(`Specified an XML property value '${value}' without an attached attribute!`);
				return false;
			}

			//Detect if target is present
			let refinedTarget;

			if (target.length > 0) {
				if (value) {
					//Attempt to select tag based on attribute and value
					for (let i = 0; i < target.length; i++) {
						if (target[i].getAttribute(attribute) === value) {
							if (refinedTarget) {
								console.warn(`Found multiple tags of type "${tag}" with combination of attribute "${attribute}" and value "${value}".`);
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
						console.warn(`Could not find any tag "${tag}" with attribute "${attribute}" and value "${value}" (but found ${target.length} tags without the latters).`);
						return false;
					}
				} else {
					if (attribute) {
						//Attempt to select tag based on an attribute only
						for (let i = 0; i < target.length; i++) {
							if (target[i].getAttribute(attribute) !== null) {
								if (refinedTarget) {
									console.warn(`Unable to select tag "${tag}" based on sole attribute "${attribute}". Please provide an associated value.`);
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
							console.warn(`Could not find any tag "${tag}" with attribute "${attribute}" (but found ${target.length} tags without the latter).`);
							return false;
						}
					} else {
						if (target.length == 1) {
							xml.currentTag = target[0];
							return xml.currentTag;
						} else {
							console.warn(`Found multiple (${target.length}) "${tag}" tags. Please refine research.`);
						}
					}
				}
			} else {
				console.warn(`Unable to find child tag "${tag}" in parent of type ${xml.currentTag.nodeName}.`);
				return false;
			}
		} else {
			console.warn("XML cache is empty. Please import a file before attempting to read it.");
			return false;
		}
	},

	back() {
		xml.currentTag = xml.currentTag.parentElement;
	},

	parse(tag) {
		if (!tag)
			console.warn(`Cannot parse, current tag is not defined!`);

		const tagname = tag.nodeName;
		let content = ``;

		function parseNodes(tag) {
			const nodes = tag.childNodes;
			let value = ``;

			for (let i = 0; i < nodes.length; i++) {
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

		parseTag:
		switch (tagname) {
			case "static":
				content = tag.childElementCount > 0 ? parseNodes(tag) : tag.innerHTML + " ";
				break;
			case "dynamic": {		
				const conditions = tag.getElementsByTagName("condition");

				// if conditions exist, check them out
				for (let i = 0; i < conditions.length; i++) {
					const name = conditions[i].getAttribute("on");
					const operator = conditions[i].getAttribute("operator")
					const index = propertiesCache.indexOf(name);
					let target = conditions[i].getAttribute("value");
					let condition;

					if (!propertiesCache.includes(name)) {
						console.warn("No property to test condition on '" + name + "'.");
						break parseTag;
					}

					let value = valuesCache[index];


					if (conditions[i].getAttribute("slice")) {
						const slice1 = conditions[i].getAttribute("slice").slice(0, 1);
						const slice2 = conditions[i].getAttribute("slice").slice(1);

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
							console.warn(`Invalid operator provided for condition "${name} ${operator} ${target}" (${err}).`);
							break;
					}

					if (condition == true) {
						const index = utility_randomChoice(conditions[i].childElementCount) - 1;
						content = parseNodes(conditions[i].children[index]);
						break parseTag;
					}
				}

				// if no condition matched and a default tag exists, use it
				if (conditions.length > 0 && !content) {
					console.info(`No condition evaluated to true, using default.`);

					const defaultTag = tag.getElementsByTagName("default")[0];
					
					if (defaultTag) {
						content = xml.parse(defaultTag.children[0]);
						break;
					}
				}
				
				// if no conditions exist, proceed by choosing a random element
				const index = utility_randomChoice(tag.childElementCount) - 1;

				if (!tag.children[index].childElementCount > 0) {
					content = xml.parse(tag.children[index]);
					break;
				}

				content = tag.children[index].nodeName === "dynamic"
					? xml.parse(tag.children[index])
					: parseNodes(tag.children[index]);

				break;
			}
			case "randnum":
				content = utility_randomNumber(tag.getAttribute("min"), tag.getAttribute("max"), tag.getAttribute("roundlevel"));
				break;
			case "randstr": {
				const name = tag.getAttribute("type");
				const wordbank = xmlCache.getRootNode().documentElement.getElementsByTagName("wordbanks")[0].getElementsByClassName(name)[0];

				if (!wordbank)
					console.warn(`Random strings bank ${name} does not exist.`);

				content = xml.parse(randomChildTag(wordbank));
				break;
			}
			case "meta": {
				const key = tag.getAttribute("source");

				if (!(key in this.metadata))
					console.warn(`Unknown scenario metadata key "${key}".`);

				content = this.metadata[key];
				break;
			}
			case "var": {
				const varName = tag.getAttribute("name");
				const index = propertiesCache.indexOf(varName);

				content = valuesCache[index];

				switch (tag.getAttribute("case")) {
					case "upper":
						content = utility_toUpperCase(content);
						break;
				}

				if (!content || content === '') {
					console.warn(`No associated value found for cached variable property ${varName}.`);
					content = `<strong style="color:red">[VARIABLE NOT FOUND]</strong>`;
				}

				break;
			}
			case "pron": {
				const key = tag.getAttribute("for");
				const gender = gendersCache[propertiesCache.indexOf(key)];
				const type = tag.getAttribute("type");
				let pronouns = [];

				switch (type) {
					case "subj":
						pronouns = ["he", "she", "it"]; break;
					case "obj":
						pronouns = ["him", "her", "it"]; break;
					case "poss":
						pronouns = ["his", "her", "its"]; break;
					default:
						console.warn(`Invalid pronoun type ${type}.`); break;
				}

				content = pronouns[gender];

				if (!content)
					console.log(`There is no pronoun for gender ${gender}.`);

				break;
			}
			default:
				console.warn(`Unknown tag name '${tagname}'.`);
				break;
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
	const anchor = document.createElement("a")
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
	const index = string.indexOf(" ");

	return index == -1
		? string.slice(-3) == "ing"
		: string.slice(0, -(string.length - index)).slice(-3) == "ing";
}

//Random choice between 2 selections
function utility_randomBoolean() {
	const random = Math.random();

	if (random <= 0.5) {
		return false;
	} else {
		return true;
	}
}

function utility_randomChoice(max) {
	const random = Math.random();
	const increment = 1 / max;
	let count = 0;

	while (count <= 1) {
		if (count > random)
			return Math.round(count * max);

		count += increment;
	}
}

function randomChildTag(tag) {
	const max = tag.childElementCount - 1;
	const random = Math.random();

	return tag.children[Math.trunc(random * max + 0.5)];
}

function utility_randomNumber(min, max, round) {
	const random = Math.random();
	let result;

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