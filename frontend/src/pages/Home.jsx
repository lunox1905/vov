import React, { useContext } from "react";
import { SocketContext } from "../context/SocketContext";
import { Outlet } from "react-router-dom";
import { VerticalNav } from "../components/VerticalNav";
export const Home = () => {
    const { isConnected } = useContext(SocketContext);
    
    return (
        <>
         
            {isConnected ? (
                <>
                    <div className="flex">
                        <VerticalNav />
                        <Outlet/>
                    </div>
                   
                </>
            ) : (
                <div className="flex justify-center"> Cannot connect to server retrying...</div>
            )}  
        </>
    )
}