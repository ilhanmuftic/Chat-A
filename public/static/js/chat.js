
// Extract the roomId from the URL using regular expressions
const match = window.location.href.match(/\/chat\/([^/]+)/);
const roomId = match ? match[1] : null;


	const socket = io('http://localhost:3000', {
		extraHeaders: {
		  'Authorization': `Bearer ${getTokenFromCookie()}` // Add the JWT token to the headers
		}, query: {room: roomId}
	  });
	

  
  

//if(!socket) document.body.innerText = 'The Server is down! Pls contact @ilhan_muftic on instagram or ilhanmuftic@gmail.com'

const messageContainer = document.querySelector('.messages-container')
const messageInput = document.querySelector('#message-input')
const chatContainer = document.querySelector('.chat-containter')

function sendMessage(){
	const message = messageInput.value

	socket.emit('message', message)
    messageInput.value=''
}


fetch('/get-messages/' + roomId)
	.then(response => response.json())
	.then(data => {
        if(!data.messages[0]) return
		for(m of data.messages){
			appnedMessage(m)
		}



	});

socket.on("message", data => {
	appnedMessage(data)
})

function appnedMessage(msg){
	messageContainer.append(stringToHTML(`<div class="message">${msg.username}: ${msg.message}</div>`))
}

function newChat(){
	name = ''
	name = prompt("Input Room Name")
	if(name == '' ) return
	fetch('/new-room', {
		method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name:name})
	})
	.then(response => response.json())
	.then(data => {
		if(data.error) alert(data.error)
	});
}


function handleKeyDown(event) {
	if (event.keyCode === 13) {
	  // Check if Enter key is pressed
	  event.preventDefault(); // Prevent default form submission behavior
	  sendMessage();
	}
  }