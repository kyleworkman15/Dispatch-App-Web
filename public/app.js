document.addEventListener("DOMContentLoaded", event => {
	
	const app = firebase.app();

});

function googleLogin() {
	const provider = new firebase.auth.GoogleAuthProvider();
	
	firebase.auth().signInWithPopup(provider)
	
			.then(result => {
				const user = result.user;
				afterLogin(user);
			})
			.catch(console.log)
			
}

function afterLogin(user) {
	const email = user.email;
	if (email === "kyleworkman15@augustana.edu") {
		correctLogin();
	} else {
		alert("Sorry, you must be a dispatcher.");
	}
}

function correctLogin() {
	var ref = firebase.database().ref();
	
	document.getElementById("button").remove();
	var status = document.createElement("BUTTON");
	status.addEventListener("click", function() { toggleStatus(ref); });
	var text = document.createTextNode("Status");
	status.appendChild(text);
	document.body.appendChild(status);

	var htmlItemsPending = [];
	var htmlItemsActive = [];

	var pendingRidesRef = ref.child("CURRENT RIDES");
	pendingRidesRef.on("value", function(snapshot) { 
		reset(htmlItemsPending);
		var output = "Pending Rides:<br>";
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

	var activeRidesRef = ref.child("ACTIVE RIDES");
	activeRidesRef.on("value", function(snapshot) {
		reset(htmlItemsActive);
		var output = "Active Rides:<br>";
		snapshot.forEach(function(child) {
			var email = child.child("email").val();
			output = output + "Email: "+email + "<br>" +
			"Time: "+child.child("time").val() + "<br>" +
			"Number of Riders: "+child.child("numRiders").val() + "<br>" +
			"From: "+child.child("start").val() + "<br>" +
			"To: "+child.child("end").val() + "<br>" +
			"Current Wait Time: "+child.child("waitTime").val() + "<br>" +
			"ETA: "+child.child("eta").val() + "<br>" +
			"End Time: "+child.child("endTime").val() + "<br>";
			createTextAndButtons(output, email, activeRidesRef, "active", htmlItemsActive);
			output = "";
		});
	});

	var flagRef = ref.child("STATUS");
	flagRef.on("value", function(snapshot) {
		if(snapshot.val().FLAG === "ON") {
			status.innerHTML = "ON";
		} else {
			status.innerHTML = "OFF";
		}
	})
}

function createTextAndButtons(output, email, ref, type, htmlItems) {
	var para = document.createElement("p");
	var textField = document.createElement("INPUT");
	var updateButton = document.createElement("BUTTON");
	var completeButton = document.createElement("BUTTON");
	var cancelButton = document.createElement("BUTTON");
	para.innerHTML = output;
	textField.setAttribute("type", "text");
	updateButton.innerHTML = "Update Wait Time";
	var db = firebase.database().ref();
	if (type === "pending") {
		completeButton.disabled = true;
	}
	completeButton.innerHTML = "Complete Ride";
	cancelButton.innerHTML = "Cancel Ride";
	updateButton.addEventListener("click", function() { updateAction(email, ref, textField, completeButton) });
	completeButton.addEventListener("click", function() { completeAction(email, ref) });
	cancelButton.addEventListener("click", function() { cancelAction(email, ref) });
	htmlItems.push(para, textField, updateButton, completeButton, cancelButton);
	document.body.appendChild(para);
	document.body.appendChild(textField);
	document.body.appendChild(updateButton);
	document.body.appendChild(completeButton);
	document.body.appendChild(cancelButton);
}

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

function updateAction(email, ref, textField, completeButton) {
	var waitTime = textField.value;
	if (waitTime !== "") {
		var user = ref.child(email);
		console.log(JSON.stringify(user.child("email")));
		user.once("value", function(snapshot) {
			//if (snapshot.val().waitTime === "1000") { // WHY IS THIS NULL
				// TODO: move from pending to active
			//	var active = firebase.database().ref().child("ACTIVE RIDES");
			//	active.child(email).set({ 
			//		email: snapshot.val().email,
			//		end: snapshot.val().end,
			//		endTime: snapshot.val().endTime,
			//		eta: snapshot.val().eta,
			//		numRiders: snapshot.val().numRiders,
			//		start: snapshot.val().start,
			//		time: snapshot.val().time,
			//		waitTime: snapshot.val().waitTime,
			//	});
			//	user.remove();
			//	completeButton.disabled = false;
			//} 
			var d = new Date();
			var newDate = new Date(d.getTime() + waitTime*60000);
			var eta = newDate.getHours() + ":" + newDate.getMinutes();
			user.update({"waitTime" : waitTime, "eta" : eta});
		});
	}
}

function completeAction(email, ref) { //TODO: add reset somewhere
	var user = ref.child(email);
	user.once("value", function(snapshot) {
		var d = new Date();
		var endTime = d.getHours() + ":" + d.getMinutes();
		user.update({"endTime" : endTime});
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

function cancelAction(email, ref) { //TODO: add reset somewhere
	var user = ref.child(email);
	user.once("value", function(snapshot) {
		var cancelled = firebase.database().ref().child("CANCELLED RIDES");
		cancelled.child(email).set({ 
			email: snapshot.val().email,
			end: snapshot.val().end,
			endTime: "Cancelled by Dispatcher",
			eta: snapshot.val().eta,
			numRiders: snapshot.val().numRiders,
			start: snapshot.val().start,
			time: snapshot.val().time,
			waitTime: snapshot.val().waitTime,
		});
		user.remove();
	});
}

function reset(htmlItems) {
	htmlItems.forEach(function(entry) {
		document.body.removeChild(entry);
	});
	htmlItems.length = 0;
}
