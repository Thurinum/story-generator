"use strict";

const UI_SCENARIO_SELECTION = document.querySelector("#scnSelect");
const UI_SCENARIO_SETTINGS = document.querySelector("#scnSettings");
const UI_SCENARIO_VARIABLES = document.querySelector("#scnVariables");
let currentUi = undefined;
let canGenerate = true;

/**
 * Animates the switch to a new user interface.
 *
 * @param {HTMLElement} ui - The user interface to switch to.
 * @todo Remove use of global variable.
 */
function switchToUi(ui) {
	ui.style.display = "flex";

	if (currentUi)
		currentUi.style.display = "none";
}

/**
 * Parses the while scenario
 * The current scenario is cached as a JS object.
 */
function parseScenario() {
	/**
	 * Parses an XML tag and pushes it to the XML cache.
	 * The current scenario is cached as a JS object.
	 *
	 * @param {string} tag
	 */
	function parseXmlTag(tag) {
		const count = xml.currentTag.childElementCount;
		for (let i = 0; i < count; i++) {
			const propertyName = tag.getElementsByTagName("ui")[i].getAttribute("name");
			let propertyValue = document.getElementById("userInput_" + propertyName).value;
			const propertyGender = document.getElementById("userInput_" + propertyName + "_gender") ? propertyGender.selectedIndex : undefined;

			let passes = true;

			if (!propertyValue || propertyValue === "") {
				propertyValue = document.getElementById("userInput_" + propertyName).getAttribute("placeholder");

				if (!propertyValue || propertyValue == "") {
					console.warn(`[Database] Unable to find a cached property value for input "${propertyName}".`);
				} else {
					console.info(`[Database] No user input specified for property "${propertyName}", using default "${propertyValue}".`);
				}

			}

			if (document.getElementById("userInput_" + propertyName).getAttribute("datatype") == "gerund")
				passes = utility_detectGerund(propertyValue);

			if (!passes)
				console.warn(`[Database] Data type check did not pass for value "${propertyValue}" of property "${propertyName}".`);

			propertiesCache.push(propertyName);
			valuesCache.push(propertyValue);

			if (propertyGender)
				gendersCache.push(propertyGender);
		}
	}

	xml.reset();
	xml.select("interface");
	parseXmlTag(xml.currentTag);
	xml.back();
}

/**
 * Populates the settings interface from an XML scenario.
 *
 * @param {string} filename - The scenario's filename.
 */
function populateSettings(filename) {
	xml.reset();
	xml.import(`resources/scenarios/${filename}.xml`);

	switchToUi(UI_SCENARIO_SETTINGS);
}

/**
 * Iteratively parses the scenario's variables to generate an editable user interface.
 * variables are user-editable parameters of the scenario.
 *
 * @return {bool} 
 */
function populateVariables() {
	/**
	 * Parses a variable of the scenario and generates a corresponding HTML input.
	 * variables are user-editable parameters of the scenario.
	 *
	 * @param {string} tag
	 */


	function parseVariables(tag) {
		for (let i = 0; i < tag.childElementCount; i++) {
			const field = tag.querySelectorAll("ui")[i];

			if (!field)
				console.warn(`Field ${tag.nodeName} is invalid!`);

			//Create label
			const label = document.createElement("label");
			if (field.innerHTML !== "")
				label.innerHTML = field.innerHTML;
			else
				label.innerHTML = "Unnamed field";
			

			//Create editable field
			const input = document.createElement("input");
			input.setAttribute("type", field.getAttribute("type"));
			input.setAttribute("placeholder", field.getAttribute("placeholder"));
			input.setAttribute("datatype", field.getAttribute("datatype"));
			input.setAttribute("id", "userInput_" + field.getAttribute("name"));

			label.innerHTML += "<br />";
			label.append(input);
			UI_SCENARIO_VARIABLES.append(label);

			if (field.hasAttribute("hasGender")) {
				UI_SCENARIO_VARIABLES.innerHTML += `
				<select id="${"userInput_" + field.getAttribute("name") + "_gender"}">
				<option>Male</option>
				<option>Female</option>
				<option>Object</option>
				</select>
				`;
			}
		}
	}

	//Create custom UI
	xml.reset();
	xml.select("interface");
	console.log(23482390432)
	parseVariables(xml.currentTag);

	const finishButton = document.createElement("button");
	finishButton.style.position = "relative";
	finishButton.style.bottom = "25px";
	finishButton.style.margin = "25px";
	finishButton.innerHTML = "Done";
	finishButton.onclick = function () {
		parseScenario();
		generateStory();
	};

	UI_SCENARIO_VARIABLES.append(finishButton);
	switchToUi(UI_SCENARIO_VARIABLES);

	return true;
}

/**
 * Generates a story using user-input variables.
 *
 * @return {bool} 
 */
function generateStory() {
	if (!canGenerate)
		return;

	canGenerate = false; // prevent multiple gen

	let storyContent = ``;

	/**
	 * Parse a node for content, capitalizing if the previous content was the end of a sentence.
	 *
	 * @param {Node} target
	 */
	function parseContent(target) {
		const content = xml.parse(target);
		storyContent += storyContent.slice(-3).includes('.?!') ? utility_toUpperCase(content) : content;
	}

	xml.reset();
	xml.select("plotline");

	// Detect available paragraphs and parse story
	for (let i = 0; i < xml.currentTag.childElementCount; i++) {
		let target = xml.currentTag.children[i];
		if (target.nodeName == "paragraph") {
			for (let a = 0; a < target.childElementCount; a++)
				parseContent(target.children[a]);

			storyContent += `<br /><br />`;
		} else {
			parseContent(target);
		}
	}

	displayStory(storyContent);
	return true;
};

/**
 * Displays the generated story for the user.
 *
 * @param {string} storyContent
 */
function displayStory(storyContent) {
	//Prepare story display
	const title = document.getElementById("scnSettings-storyTitle").value;
	const author = document.getElementById("scnSettings-storyAuthor").value;
	xml.metadata["title"] = title;
	xml.metadata["author"] = author;

	xml.reset();
	xml.select("praises");

	const description = xml.parse(randomChildTag(xml.currentTag));

	// select random critical review
	xml.reset();
	xml.select("reviews");

	let review = ``;
	let reviewType = document.getElementById("scnSettings-storyCritics").selectedIndex;

	// 0: random, 1: positive, 2: negative
	if (reviewType === 0)
		reviewType = Math.random() > 0.5 ? 1 : 2;

	xml.select(reviewType === 1 ? "positive" : "negative");

	review = xml.parse(randomChildTag(xml.currentTag));

	// review's author
	xml.back();
	xml.select("critics");

	review += `<br />&dash; ${xml.parse(randomChildTag(xml.currentTag))}`;

	//Display result
	document.querySelector("#scnDisplay").style.display = "block";
	setTimeout(function () {
		document.querySelector("#scnDisplay").style.opacity = 1;
		document.querySelector("#scnDisplay").style.transform = "translate(0%, 0%)";
	}, 500)

	document.querySelector("#mainInterface").style.opacity = 0;
	document.querySelector("#mainInterface").style.left = "-50%";
	setTimeout(function () {
		document.querySelector("#mainInterface").style.display = "none";
	}, 500);

	document.getElementById("scnDisplay-bookPageRightContent").innerHTML += storyContent + review;

	document.getElementById("scnDisplay-bookCoverFront").style.background = `url("resources/graphics/covers/cover${utility_randomNumber(1, 4, 0)}.webp")`;
	document.getElementById("scnDisplay-bookCoverFront").style.filter = "opacity(0.5) drop-shadow(0 0 0 red);";
	document.getElementById("scnDisplay-bookCoverFront").style.fontFamily = "serif";
	document.getElementById("scnDisplay-bookCoverFront").style.backgroundRepeat = "no-repeat";
	document.getElementById("scnDisplay-bookCoverFront").style.backgroundSize = "cover";
	document.getElementById("scnDisplay-bookTitle").innerHTML = title;
	document.getElementById("scnDisplay-bookSubtitle").innerHTML = "";
	document.getElementById("scnDisplay-bookAuthor").innerHTML = author;
	document.getElementById("scnDisplay-bookTagline").innerHTML = description;

	const coverFront = document.getElementById("scnDisplay-bookCoverFront");
	const coverLeft = document.getElementById("scnDisplay-bookPageLeft");

	coverFront.onclick = function () {
		coverFront.style.transform = `translate(-100%) rotateY(180deg)`;
		setTimeout(function () {
			coverFront.style.display = "none";
			coverLeft.style.opacity = 1;
			coverLeft.style.transform = `translate(0) rotateY(0deg)`;
		}, 1000);
	}

	window.oncontextmenu = function (e) {
		e.preventDefault()
		coverFront.style.display = "block";
		coverFront.style.transform = `translate(-50%) rotateY(90deg)`;
		coverLeft.style.transform = `translate(50%) rotateY(-90deg)`;
		setTimeout(function () {
			coverLeft.style.opacity = 0;
			coverFront.style.transform = `translate(0) rotateY(0deg)`;
		}, 1000);
	}
};

//**//INITIALIZATION EVENTS//**//
document.getElementById("scnSettings-startBtn").onclick = function () {
	populateVariables();
}
document.getElementById("scnSelect-chooseBtn").onclick = function () {
	populateSettings("action"); // TODO parametrize
};
