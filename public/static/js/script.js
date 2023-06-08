var stringToHTML = function (str) {
	var parser = new DOMParser();
	var doc = parser.parseFromString(str, 'text/html');
	return doc.body.getElementsByTagName('*')[0];
};

function logout(){
	// Delete the JWT cookie
	document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

	// Redirect to the login page
	window.location.href = "/login";
}

  // Function to extract the JWT token from the cookie
  function getTokenFromCookie() {
	const cookie = document.cookie;
	const tokenName = 'jwt'; // Replace with your JWT token name
  
	const tokenStartIndex = cookie.indexOf(`${tokenName}=`);
	if (tokenStartIndex === -1) {
	  return null;
	}
  
	const tokenEndIndex = cookie.indexOf(';', tokenStartIndex);
	const token = cookie.slice(tokenStartIndex + tokenName.length + 1, tokenEndIndex !== -1 ? tokenEndIndex : undefined);
	return token;
  }

