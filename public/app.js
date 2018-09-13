// Author: Kyle Workman 
// * Built based off the Dispatch Aces Android App
//   designed by Tyler May, Kevin Barbian, Megan Janssen, Tan Nguyen.
// Description: Augustana Aces Dispatcher Application
// for managing the Aces uber system accross campus. 

// Global Variables
var options = ["white ACES vehicle", "tan medical car", "#26 ACES van"]; //Example

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
	var div = buildText();

	var logs = [];

	constructStatus(ref, div);
	constructExportEdit(ref);
	constructAddRide(ref);

	// construct the three columns
	var row = document.createElement("div");
	row.setAttribute("class", "row");
	var left = document.createElement("div");
	left.setAttribute("class", "column1");
	var right = document.createElement("div");
	right.setAttribute("class", "column1");
	var log = document.createElement("div");
	log.setAttribute("class", "column1");
	row.appendChild(left);
	row.appendChild(right);
	row.appendChild(log);
	document.body.appendChild(row);

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

	constructPendingRides(ref, left, logs, log);
	constructActiveRides(ref, right, logs, log);
	constructVehicleListener(ref);
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

// Removes components from the login screen.
function removePreviousComponents() {
	document.getElementById("div").remove();
	document.getElementById("button").remove();
	document.getElementById("link").remove();
}

// Adds the text for the title and status indicator.
function buildText() {
	var title = document.createElement("p");
	document.body.appendChild(title);
	title.innerHTML = "<h1>Aces Dispatcher App</h1>";
	title.style.textAlign = "left";
	title.style.cssFloat = "left";
	var div = document.createElement("div");
	var statusText = document.createElement("b");
	statusText.innerHTML = "<h3>Status: </h3>";
	div.style.cssFloat = "right";
	div.appendChild(statusText);
	document.body.appendChild(div);
	return div;
}

// Constructs the status indicator button to toggle the Aces service
// on and off.
// Parameters: ref - reference to the firebase database
function constructStatus(ref, div) {
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
	})
}

// Toggles the status of the database on and off.
// Parameters: ref - reference to the firebase database
function toggleStatus(ref) {
	var flagRef = ref.child("STATUS");
	flagRef.once("value", function(snapshot) {
		if (snapshot.val().FLAG === "ON") {
			var message = prompt("Custom status message (leave blank or press cancel for no custom status message):", "");
			if (message === null || message === "") {
				message = "";
			} else {
				var date = new Date()
				stringDate = (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + calculateETA(0)
				message = stringDate + "\n" + message
			}
			flagRef.update({"MESSAGE" : message});
			flagRef.update({"FLAG" : "OFF"});
		} else {
			flagRef.update({"FLAG" : "ON"});
			flagRef.update({"MESSAGE" : ""});
		}
	});
}

// Constructs the buttons needed for exporting data editing vehicles.
// Parameters: ref - reference to the firebase database
function constructExportEdit(ref) {
	var div = document.createElement("div");
	div.style.textAlign = "center";
	var finish = document.createElement("BUTTON");
	finish.innerHTML = "Finish session and download spreadsheet";
	finish.style.cssFloat = "center";
	finish.addEventListener("click", function() { exportAction(ref) });
	document.body.appendChild(div);
	var edit = document.createElement("BUTTON");
	edit.innerHTML = "Edit Vehicles";
	edit.style.cssFloat = "center";
	edit.addEventListener("click", function() { editAction(ref) });
	div.appendChild(document.createElement("p"));
	div.appendChild(finish);
	div.appendChild(document.createTextNode(" "));
	div.appendChild(edit);
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
	console.log(cutoff);
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
	let csvContent = "data:text/csv;charset=utf-8,Email,From,To,Number of Riders,Time,Wait Time,ETA,End Time,Vehicle\r\n";
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
	document.body.appendChild(link);
	link.click();
}

// Constructs the fields and buttons needed for adding a ride manually.
// Parameters: ref - reference to the firebase database
function constructAddRide(ref) {
	var div = document.createElement("div");
	div.style.textAlign = "center";
	div.style.alignContent = "left";
	var title = document.createElement("p");
	title.innerHTML = "<h2>Add a ride:</h2>";
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
	fields[0].setAttribute("placeholder", "@augustana.edu");
	addRide.innerHTML = "Add Ride";
	addRide.addEventListener("click", function() { addRideAction(ref, fields) });
	div.appendChild(addRide);
	document.body.appendChild(div);
}

// Method for handeling the enter action when the enter key is pressed.
// Parameters: button - the button to be clicked when the enter key is pressed
function enterAction(event, button) {
	event.preventDefault();
	if (event.keyCode === 13) { button.click() };
}

// Method for handeling the add ride action from the add ride button.
// Parameters: ref - reference to the firebase database
// 			   fields - array of text fields
function addRideAction(ref, fields) {
	if (fields[0].value != "" && fields[1].value != "" && fields[2].value != "" && fields[3].value != "") {
		var email = fields[0].value + "@augustana.edu"
		email = email.replace(".", ",");
		var pendingRidesRef = ref.child("PENDING RIDES");
		var date = new Date();
		pendingRidesRef.child(email).set({ 
			email: email,
			end: fields[2].value,
			endTime: " ",
			eta: " ",
			numRiders: fields[3].value,
			start: fields[1].value,
			time: (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + calculateETA(0),
			timestamp: date.getTime(),
			waitTime: 1000,
			token: " ",
			vehicle: " ",
		});
		clearFields(fields);
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
		snapshot.forEach(function(child) {
			var output = "";
			var email = child.child("email").val();
			var endTime = child.child("endTime").val();
			if (endTime == "Cancelled by Dispatcher") {
				document.getElementById(email).remove();
				logs.push("- " + calculateETA(0) + ": " + email.replace(",", ".") + " - Cancelled by Dispatcher");
				drawLogs(logs, log);
			} else if (endTime == "Cancelled by User") {
				document.getElementById(email).remove();
				logs.push("<span class=user>" + "- " + calculateETA(0) +  ": " + email.replace(",", ".") + " - Cancelled by User</span>");
				drawLogs(logs, log);
			} else if (child.child("waitTime").val() != null) {
				if (!document.body.contains(document.getElementById(email))) {
					var email = child.child("email").val();
					output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
					"<b>Time: </b>"+child.child("time").val() + "<br>" +
					"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
					"<b>From: </b>"+child.child("start").val() + "<br>" +
					"<b>To: </b>"+child.child("end").val();
					var div = createTextAndButtons(output, email, pendingRidesRef, "pending");
					column.appendChild(div);
				}
			} 
		});
	});
}

// Constructs the list of active rides including the text,
// input text field, and the buttons.
// Parameters: ref - reference to the firebase database
// 			   column - the div object to display the active rides in
//			   logs - the array of logs to be displayed
//			   log - the div object to display the log
function constructActiveRides(ref, column, logs, log) {
	var activeRidesRef = ref.child("ACTIVE RIDES");
	activeRidesRef.orderByChild("etaTimestamp").on("value", function(snapshot) {
		snapshot.forEach(function(child) {
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
				if (!document.body.contains(document.getElementById(email))) {
					output = output + "<b>Email: </b>"+email.replace(",", ".") + "<br>" +
					"<b>Time: </b>"+child.child("time").val() + "<br>" +
					"<b>Number of Riders: </b>"+child.child("numRiders").val() + "<br>" +
					"<b>From: </b>"+child.child("start").val() + "<br>" +
					"<b>To: </b>"+child.child("end").val() + "<br>" +
					"<b>Current Wait Time: </b>"+child.child("waitTime").val() + "<br>" +
					"<b>ETA: </b>"+child.child("eta").val();
					var vehicle = child.child("vehicle").val();
					if (vehicle != " ") {
						output = output + "<br><b>Vehicle: </b>"+vehicle;
					}
					var div = createTextAndButtons(output, email, activeRidesRef, "active");
					var notify = document.createElement("BUTTON");
					notify.innerHTML = "Notify";
					notify.addEventListener("click", function() { notifyAction(ref, email, vehicle) });
					div.appendChild(notify);
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
		});
	});
}

// Creates the log
// Parameters: logs - the array of logs to be displayed
//			   column - the div object to be displayed in
function drawLogs(logs, column) {
	while(column.childElementCount > 1) {
		column.removeChild(column.lastChild);
	}
	var output = "";
	var stop = 0;
	var size = logs.length;
	if (size > 50) { // 50 is length of shown logs
		stop = size - 50;
	}
	for (var i = size - 1; i >= stop; --i) {
		output = output + logs[i] + "</br>";
	}
	var para = document.createElement("p");
	para.innerHTML = output;
	column.appendChild(para);
}

// Creates all of the text, text fields, and buttons needed for a single ride. 
// Parameters: output - text to be displayed
//			   email - current email of the ride
//			   ref - reference to the firebase tree (pending or active)
//			   type - string to determine if the ride is pending or active
function createTextAndButtons(output, email, ref, type) {
	var div = document.createElement("div");
	div.setAttribute("class", "ride");
	var para = document.createElement("p");
	para.setAttribute("class", "nospace");
	var textField = document.createElement("INPUT");
	var updateButton = document.createElement("BUTTON");
	var completeButton = document.createElement("BUTTON");
	var cancelButton = document.createElement("BUTTON");
	para.innerHTML = output;
	textField.setAttribute("size", "1");
	textField.setAttribute("type", "text");
	updateButton.innerHTML = "Update";
	completeButton.innerHTML = "Complete";
	cancelButton.innerHTML = "Cancel";
	textField.addEventListener("keyup", function(event){ enterAction(event, updateButton) });
	updateButton.addEventListener("click", function() { updateAction(email, ref, textField, completeButton) });
	completeButton.addEventListener("click", function() { completeAction(email, ref) });
	cancelButton.addEventListener("click", function() { cancelAction(email, ref, type) });
	div.appendChild(para);
	div.appendChild(textField);
	div.appendChild(updateButton);
	div.appendChild(completeButton);
	div.appendChild(cancelButton);
	div.setAttribute("id", email);
	if (type === "pending") {
		completeButton.disabled = true;
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
							if (token != " ") {
								user.child("notify").set({"email" : email, "vehicle" : vehicle.replace(/ *\([^)]*\) */g, ""), "id" : 0, "token" : token});
								user.child("notify").remove();
							} if (snapshot.child("etaTimestamp").val() != 1 || snapshot.child("vehicle").val() != vehicle) {
								document.getElementById(email).remove();
								user.update({"eta" : "On the Way!", "etaTimestamp" : 1, "vehicle" : vehicle, "waitTime" : "-"});
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
							if (token != " ") {
								user.child("notify").set({"email" : email, "vehicle" : vehicle.replace(/ *\([^)]*\) */g, ""), "id" : 1, "token" : token});
								user.child("notify").remove();
							} if (snapshot.child("etaTimestamp").val() != 0 || snapshot.child("vehicle").val() != vehicle) {
								document.getElementById(email).remove();
								user.update({"eta" : "Here!", "etaTimestamp" : 0, "vehicle" : vehicle, "waitTime" : "-"});
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
	$('#edit').click(function() { editAction(ref) });
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

// 
function editAction(ref) {
	var stringvar2= '<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-body"><p><b>*Separate vehicles by line*<br><br>*Driver\'s name inside of parentheses () will NOT be sent*</b><br><br>Notification format: "Watch for the __________"<br><br>Current list of vehicles/drivers:</p><textarea id="list" rows="5" cols="30" style="resize: none;"></textarea></div></div></div>';
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
			document.getElementById(email).remove();
			firebase.database().ref().child("CANCELLED RIDES").child(email + "_" + ts).once("value", function(snap) { 
				if (!snap.hasChildren()) { // for checking if the ride cancelled already (duplicate ride bug)
					if (snapshot.val().waitTime == "1000") {
						var eta = calculateETA(waitTime);
						var active = firebase.database().ref().child("ACTIVE RIDES");
						var attributes = [email, snapshot.val().end, 
							snapshot.val().endTime, eta, snapshot.val().numRiders, 
							snapshot.val().start, snapshot.val().time, ts, waitTime, snapshot.val().token, " "];
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
function completeAction(email, ref) { 
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
