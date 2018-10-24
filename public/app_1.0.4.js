// Author: Kyle Workman 
// * Built based off the Dispatch Aces Android App
//   designed by Tyler May, Kevin Barbian, Megan Janssen, Tan Nguyen.
// Description: Augustana Aces Dispatcher Application
// for managing the Aces uber system accross campus. 

// Global Variables
var mainDiv = document.createElement("div");
var topDiv = document.createElement("div");
var botDiv = document.createElement("div");
var options = ["white ACES vehicle", "tan medical car", "#26 ACES van"]; //Example
var employees = [];
var locations = [];
var logSize = 50;
var logs = [];
var map;
var markers = [];
var startLocation = "";
var endLocation = "";
var sound;
var estimatedWT = 0;
var timer = setInterval(startTimer, 60000);
var geocoder;

// Wait for page to finish loading.
document.addEventListener("DOMContentLoaded", event => {
	const app = firebase.app();
});

// Login with google via a pop-up window.
function googleLogin() {
	const provider = new firebase.auth.GoogleAuthProvider();
	firebase.auth().signInWithPopup(provider)
			.then(result => {
				const user = result.user;
				afterLogin(user);
			})
			.catch(console.log)	
}

// Check that the user is a dispatcher.
function afterLogin(user) {
	const email = user.email;
	if (email === "kyleworkman15@augustana.edu" || email === "csc490teama@augustana.edu" || email === "acesdispatcher@augustana.edu") {
		correctLogin();
	} else {
		alert("Sorry, you must be a dispatcher.");
	}
}

// Build the web page using the firebase data.
function correctLogin() {
	var ref = firebase.database().ref();

	removePreviousComponents();
	document.body.appendChild(mainDiv);
	mainDiv.setAttribute("class", "container");
	mainDiv.appendChild(topDiv);
	mainDiv.appendChild(botDiv);
	topDiv.setAttribute("class", "topChild");
	botDiv.setAttribute("class", "botChild");
	buildText();

	var right = document.createElement("div");
	right.setAttribute("id", "right");
	var left = document.createElement("div");
	left.setAttribute("id", "left");
	var log = document.createElement("div");
	log.setAttribute("id", "log");

	// construct the three columns
	var row = document.createElement("div");
	row.setAttribute("class", "row");
	left.setAttribute("class", "column1");
	right.setAttribute("class", "column1");
	log.setAttribute("class", "column1");
	row.appendChild(left);
	row.appendChild(right);
	row.appendChild(log);

	var mapDiv = initMap();

	constructExportEdit(ref, row, right, left, logs, log, mapDiv);
	constructAddRide(ref, mainDiv);
	botDiv.appendChild(row);
	
	var database = constructLocationDatabase();

	addHeaders(left, right, log);

	getWaitTime(ref);
	constructEmployeesListener(ref);
	constructPendingRides(ref, left, logs, log);
	constructActiveRides(ref, right, logs, log, left);
	constructVehicleListener(ref);
	constructLocationsListener(ref);
	sound = new sound("Ping-sound.mp3");
}

function getWaitTime(ref) {
	var estimatedWTRef = ref.child("EST WAIT TIME");
	estimatedWTRef.on("value", function(snapshot) {
		estimatedWT = Number(snapshot.child("estimatedWT").val());
		if (estimatedWT != -1) {
			document.getElementById("estimatedWTLbl").innerHTML = "<b>Estimated Wait Time Sent to Users: " + estimatedWT + " min. </b>"
		} else {
			document.getElementById("estimatedWTLbl").innerHTML = "<b>Estimated Wait Time Sent to Users: - min. </b>";
		}
	});
}

//
function addHeaders(left, right, log) {
	var pendingHeader = document.createElement("p");
	pendingHeader.innerHTML = "<h2>Pending Rides: (Ordered by Arrival)</h2><br>";
	pendingHeader.setAttribute("class", "middle");
	left.appendChild(pendingHeader);
	var activeHeader = document.createElement("p");
	activeHeader.innerHTML = "<h2>Active Rides: (Ordered by ETA)</h2><br>";
	activeHeader.setAttribute("class", "middle");
	right.appendChild(activeHeader);
	var logHeader = document.createElement("p");
	logHeader.innerHTML = "<h2>Log:</h2></br>";
	logHeader.setAttribute("class", "middle");
	log.appendChild(logHeader);
}

//IN PROGRESS
function constructVehicleListener(ref) {
	var vehicleRef = ref.child("VEHICLES");
	vehicleRef.on("value", function(snapshot) {
		options = [];
		snapshot.forEach(function(child) {
			options.push(child.val());
		});
	});
}

function constructEmployeesListener(ref) {
	var employeesRef = ref.child("EMPLOYEES");
	employeesRef.on("value", function(snapshot) {
		employees = [];
		snapshot.forEach(function(child) {
			employees.push(child.val());
		});
	});
}

function constructLocationsListener(ref) {
	var locationsRef = ref.child("LOCATIONS");
	locationsRef.on("value", function(snapshot) {
		locations = [];
		snapshot.forEach(function(child) {
			locations.push([child.child("name").val(), child.child("address").val(), child.child("lat").val(), child.child("long").val()]);
		});
	});
}

// Removes components from the login screen.
function removePreviousComponents() {
	document.getElementById("div").remove();
	document.getElementById("button").remove();
	document.getElementById("link").remove();
}

// Adds the text for the title and status indicator.
function buildText() {
	var title = document.createElement("p");
	topDiv.appendChild(title);
	title.innerHTML = "<h1>Aces Dispatcher App</h1>";
	title.style.textAlign = "left";
	title.style.cssFloat = "left";
	title.style.marginBottom = "0%";
	title.style.marginRight = "0%";
}

// Constructs the status indicator button to toggle the Aces service
// on and off.
// Parameters: ref - reference to the firebase database
function constructStatus(ref, div) {
	var statusText = document.createElement("b");
	statusText.innerHTML = "<h3>Status: </h3>";
	div.appendChild(statusText);
	var status = document.createElement("BUTTON");
	status.addEventListener("click", function() { toggleStatus(ref); });
	div.appendChild(status);
	var flagRef = ref.child("STATUS");
	flagRef.on("value", function(snapshot) {
		if(snapshot.val().FLAG === "ON") {
			status.innerHTML = "ONLINE";
			status.style.background = "#008000";
		} else {
			status.innerHTML = "OFFLINE";
			status.style.background = "#ff0000";
		}
	});
}

// Toggles the status of the database on and off.
// Parameters: ref - reference to the firebase database
function toggleStatus(ref) {
	var flagRef = ref.child("STATUS");
	flagRef.once("value", function(snapshot) {
		if (snapshot.val().FLAG === "ON") {
			var message = prompt("Custom status message (leave blank and press 'OK' for no custom status message):", "");
			if (message != null) {
				if (message === "") {
					message = "";
				} else {
					var date = new Date()
					stringDate = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + calculateETA(0)
					message = stringDate + "\n" + message
				}
				flagRef.update({"MESSAGE" : message});
				flagRef.update({"FLAG" : "OFF"});
			} //else do not turn off
		} else {
			flagRef.update({"FLAG" : "ON"});
			flagRef.update({"MESSAGE" : ""});
		}
	});
}

// Constructs the buttons needed for exporting data editing vehicles.
// Parameters: ref - reference to the firebase database
function constructExportEdit(ref, row, right, left, logs, log, mapDiv) {
	var div = document.createElement("div");
	div.style.textAlign = "right";
	var estimatedWTLbl = document.createElement("p");
	estimatedWTLbl.setAttribute("id", "estimatedWTLbl");
	estimatedWTLbl.innerHTML = "<b>Estimated Wait Time Sent to Users: - min. </b>";
	var finish = document.createElement("BUTTON");
	finish.innerHTML = "Finish session and download spreadsheet";
	finish.style.cssFloat = "center";
	finish.addEventListener("click", function() { exportAction(ref) });
	topDiv.appendChild(div);
	var editVehicles = document.createElement("BUTTON");
	editVehicles.innerHTML = "Edit Vehicles";
	editVehicles.style.cssFloat = "center";
	editVehicles.addEventListener("click", function() { editVehiclesAction(ref) });
	var editEmp = document.createElement("BUTTON");
	editEmp.innerHTML = "Edit Employees";
	editEmp.style.cssFloat = "center";
	editEmp.addEventListener("click", function() { editEmpAction(ref) });
	var editLocations = document.createElement("BUTTON");
	editLocations.innerHTML = "Edit Locations";
	editLocations.style.cssFloat = "center";
	editLocations.addEventListener("click", function() { editLocationsAction(ref) })
	div.appendChild(document.createElement("p"));
	div.appendChild(finish);
	div.appendChild(document.createTextNode(" "));
	div.appendChild(editEmp);
	div.appendChild(document.createTextNode(" "));
	div.appendChild(editVehicles);
	div.appendChild(document.createTextNode(" "));
	div.appendChild(editLocations);
	var switcher = document.createElement("BUTTON");
	switcher.disabled = true;
	switcher.innerHTML = "Map View";
	switcher.addEventListener("click", function() { switchView(switcher, ref, row, right, left, logs, log, mapDiv) });
	div.appendChild(document.createTextNode(" "));
	div.appendChild(switcher);
	div.appendChild(document.createTextNode(" "));
	constructStatus(ref, div);
	div.appendChild(estimatedWTLbl);
}

//
function switchView(switcher, ref, row, right, left, logs, log, mapDiv) {
	if (switcher.innerHTML === "Map View") {
		switcher.innerHTML = "List View";
		console.log("switching to map");
		// Hide List
		right.innerHTML = "";
		left.innerHTML = "";
		log.innerHTML = "";
		right.remove();
		left.remove();
		log.remove();
		row.remove();
		// Show Map
		botDiv.appendChild(mapDiv);
		constructPendingRides(ref, left, logs, log);
	} else {
		switcher.innerHTML = "Map View";
		console.log("switching to list");
		// Hide Map
		mapDiv.remove();
		var augieCoords = {lat: 41.505199, lng: -90.550674};
		map.setZoom(15);
		map.setCenter(augieCoords);
		for (var i = 0; i < markers.length; i ++) {
			markers[i].setMap(null);
		}
		// Show List
		row.appendChild(left);
		row.appendChild(right);
		row.appendChild(log);
		botDiv.appendChild(row);
		addHeaders(left, right, log);
		ref.child("PENDING RIDES").once("value", function(snapshot) {
			snapshot.forEach(function(child) {
				var output = "";
				var email = child.child("email").val();
				output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
				"<b>Time: </b>"+child.child("time").val() + "<br>" +
				"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
				"<b>Start: </b>"+child.child("start").val() + "<br>" +
				"<b>End: </b>"+child.child("end").val();
				var div = createTextAndButtons(output, email, ref.child("PENDING RIDES"), "pending", child.child("eta").val());
				if (child.child("token").val() != ",") {
					var para = document.createTextNode(" (Via App)");
					div.appendChild(para);
				}
				left.appendChild(div);
			});
		});
		ref.child("ACTIVE RIDES").once("value", function(snapshot) {
			snapshot.forEach(function(child) {
				var output = "";
				var email = child.child("email").val();
				output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
				"<b>Time: </b>"+child.child("time").val() + "<br>" +
				"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
				"<b>Start: </b>"+child.child("start").val() + "<br>" +
				"<b>End: </b>"+child.child("end").val() + "<br>" +
				"<b>Current Wait Time: </b>"+child.child("waitTime").val() + "<br>" +
				"<b>ETA: </b>"+child.child("eta").val();
				var vehicle = child.child("vehicle").val();
				if (vehicle != " ") {
					output = output + "<br><b>Vehicle: </b>"+vehicle;
				}
				var div = createTextAndButtons(output, email, ref.child("ACTIVE RIDES"), "active", child.child("eta").val());
				var notify = document.createElement("BUTTON");
				notify.innerHTML = "Notify";
				notify.addEventListener("click", function() { notifyAction(ref, email, vehicle) });
				div.appendChild(notify);
				if (child.child("token").val() != ",") {
					var para = document.createTextNode(" (Via App)");
					div.appendChild(para);
				}
				$(div).data('ts', child.child("etaTimestamp").val());
				var isInserted = false;
				rides = right.getElementsByTagName('div');
				for (var i = 0; i < rides.length; i++) {
					var ride = rides[i];
					if ($(ride).data('ts') > $(div).data('ts')) {
						right.insertBefore(div, ride);
						isInserted = true;
						i = rides.length;
					}
				} if (!isInserted) {
					right.appendChild(div);
				}
			});
		});
		drawLogs(logs, log);
	}
}

function initMap() {
	var mapDiv = document.createElement("div");
	mapDiv.setAttribute("class", "map");
	var augieCoords = {lat: 41.505199, lng: -90.550674};
	map = new google.maps.Map(mapDiv, {zoom: 15, center: augieCoords});
	geocoder = new google.maps.Geocoder();
	return mapDiv;
}

// Method for handeling the export to CSV file when the button is clicked.
// Parameters: ref - reference to the firebase database
function exportAction(ref) {
	var completed = ref.child("COMPLETED RIDES");
	var cancelled = ref.child("CANCELLED RIDES");
	exportMove(completed, "COMPLETED");
	exportMove(cancelled, "CANCELLED");
	cleanUp(ref);
}

// Clean database, anything older than 90 days
function cleanUp(ref) {
	var cutoff = new Date().getTime() - 7776000000; //7776000000 is 90 days in milliseconds
	var oldCancelled = ref.child("ARCHIVED").child("CANCELLED").orderByChild("timestamp").endAt(cutoff);
	var oldCompleted = ref.child("ARCHIVED").child("COMPLETED").orderByChild("timestamp").endAt(cutoff);
	oldCancelled.once("value", function(snapshot) {
		snapshot.forEach(function(child) {
			console.log(child);
			child.getRef().remove();
		});
	});
	oldCompleted.once("value", function(snapshot) {
		snapshot.forEach(function(child) {
			console.log(child);
			child.getRef().remove();
		});
	});
}

// Method for moving the completed/cancelled rides to archived.
// Parameters: ref - reference to the firebase database (completed or cancelled)
// 			   type - string to determine which type to construct new tree under
function exportMove(ref, type) {
	ref.once("value", function(snapshot) {
		var archived = firebase.database().ref().child("ARCHIVED").child(type);
		var data = new Array(snapshot.numChildren());
		var index = 0;
		snapshot.forEach(function(child) {
			var values = child.val();
			data[index] = new Array(values.email, values.start, values.end, values.numRiders, values.time, values.waitTime, values.eta, values.endTime, values.vehicle);
			archived.child(data[index][0] + "_" + values.timestamp).set({ 
				email: data[index][0],
				end: data[index][2], 
				endTime: data[index][7],
				eta: data[index][6],
				numRiders: data[index][3],
				start: data[index][1],
				time: data[index][4],
				timestamp: values.timestamp,
				waitTime: data[index][5],
				vehicle: data[index][8],
			});
			ref.child(data[index][0]).remove();
			index++;
		});
		ref.remove();
		exportToCSV(data, type);
	});
}

// Method for exporting the completed/cancelled rides to a CSV file.
// Parameters: data - the data as a 2D array to be exported to a CSV
//     	 	   type - string to determine which type of rides (completed or cancelled)
function exportToCSV(data, type) {
	let csvContent = "data:text/csv;charset=utf-8,Email,Start,End,Number of Riders,Time,Wait Time,ETA,End Time,Vehicle\r\n";
	data.forEach(function(rowArray) {
		rowArray[0] = rowArray[0].replace(",", ".");
		csvContent += rowArray.join(",") + "\r\n";
	});
	var encodedUri = encodeURI(csvContent);
	var link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	var date = new Date();
	var dateString = date.getMonth() + "-" + date.getDay() + "-" + date.getFullYear() + "_" + calculateETA(0)
	link.setAttribute("download", type + "_" + dateString + ".csv");
	mainDiv.appendChild(link);
	link.click();
}

// Constructs the fields and buttons needed for adding a ride manually.
// Parameters: ref - reference to the firebase database
function constructAddRide(ref, mainDiv) {
	var div = document.createElement("div");
	div.style.textAlign = "center";
	div.style.alignContent = "left";
	var title = document.createElement("p");
	title.innerHTML = "<h2>Add a ride:</h2>";
	title.style.cssFloat = "center";
	div.appendChild(title);
	var texts = ["Email: ", "Start: ", "End: ", "Number of Riders: "];
	var fields = [];
	var addRide = document.createElement("BUTTON");
	texts.forEach(element => {
		div.appendChild(document.createTextNode(element));
		var field = document.createElement("INPUT");
		field.setAttribute("type", "text");
		field.addEventListener("keyup", function(event){ enterAction(event, addRide) });
		div.appendChild(field);
		div.appendChild(document.createTextNode(" "));
		fields.push(field);
	});
	fields[0].setAttribute("size", "30");
	fields[3].setAttribute("size", "2");
	fields[0].setAttribute("placeholder", "@augustana.edu");
	fields[0].addEventListener("blur", function() { append(fields) });
	fields[1].setAttribute("id", "start");
	fields[2].setAttribute("id", "end");
	addRide.innerHTML = "Add Ride";
	addRide.addEventListener("click", function() { addRideAction(ref, fields, mainDiv) });
	div.appendChild(addRide);
	topDiv.appendChild(div);
}

function append(fields) {
	var value = fields[0].value + "";	
	if (!value.includes("@augustana.edu") && value != "") {
		fields[0].value = value + "@augustana.edu";
	}
}

// Method for handeling the enter action when the enter key is pressed.
// Parameters: button - the button to be clicked when the enter key is pressed
function enterAction(event, button) {
	event.preventDefault();
	if (event.keyCode === 13) { 
		document.activeElement.blur();
		button.click();
	}
}

// Method for handeling the add ride action from the add ride button.
// Parameters: ref - reference to the firebase database
// 			   fields - array of text fields
function addRideAction(ref, fields, mainDiv) {
	if (fields[0].value != "" && fields[1].value != "" && fields[2].value != "" && fields[3].value != "") {
		var email = fields[0].value.replace(".", ",");
		if (!mainDiv.contains(document.getElementById(email))) {
			var pendingRidesRef = ref.child("PENDING RIDES");
			var date = new Date();
			pendingRidesRef.child(email).set({ 
				email: email,
				end: fields[2].value.replace(".", ""),
				endTime: " ",
				eta: " ",
				numRiders: fields[3].value,
				start: fields[1].value.replace(".", ""),
				time: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + calculateETA(0),
				timestamp: date.getTime(),
				waitTime: 1000,
				token: ",",
				vehicle: " ",
			});
			clearFields(fields);
		} else {
			alert(email.replace("@augustana,edu", "") + " already has a requested ride.");
		}
	} else {
		alert("Please fill out all the fields when adding a ride.");
	}
}

// Clears all the text fields for adding a ride.
// Parameters: fields - array of text fields
function clearFields(fields) {
	fields.forEach(element => {
		element.value = "";
	});
	fields[0].focus();
}

// Constructs the list of pending rides including the text,
// input text field, and the buttons.
// Parameters: ref - reference to the firebase database
// 			   column - the div object to display the pending rides in
//			   logs - the array of logs to be displayed
//			   log - the div object to display the log
function constructPendingRides(ref, column, logs, log) {
	var pendingRidesRef = ref.child("PENDING RIDES");
	pendingRidesRef.orderByChild("timestamp").on("value", function(snapshot) { 
		if (column.innerHTML != "") {
			snapshot.forEach(function(child) {
				var output = "";
				var email = child.child("email").val();
				var endTime = child.child("endTime").val();
				var waitTime = child.child("waitTime").val();
				if (endTime == "Cancelled by Dispatcher") {
					document.getElementById(email).remove();
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by Dispatcher");
					drawLogs(logs, log);
				} else if (endTime == "Cancelled by User") {
					document.getElementById(email).remove();
					logs.push("<span class=user>" + "- " + calculateETA(0) +  ": " + email.replace(",", ".") + " - Cancelled by User</span>");
					drawLogs(logs, log);
				} else if (waitTime != null) {
					if (waitTime != 1000) {
						document.getElementById(email).remove();
					} else if (!column.contains(document.getElementById(email))) {
						var email = child.child("email").val();
						output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
						"<b>Time: </b>"+child.child("time").val() + "<br>" +
						"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
						"<b>Start: </b>"+child.child("start").val() + "<br>" +
						"<b>End: </b>"+child.child("end").val();
						var div = createTextAndButtons(output, email, pendingRidesRef, "pending", child.child("eta").val());
						if (child.child("token").val() != ",") {
							sound.play();
							var para = document.createTextNode(" (Via App)");
							div.appendChild(para);
						}
						column.appendChild(div);
					}
				} 
			});
		} else {
			snapshot.forEach(function(child) {
				var email = child.child("email").val();
				var endTime = child.child("endTime").val();
				if (endTime == "Cancelled by Dispatcher") {
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by Dispatcher");
				} else if (endTime == "Cancelled by User") {
					logs.push("<span class=user>" + "- " + calculateETA(0) +  ": " + email.replace(",", ".") + " - Cancelled by User</span>");
				}
				var startCoords = {lat: child.child("startLat").val(), lng: child.child("startLong").val()};
				var markerStart = new google.maps.Marker({position: startCoords, map: map, icon: {
					url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
				  }});
				var endCoords = {lat: child.child("endLat").val(), lng: child.child("endLong").val()};
				var markerEnd = new google.maps.Marker({position: endCoords, map: map, icon: {
					url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
				  }});
				markers.push(markerStart);
				markers.push(markerEnd);
			});
		}
	});
}

// Constructs the list of active rides including the text,
// input text field, and the buttons.
// Parameters: ref - reference to the firebase database
// 			   column - the div object to display the active rides in
//			   logs - the array of logs to be displayed
//			   log - the div object to display the log
function constructActiveRides(ref, column, logs, log, pendingColumn) {
	var activeRidesRef = ref.child("ACTIVE RIDES");
	activeRidesRef.orderByChild("etaTimestamp").on("value", function(snapshot) {
		clearInterval(timer);
		var count = 0;
		if (column.innerHTML != "") {
			var numChildren = snapshot.numChildren();
			snapshot.forEach(function(child) {
				count = count + 1;
				var output = "";
				var email = child.child("email").val();
				var endTime = child.child("endTime").val();
				var vehicle = child.child("vehicle").val();
				if (endTime == "Cancelled by Dispatcher") {
					document.getElementById(email).remove();
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by Dispatcher");
					drawLogs(logs, log);
				} else if (endTime == "Cancelled by User") {
					document.getElementById(email).remove();
					logs.push("<span class=user>" + "- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by User</span>");
					drawLogs(logs, log);
				} else if (endTime != null && endTime.includes("M")) {
					document.getElementById(email).remove();
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Completed");
					drawLogs(logs, log);
				} else {
					if (child.child("waitTime").val() == "update" || child.child("eta").val() == "update") {
						document.getElementById(email).remove();
					} else if (!column.contains(document.getElementById(email))) {
						output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
						"<b>Time: </b>"+child.child("time").val() + "<br>" +
						"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
						"<b>Start: </b>"+child.child("start").val() + "<br>" +
						"<b>End: </b>"+child.child("end").val() + "<br>" +
						"<b>Current Wait Time: </b>"+child.child("waitTime").val() + "<br>" +
						"<b>ETA: </b>"+child.child("eta").val();
						var vehicle = child.child("vehicle").val();
						if (vehicle != " ") {
							output = output + "<br><b>Vehicle: </b>"+vehicle;
						}
						var div = createTextAndButtons(output, email, activeRidesRef, "active", child.child("eta").val());
						var notify = document.createElement("BUTTON");
						notify.innerHTML = "Notify";
						notify.addEventListener("click", function() { notifyAction(ref, email, vehicle) });
						div.appendChild(notify);
						if (child.child("token").val() != ",") {
							var para = document.createTextNode(" (Via App)");
							div.appendChild(para);
						}
						$(div).data('ts', child.child("etaTimestamp").val());
						var isInserted = false;
						rides = column.getElementsByTagName('div');
						for (var i = 0; i < rides.length; i++) {
							var ride = rides[i];
							if ($(ride).data('ts') > $(div).data('ts')) {
								column.insertBefore(div, ride);
								isInserted = true;
								i = rides.length;
							}
						} if (!isInserted) {
							column.appendChild(div);
						}
					}
				}
				if (count == numChildren) {
					var etaTS = child.child("etaTimestamp").val();
					var nowDate = new Date();
					var newWT = (Number(etaTS) - nowDate.getTime()) / 60000;
					estimatedWT =  Math.round(newWT) + 5;
					if (estimatedWT < 0) {
						estimatedWT = 5;
					}
					firebase.database().ref().child("EST WAIT TIME").update({"estimatedWT" : estimatedWT});
				}
			});
		} else {
			snapshot.forEach(function(child) {
				var email = child.child("email").val();
				var endTime = child.child("endTime").val();
				if (endTime == "Cancelled by Dispatcher") {
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by Dispatcher");
				} else if (endTime == "Cancelled by User") {
					logs.push("<span class=user>" + "- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by User</span>");
				} else if (endTime != null && endTime.includes("M")) {
					logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Completed");
				} 
			});
			//add pin to map
		}
		if (count == 0) {
			estimatedWT = 5;
			firebase.database().ref().child("EST WAIT TIME").update({"estimatedWT" : 5});
		}
		timer = setInterval(startTimer, 60000);
	});
}

function startTimer() {
// 	estimatedWT = estimatedWT - 1;
// 	if (estimatedWT <= 5) {
// 		estimatedWT = 5
// 		window.clearInterval(timer);
// 	} 
// 	firebase.database().ref().child("EST WAIT TIME").update({"estimatedWT" : estimatedWT});
}

// Creates the log
// Parameters: logs - the array of logs to be displayed
//			   column - the div object to be displayed in
function drawLogs(logs, column) {
	while(column.childElementCount > 1) {
		column.removeChild(column.lastChild);
	}
	var output = "";
	var size = logs.length;
	if (size > logSize) {
		logs.shift();
		size = size - 1;
	}
	for (var i = size - 1; i >= 0; --i) {
		output = output + logs[i] + "</br>";
	}
	var para = document.createElement("p");
	para.innerHTML = output;
	para.setAttribute("style", "background-color:rgb(238, 221, 255)");
	column.appendChild(para);
}

// Creates all of the text, text fields, and buttons needed for a single ride. 
// Parameters: output - text to be displayed
//			   email - current email of the ride
//			   ref - reference to the firebase tree (pending or active)
//			   type - string to determine if the ride is pending or active
//			   eta - eta to be checked for the complete button
function createTextAndButtons(output, email, ref, type, eta) {
	var div = document.createElement("div");
	var para = document.createElement("p");
	para.setAttribute("class", "nospace");
	var textField = document.createElement("INPUT");
	var updateButton = document.createElement("BUTTON");
	var completeButton = document.createElement("BUTTON");
	var cancelButton = document.createElement("BUTTON");
	para.innerHTML = output;
	textField.setAttribute("size", "2");
	textField.setAttribute("type", "text");
	updateButton.innerHTML = "Update";
	if (eta == "Picked Up") {
		completeButton.innerHTML = "Complete";
	} else {
		completeButton.innerHTML = "Picked Up";
	}
	cancelButton.innerHTML = "Cancel";
	textField.addEventListener("keyup", function(event){ enterAction(event, updateButton) });
	updateButton.addEventListener("click", function() { updateAction(email, ref, textField, completeButton) });
	completeButton.addEventListener("click", function() { completeAction(email, ref, completeButton) });
	cancelButton.addEventListener("click", function() { cancelAction(email, ref, type) });
	div.appendChild(para);
	div.appendChild(textField);
	div.appendChild(updateButton);
	div.appendChild(completeButton);
	div.appendChild(cancelButton);
	div.setAttribute("id", email);
	if (type === "pending") {
		completeButton.disabled = true;
		if (employees.includes(email.replace("@augustana,edu", ""))) {
			div.setAttribute("class", "employee");
		} else {
			div.setAttribute("class", "pending");
		}
	} else {
		if (employees.includes(email.replace("@augustana,edu", ""))) {
			div.setAttribute("class", "employee");
		} else {
			div.setAttribute("class", "active");
		}
	}
	return div;
}

// Notifies the user that their ride has arrived
// Parameters: ref - reference to the firebase tree (root)
//			   email - current email of the ride
function notifyAction(ref, email, vehicle) {
	var stringvar = '<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><p>Assign vehicle</p><select id="dropdown"></select><button id="edit" style="float: right;">Edit Vehicles</button><p class="nospace">Choose type of notification:</p></div></div></div>';
	var popUpList = $(stringvar);
	$(popUpList).dialog({
			title: 'Choose a Vehicle',
			width: 440,
			resizable: false,
			closeOnEscape: false,
			modal: true,
			autoOpen: false,
			buttons: [ { 
				text: "On The Way",
				click: function() {
					var user = ref.child("ACTIVE RIDES").child(email);
					user.once('value', function(snapshot) {
						if (snapshot.hasChildren()) {
							var token = snapshot.child("token").val();
							var vehicle = $('#dropdown option:selected').text();
							if (token != ",") {
								user.child("notify").set({"email" : email, "vehicle" : vehicle.replace(/ *\([^)]*\) */g, ""), "id" : 0, "token" : token});
								user.child("notify").remove();
							} if (snapshot.child("etaTimestamp").val() != 2 || snapshot.child("vehicle").val() != vehicle) {
								user.update({"eta" : "update"});
								user.update({"eta" : "On the Way!", "etaTimestamp" : 2, "vehicle" : vehicle});
							}
						}
					});
					$(this).dialog("close");
					$(this).dialog('destroy').remove();
				}}, {
				text: "Here",
				click: function() {
					var user = ref.child("ACTIVE RIDES").child(email);
					user.once('value', function(snapshot) {
						if (snapshot.hasChildren()) {
							var token = snapshot.child("token").val();
							var vehicle = $('#dropdown option:selected').text();
							if (token != ",") {
								user.child("notify").set({"email" : email, "vehicle" : vehicle.replace(/ *\([^)]*\) */g, ""), "id" : 1, "token" : token});
								user.child("notify").remove();
							} if (snapshot.child("etaTimestamp").val() != 1 || snapshot.child("vehicle").val() != vehicle) {
								user.update({"eta" : "update"});
								user.update({"eta" : "Here!", "etaTimestamp" : 1, "vehicle" : vehicle});
							}
						}
					});
					$(this).dialog("close");
					$(this).dialog('destroy').remove();
				}}, {
				text: "Cancel",
				click: function() {
					$(this).dialog("close");
					$(this).dialog('destroy').remove()
				}}
			]
	});
	$('#edit').click(function() { editVehiclesAction(ref) });
	var selector = document.getElementById("dropdown");
	for (var i = 0; i < options.length; i++) {
		var option = document.createElement("option");
		option.value = options[i];
		option.text = options[i];
		selector.appendChild(option);
	}
	if (vehicle != null) {
		setVehicle: for (i = 0; i < selector.length; i++){
			if (selector.options[i].value == vehicle){
				selector.value = vehicle;
				break setVehicle;
			}
		}
	}
	$(popUpList).parent().children().children('.ui-dialog-titlebar-close').hide();
	$(popUpList).dialog('open');
}

function editLocationsAction(ref) {
	var stringvar2= '<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><p><b>Add Location:<br><br>Name (what will show in app):<br><input type="text" id="name"><br>Address (without Rock Island, IL):<br><input type="text" id="address"><br><br><button id="addLocation">Add</button><br><br>Select a location and click the "Remove" button to remove it. Ensure the address is correct by clicking "Link" which will open a google maps view of the location.<br><br>Current list of locations:</p><table id="list3" style="width:100%"></table><br><button id="removeLocation">Remove</button></div></div></div>';
	var	popUpList2 = $(stringvar2);
	$(popUpList2).dialog({
		title: 'Edit Locations',
		resizable: false,
		closeOnEscape: false,
		modal: true,
		autoOpen: false,
		buttons: [ {
			text: "OK",
			click: function() {
				$(this).dialog("close");
				$(this).dialog('destroy').remove();
			}}
		]
	});
	$('#addLocation').click(function() { addLocation(ref) });
	var addressField = document.getElementById('address');
	addressField.addEventListener("keyup", function(event){ enterAction(event, $('#addLocation')) });
	var nameField = document.getElementById('name');
	nameField.addEventListener("keyup", function(event){ enterAction(event, $('#addLocation')) });
	var tr;
	var list = document.getElementById("list3");
	for (var i = 0; i < locations.length; i++) {
		var row = list.insertRow(i);
		$(row).click(function(){
			$(this).addClass('selected').siblings().removeClass('selected');    
			tr = $(this).find('td:first').html();   
			$('#removeLocation').click(function() { removeLocation(ref, tr) });
		 });
		var rowText = row.insertCell(0);
		rowText.innerHTML = locations[i][0] + ": " + locations[i][1] + " ";
		var link = document.createElement('a');
		link.setAttribute("href", "https://www.google.com/maps/?q=" + locations[i][2] + "," + locations[i][3]);
		link.setAttribute("target", "_blank");
		link.appendChild(document.createTextNode("Link"));
		rowText.appendChild(link);
	}
	$(popUpList2).parent().children().children('.ui-dialog-titlebar-close').hide();
	$(popUpList2).dialog('open');
}

getLatLong = function(name, address, f) {
	geocoder.geocode( { 'address': address}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			latitude = results[0].geometry.location.lat();
			longitude = results[0].geometry.location.lng();
			f(name, address, latitude, longitude);
			} else {
				alert("Geocoding failed");
			}
		}); 
}

function addLocation(ref) {
	var locationsRef = ref.child("LOCATIONS");
	var name = $('#name').val();
	var address = $('#address').val()
	if (name == "" || address == "") {
		alert("Please fill out both the name and address fields.");
	} else if (inLocations(name)) {
		alert("A location with that name already exists.");
	} else {
		if (!address.toLowerCase().includes("Rock Island, IL")) {
			address = address + " Rock Island, IL";
		}
		getLatLong(name, address, function(newName, newAddr, lat, long) {
			locationsRef.child(locations.length).update({"name" : newName, "address" : newAddr.replace(" Rock Island, IL", ""), "lat" : lat, "long" : long});
			var list = document.getElementById("list3");
			list.innerHTML = "";
			var tr;
			for (var i = 0; i < locations.length; i++) {
				var row = list.insertRow(i);
				$(row).click(function(){
					$(this).addClass('selected').siblings().removeClass('selected');    
					tr = $(this).find('td:first').html();  
					$('#removeLocation').click(function() { removeLocation(ref, tr) });
				 });
				var rowText = row.insertCell(0);
				rowText.innerHTML = locations[i][0] + ": " + locations[i][1] + " ";
				var link = document.createElement('a');
				link.setAttribute("href", "https://www.google.com/maps/?q=" + locations[i][2] + "," + locations[i][3]);
				link.setAttribute("target", "_blank");
				link.appendChild(document.createTextNode("Link"));
				rowText.appendChild(link);
			}
			$('#name').val("");
			$('#address').val("");
			list3.scrollTop = list3.scrollHeight;
		});
	}
}

function inLocations(name) {
	for (var i = 0; i < locations.length; i++) {
		if (locations[i][0].toLowerCase() == name.toLowerCase()) {
			return true;
		}
	}
	return false;
}

function removeLocation(ref, tr) {
	var locationsRef = ref.child("LOCATIONS");
	var list = document.getElementById("list3");
	list.innerHTML = "";
	var name = tr.split(": ");
	for (var i = 0; i < locations.length; i++) {
		if (name[0] == locations[i][0]) {
			locationsRef.child(i).remove();
		}
	}
	locationsRef.once('value', function(snapshot) {
		var count = 0;
		snapshot.forEach(function(child) {
			var name = child.child("name").val();
			var address = child.child("address").val();
			var lat = child.child("lat").val();
			var long = child.child("long").val();
			locationsRef.child(child.key).remove();
			locationsRef.child(count).update({"name" : name, "address" : address, "lat" : lat, "long" : long});
			count = count + 1;
		});
		var tr;
		for (var i = 0; i < locations.length; i++) {
			var row = list.insertRow(i);
			$(row).click(function(){
				$(this).addClass('selected').siblings().removeClass('selected');    
				tr = $(this).find('td:first').html();   
				$('#removeLocation').click(function() { removeLocation(ref, tr) });
			 });
			var rowText = row.insertCell(0);
			rowText.innerHTML = locations[i][0] + ": " + locations[i][1] + " ";
			var link = document.createElement('a');
			link.setAttribute("href", "https://www.google.com/maps/?q=" + locations[i][2] + "," + locations[i][3]);
			link.setAttribute("target", "_blank");
			link.appendChild(document.createTextNode("Link"));
			rowText.appendChild(link);
		}
	});
}

// 
function editVehiclesAction(ref) {
	var stringvar2= '<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><p><b>*Separate vehicles by line*<br><br>*Driver\'s name inside of parentheses () will NOT be sent*<br><br>Notification format:</b><br>OTW: "Watch for the __________"<br>Here: "Hop in the __________"<br><br>Current list of vehicles/drivers:</p><textarea id="list" rows="5" cols="30" style="resize: none;"></textarea></div></div></div>';
	var	popUpList2 = $(stringvar2);
	$(popUpList2).dialog({
		title: 'Edit Vehicles',
		resizable: false,
		closeOnEscape: false,
		modal: true,
		autoOpen: false,
		buttons: [ { 
			text: "Confirm",
			click: function() {
				var vehicles = list.value;
				var newOptions = vehicles.split('\n');
				var vehicleRef = ref.child("VEHICLES");
				vehicleRef.once('value', function(snapshot) {
					vehicleRef.remove();
					var count = 0;
					for (var i = 0; i < newOptions.length; i++) {
						if (newOptions[i] != "") {
							vehicleRef.update({[count] : newOptions[i]});
							count = count + 1;
						}
					}
				});
				$(this).dialog("close");
				$(this).dialog('destroy').remove();
				$(".ui-dialog-content").dialog("close");
				$(".ui-dialog-content").dialog("destroy").remove();
			}}, {
			text: "Cancel",
			click: function() {
				$(this).dialog("close");
				$(this).dialog('destroy').remove();
			}}
		]
	});
	var list = document.getElementById("list");
	var output = "";
	for (var i = 0; i < options.length-1; i++) {
		output = output + options[i] + "\n";
	}
	if (options.length > 0) {
		output = output + options[options.length-1];
	}
	list.innerHTML = output;
	$(popUpList2).parent().children().children('.ui-dialog-titlebar-close').hide();
	$(popUpList2).dialog('open');
}

function editEmpAction(ref) {
	var stringvar2= '<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><p><b>*Separate employees by line*<br><br>*Only include first and last name with number of the employees email, no @augustana.edu*<br><br>Current list of employees:</p><textarea id="list2" rows="20" cols="30" style="resize: none;"></textarea></div></div></div>';
	var	popUpList2 = $(stringvar2);
	$(popUpList2).dialog({
		title: 'Edit Employees',
		resizable: false,
		closeOnEscape: false,
		modal: true,
		autoOpen: false,
		buttons: [ { 
			text: "Confirm",
			click: function() {
				var employees = list.value;
				if (!employees.includes(".")) {
				var newEmployees = employees.split('\n');
				var employeesRef = ref.child("EMPLOYEES");
				employeesRef.once('value', function(snapshot) {
					employeesRef.remove();
					var count = 0;
					for (var i = 0; i < newEmployees.length; i++) {
						if (newEmployees[i] != "") {
							employeesRef.update({[count] : newEmployees[i]});
							count = count + 1;
						}
					}
				});
				$(this).dialog("close");
				$(this).dialog('destroy').remove();
				$(".ui-dialog-content").dialog("close");
				$(".ui-dialog-content").dialog("destroy").remove();
			} else {
				alert("Please only fill with first name, last name and number. Do not include '@augustana.edu' or any periods.");
			}
			}}, {
			text: "Cancel",
			click: function() {
				$(this).dialog("close");
				$(this).dialog('destroy').remove();
			}}
		]
	});
	var list = document.getElementById("list2");
	var output = "";
	for (var i = 0; i < employees.length-1; i++) {
		output = output + employees[i] + "\n";
	}
	if (employees.length > 0) {
		output = output + employees[employees.length-1];
	}
	list.innerHTML = output;
	$(popUpList2).parent().children().children('.ui-dialog-titlebar-close').hide();
	$(popUpList2).dialog('open');
}

// Method for handeling the update action from the update button.
// Parameters: email - current email of the ride
//			   ref - reference to the firebase tree (pending or active)
// 			   textField - input field to update the wait time value
//			   completeButton - button used for completing a ride
function updateAction(email, ref, textField, completeButton) {
	var waitTime = textField.value;
	var isNumber = /^\d+$/.test(waitTime);
	if (waitTime !== "" && isNumber === true) {
		var user = ref.child(email);
		var nowDate = new Date();
		var etaDate = new Date(nowDate.getTime() + (60000 * waitTime));
		user.once("value", function(snapshot) {
			var email = snapshot.val().email;
			var ts = snapshot.val().timestamp;
			firebase.database().ref().child("CANCELLED RIDES").child(email + "_" + ts).once("value", function(snap) { 
				if (!snap.hasChildren()) { // for checking if the ride cancelled already (duplicate ride bug)
					if (snapshot.val().waitTime == "1000") {
						var eta = calculateETA(waitTime);
						var active = firebase.database().ref().child("ACTIVE RIDES");
						var attributes = [email, snapshot.val().end, 
							snapshot.val().endTime, eta, snapshot.val().numRiders, 
							snapshot.val().start, snapshot.val().time, ts, waitTime, snapshot.val().token, " "];
						user.update({"waitTime" : waitTime});
						user.remove();
						completeButton.disabled = false;
						active.child(email).set({ 
							email: attributes[0],
							end: attributes[1],
							endTime: attributes[2],
							eta: attributes[3],
							numRiders: attributes[4],
							start: attributes[5],
							time: attributes[6],
							timestamp: attributes[7],
							waitTime: attributes[8],
							token: attributes[9],
							etaTimestamp: etaDate.getTime(),
							vehicle: attributes[10],
						});
					} else {
						var eta = calculateETA(waitTime);
						user.update({"waitTime" : "update"});
						user.update({"waitTime" : waitTime, "eta" : eta, "etaTimestamp" : etaDate.getTime()});
					}
				}
			});
		});
	} else {
		alert("You must enter only numbers to update the wait time.");
	}
}

// Calculates the eta with the given wait time and formats the eta
// as HH:MM AM/PM and returns that String value
// Parameters: waitTime - the wait time for the ride
function calculateETA(waitTime) {
	var d = new Date();
	var newDate = new Date(d.getTime() + waitTime*60000);
	var hours = newDate.getHours();
	var minutes = newDate.getMinutes();
	var stringMinutes = "" + minutes;
	if (minutes < 10) {
		stringMinutes = "0" + minutes;
	}
	if (hours == 0) {
		return 12 + ":" + stringMinutes + " AM";
	} else if (hours < 12) {
		return hours + ":" + stringMinutes + " AM";
	} else if (hours == 12) {
		return hours + ":" + stringMinutes + " PM";
	} else {
		return (hours - 12) + ":" + stringMinutes + " PM";
	}
}

// Method for handeling the complete action from the complete button.
// Parameters: email - current email of the ride
// 			   ref - reference to the firebase tree (pending or active)
function completeAction(email, ref, completeButton) { 
	if (completeButton.innerHTML == "Complete") {
		var user = ref.child(email);
		user.once("value", function(snapshot) {
			var endTime = calculateETA(0);
			var ts = snapshot.val().timestamp
			user.update({"endTime" : endTime});
			var completed = firebase.database().ref().child("COMPLETED RIDES");
			completed.child(email + "_" + ts).set({
				email: snapshot.val().email,
				end: snapshot.val().end,
				endTime: endTime,
				eta: snapshot.val().eta,
				numRiders: snapshot.val().numRiders,
				start: snapshot.val().start,
				time: snapshot.val().time,
				timestamp: ts,
				waitTime: snapshot.val().waitTime,
				vehicle: snapshot.val().vehicle,
			});
			user.remove();
		});
	} else {
		var user = ref.child(email);
		user.update({"eta" : "update"});
		user.update({"eta" : "Picked Up", "etaTimestamp" : 0});
	}
}

// Method for handeling the cancel action from the cancel button.
// Parameters: email - current email of the ride
// 			   ref - reference to the firebase tree (pending or active)
// 			   type - string to determine if the ride is pending or active
function cancelAction(email, ref, type) { 
	if (confirm('Are you sure you want to cancel this ride?')) {
		var user = ref.child(email);
		user.once("value", function(snapshot) {
			var ts = snapshot.val().timestamp
			user.update({"endTime" : "Cancelled by Dispatcher"});
			var cancelled = firebase.database().ref().child("CANCELLED RIDES");
			cancelled.child(email + "_" + ts).set({ 
				email: snapshot.val().email,
				end: snapshot.val().end,
				endTime: "Cancelled by Dispatcher",
				eta: snapshot.val().eta,
				numRiders: snapshot.val().numRiders,
				start: snapshot.val().start,
				time: snapshot.val().time,
				timestamp: ts,
				waitTime: snapshot.val().waitTime,
				vehicle: snapshot.val().vehicle,
			});
			user.remove();
		});
	} else {
		// Do nothing
	}
}

function constructLocationDatabase() {
	var map = new Map();
	map.set("Abbey Art Studios", [41.505297, -90.551476]);
	map.set("ALDI", [41.491941, -90.548270]);
    map.set("Anderson/Bartholomew", [41.502361, -90.551381]);
    map.set("Andreen Hall", [41.501657, -90.548496]);
    map.set("Arbaugh TLA", [41.499354, -90.552103]);
    map.set("Brodahl", [41.502800, -90.552291]);
    map.set("Carver Center", [41.506636, -90.550844]);
    map.set("Centennial Hall", [41.505123, -90.548681]);
    map.set("College Center", [41.504351, -90.548201]);
    map.set("Denkmann", [41.504425, -90.550528]);
    map.set("11th Ave Flats", [41.499988, -90.548975]);
    map.set("Erickson Hall", [41.499363, -90.554705]);
    map.set("Evald", [41.505108, -90.550090]);
    map.set("Gerber Center", [41.502285, -90.550688]);
    map.set("Hanson", [41.503561, -90.551447]);
    map.set("Naeseth TLA", [41.499284, -90.553739]);
    map.set("Old Main", [41.504344, -90.549497]);
    map.set("Olin", [41.503118, -90.550591]);
    map.set("Parkander North", [41.501175, -90.549681]);
    map.set("Parkander South", [41.500545, -90.549934]);
    map.set("PepsiCo Recreation", [41.500332, -90.556294]);
    map.set("Pottery Studio", [41.505721, -90.550474]);
    map.set("Seminary Hall", [41.503043, -90.548144]);
    map.set("Swanson Commons", [41.500638, -90.548042]);
    map.set("Sorensen", [41.505139, -90.547201]);
    map.set("Swenson Geoscience", [41.503030, -90.549075]);
	map.set("Westerlin Hall", [41.500495, -90.554667]);
	$( "#start" ).autocomplete({
		source: function(request, response) {
			var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
			response($.grep(Array.from(map.keys()), function(item){
				return matcher.test(item);
			}) );
		},
		minLength: 0,
		change: function(event, ui) {
			if (ui.item) {
				//console.log(ui.item);
				startLocation = ui.item.label;
				//console.log("Start: " + startLocation);
			} else {
				//console.log("parse address");
				startLocation = this.value;
				//console.log("Start: " + startLocation);
			}
		}
	  });
	$( "#end" ).autocomplete({
		source: function(request, response) {
			var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
			response($.grep(Array.from(map.keys()), function(item){
				return matcher.test(item);
			}) );
		},
		minLength: 0,
		change: function(event, ui) {
			if (ui.item) {
				//console.log(ui.item);
				endLocation = ui.item.label;
				//console.log("End: " + endLocation);
			} else {
				//console.log("parse address");
				endLocation = this.value;
				//console.log("End: " + endLocation);
			}
		}
	  });
	return map;
}

function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    }
    this.stop = function(){
        this.sound.pause();
    }
}
