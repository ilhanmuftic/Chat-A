const chatList = document.querySelector('.chat-list')

fetch('/get-rooms')
	.then(response => response.json())
	.then(data => {
        if(!data.rooms[0]) return
		for(r of data.rooms){
			appenedRoom(r)
		}
});

function appenedRoom(room){
    chatList.append(stringToHTML(`<a href="/chat/${room.id}"><div class="chat-item">${room.name}</div></a>`))
}    

function newChat(){
	name = prompt("Input Room Name")
    console.log(name)
	if(!name || name == "null") return;
	fetch('/new-room', {
		method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name:name})
	})
	.then(response => response.json())
	.then(data => {
		if(data.error) return alert(data.error)
		location.reload()
	});
}