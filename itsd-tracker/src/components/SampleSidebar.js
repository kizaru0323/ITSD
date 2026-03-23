import React from 'react';

const SampleSidebar = () => {
    return (
        <aside style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
            <h3>Sample Sidebar</h3>
            <ul>
                <li>Home</li>
                <li>Dashboard</li>
                <li>Settings</li>
            </ul>
        </aside>
    );
};

export default SampleSidebar;
