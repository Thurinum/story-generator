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
 * Populates the settings interface from an XML scenario.
 *
 * @param {string} filename - The scenario's filename.
 */
 function loadScenario(filename) {
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
function populateUserInputs() {
	//Create custom UI
	xml.reset();
	xml.select("variables");
	
	// Parse scenario UI
	for (let i = 0; i < xml.currentTag.childElementCount; i++) {
		const field = xml.currentTag.children[i];
		const label = document.createElement("label");
		let input;
		
		if (!field)
			console.warn(`User input '${xml.currentTag.nodeName}' does not exist!`);
		
		label.innerHTML = "Unnamed field";		
		
		switch (field.nodeName) {
			case "text": {
				input = document.createElement("input");
				input.setAttribute("placeholder", field.getAttribute("placeholder"));
				input.setAttribute("datatype", field.getAttribute("type"));
				label.innerHTML = field.innerHTML;
				break;
			}
			case "time": {
				input = document.createElement("input");
				input.setAttribute("placeholder", field.getAttribute("placeholder"));
				label.innerHTML = field.innerHTML;
				break;
			}
			case "select": {
				input = document.createElement("select");
				label.innerHTML = field.getAttribute("placeholder");
				input.innerHTML = field.innerHTML;
				break;
			}
			case "section": {
				input = document.createElement("hr");
				label.innerHTML = `<strong>${field.getAttribute("name")}</strong>`;
				break;
			}
			default:
				console.warn(`Invalid user input type '${field.nodeName}'.`);
				break;
		}

		input.setAttribute("id", "userInput_" + field.getAttribute("name"));
		label.innerHTML += "<br />";
		label.append(input);

		if (field.hasAttribute("hasgender")) {
			label.innerHTML += `
			<select id="${"userInput_" + field.getAttribute("name") + "_gender"}" style="width: 20%">
				<option>Male</option>
				<option>Female</option>
				<option>Object</option>
			</select>
			`;
		}

		UI_SCENARIO_VARIABLES.append(label);
	}

	const finishButton = document.createElement("button");
	finishButton.style.position = "relative";
	finishButton.style.bottom = "25px";
	finishButton.style.margin = "25px";
	finishButton.innerHTML = "Done";
	finishButton.onclick = function () {
		parseUserInputs();
		generateStory();
	};

	UI_SCENARIO_VARIABLES.append(finishButton);
	switchToUi(UI_SCENARIO_VARIABLES);

	return true;
}

/**
 * Parses the whole scenario
 * The current scenario is cached as a JS object.
 */
 function parseUserInputs() {
	xml.reset();
	xml.select("variables");

	const count = xml.currentTag.childElementCount;
	for (let i = 0; i < count; i++) {
		if (xml.currentTag.children[i].nodeName === "section")
			continue;

		const propertyName = xml.currentTag.children[i].getAttribute("name");
		let propertyValue = document.getElementById("userInput_" + propertyName).value;
		const genderField = document.getElementById("userInput_" + propertyName + "_gender");
		const propertyGender = genderField ? genderField.selectedIndex : undefined;

		let passes = true;

		if (!propertyValue || propertyValue === "") {
			propertyValue = document.getElementById("userInput_" + propertyName).getAttribute("placeholder");

			if (!propertyValue || propertyValue == "")
				console.warn(`Unable to find a cached property value for input "${propertyName}".`);
			else
				console.info(`No user input specified for property "${propertyName}", using default "${propertyValue}".`);
		}

		if (document.getElementById("userInput_" + propertyName).getAttribute("datatype") == "gerund")
			passes = utility_detectGerund(propertyValue);

		if (!passes)
			console.warn(`Data type check did not pass for value "${propertyValue}" of property "${propertyName}".`);

		propertiesCache.push(propertyName);
		valuesCache.push(propertyValue);

		if (propertyGender)
			gendersCache.push(propertyGender);
	}

	xml.back();
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

	// TODO: use Regex lol
	storyContent = storyContent.replaceAll("\n\t\t\t\t.", ".");
	storyContent = storyContent.replaceAll("\n\t\t\t\t,", ",");
	storyContent = storyContent.replaceAll("\n\t\t\t\t'", "'");
	storyContent = storyContent.replaceAll("\n\t\t\t\t!", "!");
	storyContent = storyContent.replaceAll("\n\t\t\t\t?", "?");
	storyContent = storyContent.replaceAll("\n\t\t\t\t:", ":");
	storyContent = storyContent.replaceAll("\n\t\t\t\t;", ";");

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

	let review = '';
	let reviewType = document.getElementById("scnSettings-storyCritics").selectedIndex;

	// 0: random, 1: positive, 2: negative
	if (reviewType === 0)
		reviewType = Math.random() > 0.5 ? 1 : 2;

	xml.select(reviewType === 1 ? "positive" : "negative");

	if (xml.currentTag.childElementCount > 0)
		review = xml.parse(randomChildTag(xml.currentTag));

	// review's author
	xml.back();
	xml.select("critics");

	if (review !== '' && xml.currentTag.childElementCount > 0)
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

// main menu reveal animation
window.onload = function () {
	setTimeout(function () {
		document.getElementById("mainMenuTitle").style.opacity = 1;
		document.getElementById("mainMenuTitle").style.transform = "none";

		setTimeout(function () {
			document.getElementById("mainMenuSubtitle").style.opacity = 1;
			document.getElementById("mainMenuSubtitle").style.transform = "none";

			setTimeout(function () {
				document.getElementById("mainMenu-startBtn").style.opacity = 1;
				document.getElementById("mainMenu-startBtn").style.transform = "translate(0, 0)";
			}, 500);
		}, 500);
	}, 400);
}

// main menu start button
document.getElementById('mainMenu-startBtn').addEventListener("click", function () {
	document.getElementById('mainInterface').style.display = "block";
	document.getElementById('mainMenu').style.transform = "translate(-50%, -50%) scale(1.5)";
	document.getElementById('mainMenu').style.opacity = 0;
	setTimeout(function () {
		switchToUi(UI_SCENARIO_SELECTION);
		document.getElementById('mainInterface').style.opacity = 1;

		document.getElementById('mainInterface').style.transform = "scale(1) translate(-50%, -50%)";
	}, 500);
});

// select menu choose button
document.getElementById("scnSelect-chooseBtn").onclick = function () {
	loadScenario("epic_duel"); // TODO parametrize
}

// options menu continue button
document.getElementById("scnSettings-startBtn").onclick = populateUserInputs;

// download button
document.getElementById("scnDisplay-downloadBtn").onclick = function () {
	const link = document.createElement("a");
	link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById("scnDisplay-bookPageRightContent").innerHTML));
	link.setAttribute('download', `${xml.metadata["title"]} by ${xml.metadata["author"]}.txt`); // TODO sanitize

	link.style.display = 'none';
	document.body.appendChild(link);

	link.click();
	document.body.removeChild(link);
}




