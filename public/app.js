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
	document.getElementById("button").remove();
	var status = document.createElement("BUTTON");
	var text = document.createTextNode("Status");
	status.appendChild(text);
	document.body.appendChild(status);

	var ref = firebase.database().ref();

	var para1 = document.createElement("p");
	document.body.appendChild(para1);
	var para2 = document.createElement("p");
	document.body.appendChild(para2);

	var pendingRidesRef = ref.child("CURRENT RIDES");
	pendingRidesRef.on("value", function(snapshot) { 
		var output = "Pending Rides:<br>";
		snapshot.forEach(function(child) {
			output = output + "Email: "+child.child("email").val() + "<br>" +
			"Time: "+child.child("time").val() + "<br>" +
			"Number of Riders: "+child.child("numRiders").val() + "<br>" +
			"From: "+child.child("start").val() + "<br>" +
			"To: "+child.child("end").val() + "<br>";
		});
		para1.innerHTML = output + "<br>";
	});

	var activeRidesRef = ref.child("ACTIVE RIDES");
	activeRidesRef.on("value", function(snapshot) {
		var output = "Active Rides:<br>";
		snapshot.forEach(function(child) {
			output = output + "Email: "+child.child("email").val() + "<br>" +
			"Time: "+child.child("time").val() + "<br>" +
			"Number of Riders: "+child.child("numRiders").val() + "<br>" +
			"From: "+child.child("start").val() + "<br>" +
			"To: "+child.child("end").val() + "<br>" +
			"Current Wait Time: "+child.child("waitTime").val() + "<br>" +
			"ETA: "+child.child("eta").val() + "<br>" +
			"End Time: "+child.child("endTime").val() + "<br>";
		});
		para2.innerHTML = output + "<br>";
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
