"use strict";

const UI_SCENARIO_SELECTION = document.querySelector("#shortStory-scenarioSelection");
const UI_SCENARIO_SETTINGS  = document.querySelector("#shortStory-settings");
const UI_SCENARIO_VARIABLES = document.querySelector("#shortStory-variables");
let currentUi = UI_SCENARIO_SELECTION;

/**
 * Animates the switch to a new user interface.
 *
 * @param {HTMLElement} ui - The user interface to switch to.
 * @todo Remove use of global variable.
 */
function switchToUi(ui) {
	currentUi.style.opacity = "0";

	setTimeout(function () {
		currentUi.style.display = "none";
		ui.style.display = "flex";
		ui.style.opacity = "1";
		currentUi = ui;
	}, 500);
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
		var count = xml.currentTag.childElementCount;
		for (var i = 0; i < count; i++) {
			var propertyName = tag.getElementsByTagName("ui")[i].getAttribute("name");
			var propertyValue = document.getElementById("userInput_" + propertyName).value;
			var propertyGender = document.getElementById("userInput_" + propertyName + "_gender");
			propertyGender = propertyGender ? propertyGender.selectedIndex : undefined;

			var passes = true;

			if (!propertyValue || propertyValue === "") {
				propertyValue = document.getElementById("userInput_" + propertyName).getAttribute("placeholder");

				if (!propertyValue || propertyValue == "") {
					console.warn(`[Database] Unable to find a cached property value for input "${propertyName}".`);
				} else {
					console.info(`[Database] No user input specified for property "${propertyName}", using default "${propertyValue}".`);
				}

			}

			if (document.getElementById("userInput_" + propertyName).getAttribute("datatype") == "gerund") {
				passes = utility_detectGerund(propertyValue);
			}

			if (!passes) {
				console.warn(`[Database] Data type check did not pass for value "${propertyValue}" of property "${propertyName}".`);
			} else {
				propertiesCache.push(propertyName);
				valuesCache.push(propertyValue);
				console.log(propertyValue)

				if (propertyGender)
					gendersCache.push(propertyGender);
			}
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

	// TODO REMOVE
	setTimeout(function () {

		switchToUi(UI_SCENARIO_SETTINGS);
	}, 500);

}

/**
 * Iteratively parses the scenario's variables to generate an editable user interface.
 * Variables are user-editable parameters of the scenario.
 *
 * @return {bool} 
 */
function populateVariables() {
	var enableAutofill;

	/**
	 * Parses a variable of the scenario and generates a corresponding HTML input.
	 * Variables are user-editable parameters of the scenario.
	 *
	 * @param {string} tag
	 */
	function parseVariable(tag) {
		for (var i = 0; i < tag.childElementCount; i++) {
			var field = tag.querySelectorAll("ui")[i];

			if (!field) {
				console.warn(`Field ${tag.nodeName} is invalid!`)
			}			

			//Create label
			var label = document.createElement("p");
			label.setAttribute("class", "ui_scenarioSettingsLabel");
			if (field.innerHTML !== "") {
				label.innerHTML = field.innerHTML;
			} else {
				label.innerHTML = "Unnamed field";
			}

			//Create editable field
			var input = document.createElement("input");
			input.setAttribute("type", field.getAttribute("type"));
			input.setAttribute("placeholder", field.getAttribute("placeholder"));
			if (!enableAutofill) input.setAttribute("autocomplete", "off");
			input.setAttribute("datatype", field.getAttribute("datatype"));
			input.setAttribute("id", "userInput_" + field.getAttribute("name"));

			UI_SCENARIO_VARIABLES.append(label);
			UI_SCENARIO_VARIABLES.append(input);

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
	parseVariable(xml.currentTag);
	enableAutofill = parseInt(xml.currentTag.getAttribute("autofill")); // not implemented yet, broken

	xml.back();
	parseVariable(xml.currentTag); // parse VariableS?

	var finishButton = document.createElement("button");
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
	let storyContent = ``;

	/**
	 * Parse a node for content, capitalizing if the previous content was the end of a sentence.
	 *
	 * @param {Node} target
	 */
	function parseContent(target) {
		let content = xml.parse(target);
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
	var title = document.getElementById("shortStory-bookTitle").value;
	var author = document.getElementById("shortStory-bookAuthor").value;
	xml.metadata["title"] = title;
	xml.metadata["author"] = author;

	xml.reset();
	xml.select("cover");

	var description = xml.parse(xml.currentTag.children[0]);

	xml.reset();
	xml.select("critics");

	var critics = ``;
	var criticsType = document.getElementById("shortStory-bookCritics").selectedIndex;

	if (criticsType === 0)
		criticsType = Math.random() > 0.5 ? 1 : 2;

	xml.select(criticsType === 1 ? "favorable" : "unfavorable");

	critics = xml.parse(xml.currentTag.children[0]);

	//Display result
	document.querySelector("#ui_display").style.display = "block";
	setTimeout(function () {
		document.querySelector("#ui_display").style.opacity = 1;
		document.querySelector("#ui_display").style.transform = "translate(0%, 0%)";
	}, 500)

	document.querySelector("#ui_shortStoryInterface").style.opacity = 0;
	document.querySelector("#ui_shortStoryInterface").style.left = "-50%";
	setTimeout(function () {
		document.querySelector("#ui_shortStoryInterface").style.display = "none";
	}, 500);

	document.getElementById("ui_coverRightContent").innerHTML += storyContent + critics;

	document.getElementById("ui_coverFront").style.background = `url("resources/graphics/covers/cover${utility_randomNumber(1, 4, 0)}.webp")`;
	document.getElementById("ui_coverFront").style.filter = "opacity(0.5) drop-shadow(0 0 0 red);";
	document.getElementById("ui_coverFront").style.fontFamily = "serif";
	document.getElementById("ui_coverFront").style.backgroundRepeat = "no-repeat";
	document.getElementById("ui_coverFront").style.backgroundSize = "cover";
	document.getElementById("coverTitle").innerHTML = title;
	document.getElementById("coverSubtitle").innerHTML = "";
	document.getElementById("coverAuthor").innerHTML = author;
	document.getElementById("coverBestseller").innerHTML = description;

	var coverFront = document.getElementById("ui_coverFront");
	var coverLeft = document.getElementById("ui_coverLeft");
	var coverRight = document.getElementById("ui_coverRight");

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
document.getElementById("shortStory-startCustomize").onclick = function () {
	populateVariables();
}
document.getElementById("shortStory-startButtonAction").onclick = function () {
	populateSettings("action"); // TODO parametrize
};
