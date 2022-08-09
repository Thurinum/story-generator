"use strict";

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
				input.maxLength = 150;
				label.innerHTML = field.innerHTML + "<br />";
				break;
			}
			case "time": {
				input = document.createElement("input");
				input.setAttribute("placeholder", field.getAttribute("placeholder"));
				label.innerHTML = field.innerHTML + "<br />";
				break;
			}
			case "select": {
				input = document.createElement("select");
				input.innerHTML = field.innerHTML;
				label.innerHTML = field.getAttribute("placeholder") + "<br />";
				break;
			}
			case "section": {
				input = document.createElement("hr");
				label.innerHTML = `<br /><strong>${field.getAttribute("name")}</strong>`;
				break;
			}
			default:
				console.warn(`Invalid user input type '${field.nodeName}'.`);
				break;
		}

		input.setAttribute("id", "userInput_" + field.getAttribute("name"));
		input.required = true;	
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

		if (field.nodeName !== "section")	
			label.innerHTML += "<br />";

		$("#scnVariables-form").append(label);
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
	if (!$("#scnVariables-form").checkValidity())
		notify("Some fields were left empty. Placeholders will be used for those instead.")

	xml.reset();
	xml.select("variables");

	const count = xml.currentTag.childElementCount;
	for (let i = 0; i < count; i++) {
		if (xml.currentTag.children[i].nodeName === "section")
			continue;

		const propertyName = xml.currentTag.children[i].getAttribute("name");
		let propertyValue = $("#userInput_" + propertyName).value;
		const genderField = $("#userInput_" + propertyName + "_gender");
		const propertyGender = genderField ? genderField.selectedIndex : undefined;

		let passes = true;

		if (!propertyValue || propertyValue === "") {
			propertyValue = $("#userInput_" + propertyName).getAttribute("placeholder");

			if (!propertyValue || propertyValue == "")
				console.warn(`Unable to find a cached property value for input "${propertyName}".`);
			else
				console.info(`No user input specified for property "${propertyName}", using default "${propertyValue}".`);
		}

		if ($("#userInput_" + propertyName).getAttribute("datatype") == "gerund")
			passes = detectGerund(propertyValue);

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
		storyContent += storyContent.slice(-3).includes('.?!') ? toTitleCase(content) : content;
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

	// remove obnoxious spacing caused by xml
	storyContent = storyContent.replaceAll("\n", "")
					   .replaceAll(/\t+(?=[.,'?!:;])/g, "")
					   .replaceAll(/\t+(?![.,'?!:;])/g, " ");

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
	const title = $("#scnSettings-storyTitle").value;
	const author = $("#scnSettings-storyAuthor").value;
	xml.metadata["title"] = title;
	xml.metadata["author"] = author;

	xml.reset();
	xml.select("praises");

	const description = xml.parse(randomChildOf(xml.currentTag));

	// select random critical review
	xml.reset();
	xml.select("reviews");

	let review = '';
	let reviewType = $("#scnSettings-storyCritics").selectedIndex;

	// 0: random, 1: positive, 2: negative
	if (reviewType === 0)
		reviewType = Math.random() > 0.5 ? 1 : 2;

	xml.select(reviewType === 1 ? "positive" : "negative");

	if (xml.currentTag.childElementCount > 0)
		review = xml.parse(randomChildOf(xml.currentTag));

	// review's author
	xml.back();
	xml.select("critics");

	if (review !== '' && xml.currentTag.childElementCount > 0)
		review += `<br />&dash; ${xml.parse(randomChildOf(xml.currentTag))}`;

	//Display result
	$("#scnDisplay").style.display = "block";
	setTimeout(function () {
		$("#scnDisplay").style.opacity = 1;
		$("#scnDisplay").style.transform = "translate(0%, 0%)";
	}, 500)

	$("#mainInterface").style.opacity = 0;
	$("#mainInterface").style.left = "-50%";
	setTimeout(function () {
		$("#mainInterface").style.display = "none";
	}, 500);

	$("#scnDisplay-bookPageRightContent").innerHTML += storyContent + review;

	$("#scnDisplay-bookCoverFront").style.background = `url("resources/graphics/covers/cover${randomNumber(1, 4)}.webp")`;
	$("#scnDisplay-bookCoverFront").style.filter = "opacity(0.5) drop-shadow(0 0 0 red);";
	$("#scnDisplay-bookCoverFront").style.fontFamily = "serif";
	$("#scnDisplay-bookCoverFront").style.backgroundRepeat = "no-repeat";
	$("#scnDisplay-bookCoverFront").style.backgroundSize = "cover";
	$("#scnDisplay-bookTitle").innerHTML = title;
	$("#scnDisplay-bookSubtitle").innerHTML = "";
	$("#scnDisplay-bookAuthor").innerHTML = author;
	$("#scnDisplay-bookTagline").innerHTML = description;

	const coverFront = $("#scnDisplay-bookCoverFront");
	const coverLeft = $("#scnDisplay-bookPageLeft");

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