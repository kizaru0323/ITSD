import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './AttachmentPreviewModal.css';

const AttachmentPreviewModal = ({ fileUrl, fileName, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    if (!fileUrl) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
    const isPdf = /\.pdf$/i.test(fileUrl);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    return createPortal(
        <div className="preview-overlay animate-fade-in" onClick={onClose}>
            <div className="preview-modal-container animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="preview-header">
                    <div className="preview-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        <span>{fileName}</span>
                    </div>
                    <div className="preview-actions">
                        {isImage && (
                            <div className="zoom-controls">
                                <button className="preview-action-btn zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                                <span className="zoom-level">{Math.round(scale * 100)}%</span>
                                <button className="preview-action-btn zoom-btn" onClick={handleZoomIn} title="Zoom In">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                                <button className="preview-action-btn zoom-btn" onClick={handleReset} title="Reset">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                                </button>
                            </div>
                        )}
                        <a href={fileUrl} download={fileName} className="preview-action-btn download" title="Download">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        <button className="preview-action-btn close" onClick={onClose} title="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div 
                    className={`preview-content ${isImage ? 'panning-area' : ''}`}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    ref={containerRef}
                >
                    {isImage ? (
                        <img 
                            src={fileUrl} 
                            alt={fileName} 
                            className="preview-image" 
                            style={{ 
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                            }}
                            onMouseDown={handleMouseDown}
                            ref={imageRef}
                            draggable="false"
                        />
                    ) : isPdf ? (
                        <iframe src={fileUrl} title={fileName} className="preview-pdf"></iframe>
                    ) : (
                        <div className="preview-unsupported">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                            <p>Preview not available for this file type.</p>
                            <a href={fileUrl} download={fileName} className="v3-btn-primary">Download to View</a>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AttachmentPreviewModal;
