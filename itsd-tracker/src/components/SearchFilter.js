import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './SearchFilter.css';

const SearchFilter = ({ placeholder = "Search communications...", data, onSearch, actions = null, searchSuffix = null }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        year: '',
        month: '',
        week: '',
        fromDate: '',
        toDate: ''
    });

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (onSearch && data) {
            const filtered = data.filter(item =>
                item.trackingId?.toLowerCase().includes(val.toLowerCase()) ||
                item.subject?.toLowerCase().includes(val.toLowerCase()) ||
                item.status?.toLowerCase().includes(val.toLowerCase())
            );
            onSearch(filtered);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'year' && !value ? { month: '', week: '' } : {}),
            ...(field === 'month' && !value ? { week: '' } : {})
        }));
    };

    const clearFilters = () => {
        setFilters({
            year: '',
            month: '',
            week: '',
            fromDate: '',
            toDate: ''
        });
        setSearchTerm('');
        onSearch(data);
    };

    return (
        <div className="search-filter-container">
            <div className="search-input-wrapper">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="search-input"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
                <svg className="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
            {searchSuffix}
            {actions}
            <button className="filter-button" onClick={() => setIsModalOpen(true)}>
                <svg
                    className="filter-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <span>Filter</span>
            </button>

            {isModalOpen && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
                        <div className="modern-modal-header">
                            <h3>Advanced Filters</h3>
                            <button className="close-btn-modern" onClick={() => setIsModalOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="modern-modal-body">
                            <div className="filter-group">
                                <label>Year</label>
                                <select
                                    value={filters.year}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="">-- Select Year --</option>
                                    <option value="2026">2026</option>
                                    <option value="2025">2025</option>
                                    <option value="2024">2024</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Month</label>
                                <select
                                    value={filters.month}
                                    onChange={(e) => handleFilterChange('month', e.target.value)}
                                    className={`filter-select ${!filters.year ? 'disabled' : ''}`}
                                    disabled={!filters.year}
                                >
                                    <option value="">-- Select Month --</option>
                                    <option value="January">January</option>
                                    <option value="February">February</option>
                                    <option value="March">March</option>
                                    {/* ... add more months ... */}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Week</label>
                                <select
                                    value={filters.week}
                                    onChange={(e) => handleFilterChange('week', e.target.value)}
                                    className={`filter-select ${(!filters.year || !filters.month) ? 'disabled' : ''}`}
                                    disabled={!filters.year || !filters.month}
                                >
                                    <option value="">-- Select Week --</option>
                                    <option value="Week 1">Week 1</option>
                                    <option value="Week 2">Week 2</option>
                                    <option value="Week 3">Week 3</option>
                                    <option value="Week 4">Week 4</option>
                                </select>
                            </div>

                            <div className="date-range-divider">
                                <span>Custom Date Range</span>
                            </div>

                            <div className="filter-row">
                                <div className="filter-group half">
                                    <label>From</label>
                                    <input
                                        type="date"
                                        value={filters.fromDate}
                                        onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                        className="filter-input"
                                    />
                                </div>
                                <div className="filter-group half">
                                    <label>To</label>
                                    <input
                                        type="date"
                                        value={filters.toDate}
                                        onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                        className="filter-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button className="btn-clear" onClick={clearFilters}>Clear Filters</button>
                            <button className="pu-btn primary" style={{ borderRadius: '12px' }} onClick={() => setIsModalOpen(false)}>Apply Filters</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SearchFilter;
