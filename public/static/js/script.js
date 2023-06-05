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

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

console.log(roomId)

const socket = io('http://localhost:3000', {
	extraHeaders: {
	  'Authorization': `Bearer ${getTokenFromCookie()}` // Add the JWT token to the headers
	}, query: {room: roomId}
  });
  
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

if(!socket) document.body.innerText = 'The Server is down! Pls contact @ilhan_muftic on instagram or ilhanmuftic@gmail.com'

const messageContainer = document.querySelector('.messages-container')
const messageInput = document.querySelector('#message-input')
const chatContainer = document.querySelector('.chat-containter')

function sendMessage(){
	const message = messageInput.value

	socket.emit('message', message)
}

socket.on("message", data => {
	messageContainer.append(stringToHTML(`<div class="message">${data.from}: ${data.message}</div>`))
})