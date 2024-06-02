import React from 'react';
import { Outlet, Link } from 'react-router-dom';

import { HorizontalNav } from '../components/HorizontalNav';
function Layout() {
    return (
        <div >
            <HorizontalNav />
            <Outlet />
        </div>
    );
}

export default Layout;