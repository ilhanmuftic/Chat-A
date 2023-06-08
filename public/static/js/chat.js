
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
const roomName = document.querySelector('#room-name')
const membersList = document.getElementById('members-list');
const addMemberInput = document.querySelector('#add-member-input')



function sendMessage(){
	const message = messageInput.value

	socket.emit('message', message)
    messageInput.value=''
}


fetch('/get-room/' + roomId)
	.then(response => response.json())
	.then(data => {
        roomName.innerText = data.room.name
		data.room.members.split(',').forEach((member) => {
			membersList.append(stringToHTML(`<div>${member}</div>`));
		  });
		  
});

fetch('/get-messages/' + roomId)
	.then(response => response.json())
	.then(data => {
        if(!data.messages[0]) return
		for(m of data.messages){
			appendMessage(m)
		}

		
});


function scrollToBottom(){
	messageContainer.scrollTop = messageContainer.scrollHeight;	
}


socket.on("message", data => {
	appendMessage(data)
})

function appendMessage(msg){
	messageContainer.append(stringToHTML(`<div class="message">${msg.username}: ${msg.message}</div>`))
	scrollToBottom()
}


function handleKeyDown(event) {
	if (event.keyCode === 13) {
	  // Check if Enter key is pressed
	  event.preventDefault(); // Prevent default form submission behavior
	  sendMessage();
	}
  }

  

  function toggleMembersPanel() {
	const membersPanel = document.getElementById('members-panel');
	membersPanel.classList.toggle('active');
  }
  

  function addMember(){
	fetch('/add-member/' + roomId, {
		method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({member:addMemberInput.value})
	})
	.then(response => response.json())
	.then(data => {
		if(data.error) return alert(data.error)
		membersList.append(stringToHTML(`<div>${addMemberInput.value}</div>`));
	});
  }