import React, { createContext, useRef,useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import mediasoupClient from "mediasoup-client"
const SocketContext = createContext();
 const SocketProvider = ({ children }) => {
    const SERVER_URL = import.meta.env.SERVER_URL || 'http://localhost:3000/mediasoup';
    const socket = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
     useEffect(() => {
        const initializeWebSocket = () => {
            console.log("URL", SERVER_URL)
            socket.current = io(SERVER_URL);

            socket.current.on('connect', () => {
                console.log('WebSocket connection established');
                setIsConnected(true);
            });
          
            socket.current.on('disconnect', () => {
                console.log('WebSocket connection closed');
                setIsConnected(false);
                setTimeout(initializeWebSocket, 1000); 
            });


            socket.current.on('error', (error) => {
                console.error('Socket encountered an error:', error);
                setIsConnected(false);
                setTimeout(initializeWebSocket, 1000);
            });

            // Handle connection timeout
            socket.current.on('connect_timeout', (timeout) => {
                console.error('Socket connection timed out:', timeout);
            });
        };

        initializeWebSocket();

        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socket.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
export { SocketContext, SocketProvider };