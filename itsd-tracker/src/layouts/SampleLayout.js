import React from 'react';
import SampleSidebar from '../components/SampleSidebar';

const SampleLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <SampleSidebar />
            <main style={{ flex: 1, padding: '20px' }}>
                <header style={{ borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                    <h1>Sample Application Header</h1>
                </header>
                <div className="content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default SampleLayout;
