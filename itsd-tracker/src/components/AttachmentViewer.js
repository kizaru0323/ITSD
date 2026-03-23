import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import './AttachmentViewer.css';

const AttachmentViewer = ({ fileUrl, fileName, onClose }) => {
    const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    const isPDF = fileName.toLowerCase().endsWith('.pdf');

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (isPDF) {
            const printWindow = window.open(fileUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }
        } else if (isImage) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head><title>Print Image</title></head>
                    <body style="margin:0; display:flex; align-items:center; justify-content:center;">
                        <img src="${fileUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
                        <script>
                            window.onload = () => {
                                window.print();
                                window.close();
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="av-overlay" onClick={onClose}>
            <div className="av-modal" onClick={(e) => e.stopPropagation()}>
                {/* Top Bar (Floating) */}
                <div className="av-top-bar">
                    <span className="av-file-name">{fileName}</span>
                    <button className="av-close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Main Preview Area (Background) */}
                <div className="av-preview-area">
                    {isImage ? (
                        <TransformWrapper
                            initialScale={1}
                            minScale={0.5}
                            maxScale={8}
                            centerOnInit={true}
                        >
                            {({ zoomIn, zoomOut, resetTransform }) => (
                                <React.Fragment>
                                    <div className="av-zoom-controls">
                                        <button className="av-zoom-btn" onClick={() => zoomIn()} title="Zoom In">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                        <button className="av-zoom-btn" onClick={() => zoomOut()} title="Zoom Out">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                        <button className="av-zoom-btn" onClick={() => resetTransform()} title="Reset">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                                <polyline points="3 3 3 8 8 8"></polyline>
                                            </svg>
                                        </button>
                                    </div>
                                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={fileUrl} alt={fileName} className="av-image-preview" />
                                    </TransformComponent>
                                </React.Fragment>
                            )}
                        </TransformWrapper>
                    ) : isPDF ? (
                        <iframe src={`${fileUrl}#toolbar=0`} title="PDF Preview" className="av-pdf-preview"></iframe>
                    ) : (
                        <div className="av-unsupported">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                            <p>Preview not available for this file type.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Bar (Floating) */}
                <div className="av-bottom-bar">
                    <div className="av-controls-right">
                        <button className="av-btn av-btn-secondary" onClick={handleDownload}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            <span>Download</span>
                        </button>
                        <button className="av-btn av-btn-primary" onClick={handlePrint}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                <rect x="6" y="14" width="12" height="8"></rect>
                            </svg>
                            <span>Print</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttachmentViewer;
