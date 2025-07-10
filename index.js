const { PeerServer } = require('peer');
const { Server } = require("socket.io");

const io = new Server(3001, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 5000, // Тайм-аут на получение пинга от клиента (в миллисекундах)
    pingInterval: 5000  // Интервал отправки пингов клиентам (в миллисекундах)
});

const peerServer = PeerServer({
    port: 3002,
    path: '/peerjs/myapp',
    debug: true
});

const rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, peerId, userId, userInfo, isStream, isMuted, callback) => {

        socket.peer_id = peerId;
        socket.room_id = roomId;

        try {
            if (peerId === null) {
                callback({ success: false, message: 'peer_is_null' });
                return;
            }

            if (rooms[roomId] && rooms[roomId].some(user => user.peerId === peerId)) {
                callback({ success: false, message: 'peer_already_exists' });
                return;
            }

            socket.join(roomId);

            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            else {
                findExistUser = rooms[roomId].find((u) => u.userId === userId);
                if (findExistUser) {
                    rooms[roomId] = rooms[roomId].filter(user => user.userId !== userId);
                    socket.broadcast.to(roomId).emit('user-disconnected', findExistUser.peerId);
                }
            }

            rooms[roomId].push({ peerId, userId, userInfo, isStream, isMuted });
            socket.broadcast.to(roomId).emit('user-connected', userInfo, isStream, isMuted);

            callback({ success: true });

            socket.on('get-room-info', (callback) => {
                const roomInfo = rooms[roomId] || [];
                callback(roomInfo);
            });

            socket.on('toggle-video', (data) => {
                findPeer = rooms[roomId].find((r) => r.peerId === data.peerId);
                if (findPeer) {
                    findPeer.isStream = data.isStream;
                    socket.broadcast.to(roomId).emit('toggle-video', data);
                }
            });

            socket.on('toggle-audio', (data) => {
                findPeer = rooms[roomId].find((r) => r.peerId === data.peerId);
                if (findPeer) {
                    findPeer.isMuted = data.isMuted;
                    socket.broadcast.to(roomId).emit('toggle-audio', data);
                }
            });

            socket.on('startDrawing', (data) => {
                socket.broadcast.emit('startDrawing', data);
            });

            socket.on('drawing', (data) => {
                socket.broadcast.emit('drawing', data);
            });

            socket.on('stopDrawing', () => {
                socket.broadcast.emit('stopDrawing');
            });

            socket.on('insertText', (data) => {
                socket.broadcast.emit('insertText', data);
            });

            socket.on('undoDrawing', () => {
                socket.broadcast.emit('undoDrawing');
            });

            socket.on('redoDrawing', () => {
                socket.broadcast.emit('redoDrawing');
            });

            socket.on('clearDrawing', () => {
                socket.broadcast.emit('clearDrawing');
            });

            socket.on('message', (data) => {
                socket.broadcast.to(roomId).emit('new-message', data);
            });

            socket.on('microphone-volume', (data) => {
                socket.broadcast.to(roomId).emit('update-volume', data);
            });

            socket.on('open_material', (data) => {
                socket.broadcast.to(roomId).emit('open_material', data);
            });

            socket.on('open_task', (data) => {
                socket.broadcast.to(roomId).emit('open_task', data);
            });

            socket.on('close_task', (data) => {
                socket.broadcast.to(roomId).emit('close_task', data);
            });

            socket.on('start_task', (data) => {
                socket.broadcast.to(roomId).emit('start_task', data);
            });

            socket.on('complete_task', (data) => {
                socket.broadcast.to(roomId).emit('complete_task', data);
            });

            socket.on('start_test', () => {
                socket.broadcast.to(roomId).emit('start_test');
            });
        } catch (error) {
            socket.disconnect();
        }
    });

    socket.on('disconnect', () => {
        if (socket.room_id && socket.peer_id) {
            rooms[socket.room_id] = rooms[socket.room_id].filter(user => user.peerId !== socket.peer_id);

            socket.broadcast.to(socket.room_id).emit('user-disconnected', socket.peer_id);

            if (rooms[socket.room_id].length === 0) {
                delete rooms[socket.room_id];
            }

            socket.leave(socket.room_id);
        }
    });
});