document.addEventListener("DOMContentLoaded", event => {
	
	const app = firebase.app();
	const db = firebase.database();

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
		alert("Sorry, you must be a dispatcher");
	}
}

function correctLogin() {
	document.getElementById("button").remove();
	var status = document.createElement("BUTTON");
	var text = document.createTextNode("Status");
	status.appendChild(text);
	document.body.appendChild(status);
}
