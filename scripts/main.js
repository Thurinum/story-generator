"use strict";

// main menu reveal animation
window.onload = function () {
	setTimeout(function () {
		$("#mainMenuTitle").style.opacity = 1;
		$("#mainMenuTitle").style.transform = "none";

		setTimeout(function () {
			$("#mainMenuSubtitle").style.opacity = 1;
			$("#mainMenuSubtitle").style.transform = "none";

			setTimeout(function () {
				$("#mainMenu-startBtn").style.opacity = 1;
				$("#mainMenu-startBtn").style.transform = "translate(0, 0)";
			}, 500);
		}, 500);
	}, 400);
}

// main menu start button
$("#mainMenu-startBtn").addEventListener("click", function () {
	$("#mainInterface").style.display = "block";
	$("#mainMenu").style.transform = "translate(-50%, -50%) scale(1.5)";
	$("#mainMenu").style.opacity = 0;

	setTimeout(function () {
		switchToUi(UI_SCENARIO_SELECTION);
		$("#mainInterface").style.opacity = 1;

		$("#mainInterface").style.transform = "scale(1) translate(-50%, -50%)";
	}, 500);
});

// select menu choose button
$("#scnSelect-chooseBtn").onclick = function () {
	loadScenario("epic_duel"); // TODO parametrize
}

// options menu continue button
$("#scnSettings-startBtn").onclick = function() {
	if (!$("#scnSettings-form").checkValidity()) {
		notify("Please make sure all fields are filled and valid!")
		return;
	}
	
	populateUserInputs();
};

// download button
$("#scnDisplay-downloadBtn").onclick = function () {
	const link = document.createElement("a");
	link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent($("#scnDisplay-bookPageRightContent").innerHTML));
	link.setAttribute('download', `${xml.metadata["title"]} by ${xml.metadata["author"]}.txt`); // TODO sanitize

	link.style.display = 'none';
	document.body.appendChild(link);

	link.click();
	document.body.removeChild(link);
}