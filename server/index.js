import { Server } from 'socket.io';

const io = new Server(8000, {
  cors: {
    origin: '*', 
  },
});


const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on('connection', (socket) => {
  console.log(`socket connected ${socket.id}`);

  socket.on('room:join', (data) => {
    const { email, room } = data;
    console.log(data);
    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    io.to(room).emit('user:joined', {email, id : socket.id})

    socket.join(room)
  
    io.to(socket.id).emit('room:join', data);
  });

  socket.on("user:call", ({to, offer, room}) => {
    io.to(to).emit("incoming:call", {from : socket.id , offer})
  });

  socket.on('call:incoming', ({to, room}) => {
    // Optional: You can add additional logic here if needed
    console.log(`Incoming call in room ${room}`);
  });

  socket.on('call:accepted', ({to , ans, room}) => {
    io.to(to).emit("call:accepted", {from : socket.id , ans})
  });

  socket.on('call:declined', ({to, room}) => {
    io.to(to).emit("call:declined")
  });

  socket.on('peer:nego:needed', ({to, offer, room})=>{
    io.to(to).emit("peer:nego:needed", {from : socket.id , offer})
  });

  socket.on('peer:nego:done', ({to, ans, room})=>{
    io.to(to).emit("peer:nego:final", {from : socket.id , ans})
  });
});