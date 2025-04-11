document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const joinForm = document.getElementById('joinForm');
    const chatContainer = document.getElementById('chatContainer');
    const username = document.getElementById('username');
    const roomId = document.getElementById('roomId');
    const joinBtn = document.getElementById('joinBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    // 用户信息
    let currentUser = null;
    let currentRoom = null;
    let lastMessageId = 0;
    let messagePolling = null;
    
    // 加入聊天室
    joinBtn.addEventListener('click', function() {
        if (!username.value.trim() || !roomId.value.trim()) {
            alert('请输入昵称和房间号');
            return;
        }
        
        currentUser = username.value.trim();
        currentRoom = roomId.value.trim();
        
        // 显示聊天界面
        joinForm.style.display = 'none';
        chatContainer.style.display = 'flex';
        
        // 更新显示信息
        roomIdDisplay.textContent = currentRoom;
        usernameDisplay.textContent = currentUser;

        // 发送加入消息
        sendSystemMessage('join');
        
        // 开始轮询消息
        fetchMessages();
        messagePolling = setInterval(fetchMessages, 1000);
    });
    
    // 离开聊天室
    leaveBtn.addEventListener('click', function() {
        if (messagePolling) {
            clearInterval(messagePolling);
        }
        
        // 发送离开消息
        sendSystemMessage('leave');
        
        // 重置状态
        currentUser = null;
        currentRoom = null;
        lastMessageId = 0;
        chatMessages.innerHTML = '';
        
        // 显示加入表单
        chatContainer.style.display = 'none';
        joinForm.style.display = 'flex';
    });
    
    // 发送消息
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 发送消息函数
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // 加密过程
        var tmessage = CryptoJS.AES.encrypt(message, currentRoom).toString();  

        const data = {
            action: 'send',
            room: currentRoom,
            username: currentUser,
            message: tmessage,
            timestamp: Date.now()
        };
        
        fetch('server.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                messageInput.value = '';
                fetchMessages(); // 立即获取最新消息
            } else {
                console.error('发送失败:', data.message);
            }
        })
        .catch(error => {
            console.error('发送错误:', error);
        });
    }
    
    // 获取消息
    function fetchMessages() {
        if (!currentRoom || !currentUser) return;
        
        const data = {
            action: 'get',
            room: currentRoom,
            username: currentUser,
            last_id: lastMessageId
        };
        
        fetch('server.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.messages.length > 0) {
                displayMessages(data.messages);
                lastMessageId = data.last_id;
            }
        })
        .catch(error => {
            console.error('获取消息错误:', error);
        });
    }
    
    // 显示消息
    function displayMessages(messages) {
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${msg.username === currentUser ? 'self' : 'other'}`;
            
            const senderElement = document.createElement('div');
            senderElement.className = 'sender';
            senderElement.textContent = msg.username;

            // 解密过程
            var bytes = CryptoJS.AES.decrypt(msg.message, currentRoom);
            // 将解密结果转换为 UTF-8 字符串
            var tmessage = bytes.toString(CryptoJS.enc.Utf8);
            
            const contentElement = document.createElement('div');
            contentElement.className = 'content';
            contentElement.textContent = tmessage;
            
            const timeElement = document.createElement('div');
            timeElement.className = 'time';
            timeElement.textContent = formatTime(msg.timestamp);
            
            messageElement.appendChild(senderElement);
            messageElement.appendChild(contentElement);
            messageElement.appendChild(timeElement);
            
            chatMessages.appendChild(messageElement);
        });
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 发送系统消息
    function sendSystemMessage(type) {

        let message = '';
        switch (type) {
            case 'join':
                message = currentUser + ' 加入了聊天室';
                break;
            case 'leave':
                message = currentUser + ' 离开了聊天室';
                break;
            default:
                message = "系统消息";
        }

        // 加密过程
        var tmessage = CryptoJS.AES.encrypt(message, currentRoom).toString(); 

        const data = {
            action: 'system',
            type: type,
            room: currentRoom,
            username: currentUser,
            message: tmessage,
            timestamp: Date.now()
        };

        fetch('server.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .catch(error => {
            console.error('系统消息发送错误:', error);
        });
    }
    
    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(parseInt(timestamp));
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // 页面关闭前发送离开消息
    window.addEventListener('beforeunload', function() {
        if (currentUser && currentRoom) {
            sendSystemMessage('leave');
        }
    });
});