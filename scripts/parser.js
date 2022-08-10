"use strict";

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
						this.currentTag = xmlCache.getRootNode().documentElement;

						// remove xml whitespace
						this.currentTag.innerHTML = this.currentTag.innerHTML
							.replaceAll("\n", "")
							.replaceAll(/\t+(?=[.,'?!:;])/g, "")
							.replaceAll(/\t+(?![.,'?!:;])/g, " ");
					} catch (err) {
						console.error(`Invalid XML file '${src}': ${err}.`);
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
		this.currentTag = xmlCache.getRootNode().documentElement;
	},

	select(tag, attribute, value) {
		//Validate xml cache
		if (xmlCache.innerHTML !== "") {
			if (!this.currentTag)
				console.warn("Cannot select, current tag is not defined!");

			const target = this.currentTag.querySelectorAll(tag);

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
						this.currentTag = refinedTarget;
						return this.currentTag;
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
							this.currentTag = refinedTarget;
							return this.currentTag;
						} else {
							console.warn(`Could not find any tag "${tag}" with attribute "${attribute}" (but found ${target.length} tags without the latter).`);
							return false;
						}
					} else {
						if (target.length == 1) {
							this.currentTag = target[0];
							return this.currentTag;
						} else {
							console.warn(`Found multiple (${target.length}) "${tag}" tags. Please refine research.`);
						}
					}
				}
			} else {
				console.warn(`Unable to find child tag "${tag}" in parent of type ${this.currentTag.nodeName}.`);
				return false;
			}
		} else {
			console.warn("XML cache is empty. Please import a file before attempting to read it.");
			return false;
		}
	},

	back() {
		this.currentTag = this.currentTag.parentElement;
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

		switch (tagname) {
			case "static":
				content = tag.childElementCount > 0 ? parseNodes(tag) : tag.innerHTML + " ";
				break;
			case "dynamic": {
				if (tag.childElementCount === 0) {
					console.info(`Skipping empty element of type ${tagname}.`);
					break;
				}

				const randElem = randomChildOf(tag);
				if (randElem.childElementCount === 0) {
					content = xml.parse(randElem);
					break;
				}
				
				content = xml.parse(randElem);				
				break;
			}
			case "condition": {
				let fulfilled = false;
				const target = tag.getAttribute("where");
				const operator = tag.getAttribute("is")
				let expectedVal = tag.getAttribute("than");
				let expectedValVar = tag.getAttribute("thanvar");

				// check if expected value is a variable
				if (expectedValVar) {
					const valueTarget = propertiesCache.indexOf(expectedValVar);

					if (valueTarget !== -1)
						expectedVal = valuesCache[valueTarget];
				}

				if (!expectedVal) {
					console.warn("No expected value provided for condition!");
					break;
				}

				if (!propertiesCache.includes(target)) {
					console.warn("No property to test condition on '" + target + "'.");
					break;
				}

				const index = propertiesCache.indexOf(target);
				let actualValue = valuesCache[index];

				if (tag.getAttribute("numeral")) {
					expectedVal = parseInt(expectedVal);
					actualValue = parseInt(actualValue);
				}

				switch (operator) {
					case "eq":
						fulfilled = (actualValue == expectedVal); // type coercion is intended behavior!
						break;
					case "neq":
						fulfilled = (actualValue != expectedVal);
						break;
					case "gt":
						fulfilled = (actualValue > expectedVal);
						break;
					case "lw":
						fulfilled = (actualValue < expectedVal);
						break;
					case "geq":
						fulfilled = (actualValue >= expectedVal);
						break;
					case "leq":
						fulfilled = (actualValue <= expectedVal);
						break;
					default:
						console.warn(`Invalid operator provided for condition "${target} ${operator} ${expectedVal}" (${err}).`);
						break;
				}

				if (fulfilled === true) {
					content = parseNodes(randomChildOf(tag));
					break;
				}

				break;
			}
			case "randnum":
				content = randomNumber(tag.getAttribute("min"), tag.getAttribute("max"), tag.getAttribute("roundlevel"));
				break;
			case "randstr": {
				const name = tag.getAttribute("type");
				const wordbank = xmlCache.getRootNode().documentElement.getElementsByTagName("wordbanks")[0].getElementsByClassName(name)[0];

				if (!wordbank)
					console.warn(`Random strings bank ${name} does not exist.`);

				content = xml.parse(randomChildOf(wordbank));
				break;
			}
			case "meta": {
				const key = tag.getAttribute("source");

				if (!(key in this.metadata))
					console.warn(`Unknown scenario metadata key "${key}".`);

				content = this.metadata[key];
				break;
			}
			case "set": {
				const name = tag.getAttribute("var");
				const value = tag.getAttribute("to");
				propertiesCache.push(name);
				valuesCache.push(value);
				break;
			}
			case "offset": {
				const name = tag.getAttribute("var");
				const value = parseInt(tag.getAttribute("by"));

				if (isNaN(value)) {
					console.warn(`Cannot offset variable '${name}' by invalid value '${value}'.`);
					break;
				}

				const index = propertiesCache.indexOf(name);

				if (index === -1) {
					console.info(`Implicitly setting value of variable '${name}' to '${value}'.`);
					propertiesCache.push(name);
					valuesCache.push(value);
					break;
				}

				valuesCache[index] = parseInt(valuesCache[index]) + value;
				break;
			}
			case "var": {
				const name = tag.getAttribute("name");
				const index = propertiesCache.indexOf(name);

				content = valuesCache[index];

				switch (tag.getAttribute("case")) {
					case "upper":
						content = toTitleCase(content);
						break;
				}

				if (!content || content === '') {
					console.warn(`No associated value found for cached variable property ${name}.`);
					content = `<strong style="color:red">[VARIABLE NOT FOUND]</strong>`;
				}

				break;
			}
			case "pron": {
				const key = tag.getAttribute("for");
				const gender = gendersCache[propertiesCache.indexOf(key)];
				const type = tag.getAttribute("type");
				let pronouns = [];

				if (gender === undefined) {
					console.warn(`Cannot generate pronoun for '${key}' because this variable has no gender!\nContext: ${tag.previousSibling.textContent}`);
					break;
				}

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
					console.warn(`There is no pronoun for gender ${gender}.`);

				break;
			}
			case "#comment":
			case "default": break;
			default:
				console.warn(`Unknown tag name '${tagname}'.`);
				break;
		}

		// capitalize if beginning of sentence (FIXME: doesnt work in nested tags with no #text before them)
		if (tag.previousSibling.textContent.slice(-4).match(/[.!?]/g))
			content = toTitleCase(content);

		return content;
	},
};