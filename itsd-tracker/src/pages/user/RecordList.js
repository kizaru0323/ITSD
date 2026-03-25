import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import UserLayout from '../../layouts/UserLayout';
import AdminLayout from '../../layouts/AdminLayout';
import SearchFilter from '../../components/SearchFilter';
import { logActivity } from '../../utils/activityLogger';
import Pagination from '../../components/Pagination';
import { hasPermission } from '../../utils/auth';
import AttachmentViewer from '../../components/AttachmentViewer';
import { API_BASE_URL, getAttachmentUrl } from '../../apiConfig';
import './RecordList.css';

const DIRECTIONS = ['INCOMING', 'OUTGOING', 'ITSD ONLY'];
const KIND_OPTIONS = ['Executive Order', 'Memorandum Order', 'Notice', 'Transmittals', 'Letter Requests', 'Letter of Intent', 'Response Letter'];

const RecordList = ({ role = "USER", filter = "ALL" }) => {
    const location = useLocation();
    const isAdmin = role && role.toUpperCase() === 'ADMIN';
    const Layout = isAdmin ? AdminLayout : UserLayout;
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [subFilter, setSubFilter] = useState('ALL'); // ALL, APPROVED, DECLINED
    const [assignedToFilter, setAssignedToFilter] = useState('ALL');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const assigneeContainerRef = useRef(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [offices, setOffices] = useState([]);
    const [sectionHeads, setSectionHeads] = useState([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnRemarks, setReturnRemarks] = useState('');
    const [recordToReturn, setRecordToReturn] = useState(null);
    const [newAttachments, setNewAttachments] = useState([]);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionRecord, setCompletionRecord] = useState(null);
    const [completionFiles, setCompletionFiles] = useState([]);
    const [completionRemarksInput, setCompletionRemarksInput] = useState('');
    const [allGroups, setAllGroups] = useState([]);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [recordToAssignSection, setRecordToAssignSection] = useState(null);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [notification, setNotification] = useState(null); // { message, type: 'success' | 'error' }

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const fetchRecords = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/communications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch communications');
            const data = await response.json();
            setRecords(data);
            // applyFilters(data, subFilter); // Removed: handled by useEffect
        } catch (error) {
            console.error('Error fetching communications:', error);
            setRecords([]);
            setFilteredRecords([]);
        }
    }, []); // Removed subFilter/filter dependencies to prevent loops

    const applyFilters = useCallback((data, currentSubFilter) => {
        let result = data;
        if (filter === 'PROCESSED') {
            result = data.filter(c => {
                const s = (c.status || '').toUpperCase().trim();
                return s === 'DECLINED' || s === 'COMPLETED' || s === 'READY FOR ARCHIVING';
            });
        } else if (filter === 'PENDING') {
            result = data.filter(c => {
                const s = (c.status || '').toUpperCase().trim();
                return s === 'PENDING' || s === 'RETURNED' || s === 'APPROVED' || s === 'PENDING_SECTION_HEAD' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'DIV_ACCEPTED';
            });
        } else if (filter === 'DIVISION_REVIEW') {
            result = data.filter(c => {
                const s = (c.status || '').toUpperCase().trim();
                return s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'DIV_ACCEPTED';
            });
        }

        if (currentSubFilter && currentSubFilter !== 'ALL') {
            result = result.filter(c => (c.status || '').toUpperCase() === currentSubFilter);
        }
        setFilteredRecords(result);
    }, [filter]);

    // Initial load and on filter change
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords, filter]);

    // Synchronize filteredRecords whenever records or subFilter changes
    useEffect(() => {
        applyFilters(records, subFilter);
    }, [records, subFilter, applyFilters]);

    React.useEffect(() => {
        const fetchUsers = async () => {
            const userRaw = sessionStorage.getItem('itsd_user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                setCurrentUser(user);
                
                // Fetch directory if admin OR if they have a groupId (Section Head flow)
                if (user.role?.toLowerCase() === 'admin' || user.role === 'Admin' || user.groupId) {
                    try {
                        const token = sessionStorage.getItem('itsd_auth_token');
                        let url = `${API_BASE_URL}/api/users`;
                        
                        // If they have a groupId AND don't have global management powers, restrict to their group
                        if (user.groupId && !user.permissions?.includes('manage_all_assignments')) {
                            url += `?groupId=${user.groupId}`;
                        }

                        const userRes = await fetch(url, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const userData = await userRes.json();
                        setAllUsers(Array.isArray(userData) ? userData : []);

                        // Fetch Section Heads
                        const headRes = await fetch(`${API_BASE_URL}/api/users?isHead=true`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const headData = await headRes.json();
                        setSectionHeads(Array.isArray(headData) ? headData : []);

                        // Fetch Offices
                        const officeRes = await fetch(`${API_BASE_URL}/api/offices`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const officeData = await officeRes.json();
                        setOffices(Array.isArray(officeData) ? officeData : []);

                        // Fetch All Groups (Sections)
                        const groupRes = await fetch(`${API_BASE_URL}/api/groups`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const groupData = await groupRes.json();
                        setAllGroups(Array.isArray(groupData) ? groupData : []);
                    } catch (err) {
                        console.error('Error fetching metadata:', err);
                    }
                }
            }
        };
        fetchUsers();
    }, []);

    React.useEffect(() => {
        if (location.state?.expandRecordId && records.length > 0) {
            setExpandedRow(location.state.expandRecordId);
        }
    }, [location.state, records]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Apply assignedTo filter on top of filteredRecords
    const displayedRecords = assignedToFilter === 'ALL'
        ? filteredRecords
        : filteredRecords.filter(r => {
            if (assignedToFilter === 'Unassigned') {
                return (!r.Assignees || r.Assignees.length === 0) && !r.assignedTo;
            }
            // Check in the multi-assignee collection first
            const inCollection = r.Assignees?.some(u => u.name === assignedToFilter);
            // Fallback to legacy virtual field
            const inVirtual = r.assignedTo === assignedToFilter;
            return inCollection || inVirtual;
        });

    const currentItems = displayedRecords.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(displayedRecords.length / itemsPerPage);

    // Unique assigned-to names from all records (not filtered)
    const assignedToOptions = ['ALL', ...Array.from(new Set(
        filteredRecords.flatMap(r => {
            const names = r.Assignees?.map(u => u.name) || [];
            if (r.assignedTo) names.push(r.assignedTo);
            return names.length > 0 ? names : ['Unassigned'];
        }).filter(Boolean)
    )).sort()];

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close suggestion list if clicking outside the container
            if (assigneeContainerRef.current && !assigneeContainerRef.current.contains(event.target)) {
                // Delay closing slightly to allow onClick to fire on list items
                setTimeout(() => setShowAssigneeSuggestions(false), 200);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleRow = (record) => {
        setExpandedRow(expandedRow === record.id ? null : record.id);
        if (expandedRow !== record.id) {
            logActivity(
                'View Communication Details',
                `Tracking ID: ${record.trackingId || 'N/A'} | Subject: ${record.subject || 'N/A'}`,
                'USER',
                'Records'
            );
        }
    };

    const viewAttachment = (e, record, specificFile = null) => {
        e.stopPropagation();

        const files = record.attachments && record.attachments.length > 0
            ? record.attachments
            : (record.attachment ? [record.attachment] : []);

        const index = specificFile ? files.indexOf(specificFile) : 0;

        setSelectedAttachment(record);
        setCurrentPageIndex(index >= 0 ? index : 0);
        setShowAttachmentModal(true);
        logActivity('View', `Opened attachment preview for Tracking ID: ${record.trackingId}`, 'USER', 'Records');
    };

    const handleUpdateAssignees = async (recordId, newIds) => {
        setIsUpdatingTags(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/communications/${recordId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ assignedToIds: newIds })
            });

            if (!response.ok) throw new Error('Failed to update assignees');
            
            // Refresh list using the centralized function
            fetchRecords();
        } catch (error) {
            console.error('Update failed:', error.message);
        } finally {
            setIsUpdatingTags(false);
            // Don't close immediately here, the outside click or manual selection will handle it
        }
    };

    const handleDivReview = async (id, action, remarks = null) => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/communications/${id}/div-review`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action, publicRemarks: remarks })
            });

            if (!response.ok) throw new Error('Failed to submit review');
            
            const updatedComm = await response.json();
            setRecords(records.map(r => r.id === id ? updatedComm : r));
            applyFilters(records.map(r => r.id === id ? updatedComm : r), subFilter);
            
            logActivity('Division Review', `${action} communication ID: ${id}`, role, 'Records');
        } catch (error) {
            console.error('Error in handleDivReview:', error);
            setNotification({ message: 'Review failed. Please try again.', type: 'error' });
        }
    };

    const handleAssignSections = async (id, groupIds) => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/communications/${id}/assign-sections`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ groupIds })
            });

            if (!response.ok) throw new Error('Failed to assign sections');
            
            fetchRecords();
            setShowSectionModal(false);
            setRecordToAssignSection(null);
            setSelectedGroupIds([]);
        } catch (error) {
            console.error('Error assigning sections:', error);
            setNotification({ message: 'Failed to assign sections. Please try again.', type: 'error' });
        }
    };

    const handleStatusUpdate = async (id, newStatus, remarks = null, files = []) => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const record = records.find(r => r.id === id);
            
            let response;
            if (newStatus === 'COMPLETED' && files.length > 0) {
                const formData = new FormData();
                formData.append('status', newStatus);
                formData.append('completionRemarks', remarks || '');
                files.forEach(file => formData.append('proof', file));

                response = await fetch(`${API_BASE_URL}/api/communications/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/communications/${id}/status`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        status: newStatus,
                        publicRemarks: remarks !== null ? remarks : (record?.publicRemarks || '')
                    })
                });
            }

            if (!response.ok) throw new Error('Failed to update status');

            // Update local state
            const updated = records.map(r => r.id === id ? { ...r, status: newStatus } : r);
            setRecords(updated);

            // Re-apply filtering (Case Insensitive)
            applyFilters(updated, subFilter);

            logActivity('Status Update', `${newStatus} communication ID: ${id}`, role, 'Records');

            if (newStatus === 'APPROVED') {
                setNotification({ message: 'Communication successfully sent to personnel.', type: 'success' });
            } else if (newStatus === 'COMPLETED') {
                setNotification({ message: 'Task marked as completed successfully.', type: 'success' });
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setNotification({ message: 'Failed to update status. Please try again.', type: 'error' });
        }
    };

    const handleSubFilter = (type) => {
        const newSubFilter = subFilter === type ? 'ALL' : type;
        setSubFilter(newSubFilter);
        applyFilters(records, newSubFilter);
        setCurrentPage(1);
    };


    const handleExport = () => {
        logActivity('Export', `Exported ${filteredRecords.length} communications to Excel`, role, 'Records');

        // Generate Excel-compatible HTML table
        const tableHeader = '<tr><th>ID</th><th>TRACKING ID</th><th>SUBJECT</th><th>STATUS</th><th>DATE</th><th>OFFICE</th><th>PRIORITY</th><th>KIND</th><th>TYPE</th></tr>';
        const tableRows = filteredRecords.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.trackingId}</td>
                <td>${r.subject}</td>
                <td>${r.status}</td>
                <td>${r.date}</td>
                <td>${r.office || ''}</td>
                <td>${r.priority}</td>
                <td>${r.kind || ''}</td>
                <td>${r.type || ''}</td>
            </tr>
        `).join('');

        const excelTemplate = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Communications</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
            <body><table>${tableHeader}${tableRows}</table></body>
            </html>
        `;

        const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ITSD_Communications_${new Date().getTime()}.xls`;
        a.click();
    };

    const handleBatchStatus = async (status) => {
        if (!selectedRecords.length) return;
        setIsUpdatingBatch(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/communications/batch-status`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedRecords, status })
            });
            if (!res.ok) throw new Error('Batch update failed');
            
            // Update local state smoothly
            const updated = records.map(r => 
                selectedRecords.includes(r.id) ? { ...r, status } : r
            );
            setRecords(updated);

            // Re-apply filtering
            if (filter === 'PROCESSED') {
                setFilteredRecords(updated.filter(c => {
                    const s = (c.status || '').toUpperCase().trim();
                    return s === 'DECLINED' || s === 'COMPLETED' || s === 'READY FOR ARCHIVING';
                }));
            } else if (filter === 'PENDING') {
                setFilteredRecords(updated.filter(c => {
                    const s = (c.status || '').toUpperCase().trim();
                    return s === 'PENDING' || s === 'RETURNED' || s === 'APPROVED' || s === 'PENDING_SECTION_HEAD' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'DIV_ACCEPTED';
                }));
            } else {
                setFilteredRecords(updated);
            }

            setSelectedRecords([]); // Clear selection after update
            logActivity('Batch Status Update', `Mass ${status} for ${selectedRecords.length} records`, role, 'Records');
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Batch update failed. Please try again.', type: 'error' });
        } finally {
            setIsUpdatingBatch(false);
        }
    };

    const toggleSelection = (id) => {
        setSelectedRecords(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const openReturnModal = (record) => {
        setRecordToReturn(record);
        setReturnRemarks(record.publicRemarks || '');
        setShowReturnModal(true);
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        if (!recordToReturn) return;
        
        const s = (recordToReturn.status || '').toUpperCase();
        if (s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL') {
            await handleDivReview(recordToReturn.id, 'RETURN', returnRemarks);
        } else {
            await handleStatusUpdate(recordToReturn.id, 'RETURNED', returnRemarks);
        }
        
        setShowReturnModal(false);
        setRecordToReturn(null);
        setReturnRemarks('');
    };

    const handleEditResubmit = (record) => {
        setEditingRecord(record);
        setEditForm({
            ...record,
            kinds: record.kind ? record.kind.split(',').map(k => k.trim()) : [],
            tags: record.tags ? record.tags.split(',').map(t => t.trim()) : [],
            assignedToIds: record.Assignees ? record.Assignees.map(a => a.id) : [],
            sectionHead: record.sectionHeadLabel || record.sectionHead || '',
            office: record.officeLabel || record.office || '',
            date: record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            attachments: Array.isArray(record.attachments) ? [...record.attachments] : []
        });
        setNewAttachments([]);
        setShowEditModal(true);
    };

    const handleResubmitConfirm = async (e) => {
        if (e) e.preventDefault();
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const formData = new FormData();
            
            // Basic fields
            const fields = ['direction', 'type', 'date', 'office', 'subject', 'details', 'sectionHead', 'sectionHeadId', 'officeId', 'priority'];
            fields.forEach(f => {
                if (editForm[f]) formData.append(f, editForm[f]);
            });

            formData.append('kinds', editForm.kinds.join(', '));
            formData.append('tags', editForm.tags.join(', '));
            formData.append('assignedToIds', JSON.stringify(editForm.assignedToIds));
            
            // Existing attachments to keep
            formData.append('existingAttachments', JSON.stringify(editForm.attachments));
            
            // New attachments
            newAttachments.forEach(file => {
                formData.append('attachment', file);
            });

            const response = await fetch(`${API_BASE_URL}/api/communications/${editingRecord.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to resubmit');
            }

            const updated = await response.json();
            setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
            setShowEditModal(false);
            setEditingRecord(null);
            setEditForm(null);
            setNewAttachments([]);
            logActivity('Resubmission', `Resubmitted communication ${updated.trackingId}`, role, 'Records');
            
            // Refresh to ensure filters apply
            fetchRecords();
        } catch (error) {
            console.error('Error updating status:', error);
            setNotification({ message: error.message || 'Failed to update record.', type: 'error' });
        }
    };

    const handleCompletionSubmit = async () => {
        if (!completionRecord) return;
        if (completionFiles.length === 0) {
            setNotification({ message: 'Please upload at least one attachment as proof of completion.', type: 'error' });
            return;
        }

        await handleStatusUpdate(completionRecord.id, 'COMPLETED', completionRemarksInput, completionFiles);
        setShowCompletionModal(false);
        setCompletionRecord(null);
        setCompletionFiles([]);
        setCompletionRemarksInput('');
    };

    return (
        <Layout
            title={
                filter === 'PROCESSED' ? "PROCESSED LISTS" :
                    filter === 'PENDING' ? "RECEIVED TICKETS" : "TICKET LISTS"
            }
            subtitle={
                filter === 'PROCESSED'
                    ? (role === 'ADMIN' ? "Overview of all approved and declined records across the system" : "View your approved and declined communication records")
                    : filter === 'PENDING'
                        ? (isAdmin ? "New Tickets Awaiting Review" : "Track status of your received submissions")
                        : (isAdmin ? "Manage and Oversee Submitted Service Dispatches" : "Registry of Submitted Service Dispatches")
            }
        >
            <div className="record-list-container animate-fade-in">
                {isAdmin && filter === 'PROCESSED' && (
                    <div className="lists-header-summary stats-header-grid">
                        <div
                            className={`modern-stat-card blue ${subFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('ALL')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">TOTAL PROCESSED</span>
                                <span className="stat-value">
                                    {records.filter(r => {
                                        const s = (r.status || '').toUpperCase();
                                        return s === 'DECLINED' || s === 'COMPLETED' || s === 'READY FOR ARCHIVING';
                                    }).length}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`modern-stat-card red ${subFilter === 'DECLINED' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('DECLINED')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">DECLINED</span>
                                <span className="stat-value">
                                    {records.filter(r => (r.status || '').toUpperCase() === 'DECLINED').length}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`modern-stat-card indigo ${subFilter === 'COMPLETED' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('COMPLETED')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">COMPLETED</span>
                                <span className="stat-value">
                                    {records.filter(r => (r.status || '').toUpperCase() === 'COMPLETED').length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {isAdmin && filter === 'PENDING' && (
                    <div className="lists-header-summary stats-header-grid">
                        <div
                            className={`modern-stat-card blue ${subFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('ALL')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">PENDING (ALL)</span>
                                <span className="stat-value">
                                    {records.filter(r => {
                                        const s = (r.status || '').toUpperCase();
                                        return s === 'PENDING' || s === 'RETURNED' || s === 'APPROVED' || s === 'PENDING_SECTION_HEAD' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'DIV_ACCEPTED';
                                    }).length}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`modern-stat-card yellow ${subFilter === 'PENDING' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('PENDING')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">PENDING</span>
                                <span className="stat-value">
                                    {records.filter(r => (r.status || '').toUpperCase() === 'PENDING').length}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`modern-stat-card green ${subFilter === 'APPROVED' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('APPROVED')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">ACTIVE (APPROVED)</span>
                                <span className="stat-value">
                                    {records.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length}
                                </span>
                            </div>
                        </div>
                        <div
                            className={`modern-stat-card red ${subFilter === 'RETURNED' ? 'active' : ''}`}
                            onClick={() => handleSubFilter('RETURNED')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon-circle">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"></path></svg>
                            </div>
                            <div className="stat-info">
                                <span className="stat-label">RETURNED</span>
                                <span className="stat-value">
                                    {records.filter(r => (r.status || '').toUpperCase() === 'RETURNED').length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="list-controls-row">
                    <SearchFilter
                        placeholder="Search communications..."
                        data={records.filter(c => {
                            const s = (c.status || '').toUpperCase().trim();
                            if (filter === 'PROCESSED') return s === 'DECLINED' || s === 'COMPLETED' || s === 'APPROVED' || s === 'READY FOR ARCHIVING';
                            if (filter === 'PENDING') return s === 'PENDING' || s === 'RETURNED' || s === 'APPROVED' || s === 'PENDING_SECTION_HEAD' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'DIV_ACCEPTED';
                            return true;
                        })}
                        onSearch={(filtered) => {
                            setFilteredRecords(filtered);
                            setCurrentPage(1);
                        }}
                        searchSuffix={
                            <div className="assigned-to-inline-group">
                                <label>Assigned To:</label>
                                <select
                                    value={assignedToFilter}
                                    onChange={e => { setAssignedToFilter(e.target.value); setCurrentPage(1); }}
                                >
                                    {assignedToOptions.map(name => (
                                        <option key={name} value={name}>
                                            {name === 'ALL' ? '— All Personnel —' : name}
                                        </option>
                                    ))}
                                </select>
                                {assignedToFilter !== 'ALL' && (
                                    <button
                                        className="clear-filter-btn"
                                        onClick={() => { setAssignedToFilter('ALL'); setCurrentPage(1); }}
                                    >
                                        ✕ Clear
                                    </button>
                                )}
                            </div>
                        }
                        actions={
                            hasPermission('generate_reports') && (
                                <button className="export-data-btn" onClick={handleExport}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>EXPORT</span>
                                </button>
                            )
                        }
                    />
                </div>

                {isAdmin && selectedRecords.length > 0 && (
                    <div className="batch-actions-toolbar animate-slide-down">
                        <div className="batch-info">
                            <span className="count">{selectedRecords.length}</span> records selected
                        </div>
                        <div className="batch-btns">
                            <button className="approve" onClick={() => handleBatchStatus('APPROVED')} disabled={isUpdatingBatch}>APPROVE ALL</button>
                            <button className="decline" onClick={() => handleBatchStatus('DECLINED')} disabled={isUpdatingBatch}>DECLINE ALL</button>
                            <button className="clear" onClick={() => setSelectedRecords([])}>CLEAR</button>
                        </div>
                    </div>
                )}

                <div className="custom-table-modern glass-premium">
                    <div className="table-header navy-header">
                        {isAdmin && <div className="col checkbox-col"></div>}
                        <div className="col id" data-label="#">#</div>
                        <div className="col tracking" data-label="TRACKING ID">TRACKING ID</div>
                        <div className="col subject" data-label="SUBJECT">SUBJECT</div>
                        <div className="col status" data-label="STATUS">STATUS</div>
                        <div className="col action" data-label="ACTION">ACTION</div>
                    </div>
                    <div className="table-body">
                        {currentItems.length > 0 ? (
                            currentItems.map((record, index) => (
                                <div key={record.id} className={`table-row-group ${expandedRow === record.id ? 'expanded' : ''}`}>
                                    <div className="main-row" onClick={() => toggleRow(record)}>
                                        {isAdmin && (
                                            <div className="col checkbox-col" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedRecords.includes(record.id)} 
                                                    onChange={() => toggleSelection(record.id)} 
                                                />
                                            </div>
                                        )}
                                        <div className="col id" data-label="#">{indexOfFirstItem + index + 1}</div>
                                        <div className="col tracking" data-label="TRACKING ID">{record.trackingId}</div>
                                        <div className="col subject" data-label="SUBJECT"><div className="subject-text">{record.subject}</div></div>
                                        <div className="col status" data-label="STATUS">
                                            <span className={`status-badge ${(record.status || '').toLowerCase().replace(/_/g, '-').replace(/ /g, '-')}`}>
                                                {renderStatusLabel(record.status)}
                                            </span>
                                        </div>
                                        <div className="col action" data-label="ACTION">
                                            <button
                                                className="attachment-btn-vibrant"
                                                onClick={(e) => viewAttachment(e, record)}
                                            >
                                                ATTACHMENT
                                            </button>
                                        </div>
                                    </div>

                                    {expandedRow === record.id && (
                                        <div className="detail-panel animate-slide-down">
                                            <div className="detail-grid">
                                                <div className="progress-tracker-wrapper">
                                                    <ProgressTracker status={record.status} />
                                                </div>
                                                <div className="detail-info-item full">
                                                    <label>Full Details</label>
                                                    <p className="details-text">{record.details}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Direction</label>
                                                    <p className={`direction-tag ${record.direction?.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {record.direction === 'ITSD ONLY' ? 'INTERNAL' : record.direction}
                                                    </p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>KIND OF COMMUNICATION</label>
                                                    <p>{record.kind || '---'}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>File Type</label>
                                                    <p>{record.type || 'Digital Copy'}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Date Submitted</label>
                                                    <p>{new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Office / Organization</label>
                                                    <p>{record.office}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Priority</label>
                                                    <p className={`priority-text ${record.priority.toLowerCase()}`}>{record.priority}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Section Heads</label>
                                                    <div className="detail-tags-list">
                                                        {record.AssignedSections && record.AssignedSections.length > 0 ? (
                                                            record.AssignedSections.map(s => (
                                                                <span key={s.id} className="detail-tag-pill" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0369a1', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '6px 12px' }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                                    {s.SectionHead ? `${s.SectionHead.name} (${s.name})` : s.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <p>{record.sectionHead || '---'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Assigned Workers (Personnel)</label>
                                                    <div className="detail-tags-list">
                                                        {record.Assignees && record.Assignees.length > 0 ? (
                                                            record.Assignees.map(u => (
                                                                <span key={u.id} className="detail-tag-pill worker">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                                    {u.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            record.assignedTo ? (
                                                                <span className="detail-tag-pill worker legacy">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                                    {record.assignedTo}
                                                                </span>
                                                            ) : <p style={{ color: '#94a3b8', margin: 0 }}>No personnel tagged yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Follow-up</label>
                                                    <p className={`followup-text ${record.followUp === 'FOLLOW-UP REQUIRED' ? 'warning' : ''}`}>
                                                        {record.followUp}
                                                    </p>
                                                </div>

                                                {/* Manage Assignees: Master Admin OR designated Section Head (including multi-section heads) */}
                                                {(hasPermission('manage_all_assignments') || 
                                                  (record.sectionHeadId && parseInt(record.sectionHeadId) === currentUser?.id) ||
                                                  (record.AssignedSections?.some(s => s.headId === currentUser?.id))) ? (
                                                    <div className="detail-info-item full admin-tagging-manager" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1.5px dashed #e2e8f0' }}>
                                                        <label style={{ color: 'var(--primary-navy)', fontSize: '11px', marginBottom: '4px' }}>
                                                            {hasPermission('manage_all_assignments') ? 'MANAGE ASSIGNED PERSONNEL (ADMIN ACTION)' : 'DELEGATE PERSONNEL (SECTION HEAD ACTION)'}
                                                        </label>
                                                        {(!hasPermission('manage_all_assignments') && record.sectionHeadId && parseInt(record.sectionHeadId) === currentUser?.id) && (
                                                            <p style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>
                                                                You are assigning personnel as the designated Section Head.
                                                            </p>
                                                        )}
                                                        <div className="tags-system-modern" ref={assigneeContainerRef}>
                                                            <div className="tags-input-container" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }} onClick={() => setShowAssigneeSuggestions(record.id)}>
                                                                <div className="tags-list">
                                                                    {record.Assignees?.map(u => (
                                                                        <span key={u.id} className="tag-pill worker">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                                            {u.name}
                                                                            <button type="button" onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                const newIds = record.Assignees.filter(x => x.id !== u.id).map(x => x.id);
                                                                                handleUpdateAssignees(record.id, newIds);
                                                                            }}>✕</button>
                                                                        </span>
                                                                    ))}
                                                                    <input
                                                                        type="text"
                                                                        placeholder={((record.status === 'PENDING_DIV_HEAD' || record.status === 'PENDING_DIV_APPROVAL') && !hasPermission('manage_all_assignments')) ? "Locked..." : (isUpdatingTags ? "Updating..." : "Search to tag...")}
                                                                        value={assigneeSearch}
                                                                        onChange={(e) => setAssigneeSearch(e.target.value)}
                                                                        onFocus={() => setShowAssigneeSuggestions(record.id)}
                                                                        style={{ width: '150px', opacity: isUpdatingTags ? 0.5 : 1 }}
                                                                        disabled={isUpdatingTags || ((record.status === 'PENDING_DIV_HEAD' || record.status === 'PENDING_DIV_APPROVAL') && !hasPermission('manage_all_assignments'))}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {showAssigneeSuggestions === record.id && (
                                                                <div className="suggested-tags-scroll animate-fade-in" style={{ position: 'absolute', width: '100%', zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                                    {allUsers
                                                                        .filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) && parseInt(u.id) !== currentUser?.id)
                                                                        .map(u => {
                                                                            const isAssigned = record.Assignees?.some(x => parseInt(x.id) === parseInt(u.id));
                                                                            return (
                                                                                <div
                                                                                    key={u.id}
                                                                                    className={`suggested-tag-item ${isAssigned ? 'selected' : ''}`}
                                                                                    style={{ padding: '10px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9' }}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        let newIds = record.Assignees?.map(x => x.id) || [];
                                                                                        if (isAssigned) {
                                                                                            newIds = newIds.filter(id => parseInt(id) !== parseInt(u.id));
                                                                                        } else {
                                                                                            newIds = [...newIds, u.id];
                                                                                        }
                                                                                        handleUpdateAssignees(record.id, newIds);
                                                                                    }}
                                                                                >
                                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isAssigned ? '#10b981' : '#e2e8f0' }}></div>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-navy)' }}>{u.name}</span>
                                                                                        <span style={{ fontSize: '9px', color: '#64748b' }}>{u.department}</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (currentUser?.groupId && record.sectionHeadId) && (
                                                    <div className="detail-info-item full managed-by-other" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1.5px dashed #e2e8f0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-navy)' }}>READ-ONLY ACCESS</span>
                                                                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Delegation managed by {record.sectionHead || 'another Section Head'}.</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                 {record.status === 'RETURNED' && record.publicRemarks && (
                                                    <div className="detail-info-item full public-feedback-display animate-fade-in" style={{ marginTop: '15px' }}>
                                                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                                <label style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Revision Instructions / Remarks</label>
                                                            </div>
                                                            <p style={{ color: '#450a0a', fontSize: '13px', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>{record.publicRemarks}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {record.publicRemarks && !isAdmin && record.status !== 'RETURNED' && (
                                                    <div className="detail-info-item full public-feedback-display">
                                                        <label>Admin Feedback / Remarks</label>
                                                        <div className="feedback-content">
                                                            <p>{record.publicRemarks}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="detail-info-item">
                                                    {record.tags && (
                                                        <div style={{ marginBottom: '20px' }}>
                                                            <label>Tags</label>
                                                            <div className="detail-tags-list">
                                                                {record.tags.split(',').map((tag, idx) => (
                                                                    <span key={idx} className="detail-tag-pill">{tag.trim()}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="record-attachments-section">
                                                        <label>Attachments ({record.attachments?.length || 0})</label>
                                                        <div className="attachments-list-horizontal">
                                                            {record.attachments && record.attachments.length > 0 ? (
                                                                record.attachments.map((file, idx) => (
                                                                    <div key={idx} className="attachment-chip" onClick={(e) => viewAttachment(e, record, file)}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                                                                        </svg>
                                                                        <span className="file-name-truncate">{typeof file === 'string' ? file : file.name}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="attachments-placeholder" onClick={(e) => viewAttachment(e, record)}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                                                                    </svg>
                                                                    <span>{`Official_Document_#${record.trackingId.split('-').pop()}.pdf`}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {record.status === 'COMPLETED' && (record.completionProof?.length > 0 || record.completionRemarks) && (
                                                    <div className="detail-info-item span-2">
                                                        <label>Proof of Completion</label>
                                                        <div className="completion-proof-container">
                                                            {record.completionProof?.length > 0 && (
                                                                <div className="attachments-list-horizontal" style={{ marginTop: '8px' }}>
                                                                    {record.completionProof.map((file, idx) => {
                                                                        const fileName = typeof file === 'string' ? file : file.name;
                                                                        return (
                                                                            <div key={idx} className="attachment-chip" onClick={(e) => viewAttachment(e, record, file)}>
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                                                                                </svg>
                                                                                <span className="file-name-truncate">{fileName.includes('-') && !fileName.match(/^\d+$/) ? fileName.split('-').slice(1).join('-') : fileName}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {record.completionRemarks && (
                                                                <div className="completion-remarks-box" style={{ marginTop: '12px' }}>
                                                                    <strong>Assignee Remarks:</strong>
                                                                    <p className="details-text">{record.completionRemarks}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Administrative Actions */}


                                                {/* Division Head Actions */}
                                                {hasPermission('review_communication') && currentUser?.role !== 'Admin Section' && 
                                                 (['PENDING', 'PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL'].includes(record.status)) && (
                                                    <div className="detail-info-item full">
                                                        <label>Division Head Review</label>
                                                        <p className="details-text" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                                                            Step 1: Assign sections if needed. Step 2: Click Accept to route the record to the selected Section Heads.
                                                        </p>
                                                        <div className="admin-actions-group">
                                                            <button className="admin-btn approve" onClick={() => handleDivReview(record.id, record.status === 'PENDING_DIV_APPROVAL' ? 'APPROVE_INTERNAL' : 'ACCEPT')}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                {record.status === 'PENDING_DIV_APPROVAL' ? 'APPROVE & ROUTE' : 'ACCEPT & ROUTE'}
                                                            </button>
                                                            <button className="admin-btn decline" onClick={() => handleDivReview(record.id, 'DECLINE')}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                DECLINE
                                                            </button>
                                                            <button className="admin-btn return" onClick={() => {
                                                                setRecordToReturn(record);
                                                                setShowReturnModal(true);
                                                                // Note: handleReturnSubmit needs to check status to call handleDivReview(record.id, 'RETURN', remarks)
                                                            }}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 14l-4-4 4-4" /><path d="M5 10h11a4 4 0 010 8h-1" /></svg>
                                                                RETURN
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Division Head only: Section Assignment */}
                                                {(hasPermission('review_communication') || isAdmin) && currentUser?.role !== 'Admin Section' && 
                                                 (['DIV_ACCEPTED', 'PENDING', 'PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL'].includes(record.status)) && (
                                                    <div className="detail-info-item full">
                                                        <label>Section Assignment Required</label>
                                                        <div className="admin-actions-group">
                                                            <button className="admin-btn approve" onClick={() => {
                                                                setRecordToAssignSection(record);
                                                                setSelectedGroupIds(record.AssignedSections?.map(s => s.id) || []);
                                                                setShowSectionModal(true);
                                                            }}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                                ASSIGN SECTIONS
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Section Head Actions: Needs approve/decline/return perms AND must be the designated head (or Master Admin) */}
                                                {(hasPermission('approve_record') || hasPermission('decline_record') || hasPermission('return_record') || currentUser?.role === 'Section Head') && 
                                                 (record.status === 'READY FOR ARCHIVING' || record.status === 'PENDING' || record.status === 'RETURNED' || record.status === 'PENDING_SECTION_HEAD') && 
                                                 (isAdmin || 
                                                  ((record.sectionHeadId && parseInt(record.sectionHeadId) === currentUser?.id) ||
                                                   (record.AssignedSections?.some(s => s.headId === currentUser?.id)))) && currentUser?.role !== 'Admin Section' && (
                                                    <div className="detail-info-item full">
                                                        <label>{isAdmin ? 'Administrator Actions' : 'Section Head Actions'}</label>
                                                        <p className="details-text" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                                                             {record.status === 'PENDING_SECTION_HEAD' && "Step 1: Assign personnel below. Step 2: Click ACCEPT & SEND TO USER to finalize and notify the assigned personnel."}
                                                         </p>
                                                        <div className="admin-actions-group">
                                                            {(hasPermission('approve_record') || currentUser?.role === 'Section Head') && (
                                                                <button
                                                                    className={`admin-btn approve ${record.status === 'APPROVED' ? 'active' : ''}`}
                                                                    onClick={() => handleStatusUpdate(record.id, 'APPROVED')}
                                                                    disabled={record.status === 'APPROVED'}
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                    </svg>
                                                                     {record.status === 'PENDING_SECTION_HEAD' ? 'ACCEPT & SEND TO USER' : 'APPROVE'}
                                                                </button>
                                                            )}
                                                            {(hasPermission('decline_record') || currentUser?.role === 'Section Head') && (
                                                                <button
                                                                    className={`admin-btn decline ${record.status === 'DECLINED' ? 'active' : ''}`}
                                                                    onClick={() => handleStatusUpdate(record.id, 'DECLINED')}
                                                                    disabled={record.status === 'DECLINED' || record.status === 'RETURNED'}
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                    </svg>
                                                                    DECLINE
                                                                </button>
                                                            )}
                                                            {(hasPermission('return_record') || currentUser?.role === 'Section Head') && (
                                                                <button
                                                                    className={`admin-btn return ${record.status === 'RETURNED' ? 'active' : ''}`}
                                                                    onClick={() => openReturnModal(record)}
                                                                    disabled={record.status === 'RETURNED'}
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <path d="M9 14l-4-4 4-4" />
                                                                        <path d="M5 10h11a4 4 0 010 8h-1" />
                                                                    </svg>
                                                                    RETURN
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Edit Action removed as per user request to simplify flow */}

                                                {hasPermission('complete_task') && record.status === 'APPROVED' && 
                                                 (record.Assignees?.some(a => a.id === currentUser?.id)) && (
                                                    <div className="detail-info-item full">
                                                        <label>Personnel Actions</label>
                                                        <div className="admin-actions-group">
                                                            <button
                                                                className="admin-btn approve"
                                                                onClick={() => {
                                                                    setCompletionRecord(record);
                                                                    setShowCompletionModal(true);
                                                                }}
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                                SUBMIT AS COMPLETED
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Admin Section (Creator) Actions: Edit & Resubmit RETURNED records */}
                                                {record.status === 'RETURNED' && 
                                                 (isAdmin || record.userId === currentUser?.id) && (
                                                    <div className="detail-info-item full">
                                                        <label>Admin Section Actions</label>
                                                        <div className="admin-actions-group">
                                                            <button
                                                                className="admin-btn return"
                                                                onClick={() => handleEditResubmit(record)}
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                                EDIT & RESUBMIT
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="empty-table-state">No communications found matching your search.</div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={paginate}
                />

                {showEditModal && editForm && createPortal(
                    <div className="modern-overlay animate-fade-in" onClick={() => setShowEditModal(false)}>
                        <div className="modern-modal resubmit-premium-modal animate-zoom-in" onClick={e => e.stopPropagation()}>
                            <div className="modern-modal-header premium-header">
                                <div className="header-title-stack">
                                    <span className="subtitle-badge">
                                        {hasPermission('div_head_review') && (editingRecord?.status === 'PENDING_DIV_HEAD' || editingRecord?.status === 'PENDING_DIV_APPROVAL') ? 'ADMINISTRATION PORTAL' : 'RESUBMISSION PORTAL'}
                                    </span>
                                    <h3>
                                        {hasPermission('div_head_review') && (editingRecord?.status === 'PENDING_DIV_HEAD' || editingRecord?.status === 'PENDING_DIV_APPROVAL') ? 'Edit Record' : 'Edit & Resubmit'}: {editingRecord?.trackingId}
                                    </h3>
                                </div>
                                <button className="close-btn-modern-v2" onClick={() => setShowEditModal(false)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <form onSubmit={handleResubmitConfirm} className="premium-form-layout">
                                <div className="modern-modal-body no-scrollbar">
                                    <div className="edit-form-grid-modern">
                                        {editingRecord?.publicRemarks && (
                                            <div className="form-input-wrapper full-width animate-fade-in">
                                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', padding: '20px', borderRadius: '16px', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                        <label style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Fixes & Remarks</label>
                                                    </div>
                                                    <p style={{ color: '#450a0a', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: '1.6' }}>{editingRecord.publicRemarks}</p>
                                                </div>
                                            </div>
                                        )}
                                        {/* Direction */}
                                        <div className="form-input-wrapper">
                                            <label className="premium-label">Direction</label>
                                            <div className="custom-select-v2">
                                                <select 
                                                    value={editForm.direction} 
                                                    onChange={e => setEditForm({...editForm, direction: e.target.value})}
                                                    required
                                                >
                                                    <option value="">Select Direction</option>
                                                    {DIRECTIONS
                                                        .filter(d => currentUser?.role === 'Admin Section' ? d !== 'ITSD ONLY' : true)
                                                        .map(d => <option key={d} value={d}>{d}</option>)
                                                    }
                                                </select>
                                                <div className="select-arrow-v2">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Office */}
                                        <div className="form-input-wrapper">
                                            <label className="premium-label">Originating Office</label>
                                            <div className="custom-select-v2">
                                                <select 
                                                    value={editForm.office} 
                                                    onChange={e => {
                                                        const off = offices.find(o => o.name === e.target.value);
                                                        setEditForm({...editForm, office: e.target.value, officeId: off?.id});
                                                    }}
                                                    required
                                                >
                                                    <option value="">Select Office</option>
                                                    {offices.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                                </select>
                                                <div className="select-arrow-v2">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Subject */}
                                        <div className="form-input-wrapper full-width">
                                            <label className="premium-label">Subject / Title</label>
                                            <input 
                                                className="premium-input-v2"
                                                type="text" 
                                                value={editForm.subject}
                                                onChange={e => setEditForm({...editForm, subject: e.target.value})}
                                                placeholder="Brief subject of the communication"
                                                required
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="form-input-wrapper full-width">
                                            <label className="premium-label">Full Details / Purpose</label>
                                            <textarea 
                                                className="premium-textarea-v2"
                                                value={editForm.details}
                                                onChange={e => setEditForm({...editForm, details: e.target.value})}
                                                placeholder="Provide comprehensive details about this record..."
                                                rows="4"
                                                required
                                            />
                                        </div>

                                        {/* Kinds */}
                                        <div className="form-input-wrapper full-width">
                                            <label className="premium-label">Kind of Communication</label>
                                            <div className="modern-chips-selector">
                                                {KIND_OPTIONS.map(kind => (
                                                    <button 
                                                        type="button"
                                                        key={kind}
                                                        className={`premium-kind-chip ${editForm.kinds.includes(kind) ? 'active' : ''}`}
                                                        onClick={() => {
                                                            const newKinds = editForm.kinds.includes(kind)
                                                                ? editForm.kinds.filter(k => k !== kind)
                                                                : [...editForm.kinds, kind];
                                                            setEditForm({...editForm, kinds: newKinds});
                                                        }}
                                                    >
                                                        {kind}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Section Head */}
                                        <div className="form-input-wrapper">
                                            <label className="premium-label">Route to Section Head</label>
                                            <div className="custom-select-v2">
                                                <select 
                                                    value={editForm.sectionHead} 
                                                    onChange={e => {
                                                        const head = sectionHeads.find(h => h.name === e.target.value);
                                                        setEditForm({...editForm, sectionHead: e.target.value, sectionHeadId: head?.id});
                                                    }}
                                                    required
                                                >
                                                    <option value="">Pick a Section Head</option>
                                                    {sectionHeads.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                                                </select>
                                                <div className="select-arrow-v2">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Priority */}
                                        <div className="form-input-wrapper">
                                            <label className="premium-label">Priority Level</label>
                                            <div className="custom-select-v2">
                                                <select 
                                                    className={`priority-select-color ${editForm.priority === 'URGENT' ? 'urgent' : editForm.priority === 'CONFIDENTIAL' ? 'confidential' : ''}`}
                                                    value={editForm.priority} 
                                                    onChange={e => setEditForm({...editForm, priority: e.target.value})}
                                                    required
                                                >
                                                    <option value="NORMAL">Normal</option>
                                                    <option value="URGENT">Urgent</option>
                                                    <option value="CONFIDENTIAL">Confidential</option>
                                                </select>
                                                <div className="select-arrow-v2">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Attachment Management */}
                                        <div className="form-input-wrapper full-width" style={{ marginTop: '10px' }}>
                                            <label className="premium-label">Manage Attachments</label>
                                            
                                            {/* Existing Files */}
                                            {editForm.attachments && editForm.attachments.length > 0 && (
                                                <div className="selected-files-list" style={{ marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Current Files (Click ✕ to remove)</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {editForm.attachments.map((file, idx) => (
                                                            <div key={`existing-${idx}`} className="file-item-pill" style={{ background: 'white', border: '1px solid #cbd5e1' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                                <span className="file-name" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                                                                <button type="button" className="remove-file-btn" onClick={() => {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        attachments: editForm.attachments.filter((_, i) => i !== idx)
                                                                    });
                                                                }}>✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* New Uploads */}
                                            <div className="attachment-upload-premium">
                                                <input
                                                    type="file"
                                                    id="edit-file-upload"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            setNewAttachments(prev => [...prev, ...Array.from(e.target.files)]);
                                                        }
                                                    }}
                                                    multiple
                                                />
                                                <label htmlFor="edit-file-upload" className="upload-box-modern" style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '20px', background: 'rgba(248, 250, 252, 0.5)' }}>
                                                    <div className="upload-icon-circle" style={{ width: '40px', height: '40px' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                    </div>
                                                    <div className="upload-text-centered">
                                                        <p style={{ fontSize: '13px' }}>Upload <span className="browse-link">new documents</span> to add/replace</p>
                                                    </div>
                                                </label>

                                                {newAttachments.length > 0 && (
                                                    <div className="selected-files-list animate-fade-in" style={{ marginTop: '15px' }}>
                                                        {newAttachments.map((file, idx) => (
                                                            <div key={`new-${idx}`} className="file-item-pill" style={{ background: 'var(--primary-gold)', color: 'white', border: 'none' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                                <span className="file-name">{file.name} (New)</span>
                                                                <button type="button" className="remove-file-btn" style={{ color: 'white' }} onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modern-modal-footer premium-footer">
                                    <button type="button" className="premium-btn-secondary" onClick={() => setShowEditModal(false)}>
                                        DISCARD CHANGES
                                    </button>
                                    <button type="submit" className="premium-btn-primary">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        {hasPermission('review_communication') && (editingRecord?.status === 'PENDING_DIV_HEAD' || editingRecord?.status === 'PENDING_DIV_APPROVAL') ? 'SAVE CHANGES' : 'RESUBMIT FOR REVIEW'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {showCompletionModal && createPortal(
                    <div className="modern-overlay animate-fade-in" onClick={() => setShowCompletionModal(false)}>
                        <div className="modern-modal clean-white-modal animate-zoom-in" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
                            <div className="modern-modal-header centered-header">
                                <div className="modal-header-content">
                                    <div className="modal-icon-wrapper success-pulse">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <h2 className="modal-main-title">Proof of Completion</h2>
                                    <div className="modal-id-badge">TRACKING ID: {completionRecord?.trackingId}</div>
                                </div>
                                <button className="minimal-close-btn" onClick={() => setShowCompletionModal(false)}>✕</button>
                            </div>
                            
                            <div className="modern-modal-body no-scrollbar unified-body">
                                <div className="minimal-guidance">
                                    <p>Please upload evidence for <strong>{completionRecord?.subject}</strong> and add any final remarks below.</p>
                                </div>

                                <div className="minimal-form-section">
                                    <label className="minimal-label">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                        UPLOAD ATTACHMENTS
                                    </label>
                                    
                                    <div className="minimal-upload-zone">
                                        <input 
                                            type="file" 
                                            id="completion-proof-upload" 
                                            multiple 
                                            style={{ display: 'none' }} 
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setCompletionFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                                }
                                            }}
                                        />
                                        <label htmlFor="completion-proof-upload" className="minimal-drop-area">
                                            <div className="drop-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                            </div>
                                            <div className="drop-text">
                                                <span>Click to <span className="blue-link">browse proof</span></span>
                                                <span className="small-hint">Max 10MB total</span>
                                            </div>
                                        </label>

                                        {completionFiles.length > 0 && (
                                            <div className="minimal-file-list animate-slide-up">
                                                {completionFiles.map((file, idx) => (
                                                    <div key={idx} className="minimal-file-pill">
                                                        <span className="name">{file.name}</span>
                                                        <button type="button" className="remove-btn" onClick={() => setCompletionFiles(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="minimal-form-section">
                                    <label className="minimal-label">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path></svg>
                                        FINAL REMARKS (OPTIONAL)
                                    </label>
                                    <textarea 
                                        className="minimal-textarea" 
                                        placeholder="Type any notes here..."
                                        value={completionRemarksInput}
                                        onChange={(e) => setCompletionRemarksInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modern-modal-footer unified-footer">
                                <button className="minimal-btn-secondary" onClick={() => setShowCompletionModal(false)}>
                                    CANCEL
                                </button>
                                <button 
                                    className="minimal-btn-primary" 
                                    onClick={handleCompletionSubmit}
                                    disabled={completionFiles.length === 0}
                                >
                                    CONFIRM COMPLETION
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {showAttachmentModal && createPortal(
                <AttachmentViewer
                    fileName={(() => {
                        const files = selectedAttachment?.attachments && selectedAttachment.attachments.length > 0
                            ? selectedAttachment.attachments
                            : (selectedAttachment?.attachment ? [selectedAttachment.attachment] : []);
                        const file = files[currentPageIndex];
                        return typeof file === 'string' ? file : (file?.name || 'attachment');
                    })()}
                    fileUrl={(() => {
                        const files = selectedAttachment?.attachments && selectedAttachment.attachments.length > 0
                            ? selectedAttachment.attachments
                            : (selectedAttachment?.attachment ? [selectedAttachment.attachment] : []);
                        return getAttachmentUrl(files[currentPageIndex]);
                    })()}
                    onClose={() => setShowAttachmentModal(false)}
                />,
                document.body
            )}
            {showReturnModal && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowReturnModal(false)}>
                    <div className="modern-modal" style={{ width: '500px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary-navy)', fontSize: '1.25rem', fontWeight: 800 }}>Return Communication</h3>
                        </div>
                        <form onSubmit={handleReturnSubmit}>
                            <div className="modern-modal-body" style={{ padding: '30px' }}>
                                <div className="form-input-wrapper full-width">
                                    <label className="premium-label" style={{ marginBottom: '12px', display: 'block' }}>Remarks / Instructions for Admin Section</label>
                                    <textarea 
                                        className="premium-textarea-v2"
                                        placeholder="Explain what needs to be changed or corrected..."
                                        value={returnRemarks}
                                        onChange={e => setReturnRemarks(e.target.value)}
                                        rows="5"
                                        required
                                        autoFocus
                                    />
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', fontStyle: 'italic' }}>
                                        These remarks will be visible to the Admin Section staff to help them correct the record.
                                    </p>
                                </div>
                            </div>
                            <div className="modern-modal-footer" style={{ padding: '24px 30px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="premium-btn-secondary" onClick={() => setShowReturnModal(false)}>
                                    CANCEL
                                </button>
                                <button type="submit" className="premium-btn-primary" style={{ background: '#ef4444' }}>
                                    CONFIRM RETURN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            
            {showSectionModal && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowSectionModal(false)}>
                    <div className="modern-modal" style={{ width: '500px', backgroundColor: 'white', borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary-navy)', fontSize: '1.25rem', fontWeight: 800 }}>Assign Sections</h3>
                        </div>
                        <div className="modern-modal-body" style={{ padding: '30px' }}>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                                Select one or more sections to handle this communication.
                            </p>
                            <div className="groups-selection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {allGroups.map(group => (
                                    <div 
                                        key={group.id} 
                                        className={`group-select-card ${selectedGroupIds.includes(group.id) ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedGroupIds(prev => 
                                                prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                                            );
                                        }}
                                        style={{ 
                                            padding: '15px', 
                                            borderRadius: '16px', 
                                            border: '2px solid',
                                            borderColor: selectedGroupIds.includes(group.id) ? 'var(--primary-gold)' : '#f1f5f9',
                                            background: selectedGroupIds.includes(group.id) ? '#fffbeb' : '#f8fafc',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--primary-navy)' }}>{group.name}</div>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Head: {group.SectionHead?.name || 'Unassigned'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modern-modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="premium-btn-secondary" onClick={() => setShowSectionModal(false)}>CANCEL</button>
                            <button 
                                className="premium-btn-primary" 
                                disabled={selectedGroupIds.length === 0}
                                onClick={() => handleAssignSections(recordToAssignSection.id, selectedGroupIds)}
                            >
                                CONFIRM ASSIGNMENT
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {notification && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setNotification(null)}>
                    <div className="modern-modal clean-white-modal animate-zoom-in" style={{ maxWidth: '400px', width: '90%', padding: '30px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div className={`modal-icon-wrapper ${notification.type === 'error' ? 'error-icon' : 'success-icon'}`} style={{ 
                                width: '64px', 
                                height: '64px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                background: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
                                color: notification.type === 'error' ? '#ef4444' : '#22c55e',
                                marginBottom: '20px'
                            }}>
                                {notification.type === 'error' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                ) : (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                )}
                            </div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800, color: notification.type === 'error' ? '#ef4444' : 'var(--primary-gold)' }}>
                                {notification.type === 'error' ? 'Oops!' : 'Success!'}
                            </h3>
                            <p style={{ margin: 0, color: 'var(--primary-navy)', fontSize: '14px', lineHeight: '1.6', fontWeight: 600 }}>
                                {notification.message}
                            </p>
                            <button 
                                className="premium-btn-primary" 
                                style={{ marginTop: '30px', width: '100%', background: notification.type === 'error' ? '#ef4444' : 'var(--primary-navy)' }} 
                                onClick={() => setNotification(null)}
                            >
                                GOT IT
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </Layout>
    );
};

export default RecordList;

function renderStatusLabel(status) {
    const s = (status || '').toUpperCase();
    if (s === 'READY FOR ARCHIVING' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL') return 'PENDING REVIEW';
    if (s === 'DIV_ACCEPTED') return 'IN SECTION REVIEW';
    if (s === 'PENDING_SECTION_HEAD') return 'ASSIGNED TO SECTION';
    if (s === 'APPROVED') return 'ONGOING ACTION';
    return s.replace(/_/g, ' ') || 'UNKNOWN';
}

function ProgressTracker({ status }) {
    const s = (status || 'PENDING').toUpperCase();
    
    // Define stages and their associated internal statuses
    const stages = [
        { label: 'Submitted', key: 'SUBMITTED', match: ['PENDING', 'PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL'] },
        { label: 'Review', key: 'REVIEW', match: ['DIV_ACCEPTED', 'DIV_DECLINED', 'DIV_RETURNED', 'RETURNED'] },
        { label: 'Assigned', key: 'ASSIGNED', match: ['PENDING_SECTION_HEAD'] },
        { label: 'Ongoing', key: 'ONGOING', match: ['APPROVED'] },
        { label: 'Completed', key: 'COMPLETED', match: ['COMPLETED', 'READY FOR ARCHIVING'] }
    ];

    // Find current stage index
    let currentIdx = stages.findIndex(stage => stage.match.includes(s));
    
    // Special handling for edge cases
    if (currentIdx === -1) {
        if (s.includes('DIV')) currentIdx = 1;
        else if (s.includes('SECTION')) currentIdx = 2;
        else if (s === 'APPROVED') currentIdx = 3;
        else if (s === 'COMPLETED') currentIdx = 4;
        else currentIdx = 0;
    }

    const isDeclined = s.includes('DECLINED') || s.includes('RETURNED');

    return (
        <div className="progress-stepper">
            {stages.map((stage, index) => {
                const isStepCompleted = index < currentIdx || (index === currentIdx && (s === 'COMPLETED' || s === 'READY FOR ARCHIVING'));
                let stateClass = '';
                if (isStepCompleted) stateClass = 'completed';
                else if (index === currentIdx) stateClass = isDeclined ? 'declined' : 'active';

                return (
                    <div key={stage.key} className={`step-item ${stateClass}`}>
                        <div className="step-dot">
                            {isStepCompleted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span className="step-label">{stage.label}</span>
                    </div>
                );
            })}
        </div>
    );
}


