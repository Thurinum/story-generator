"use strict";

// TODO: get rid of useless globals
const UI_SCENARIO_SELECTION = $("#scnSelect");
const UI_SCENARIO_SETTINGS = $("#scnSettings");
const UI_SCENARIO_VARIABLES = $("#scnVariables");
let currentUi = undefined;
let canGenerate = true;

let xmlCache = $("#xmlCache");
let propertiesCache = [];
let valuesCache = [];
let gendersCache = [];

/**
 * Lazy jquery-like wrapper to alleviate element query syntax.
 * We don't actually use jquery!
 *
 * @param {string} sel - The selector
 * @return {HTMLElement} 
 */
 function $(sel) {
	return document.querySelector(sel);
}

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
 * Display a notification banner with a message.
 *
 * @param {string} msg
 */
 function notify(msg) {
	let banner = $("#notificationsBanner");

	banner.textContent = msg;
	banner.style.top = 0;

	setTimeout(() => {
		banner.style.top = "-70px";
	}, 4500);
}

/**
 * Gets a random child of a given tag, if it exists.
 *
 * @param {HTMLElement} tag
 * @return {HTMLElement} - If the tag has children, a random element, otherwise NULL.
 */
function randomChildOf(tag) {
	if (tag.childElementCount === 0)
		return null;

	const max = tag.childElementCount - 1;
	const random = Math.random();

	return tag.children[Math.trunc(random * max + 0.5)];
}

/**
 * Gets a random number using some abstruse old logic.
 *
 * @param {number} min
 * @param {number} max
 * @param {number} [round=0]
 * @return {number} 
 */
function randomNumber(min, max, round = 0) {
	const random = Math.random();

	min = parseInt(min);
	max = parseInt(max);
	round = parseInt(round);

	const base = min + ((max - min) * random);
		
	return round === 0 ? Math.round(base) : base.toFixed(round);
}

/**
 * Converts the first letter of a string to upper case.
 * 
 * @param {string} string
 * @return {string} 
 */
 function toTitleCase(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Detects whether an expression is a gerund.
 *
 * @param {string} string
 * @return {boolean}
 */
 function detectGerund(string) {
	const index = string.indexOf(" ");

	return index == -1
		? string.slice(-3) == "ing"
		: string.slice(0, -(string.length - index)).slice(-3) == "ing";
}