import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import mediasoupClient from "mediasoup-client"
const SocketContext = createContext();
export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const SERVER_URL = import.meta.env.SERVER_URL || 'http://localhost:3000/mediasoup';
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io(SERVER_URL); // Adjust the URL as necessary
       
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
