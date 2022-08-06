/*///////////////////////////////////////////////////////////////////////////*/
/* QuickAnimations.js - Quick CSS and scripted JavaScript animations library */
/*///////////////////////////////////////////////////////////////////////////*/

//**//DEFAULT SETTINGS//**//
const defaultDuration = "0.5";
const defaultInterpolation = "ease-in-out";

/*///////////////////////////////////////*/
/*/qanim_fade.js - simple opacity change/*/
/*///////////////////////////////////////*/
function qanim_fadeIn(element, duration, interpolation) {
	if (!duration) {
		duration = defaultDuration;
	}
	if (!interpolation) {
		interpolation = defaultInterpolation;
	}
	element.style.transition += `opacity ${duration}s ${interpolation}`;
	element.style.display = "block";
	element.style.opacity = 1;
}
function qanim_fadeOut(element, duration, interpolation) {
	if (!duration) {
		duration = defaultDuration;
	}
	if (!interpolation) {
		interpolation = defaultInterpolation;
	}
	element.style.transition += `opacity ${duration}s ${interpolation}`;
	element.style.opacity = 0;
	setTimeout(function () {
		element.style.display = "none";
	}, duration);
}

function qanim_switchVisible(element1, element2, simultaneous, duration, interpolation) {
	if (!duration) {
		duration = defaultDuration;
	}

	if (!interpolation) {
		interpolation = defaultInterpolation;
	}
	if (element1.constructor == String) {
		element1 = document.getElementById(element1);
	}
	if (element2.constructor == String) {
		element2 = document.getElementById(element2);
	}

	element1.style.transition = `opacity ${duration}s ${interpolation}`;
	console.log(`opacity ${duration}s ${interpolation}`)
	element2.style.transition = `opacity ${duration}s ${interpolation}`;

	duration = parseFloat(duration) * 100;

	if (simultaneous) {
		if (element1.style.opacity == 0 || element1.style.display == "none") {
			element2.style.opacity = 0;
			element1.style.display = "block";
			element1.style.opacity = 1;
			setTimeout(function () {
				element2.style.display = "none";
			}, duration);
		} else {
			element1.style.opacity = 0;
			element2.style.display = "block";
			element2.style.opacity = 1;
			setTimeout(function () {
				element1.style.display = "none";
			}, duration);
		}
	} else {
		if (element1.style.opacity == 0 || element1.style.display == "none") {
			element2.style.opacity = 0;
			element1.style.display = "block";
			setTimeout(function () {
				element1.style.opacity = 1;
				element2.style.display = "none";
			}, duration);
		} else {
			element1.style.opacity = 0;
			element2.style.display = "block";
			setTimeout(function () {
				element2.style.opacity = 1;
				element1.style.display = "none";
			}, duration);
		}
	}
}