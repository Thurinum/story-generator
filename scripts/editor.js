document.getElementById("shortStory-editorButton").onclick = function () {
	document.getElementById("shortStory-scenarioSelection").style.transform = "scale(1.1)";
	document.getElementById("shortStory-scenarioSelection").style.opacity = "0";
	document.getElementById("shortStory-scenarioSelection").style.zIndex = "-1000";
	document.getElementById("shortStory-editor").style.transform = "scale(1.0) ";
	document.getElementById("shortStory-editor").style.opacity = "1";
	document.getElementById("shortStory-editor").style.zIndex = "10";

	document.getElementById("editor-startEditing").onclick = function () {
		document.getElementById("shortStory-editor").innerHTML = `
		<div id="shortStory-editorPanel"></div>
		<textarea id="shortStory-editorTextarea"></textarea>`;
	}
};

//**//GENERATES A GRAPHICAL REPRESENTATION OF AN XML FILE//**//
function ui_updateXMLstructure() {
	//Utility functions
	function createDetails(header) {
		let details = document.createElement("details");
		let summary = document.createElement("summary");
		summary.innerHTML = header;
		details.append(summary);

		return details;
	}

	function createLabel(header, type) {
		var label = document.createElement("div");
		label.innerHTML = header;
		label.setAttribute("class", "editor_label");
		label.addEventListener("click", function () {
			labelAction(type);
		});

		return label;
	}

	//User interface
	xml.reset();
	xml.select("interface");
	var uiDropdown = createDetails("User Interface");
	var children = currentTag.children;

	for (var i = 0; i < children.length; i++) {
		let label = createLabel(children[i].getAttribute("name"), "ui");
		label.setAttribute("data_type", children[i].getAttribute("type"));
		label.setAttribute("data_placeholder", children[i].innerHTML);

		uiDropdown.append(label);
	}

	//Scenario content
	xml.reset();
	xml.select("scenario");

	var scenarioDropdown = createDetails(`${currentTag.getAttribute("name")} scenario`);
	children = currentTag.children;

	for (var i = 0; i < children.length; i++) {
		if (children[i].nodeName !== "plotline") {
			let label = createLabel(children[i].getAttribute("name"), children[i].nodeName);
			label.setAttribute("content", children[i].outerHTML);
			label.innerHTML = children[i].nodeName;

			scenarioDropdown.append(label);
		} else {
			var plotlineDropdown = createDetails(`${children[i].getAttribute("name")} plotline`);
			xml.select("plotline", "name", children[i].getAttribute("name"))
			children = currentTag.children;

			scenarioDropdown.append(plotlineDropdown);

			for (var i = 0; i < children.length; i++) {
				if (children[i].nodeName !== "variant") {
					let label = createLabel(children[i].getAttribute("name"), children[i].nodeName);
					label.setAttribute("content", children[i].outerHTML);
					label.innerHTML = children[i].nodeName;

					plotlineDropdown.append(label);
				} else {
					var variantDropdown = createDetails(`${children[i].getAttribute("name")} variant`);
					xml.select("variant", "name", children[i].getAttribute("name"))
					children = currentTag.children;

					plotlineDropdown.append(variantDropdown);

					for (var i = 0; i < children.length; i++) {
						if (children[i].nodeName !== "paragraph") {
							let label = createLabel(children[i].getAttribute("name"), children[i].nodeName);
							label.setAttribute("content", children[i].outerHTML);
							label.innerHTML = children[i].nodeName;

							variantDropdown.append(label);
						} else {
							var paragraphDropdown = createDetails(`paragraph`);

							variantDropdown.append(paragraphDropdown);
						}
					}
				}
			}
		}
	}

	document.body.innerHTML = "";
	document.body.append(uiDropdown);
	document.body.append(scenarioDropdown);
};