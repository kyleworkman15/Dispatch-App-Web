// Author: Kyle Workman 
// * Built based off the Dispatch Aces Android App
//   designed by Tyler May, Kevin Barbian, Megan Janssen, Tan Nguyen.
// Description: Augustana Aces Dispatcher Application
// for managing the Aces uber system accross campus. 

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
	if (email === "kyleworkman15@augustana.edu" || email === "csc490teama@augustana.edu") {
		correctLogin();
	} else {
		alert("Sorry, you must be a dispatcher.");
	}
}

// Build the web page using the firebase data.
function correctLogin() {
	var ref = firebase.database().ref();

	removePreviousComponents();
	buildText();

	var htmlItemsPending = [];
	var htmlItemsActive = [];

	constructStatus(ref);
	constructAddRide(ref);
	constructPendingRides(ref, htmlItemsPending);
	constructActiveRides(ref, htmlItemsActive);
}

// Removes components from the login screen.
function removePreviousComponents() {
	document.getElementById("div").remove();
	document.getElementById("button").remove();
}

// Adds the text for the title and status indicator.
function buildText() {
	var title = document.createElement("p");
	document.body.appendChild(title);
	title.innerHTML = "<h1>Aces Dispatcher App </h1><br>";
	document.body.appendChild(document.createTextNode("Status: "));
}

// Constructs the status indicator button to toggle the Aces service
// on and off.
// Parameters: ref - reference to the firebase database
function constructStatus(ref) {
	var status = document.createElement("BUTTON");
	status.addEventListener("click", function() { toggleStatus(ref); });
	document.body.appendChild(status);
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
			flagRef.update({"FLAG" : "OFF"});
		} else {
			flagRef.update({"FLAG" : "ON"});
		}
	});
}

// Constructs the fields and buttons needed for adding a ride manually.
// Parameters: ref - reference to the firebase database
function constructAddRide(ref) {
	var title = document.createElement("p");
	title.innerHTML = "<h2>Add a ride:</h2>";
	document.body.appendChild(title);
	var texts = ["Email: ", "From: ", "To: ", "Number of Riders: "];
	var fields = [];
	texts.forEach(element => {
		var para = document.createElement("p");
		para.innerHTML = element;
		document.body.appendChild(para);
		var field = document.createElement("INPUT");
		field.setAttribute("type", "text");
		document.body.appendChild(field);
		fields.push(field);
	});
	var addRide = document.createElement("BUTTON");
	addRide.innerHTML = "Add Ride";
	addRide.addEventListener("click", function() { addRideAction(ref, fields) });
	document.body.appendChild(document.createElement("p"));
	document.body.appendChild(addRide);
}

// Method for handeling the add ride action from the add ride button.
// Parameters: ref - reference to the firebase database
// 			   fields - array of text fields
function addRideAction(ref, fields) {
	var email = fields[0].value;
	var pendingRidesRef = ref.child("PENDING RIDES");
	var date = new Date();
	pendingRidesRef.child(email).set({ 
		email: email,
		end: fields[2].value,
		endTime: " ",
		eta: " ",
		numRiders: fields[3].value,
		start: fields[1].value,
		time: date.getMonth() + "/" + date.getDay() + "/" + date.getFullYear() + " " + calculateETA(0),
		waitTime: 1000,
	});
	clearFields(fields);
}

// Clears all the text fields for adding a ride.
// Parameters: fields - array of text fields
function clearFields(fields) {
	fields.forEach(element => {
		element.value = "";
	});
}

// Constructs the list of pending rides including the text,
// input text field, and the buttons.
// Parameters: ref - reference to the firebase database
//             htmlItemsPending - array to hold all html items currently
//								  being used by the pending rides
function constructPendingRides(ref, htmlItemsPending) {
	var pendingRidesRef = ref.child("PENDING RIDES");
	pendingRidesRef.on("value", function(snapshot) { 
		reset(htmlItemsPending);
		var output = "<h2>Pending Rides:</h2><br>";
		snapshot.forEach(function(child) {
			var email = child.child("email").val();
			output = output + "Email: "+email + "<br>" +
			"Time: "+child.child("time").val() + "<br>" +
			"Number of Riders: "+child.child("numRiders").val() + "<br>" +
			"From: "+child.child("start").val() + "<br>" +
			"To: "+child.child("end").val() + "<br>";
			createTextAndButtons(output, email, pendingRidesRef, "pending", htmlItemsPending);
			output = "";
		});
	});
}

// Constructs the list of active rides including the text,
// input text field, and the buttons.
// Parameters: ref - reference to the firebase database
// 		       htmlItemsActive - array to hold all html items currently
// 			  		 	 	     being used by the acitve rides
function constructActiveRides(ref, htmlItemsActive) {
	var activeRidesRef = ref.child("ACTIVE RIDES");
	activeRidesRef.on("value", function(snapshot) {
		reset(htmlItemsActive);
		var output = "<h2>Active Rides:</h2><br>";
		snapshot.forEach(function(child) {
			var email = child.child("email").val();
			output = output + "Email: "+email + "<br>" +
			"Time: "+child.child("time").val() + "<br>" +
			"Number of Riders: "+child.child("numRiders").val() + "<br>" +
			"From: "+child.child("start").val() + "<br>" +
			"To: "+child.child("end").val() + "<br>" +
			"Current Wait Time: "+child.child("waitTime").val() + "<br>" +
			"ETA: "+child.child("eta").val() + "<br>";
			//"End Time: "+child.child("endTime").val() + "<br>";
			createTextAndButtons(output, email, activeRidesRef, "active", htmlItemsActive);
			output = "";
		});
	});
}

// Creates all of the text, text fields, and buttons needed for a single ride. 
// Parameters: output - text to be displayed
//			   email - current email of the ride
//			   ref - reference to the firebase tree (pending or active)
//			   type - string to determine if the ride is pending or active
//			   htmlItems - array for holding html items currently being used
// 						   by this current ride
function createTextAndButtons(output, email, ref, type, htmlItems) {
	var para = document.createElement("p");
	var textField = document.createElement("INPUT");
	var updateButton = document.createElement("BUTTON");
	var completeButton = document.createElement("BUTTON");
	var cancelButton = document.createElement("BUTTON");
	para.innerHTML = output;
	textField.setAttribute("type", "text");
	updateButton.innerHTML = "Update Wait Time";
	completeButton.innerHTML = "Complete Ride";
	cancelButton.innerHTML = "Cancel Ride";
	textField.addEventListener("keyup", function(event){
		event.preventDefault();
		if (event.keyCode === 13) { updateButton.click(); }
	});
	updateButton.addEventListener("click", function() { updateAction(email, ref, textField, completeButton) });
	completeButton.addEventListener("click", function() { completeAction(email, ref) });
	cancelButton.addEventListener("click", function() { cancelAction(email, ref, type) });
	htmlItems.push(para, textField, updateButton, completeButton, cancelButton);
	document.body.appendChild(para);
	document.body.appendChild(textField);
	document.body.appendChild(updateButton);
	document.body.appendChild(completeButton);
	document.body.appendChild(cancelButton);
	if (type === "pending") {
		completeButton.disabled = true;
	}
	checkReorder(type);
}

// Method for handeling the update action from the update button.
// Parameters: email - current email of the ride
//			   ref - reference to the firebase tree (pending or active)
// 			   textField - input field to update the wait time value
//			   completeButton - button used for completing a ride
function updateAction(email, ref, textField, completeButton) {
	var waitTime = textField.value;
	if (waitTime !== "") {
		var user = ref.child(email);
		user.once("value", function(snapshot) {
			if (snapshot.val().waitTime == "1000") {
				var eta = calculateETA(waitTime);
				var active = firebase.database().ref().child("ACTIVE RIDES");
				var attributes = [snapshot.val().email, snapshot.val().end, 
					snapshot.val().endTime, eta, snapshot.val().numRiders, 
					snapshot.val().start, snapshot.val().time, waitTime];
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
					waitTime: attributes[7],
				});
			} else {
				var eta = calculateETA(waitTime);
				user.update({"waitTime" : waitTime, "eta" : eta});
			}
		});
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
	if (hours < 12) {
		return hours + ":" + stringMinutes + " AM";
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
		user.update({"endTime" : calculateETA(0)});
		var archived = firebase.database().ref().child("ARCHIVED RIDES");
		archived.child(email).set({ //TODO: ADD TIME/DATE to end of the email
			email: snapshot.val().email,
			end: snapshot.val().end,
			endTime: snapshot.val().endTime,
			eta: snapshot.val().eta,
			numRiders: snapshot.val().numRiders,
			start: snapshot.val().start,
			time: snapshot.val().time,
			waitTime: snapshot.val().waitTime,
		});
		user.remove();
	});
}

// Method for handeling the cancel action from the cancel button.
// Parameters: email - current email of the ride
// 			   ref - reference to the firebase tree (pending or active)
// 			   type - string to determine if the ride is pending or active
function cancelAction(email, ref, type) { 
	var user = ref.child(email);
	user.once("value", function(snapshot) {
		user.update({"endTime" : "Cancelled by Dispatcher"});
		var cancelled = firebase.database().ref().child("CANCELLED RIDES");
		cancelled.child(email).set({ 
			email: snapshot.val().email,
			end: snapshot.val().end,
			endTime: snapshot.val().endTime,
			eta: snapshot.val().eta,
			numRiders: snapshot.val().numRiders,
			start: snapshot.val().start,
			time: snapshot.val().time,
			waitTime: snapshot.val().waitTime,
		});
		user.remove();
		checkReorder(type);
	});
}

// Moves the active ride list down (if need be) by creating and removing dummy 
// data in the firebase database.
// Parameters: type - string to determine if the ride is pending or active
function checkReorder(type) {
	if (type === "pending") {
		var activeRidesRef = firebase.database().ref().child("ACTIVE RIDES");
		activeRidesRef.child("update").set({
			email: "update"
		});
		activeRidesRef.child("update").remove();
	}
}

// Removes all of the html items in the given array (htmlItems)
// from the document and clears the array.
function reset(htmlItems) {
	htmlItems.forEach(function(entry) {
		document.body.removeChild(entry);
	});
	htmlItems.length = 0;
}
