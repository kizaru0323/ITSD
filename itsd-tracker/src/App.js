import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/Users';
import AdminGroups from './pages/admin/Groups';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminAccountRequests from './pages/admin/AccountRequests';
import AdminOffices from './pages/admin/Offices';
import UserDashboard from './pages/user/UserDashboard';
import UserCalendar from './pages/user/UserCalendar';
import UserAnnouncements from './pages/user/UserAnnouncements';
import SharedSettings from './pages/SharedSettings';
import UserTeam from './pages/user/UserTeam';
import RecordList from './pages/user/RecordList';
import NewCommunication from './pages/user/NewCommunication';
import InternalCommunication from './pages/user/InternalCommunication';
import InternalRequestList from './pages/user/InternalRequestList';
import ActivityLogs from './pages/user/ActivityLogs';
import Login from './pages/Login';
import './App.css';

function App() {
    return (
        <div className="App">
            <Routes>
                {/* MAIN ENTRANCE: LOGIN */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Navigate to="/" replace />} />

                {/* ADMIN ROUTES */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/groups" element={<AdminGroups />} />
                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                <Route path="/admin/activity-logs" element={<ActivityLogs role="ADMIN" />} />
                <Route path="/admin/requests" element={<AdminAccountRequests />} />
                <Route path="/admin/offices" element={<AdminOffices />} />

                <Route path="/admin/communications" element={<RecordList role="ADMIN" filter="PENDING" />} />
                <Route path="/admin/processed" element={<RecordList role="ADMIN" filter="PROCESSED" />} />
                <Route path="/admin/calendar" element={<UserCalendar role="ADMIN" />} />
                <Route path="/admin/settings" element={<SharedSettings role="ADMIN" />} />

                {/* USER ROUTES (Consolidated Staff features) */}
                <Route path="/user" element={<Navigate to="/user/overview" replace />} />
                <Route path="/user/dashboard" element={<UserDashboard />} />
                <Route path="/user/overview" element={<UserDashboard />} />
                <Route path="/user/new-communication" element={<NewCommunication />} />
                <Route path="/user/internal-request" element={<InternalCommunication />} />
                <Route path="/user/internal-list" element={<InternalRequestList />} />
                <Route path="/user/division-review" element={<RecordList filter="DIVISION_REVIEW" />} />
                <Route path="/user/communications" element={<RecordList filter="PENDING" />} />
                <Route path="/user/announcements" element={<UserAnnouncements />} />
                <Route path="/user/activity-logs" element={<ActivityLogs role="USER" />} />
                <Route path="/user/organizations" element={<UserTeam />} /> {/* Team as Organizations */}
                <Route path="/user/processed" element={<RecordList filter="PROCESSED" />} />

                <Route path="/user/settings" element={<SharedSettings role="USER" />} />

                {/* Default: redirect to landing */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
