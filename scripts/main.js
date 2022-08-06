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

function createSettings(scenario) {
	xml.reset();
	xml.import(`resources/scenarios/${scenario}.xml`);

	setTimeout(function () {
		//Create scenario UI
		xml.select("plotlines");

		var plotlineDropdown = document.getElementById("shortStory-plotlineDropdown");
		for (var i = 0; i < currentTag.getElementsByTagName("plotline").length; i++) {
			var opt = document.createElement("option");
			opt.innerHTML = currentTag.getElementsByTagName("plotline")[i].getAttribute("name");
			plotlineDropdown.append(opt);
		}

		xml.select("plotline");

		var variantDropdown = document.getElementById("shortStory-variantDropdown");
		for (var i = 0; i < currentTag.getElementsByTagName("variant").length; i++) {
			var opt = document.createElement("option");
			opt.innerHTML = currentTag.getElementsByTagName("variant")[i].getAttribute("name");
			variantDropdown.append(opt);
		}

		switchToUi(UI_SCENARIO_SETTINGS);
	}, 500);

}

function createUI(scenario) {
	var enableAutofill;

	//Detect chose declinations
	var selectedPlotline = document.getElementById("shortStory-plotlineDropdown").value;
	var selectedVariant = document.getElementById("shortStory-variantDropdown").value;

	function parseUI(tag, ui) {
		for (var i = 0; i < tag.childElementCount; i++) {
			var field = tag.querySelectorAll("ui")[i];

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

			ui.append(label);
			ui.append(input);
		}
	}

	//Create custom UI
	xml.reset();
	xml.select("interface");
	xml.select("global");
	parseUI(currentTag, UI_SCENARIO_VARIABLES);
	enableAutofill = parseInt(currentTag.getAttribute("autofill")); // not implemented yet, broken

	xml.back();
	if (xml.select("plotline", "type", selectedPlotline)) {
		parseUI(currentTag, UI_SCENARIO_VARIABLES);
		if (xml.select("variant", "type", selectedVariant)) {
			parseUI(currentTag, UI_SCENARIO_VARIABLES);
		} else {
			console.exception(`[Interface] No user fields found for variant ${selectedVariant}.`);
			return false;
		}
	} else {
		console.exception(`[Interface] No user fields found for plotline ${selectedPlotline}.`);
		return false;
	}

	var finishButton = document.createElement("button");
	finishButton.innerHTML = "Done";
	finishButton.onclick = function () {
		createDatabase();
		createScenario(document.getElementById("shortStory-plotlineDropdown").value, document.getElementById("shortStory-variantDropdown").value);
	};

	UI_SCENARIO_VARIABLES.append(finishButton);

	switchToUi(UI_SCENARIO_VARIABLES);
}

function createDatabase() {
	var selectedPlotline = document.getElementById("shortStory-plotlineDropdown").value;
	var selectedVariant = document.getElementById("shortStory-variantDropdown").value;

	xml.reset();

	function parseDB(tag) {
		var count = currentTag.childElementCount;
		for (var i = 0; i < count; i++) {
			var propertyName = tag.getElementsByTagName("ui")[i].getAttribute("name");
			var propertyValue = document.getElementById("userInput_" + propertyName).value;
			var passes = true;

			if (!propertyValue) {
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
			}
		}
	}

	xml.select("interface");
	xml.select("global");
	parseDB(currentTag);
	xml.back();
	xml.select("plotline", "type", selectedPlotline);
	parseDB(currentTag);
	xml.select("variant", "type", selectedVariant);
	parseDB(currentTag);
}

function createScenario(currentPlotline, currentVariant) {
	var storyContent = ``;

	xml.reset();
	xml.select("plotlines");

	var plotlineType;
	var variantType;

	//Detect available plotlines and match with user choice
	for (let i = 0; i < currentTag.childElementCount; i++) {
		var target = currentTag.children[i];
		if (target.nodeName == "plotline") {
			if (target.getAttribute("name") == currentPlotline) {
				plotlineType = target;
			}
		} else {
			storyContent += xml.parse(target);
		}
	}

	//Verify if a plotline was properly selected
	if (plotlineType == undefined) {
		console.warn(`[Scenario] User-selected plotline type "${currentPlotline}" does not match available plotlines for this file.`);
		return false;
	}

	xml.select("plotline", "name", currentPlotline);

	//Detect available variants and match with user choice
	for (let i = 0; i < currentTag.childElementCount; i++) {
		var target = currentTag.children[i];
		if (target.nodeName == "variant") {
			if (target.getAttribute("name") === currentVariant) {
				variantType = target;
			}
		} else {
			storyContent += xml.parse(target);
		}
	}

	//Verify if a variant was properly selected
	if (variantType == undefined) {
		console.warn(`[Scenario] User-selected variant type "${currentVariant}" does not match available variants for this file.`);
		return false;
	}

	xml.select("variant", "name", currentVariant);

	//Detect available paragraphs
	for (let i = 0; i < currentTag.childElementCount; i++) {
		var target = currentTag.children[i];
		if (target.nodeName == "paragraph") {
			//Create content
			for (let a = 0; a < target.childElementCount; a++) {
				storyContent += xml.parse(target.children[a]);
			}
			storyContent += `<br /><br />`;
		} else {
			storyContent += xml.parse(target);
		}
	}

	createDisplay(storyContent);
};

function createDisplay(storyContent) {
	//Prepare story display
	var title = document.getElementById("shortStory-bookTitle").value;
	var author = document.getElementById("shortStory-bookAuthor").value;
	xml.metadata["title"] = title;
	xml.metadata["author"] = author;

	xml.reset();
	xml.select("cover");

	var description = xml.parse(currentTag.children[0]);

	xml.reset();
	xml.select("critics");

	var critics = ``;
	var criticsType = document.getElementById("shortStory-bookCritics").selectedIndex;

	if (criticsType == 1) {
		xml.select("favorable");
	} else if (criticsType == 2) {
		xml.select("unfavorable");
	}
	critics = xml.parse(currentTag.children[0]);

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
	createUI();
}
document.getElementById("shortStory-startButtonAction").onclick = function () {
	createSettings("action");
};
// function generate() {
// 	//**//INITIAL VARIABLES//**//
// 	// Protagonist
// 	var protagonistFirstName = toUpperCase(get("protagonistFirstName"));
// 	var protagonistLastName = toUpperCase(get("protagonistLastName"));
// 	var protagonistType = toLowerCase(get("protagonistType"));
// 	var protagonistAge = get("protagonistAge");
// 	var protagonistDescription1 = get("protagonistAppearance1");
// 	var protagonistDescription2 = get("protagonistAppearance2");
// 	var protagonistDescription3 = get("protagonistAppearance3");
// 	var protagonistDescription4 = get("protagonistAppearance4");
// 	var protagonistHobby = get("protagonistHobby");
// 	var protagonistQuality = get("protagonistQuality");
// 	var protagonistConflictReason = get("protagonistConflictReason");
// 	var protagonistAdjuvantRelation = get("protagonistAdjuvantRelation");
// 	var protagonistAttackStrategy = get("protagonistAttackStrategy");
// 	var protagonistTransport = get("protagonistTransport");
// 	var protagonistDreamLocation = get("protagonistDreamLocation");

// 	//Antagonist
// 	var antagonistFirstName = toUpperCase(get("antagonistFirstName"));
// 	var antagonistLastName = toUpperCase(get("antagonistLastName"));
// 	var antagonistType = toLowerCase(get("antagonistType"));
// 	var antagonistAge = get("protagonistAge");
// 	var antagonistDescription1 = get("antagonistAppearance1");
// 	var antagonistDescription2 = get("antagonistAppearance2");
// 	var antagonistDescription3 = get("antagonistAppearance3");
// 	var antagonistDescription4 = get("antagonistAppearance4");
// 	var antagonistFlaw = get("antagonistFlaw");
// 	var antagonistOpponentRelation = get("antagonistOpponentRelation");
// 	var antagonistLocationType = get("antagonistLocationType");

// 	//Allies and ennemies
// 	var adjuvantFirstName = toUpperCase(get("adjuvantFirstName"));
// 	var adjuvantLastName = toUpperCase(get("adjuvantLastName"));
// 	var adjuvantType = toLowerCase(get("adjuvantType"));
// 	var opponentFirstName = toUpperCase(get("opponentFirstName"));
// 	var opponentLastName = toUpperCase(get("opponentLastName"));
// 	var opponentType = toLowerCase(get("opponentType"));

// 	//Environment
// 	var date = get("date");
// 	var time = get("time");
// 	var weather = get("weather")

// 	//Location
// 	var location = get("location");
// 	var locationDetails1 = get("locationDetails1");
// 	var locationDetails2 = get("locationDetails2");
// 	var locationDetails3 = get("locationDetails3");
// 	var locationDetails4 = get("locationDetails4");

// 	//Scenario type
// 	var protagonistInitialAction = get("protagonistInitialAction");
// 	var antagonistInitialAction = get("antagonistInitialAction");
// 	var opponentInitialAction = get("opponentInitialAction");
// 	var scenarioLength = get("scenarioLength");
// 	var scenarioType = get("scenarioType");
// 	var scenarioResolutionType = get("resolutionType");



// 	//Action Scenario
// 	var scenarioActionType = get("scenarioActionType");
// 	var scenarioActionStrategyMurder = get("scenarioActionStrategyMurder");
// 	var scenarioActionWeaponProtagonist = get("scenarioActionWeapon1");
// 	var scenarioActionWeaponAntagonist = get("scenarioActionWeapon2");
// 	var scenarioActionWeaponAdjuvant = get("scenarioActionWeapon3");
// 	var scenarioActionWeaponOpponent = get("scenarioActionWeapon4");
// 	var scenarioActionItemRising = get("scenarioActionItemRising");

// 	var authorName = get("authorName");
// 	var authorBestseller = get("authorBestseller");

// 	var fontFamily = get("coverStyle");

// 	var critics = get("critics");

// 	//TEMPORARY FOR TESTING PURPOSES
// 	var protagonistFirstName = "Michel";
// 	var protagonistLastName = "Forever";
// 	var protagonistType = "man";
// 	var protagonistAge = 14;
// 	var protagonistDescription1 = "smart";
// 	var protagonistDescription2 = "strong";
// 	var protagonistDescription3 = "slim";
// 	var protagonistDescription4 = "cultivated";
// 	var protagonistHobby = "playing Fortnite Battle Royale";
// 	var protagonistQuality = "able to adapt to any situation";
// 	var protagonistConflictReason = "once destroyed his life";
// 	var protagonistAdjuvantRelation = "love";
// 	var protagonistAttackStrategy = "breaking his neck";
// 	var protagonistTransport = "car";
// 	var protagonistDreamLocation = "strip club";

// 	//Antagonist
// 	var antagonistFirstName = "Nazeem";
// 	var antagonistLastName = "Barhoumeter";
// 	var antagonistType = "man";
// 	var antagonistAge = 6;
// 	var antagonistDescription1 = "stupid";
// 	var antagonistDescription2 = "gay";
// 	var antagonistDescription3 = "dumb";
// 	var antagonistDescription4 = "ignorant";
// 	var antagonistFlaw = "gay";
// 	var antagonistOpponentRelation = "bodyguard";
// 	var antagonistLocationType = "Exterior";

// 	//Allies and ennemies
// 	var adjuvantFirstName = "Sofia";
// 	var adjuvantLastName = "Volkov";
// 	var adjuvantType = get("adjuvantType");
// 	var opponentFirstName = "Jaune";
// 	var opponentLastName = "Cena";
// 	var opponentType = "man";

// 	//Environment
// 	var date = "23/4/2323";
// 	var time = "22:21";
// 	var weather = "Clear";

// 	//Location
// 	var location = "strip club";
// 	var locationDetails1 = "immersive";
// 	var locationDetails2 = "extravagant";
// 	var locationDetails3 = "hot";
// 	var locationDetails4 = "interesting";

// 	//Scenario type
// 	var protagonistInitialAction = "reading a good book";
// 	var antagonistInitialAction = "torturing an innocent";
// 	var opponentInitialAction = "watching TV";
// 	var scenarioLength = "Longer";
// 	var scenarioType = "Action";
// 	var scenarioResolutionType = "Protagonist";

// 	//Action Scenario
// 	var scenarioActionType = "Kill the antagonist";
// 	var scenarioActionStrategyMurder = "In person, silently";
// 	var scenarioActionWeaponProtagonist = "pistol";
// 	var scenarioActionWeaponAntagonist = "machinegun";
// 	var scenarioActionWeaponAdjuvant = "broom";
// 	var scenarioActionWeaponOpponent = "kitchen spoon";
// 	var scenarioActionItemRising = "book";

// 	var authorName = "Maxime Gagnon";
// 	var authorBestseller = "Sample Text";

// 	var fontFamily = get("coverStyle");

// 	var critics = "Acclaimed";

// 	//CHECK VARIABLES VALIDITY//
// 	if (undefinedCount !== 0) {
// 		banner(`Make sur you filled all inputs! (${undefinedCount} are empty)`);
// 		undefinedCount = 0;
// 		return false;
// 	}

// 	//**//ADDITIONNAL VARIABLES//**//
// 	var content = ``;
// 	var protagonistPronounPersonnal;
// 	var protagonistPronounPossessive;
// 	var protagonistPronounObjective;
// 	var protagonistAgeCategory;
// 	var antagonistPronounPersonnal;
// 	var antagonistPronounPossessive;
// 	var antagonistPronounObjective;
// 	var adjuvantPronounPersonnal;
// 	var adjuvantPronounPossessive;
// 	var adjuvantPronounObjective;
// 	var opponentPronounPersonnal;
// 	var opponentPronounPossessive;
// 	var opponentPronounObjective;
// 	var scenarioInfo = "";
// 	var scenarioActionRoom;

// 	//Set full name of characters
// 	var protagonist = protagonistFirstName + " " + protagonistLastName;
// 	var antagonist = antagonistFirstName + " " + antagonistLastName;
// 	var adjuvant = adjuvantFirstName + " " + adjuvantLastName;
// 	var opponent = opponentFirstName + " " + opponentLastName;

// 	//Get hours from time
// 	var hours = parseInt(time.slice(0, 2));

// 	//Set protagonist replacement pronouns
// 	if (protagonistType === "man") {
// 		protagonistPronounPersonnal = "he";
// 		protagonistPronounPossessive = "his";
// 		protagonistPronounObjective = "him";
// 	} else if (protagonistType === "woman") {
// 		protagonistPronounPersonnal = "she";
// 		protagonistPronounPossessive = "her";
// 		protagonistPronounObjective = "her";
// 	} else {
// 		protagonistPronounPersonnal = "it";
// 		protagonistPronounPossessive = "its";
// 		protagonistPronounObjective = "it";
// 	}

// 	//Set antagonist replacement pronouns
// 	if (protagonistType === "man") {
// 		antagonistPronounPersonnal = "he";
// 		antagonistPronounPossessive = "his";
// 		antagonistPronounObjective = "him";
// 	} else if (protagonistType === "woman") {
// 		antagonistPronounPersonnal = "she";
// 		antagonistPronounPossessive = "her";
// 		antagonistPronounObjective = "her";
// 	} else {
// 		antagonistPronounPersonnal = "it";
// 		antagonistPronounPossessive = "its";
// 		antagonistPronounObjective = "it";
// 	}

// 	//Set adjuvant replacement pronouns
// 	if (adjuvantType === "man") {
// 		adjuvantPronounPersonnal = "he";
// 		adjuvantPronounPossessive = "his";
// 		adjuvantPronounObjective = "him";
// 	} else if (protagonistType === "woman") {
// 		adjuvantPronounPersonnal = "she";
// 		adjuvantPronounPossessive = "her";
// 		adjuvantPronounObjective = "her";
// 	} else {
// 		adjuvantPronounPersonnal = "it";
// 		adjuvantPronounPossessive = "its";
// 		adjuvantPronounObjective = "it";
// 	}

// 	//Set opponent replacement pronouns
// 	if (opponentType === "man") {
// 		opponentPronounPersonnal = "he";
// 		opponentPronounPossessive = "his";
// 		opponentPronounObjective = "him";
// 	} else if (protagonistType === "woman") {
// 		opponentPronounPersonnal = "she";
// 		opponentPronounPossessive = "her";
// 		opponentPronounObjective = "her";
// 	} else {
// 		opponentPronounPersonnal = "it";
// 		opponentPronounPossessive = "its";
// 		opponentPronounObjective = "it";
// 	}

// 	//Get scenario information
// 	if (scenarioType === "Action") {
// 		scenarioInfo = scenarioInfo + "action";
// 		if (scenarioActionType === "Kill the antagonist") {
// 			scenarioInfo = scenarioInfo + "Murder";
// 			if (scenarioActionStrategyMurder === "In person, silently") {
// 				scenarioInfo = scenarioInfo + "Silent";
// 			}
// 		}
// 	}

// 	//Protagonist age category
// 	if (protagonistAge <= 22) {
// 		protagonistAgeCategory = "young";
// 	} else if (protagonistAge >= 60) {
// 		protagonistAgeCategory = "old";
// 	} else {
// 		protagonistAgeCategory = "";
// 	}

// 	var temp_roomType = "room_" + toLowerCase(antagonistLocationType);

// 	//**//PARSING FUNCTIONS//**//
// 	//Choose a random element from an array
// 	function parseScenario(array) {
// 		if (scenarioStrings[array] === undefined) {
// 			console.warn(`[ScenarioStrings] Invalid entry "${array}" for scenario string.`);
// 			banner(`Warning: An error occured when parsing scenario strings content.`);
// 			return "[MISSING SCENARIO STRING]";
// 		}
// 		array = scenarioStrings[array];
// 		return array[Math.floor(Math.random() * array.length)];
// 	}

// 	//Choose a random element from an array
// 	function parseRandom(array) {
// 		if (randomStrings[array] === undefined) {
// 			console.warn(`[RandomStrings] Invalid entry "${array}" for random string.`);
// 			banner(`Warning: An error occured when parsing random strings content.`);
// 			return "[MISSING RANDOM STRING]";
// 		}
// 		array = randomStrings[array];
// 		return array[Math.floor(Math.random() * array.length)];
// 	}

// 	//Sets optional content based on desired text length
// 	function setOptionalContent(scenarioLength, content) {
// 		//Shorter: 0% chance of optional dialogue
// 		//Normal: 50% chance of optional dialogue
// 		//Longer: 100% chance of optional dialogue

// 		if (scenarioLength === "Shorter") {
// 			return "";
// 		} else if (scenarioLength === "Normal") {
// 			if (random()) {
// 				return parseScenario(content);
// 			} else {
// 				return "";
// 			}
// 		} else if (scenarioLength === "Longer") {
// 			return parseScenario(content);
// 		} else {
// 			console.warn("ERROR");
// 		}
// 	}

// 	var temp_firstName = "(If you see this something went wrong)";

// 	//**//RANDOM STRINGS//**//
// 	const randomStrings = {
// 		opening: [
// 			`door`,
// 			`window`,
// 			`entrance`,
// 		],
// 		room_interior: [
// 			`bedroom`,
// 			`kitchen`,
// 			`living room`,
// 			`garage`,
// 			`cave`,
// 			`library`,
// 			`dining room`,
// 		],
// 		room_exterior: [
// 			`garden`,
// 		],
// 		firstName: [
// 			`John`,
// 		],
// 		action_message: [
// 			`Meeting with John at ${randomNumber(10)}am, ${temp_roomType}.`,
// 		],
// 		cover: [
// 			`wall`,
// 			`post`,
// 			`door`,
// 			`fence`,
// 			`column`,
// 		],
// 		insult: [
// 			`bastard`,
// 			`dog`,
// 		],
// 		materialSturdy: [
// 			`steel`,
// 			`iron`,
// 			`ebony`,
// 			`copper`,
// 			`bronze`,
// 			`oak`,
// 		],
// 		enemyForce: [
// 			`soldiers`,
// 			`assassins`,
// 			`policemen`,
// 			`guards`,
// 		],
// 		adjective_doorGeneric: [
// 			`rustic`,
// 			`solid`,
// 			`sturdy`,
// 			`thick`,
// 			`ancient`,
// 			`large`,
// 		],
// 		color: [
// 			`white`,
// 			`black`,
// 			`red`,
// 			`green`,
// 			`blue`,
// 			`orange`,
// 			`purple`,
// 			`magenta`,
// 			`yellow`,
// 			`brown`,
// 			`pink`,
// 		],
// 		container: [
// 			`chest`,
// 			`box`,
// 			`shelf`,
// 			`end table`,
// 			`barrel`,
// 		],
// 		barrage: [
// 			`river`,
// 			`grid`,
// 			`fence`,
// 			`wall`,
// 			`force field`,
// 		],
// 		critics: [
// 			`The New York Times`,
// 			`Times Magazine`,
// 			`Le Devoir`,
// 			`Paris Match`,
// 			`La Presse`,
// 			`Washington Post`,
// 		],
// 	}

// 	//Set action scenario random room
// 	if (antagonistLocationType === "Interior") {
// 		scenarioActionRoom = parseRandom("room_interior")
// 	} else if (antagonistLocationType === "Exterior") {
// 		scenarioActionRoom = parseRandom("room_exterior")
// 	}

// 	temp_firstName = parseRandom("firstName");

// 	//**//SCENARIO STRINGS//**//
// 	const scenarioStrings = {
// 		setting_timeDawn: [
// 			`and the sun was slowly rising.`,
// 			`and slowly the sun was rising.`,
// 			`and the sun, majestuous orb in the sky, was slowly rising.`,
// 			`and a new day was on the verge of beginning.`,
// 			`and the first rays of lights were starting to appear.`,
// 		],
// 		setting_timeDay: [
// 			`and the sun was high in the sky.`,
// 		],
// 		setting_timeDusk: [
// 			`and the sun was slowly disappearing on the horizon.`,
// 			`and slowly the sun was disappearing on the horizon.`,
// 			`and slowly the day was coming to an end.`,
// 		],
// 		setting_timeNight: [
// 			`and the moon was glimmering in the night sky.`,
// 			`and the night was pitch black.`,
// 			`and even the moon was struggling to dissipate the darkness of the night.`,
// 			`but the moon lit the ${locationDetails1} ${location} where ${protagonist} stood.`,
// 			`and it was very dark, for the moon was hidden behind a thick layer of clouds.`,
// 		],
// 		setting_seasonSpring: [
// 			`The plants were slowly starting to appear over the melting snow.`,
// 			`The flowers, once burried under the snow, were now starting to blossom again.`,
// 		],
// 		setting_seasonSummer: [
// 			`It was summer, and the heat was overwhelming.`,
// 			`The summer heat was overwhelming, and many were the people that did not dare getting outside.`,
// 		],
// 		setting_seasonFall: [
// 			`Dead leaves were falling all over on the ground.`,
// 			`Autumn was taking over, and ${protagonistPronounPersonnal} started`,
// 			`Summer was over, and the first signs of winter had already begun to spread as the decaying leaves of the trees fell from their naked barks.`,
// 		],
// 		setting_seasonWinter: [
// 			`It was winter, and the ground was heavily covered by several layers of snow.`,
// 			`The air was bitter cold.`,
// 		],
// 		setting_weatherClear: [
// 			`There was not a cloud in the sky.`,
// 			`It was a pleasant day.`,
// 		],
// 		setting_weatherCloudy: [
// 			`There were many clouds in the sky.`,
// 			`The numerous clouds in the sky led to think there would soon be a storm. Thus, rare were the folks to walk in the streets.`,
// 			`It was a cloudy day.`,
// 		],
// 		setting_locationGeneric: [
// 			`The ${location} was a ${locationDetails2} place: ${locationDetails3} and ${locationDetails4}.`,
// 			`${toUpperCase(locationDetails1)}, ${locationDetails2}, and ${locationDetails3}: the ${location} really was a ${locationDetails4} place.`,
// 			`A ${locationDetails1} place that this ${location}, thought ${protagonist}. Very ${locationDetails2} and ${locationDetails3}.`,
// 			`The ${location} had always appeared ${locationDetails1} to him, but ${protagonist} had never fully understood how ${locationDetails3} and ${locationDetails4} it was before.`,
// 		],
// 		setting_character:  [
// 			`${protagonist} was a ${protagonistAge} years ${protagonistAgeCategory} ${protagonistDescription1} ${protagonistType}. `,
// 			`${toUpperCase(protagonistDescription2)} and ${protagonistDescription3}, ${protagonist} was a ${protagonistAge} years ${protagonistAgeCategory} ${protagonistType}.`,
// 		],
// 		setting_actionMurder: [
// 			`${toUpperCase(protagonistPronounPersonnal)} used to enjoy ${protagonistHobby} in ${protagonistPronounPossessive} free hours. However, today was to be different, for ${protagonistPronounPersonnal} was invested of a mission of the highest importance: to kill ${antagonist}, the ${toUpperCase(antagonistDescription1)}, ${protagonistPronounPossessive} fiercest enemy. More than ${randomNumber(10)} years ago, when they used to be friends, ${antagonistFirstName} had ${protagonistConflictReason}. For a long time ${protagonistPronounPersonnal} had lurked in the dark, yet it was now time to act!`,
// 		],
// 		setting_actionMurderOptionalSpeech: [
// 			`\n\n - At last, the day of my revenge! ${antagonist}, tomorrow you will breathe for the last time...`,
// 		],
// 		triggerStart_actionMurderSilent: [
// 			`To assassinate his foe was not an easy task. Yet ${protagonistFirstName} decided that ${protagonistPronounPersonnal} would take down ${antagonist} ${toLowerCase(scenarioActionStrategyMurder)}, so that he could feel the fear into his eyes. Carefully, ${protagonistPronounPersonnal} sneaked inside the ${locationDetails2} ${location}, ${protagonistPronounPossessive} ${scenarioActionWeaponProtagonist} drawn, and hid behind a ${parseRandom("cover")}. It was better to wait for the night.`,
// 		],
// 		trigger_actionMurderSilent: [
// 			`${24 - hours} hours later, a dark figure appeared in sight of ${protagonistFirstName}. At first ${protagonistPronounPersonnal} thought it was ${antagonistFirstName}, but soon recognized ${opponent}, his ${antagonistOpponentRelation} and damned soul. If he was to pass, there was no choice but to kill him. It was time, at last, to show these ${parseRandom("insult")}s what he was made of!`,
// 		],
// 		trigger_actionMurderSilentOptionalSpeech: [
// 			`\n\n- Here we go...`,
// 		],
// 		triggerEnd_actionMurderSilent: [
// 			`Silently, ${protagonistPronounPersonnal} got behind the vile ${opponentFirstName} that, inconscious of his close fate, kept ${opponentInitialAction}. ${toUpperCase(protagonistFirstName)} hesitated a few seconds. He had to do it, or all this would have served naught. Resolute, he killed him by ${protagonistAttackStrategy}. The deed was done. There was no way ${protagonistPronounPersonnal} could go back now: it was ${antagonistFirstName} or ${protagonistPronounObjective}!`,
// 		],
// 		rising1start_actionMurderSilent: [
// 			`${protagonistFirstName} glanced in the room. Nobody. Only then did ${protagonistPronounPersonnal} realize that he had not the slightest idea of where ${antagonistFirstName} could be! With some apprehension, ${protagonistPronounPersonnal} entered in what looked like a ${scenarioActionRoom}.`,
// 		],
// 		rising1_actionMurderSilent: [
// 			`The place was very ordinary, thus ${protagonistFirstName} felt somewhat uneasy. Maybe was he expecting something more... appropriate to the situation? A corpse or a bloodstained note, perhaps. At this thought, ${protagonistPronounPersonnal} glanced at the wall next to him, and noticed a board with several notes hanged-in. Opportunately enough, he found a message of relative importance on one of them: \n\n${parseRandom("action_message")}`,
// 		],
// 		rising1_actionMurderOptionalSpeech: [
// 			`\n\n- We never know...`,
// 		],
// 		rising1end_actionMurderSilent: [
// 			`${toUpperCase(protagonistFirstName)} sneaked by the ${parseRandom("opening")} inside the ${scenarioActionRoom} where, ${protagonistPronounPersonnal} was sure, ${protagonistPronounPossessive} target would be ${antagonistInitialAction}. However, a quick look over the room and no one was to be found. ${toUpperCase(protagonistFirstName)} reddenned at the thought of how foolish he had been of building his hopes out of a sticking note! Where could that ${antagonistLastName} ${parseRandom("insult")} be?`,
// 		],
// 		rising2start_actionMurderSilent: [
// 			`Suddenly, ${protagonistPronounPersonnal} realized that ${protagonistPronounPersonnal} had forgotten to loot the corpse of ${opponentFirstName}. At first glance, this one seemed to be ${opponentInitialAction}, a quite unusual activity for someone supposed to make the guard. But as ${protagonistFirstName} made ${opponentPronounPossessive} pockets, he extracted a very peculiar object: a ${scenarioActionItemRising}! ${toUpperCase(protagonistPronounPersonnal)} eagerly picked it up and spent the next ${randomNumber(10)} minutes to analyze it. On the left side, there was written: ${parseRandom(temp_roomType)}. At last, a hint!`,
// 		],
// 		rising2_actionMurderSilent: [
// 			`${protagonistFirstName} directed to the ${parseRandom(temp_roomType)}, which appeared unfortunately, to bee protected by a ${parseRandom("adjective_doorGeneric")} ${parseRandom("materialSturdy")} door. ${protagonistFirstName} thought at first to break in with his ${scenarioActionWeaponProtagonist}, but it would have made too much noise. Instead, he looked at the lock, that seemed to be made in a ${parseRandom("adjective_doorGeneric")} ${parseRandom("materialSturdy")}. It required an irregular key, whose shape matched opportunately the ${scenarioActionItemRising} ${protagonistPronounPersonnal} had found before. Cautiously, ${protagonistPronounPersonnal} inserted it in the opening... and the door opened.\n\n`,
// 		],
// 		rising2_actionMurderOptionalSpeech: [
// 			`- Why being so cautious about a door? It means ${antagonistFirstName} must be behind!`,
// 		],
// 		rising2end_actionMurderSilent: [
// 			`To ${protagonistPronounPossessive} great surprise, however, the room was empty. The back wall had been replaced by a ${parseRandom("adjective_doorGeneric")} opaque panel whose texture looked like glass. In the middle of the panel was a small ${parseRandom("color")} button. Should ${protagonistPronounPersonnal} press it?`,
// 		],
// 		rising3start_actionMurderSilent: [
// 			`Logically, the button would open the glass panel, revealing something. But what? Uneasy, ${protagonistFirstName} pressed it. As expected, the panel slowly disappeared under the ground, revealing a very common elevator.`,
// 		],
// 		rising3_actionMurderSilent: [
// 			`Which, of course, had to be protected by a lock. ${protagonistFirstName} tried the ${scenarioActionItemRising}, without success. But the lock appeared to be made of weak metal, that could easily be melted. ${toUpperCase(protagonistPronounPersonnal)} took a match from his pocket. A few minutes later, he entered the elevator.`,
// 		],
// 		rising3_actionMurderOptionalSpeech: [
// 			`\n\n- I must be getting closer. I feel it!`,
// 		],
// 		rising3end_actionMurderSilent: [
// 			`As he pushed the elevator's button, ${protagonist} thought of what he could find behind. ${antagonist} was there, for sure. But what treasure could be hidden in such a place? Money, perhaps. Compremetting papers. Yet when the elevator stopped and its doors opened, ${protagonistPronounPersonnal} stayed speechless. He could have expected anything, but this!`,
// 		],
// 		climaxStart_actionMurderSilent: [
// 			`For in front of him was ${adjuvant}, ${protagonistPronounPossessive} ${protagonistAdjuvantRelation}, hands tied, threathened by ${antagonist}'s ${scenarioActionWeaponAntagonist}!`,
// 		],
// 		climax_actionMurderSilentOptionalSpeech1: [
// 			`\n\n- Well well, isn't this a surprise! ${protagonist} in person! Honestly, I never thought you'd have the guts to come here. Good. As you are, we can now safely discuss, can't we?`,
// 		],
// 		climax_actionMurderSilentOptionalSpeech2: [
// 			`\n\n- You ${antagonistDescription1} bastard!, said ${protagonistFirstName}.`,
// 		],
// 		climax_actionMurderSilentOptionalSpeech3: [
// 			`\n\n- Not so fast... you wouldn't want anything to happen to ${adjuvantFirstName}, don't you? Nonetheless, I rather enjoyed wathing your little, shall I say, "adventures". Anyway, hand me your ${scenarioActionWeaponProtagonist}, and I might reconsider letting you both alive.`,
// 		],
// 		climax_actionMurderSilent: [
// 			`Without choice, ${protagonistFirstName} handed ${antagonistFirstName} his weapon, who as promised relaxed ${adjuvantFirstName}. At this moment, ${adjuvantPronounPersonnal} remembered that ${antagonistPronounPersonnal} had put ${adjuvantPronounPossessive} ${scenarioActionWeaponAdjuvant} in his pocket. Skillfully ${adjuvantPronounPersonnal} took it, and stabbed him without hesitating in the back. In a matter of seconds, ${antagonist} was dead.`,
// 		],
// 		climax_actionMurderSilentOptionalSpeech4: [
// 			`\n\n- We shouldn't stay here, said ${adjuvantFirstName}. Let's go. `,
// 		],
// 		climaxEnd_actionMurderSilent: [
// 			`${protagonistFirstName} nodded. As ${protagonistPronounPersonnal} said that, a bunch of ${parseRandom("enemyForce")} arrived, alarmed by the nearby noise. Fortunately, the fugitives managed to hide again next to the ${parseRandom("cover")}. They must escape the ${location}!`,
// 		],
// 		falling1start_actionMurderSilent: [
// 			`Quickly, ${protagonistFirstName} evaluated the possibilities.`,
// 		],
// 		falling1_actionMurderSilent: [
// 			`${protagonistPronounPossessive}'s first reflex was to pass by the ${parseRandom(temp_roomType)}. Indeed, they were being searched for in the opposite direction. They rapidly passed through the multiple rooms ${protagonistPronounPersonnal} had previously visited, and breaked through the ${parseRandom("opening")}. Free, at last. But the game wasn't ended yet. The ${location} was surrounded by a huge ${parseRandom("barrage")}, and it would have to be bypassed.\n\n`,
// 		],
// 		falling1_actionMurderOptionalSpeech: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling1end_actionMurderSilent: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling2start_actionMurderSilent: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling2_actionMurderSilent: [
// 			`Fortunately, ${adjuvantFirstName} had an idea. When ${adjuvantPronounPersonnal} was captured, ${adjuvantPronounPersonnal} had noticed that the guards had stored ${adjuvantPronounPossessive} ${protagonistTransport} inside one of the ${parseRandom(temp_roomType)}s. If they were fast enough, they could take it back and break the gates. Hurrying, they rushed to the said room, where they found it guarded by two men. What could they do?\n\n`,
// 		],
// 		falling2_actionMurderOptionalSpeech: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling2end_actionMurderSilent: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling3start_actionMurderSilent: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling3_actionMurderSilent: [
// 			`As ${protagonistFirstName} was very ${protagonistQuality}, he did not discourage, and quickly built a plan. While ${protagonistPronounPersonnal} would take down the strongest of the man, ${adjuvantFirstName} would rush to the ${parseRandom("container")} were the ${protagonistTransport}'s keys were located. Then, ${adjuvantPronounPersonnal} would enter the vehicle, and before the second guard could do anything... they would be free! It was risky, but they no longer had choice.\n\n`,
// 		],
// 		falling3_actionMurderOptionalSpeech: [
// 			`UNIMPLEMENTED`,
// 		],
// 		falling3end_actionMurderSilent: [
// 			`UNIMPLEMENTED`,
// 		],
// 		resolutionStart_actionMurderSilentProtagonistWin: [
// 			`Fortunately, ${protagonistFirstName}'s ${scenarioActionWeaponProtagonist} was more than enough against the first guard. As expected, the second was not alert enough, and ${adjuvantFirstName} had plenty of time to take the keys. Soon enough they were in the ${protagonistTransport}, and before anyone could do anything they were gone!`,
// 		],
// 		resolutionStart_actionMurderSilentProtagonistLoss: [
// 			`UNIMPLEMENTED`,
// 		],
// 		resolution_actionMurderSilentProtagonistWinOptionalSpeech: [
// 			`\n\n- I thought I'd never get out of here alive. Thank you, ${protagonistFirstName}, said ${adjuvantFirstName}.\n\n- We wouldn't have escaped without your help, ${protagonistPronounPersonnal} replied.`,
// 		],
// 		resolution_actionMurderSilentProtagonistLossOptionalSpeech: [
// 			`UNIMPLEMENTED`,
// 		],
// 		resolutionEnd_actionMurderSilentProtagonistWin: [
// 			`After so many  years, ${antagonist} had finally faltered. ${toUpperCase(protagonistFirstName)} and ${adjuvantFirstName} headed toward the ${protagonistDreamLocation}, where no ${toUpperCase(antagonistDescription4)} would come to separate them. At last, they were free!`,
// 		],
// 		resolutionEnd_actionMurderSilentProtagonistLoss: [
// 			`UNIMPLEMENTED`,
// 		],
// 		coverAnnouncement: [
// 			`from the great master of litterature`,
// 			`presented by`,
// 			`written by`,
// 			`a novel by`,
// 		],
// 		attentionGetter: [
// 			`From the bestseller author of ${protagonist}`,
// 			`More than ${randomNumber(10)} millions of copies sold!`,
// 			`More than ${randomNumber(100)} millions of copies sold!`,
// 			`More than ${randomNumber(1000)} millions of copies sold!`,
// 			`More than ${randomNumber(10)} billions of copies sold!`,
// 			`The long-waited critically acclaimed novel`,
// 			`Bestseller of more than ${randomNumber(100)} magazines`,
// 			`Bestseller of more than ${randomNumber(1000)} magazines`,
// 		],
// 		criticsGood: [
// 			`An exciting novella. The character of ${protagonist} is well-built, complex, and really makes the story enjoyable.\n\n- ${parseRandom("critics")}`,
// 			`This immersive and deep story really denotes a high degree of personal investment from ${authorName}. His best book yet!\n\n- ${parseRandom("critics")}`,
// 			`Scattered with many hilarious references, ${authorName} succeeds with brio to make us enjoy the adventures of ${protagonist} against the malevolent ${antagonist}. A must-read!\n\n- ${parseRandom("critics")}`,
// 			`A brilliant book. The adventures of ${protagonist} will stay in our memories for generations to come.\n\n- ${parseRandom("critics")}`,
// 			`The indescriptible genius, the incredible acuity of spirit of ${protagonist} makes this book a simple yet genuine success.\n\n- ${parseRandom("critics")}`,
// 		],
// 		criticsBad: [
// 			`Honestly, we probably never saw worse in our entire careers. Absolutely disgusting.`,
// 			`This so-called "novel" is the apotheosis of stupidity. It is utterly shocking that such an foolish absurdity managed to get inside the libraries themselves.`,
// 			`${protagonist} is the living counterproof that we should burn books.`,
// 			`The ideologism mentionned in this shocking novel is the contrary of our society's principles, thus it is a shame for which ${authorName} will take long before being forgotten.`,
// 			`So bad that it becomes almost funny. I wouldn't give this book even to my dog, except to eat, perhaps.`,
// 		],
// 		defaultCovers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
// 	}

// 	//**//SHORT STORY GENERATION//**//
// 	//Different patterns are available for different settings...
// 	var possibilities = ["time", "season", "weather", "location"];
// 	var paragraph1 = "";		//Setting - Intro
// 	var paragraph2 = "";		//Setting - Characterization
// 	var paragraph3 = "";		//
// 	var paragraph4 = "";		//
// 	var paragraph5 = "";		//
// 	var paragraph6 = "";		//
// 	var paragraph7 = "";		//
// 	var paragraph8 = "";
// 	var paragraph9 = "";
// 	var paragraph10 = "";
// 	var paragraph11 = "";
// 	var paragraph12 = "";
// 	var paragraph13 = "";
// 	var paragraph14 = "";
// 	var paragraph15 = "";
// 	var paragraph16 = "";
// 	var paragraph17 = "";
// 	var paragraph18 = "";
// 	var paragraph19 = "";
// 	var paragraph20 = "";
// 	var paragraph21 = "";
// 	var paragraph22 = "";
// 	var paragraph23 = "";
// 	var paragraph24 = "";
// 	var paragraph25 = "";
// 	var paragraph26 = "";
// 	var paragraph27 = "";
// 	var paragraph28 = "";
// 	var paragraph29 = "";

// 	//**//PARAGRAPH 1 - SETTING INTRO//**//
// 	while (possibilities.length > 0) {
// 		var choice = possibilities[Math.floor(Math.random() * possibilities.length)];

// 		let string;

// 		if (choice === "time") {
// 			if (hours === 5 || hours === 6) {
// 				string = `It was ${time}, ${parseScenario("setting_timeDawn")}`;
// 			} else if (hours >= 16 && hours <= 19) {
// 				string = `It was ${time}, ${parseScenario("setting_timeDay")}`;
// 			} else if (hours >= 7 && hours <= 18) {
// 				string = `It was ${time}, ${parseScenario("setting_timeDay")}`;
// 			} else if (hours >= 0 && hours <= 6) {
// 				string = `It was ${time}, ${parseScenario("setting_timeDusk")}`;
// 			} else if (hours >= 20 && hours <= 24) {
// 				string = `It was ${time}, ${parseScenario("setting_timeNight")}`;
// 			}
// 		} else if (choice === "season") {
// 			//Get date values
// 			var dateValues = date.split('');
// 		    var month = parseInt(dateValues[1]);

// 		    //Seasons from months numbers
// 		    var spring = [3, 4, 5];
// 		    var summer = [6, 7, 8];
// 		    var fall = [9, 10, 11];
// 		    var winter = [12, 1, 2];

// 			if (spring.includes(month)) {
// 				string = parseScenario("setting_seasonSpring")
// 			} else if (summer.includes(month)) {
// 				string = parseScenario("setting_seasonSummer")
// 			} else if (fall.includes(month)) {
// 				string = parseScenario("setting_seasonFall")
// 			} else if (winter.includes(month)) {
// 				string = parseScenario("setting_seasonWinter")
// 			}
// 		} else if (choice === "weather") {
// 			if (weather === "Clear") {
// 				string = parseScenario("setting_weatherClear");
// 			} else if (weather === "Cloudy") {
// 				string = parseScenario("setting_weatherCloudy");
// 			} else {
// 				console.log(343434)
// 			}
// 		} else if (choice === "location") {
// 			string = parseScenario("setting_locationGeneric");
// 		} else {
// 			console.exception("Error")
// 		}

// 		//Remove choice from possibilities array to prevent repetitions
// 		for (let i = 0; i < possibilities.length; i++){
// 		   	if (possibilities[i] === choice) {
// 		   		possibilities.splice(i, 1);
// 		  	}
// 		}

// 		//Add string to paragraph
// 		paragraph1 = paragraph1 + string + " ";
// 	}

// 	//**//PARAGRAPH 2 - SETTING CHARACTERIZATION//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph2 = parseScenario("setting_character")
// 				   + " "
// 				   + parseScenario("setting_actionMurder")
// 				   + setOptionalContent(scenarioLength, "setting_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 3 - TRIGGER START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph3 = parseScenario("triggerStart_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 4 - TRIGGER//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph4 = parseScenario("trigger_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "trigger_actionMurderSilentOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 5 - TRIGGER END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph5 = parseScenario("triggerEnd_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 6 - RISING ACTION #1 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph6 = parseScenario("rising1start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 7 - RISING ACTION #1//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph7 = parseScenario("rising1_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "rising1_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 8 - RISING ACTION #1 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph8 = parseScenario("rising1end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 9 - RISING ACTION #2 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph9 = parseScenario("rising2start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 10 - RISING ACTION #2//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph10 = parseScenario("rising2_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "rising2_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 11 - RISING ACTION #2 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph11 = parseScenario("rising2end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 12 - RISING ACTION #3 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph12 = parseScenario("rising3start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 13 - RISING ACTION #3//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph13 = parseScenario("rising3_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "rising3_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 14 - RISING ACTION #3 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph14 = parseScenario("rising3end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 15 - CLIMAX START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph15 = parseScenario("climaxStart_actionMurderSilent")
// 				    + setOptionalContent(scenarioLength, "climax_actionMurderSilentOptionalSpeech1")
// 				    + setOptionalContent(scenarioLength, "climax_actionMurderSilentOptionalSpeech2")
// 				    + setOptionalContent(scenarioLength, "climax_actionMurderSilentOptionalSpeech3");
// 	}

// 	//**//PARAGRAPH 16 - CLIMAX//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph16 = parseScenario("climax_actionMurderSilent")
// 					+ setOptionalContent(scenarioLength, "climax_actionMurderSilentOptionalSpeech4");
// 	}

// 	//**//PARAGRAPH 17 - CLIMAX END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph17 = parseScenario("climaxEnd_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 18 - FALLING ACTION #1 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph18 = parseScenario("falling1start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 19 - FALLING ACTION #1//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph19 = parseScenario("falling1_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "falling1_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 20 - FALLING ACTION #1 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph20 = parseScenario("falling1end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 21 - FALLING ACTION #2 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph21 = parseScenario("falling2start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 22 - FALLING ACTION #2//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph22 = parseScenario("falling2_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "falling2_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 23 - FALLING ACTION #2 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph23 = parseScenario("falling3end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 24 - FALLING ACTION #3 START//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph24 = parseScenario("falling3start_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 25 - FALLING ACTION #3//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph25 = parseScenario("falling3_actionMurderSilent")
// 				   + setOptionalContent(scenarioLength, "falling3_actionMurderOptionalSpeech");
// 	}

// 	//**//PARAGRAPH 26 - FALLING ACTION #3 END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		paragraph26 = parseScenario("falling3end_actionMurderSilent");
// 	}

// 	//**//PARAGRAPH 27 - RESOLUTION//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		if (scenarioResolutionType === "Protagonist") {
// 			paragraph27 = parseScenario("resolutionStart_actionMurderSilentProtagonistWin")
// 						+ setOptionalContent(scenarioLength, "resolution_actionMurderSilentProtagonistWinOptionalSpeech");
// 		} else if (scenarioResolutionType === "Antagonist") {
// 			paragraph27 = parseScenario("resolutionStart_actionMurderSilentProtagonistLoss")
// 						+ setOptionalContent(scenarioLength, "resolution_actionMurderSilentProtagonistLossOptionalSpeech");
// 		}
// 	}

// 	//**//PARAGRAPH 28 - RESOLUTION END//**//
// 	if (scenarioInfo === "actionMurderSilent") {
// 		if (scenarioResolutionType === "Protagonist") {
// 			paragraph28 = parseScenario("resolutionEnd_actionMurderSilentProtagonistWin");
// 		} else if (scenarioResolutionType === "Antagonist") {
// 			paragraph28 = parseScenario("resolutionEnd_actionMurderSilentProtagonistLoss");
// 		}
// 	}

// 	//**//PARAGRAPH 29 - CRITICS//**//
// 	if (critics === "Acclaimed") {
// 		paragraph29 = `CRITICS\n\n` + parseScenario("criticsGood");
// 	} else if (critics === "Badly") {
// 		paragraph29 = `CRITICS\n\n` + parseScenario("criticsBad");
// 	}

// 	//**//FINAL TEXT//**//
// 	var content = paragraph1 + "\n\n" + paragraph2
// 	+ "\n\n" + paragraph3 + "\n\n" + paragraph4
// 	+ "\n\n" + paragraph5 + "\n\n" + paragraph6
// 	+ "\n\n" + paragraph7 + "\n\n" + paragraph8
// 	+ "\n\n" + paragraph9 + "\n\n" + paragraph10
// 	+ "\n\n" + paragraph11 + "\n\n" + paragraph12
// 	+ "\n\n" + paragraph13 + "\n\n" + paragraph14
// 	+ "\n\n" + paragraph15 + "\n\n" + paragraph16
// 	+ "\n\n" + paragraph17 + "\n\n" + paragraph18
// 	+ "\n\n" + paragraph19 + "\n\n" + paragraph20
// 	+ "\n\n" + paragraph21 + "\n\n" + paragraph22
// 	+ "\n\n" + paragraph23 + "\n\n" + paragraph24
// 	+ "\n\n" + paragraph25 + "\n\n" + paragraph26
// 	+ "\n\n" + paragraph27 + "\n\n" + paragraph28
// 	+ "\n\n" + paragraph29;

// 	//**//DISPLAY RESULT WINDOW//**//

