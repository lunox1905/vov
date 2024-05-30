import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { VerticalNav } from '../components/VerticalNav';
function Layout() {
    return (
        <div className='flex'>
            <VerticalNav/>
            <Outlet />
        </div>
    );
}

export default Layout;