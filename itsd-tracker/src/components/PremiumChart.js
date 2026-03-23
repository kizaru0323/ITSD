import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/* ─── Premium Line Chart ─── */
export const PremiumLineChart = ({ labels, datasets, title, subtitle }) => {
    const [hoveredNode, setHoveredNode] = useState(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const track = (e) => setCursor({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', track);
        return () => window.removeEventListener('mousemove', track);
    }, []);

    const width = 1000;
    const height = 300;
    const padding = { top: 30, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const allData = datasets.flatMap(ds => ds.data);
    const maxValue = Math.max(...allData, 5);
    const roughStep = maxValue / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
    let niceStep = Math.ceil(roughStep / magnitude) * magnitude;
    if (niceStep === 0) niceStep = 10;
    
    const maxChartValue = niceStep * 5;

    const getX = (i) => padding.left + (i * (chartWidth / Math.max(labels.length - 1, 1)));
    const getY = (v) => height - padding.bottom - ((v / maxChartValue) * chartHeight);

    const buildCurve = (data) => {
        if (data.length < 2) return `M ${getX(0)} ${getY(data[0] || 0)}`;
        let path = `M ${getX(0)} ${getY(data[0])}`;
        for (let i = 0; i < data.length - 1; i++) {
            const x1 = getX(i);
            const x2 = getX(i + 1);
            const midX = (x1 + x2) / 2;
            path += ` C ${midX} ${getY(data[i])}, ${midX} ${getY(data[i + 1])}, ${x2} ${getY(data[i + 1])}`;
        }
        return path;
    };

    const buildArea = (data) => {
        const curve = buildCurve(data);
        return `${curve} L ${getX(data.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;
    };

    return (
        <div className="premium-chart-container">
            <div className="an-card-header">
                <div>
                    <h3>{title}</h3>
                    {subtitle && <p style={{ fontSize: '11px', color: 'var(--dash-text-sub)', margin: '4px 0 0' }}>{subtitle}</p>}
                </div>
            </div>
            <div className="an-line-wrap" style={{ marginTop: '20px' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
                    <defs>
                        {datasets.map((ds, i) => (
                            <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={ds.color} stopOpacity="0.1" />
                                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </linearGradient>
                        ))}
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((p) => {
                        const val = Math.round(p * maxChartValue);
                        const y = getY(val);
                        return (
                            <g key={p}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--dash-border)" strokeDasharray="4" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: '12px', fill: 'var(--dash-text-sub)', fontWeight: 500 }}>{val}</text>
                            </g>
                        );
                    })}

                    {datasets.map((ds, i) => (
                        <path key={`area-${i}`} d={buildArea(ds.data)} fill={`url(#grad-${i})`} />
                    ))}

                    {datasets.map((ds, i) => (
                        <path key={`line-${i}`} d={buildCurve(ds.data)} stroke={ds.color} strokeWidth="3" fill="none" strokeLinecap="round" />
                    ))}

                    {labels.map((label, i) => {
                        const x = getX(i);
                        return (
                            <g key={i}>
                                {hoveredNode === i && <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="var(--dash-border)" strokeWidth="1" />}
                                <text x={x} y={height - 10} textAnchor="middle" style={{ fontSize: '12px', fill: 'var(--dash-text-sub)', fontWeight: 500 }}>{label}</text>
                                <rect 
                                    x={x - 20} y={padding.top} width="40" height={chartHeight} 
                                    fill="transparent" 
                                    onMouseEnter={(e) => { setHoveredNode(i); setCursor({ x: e.clientX, y: e.clientY }); }}
                                    onMouseLeave={() => setHoveredNode(null)}
                                />
                            </g>
                        );
                    })}
                </svg>

                {hoveredNode !== null && createPortal(
                    <div style={{
                        position: 'fixed', left: cursor.x + 10, top: cursor.y - 10,
                        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
                        padding: '10px 14px', borderRadius: '8px', color: 'white', zIndex: 10000,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', pointerEvents: 'none'
                    }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.6, marginBottom: '6px' }}>{labels[hoveredNode]}</div>
                        {datasets.map((ds, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '2px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ds.color }}></span>
                                <span>{ds.label}: <strong>{ds.data[hoveredNode]}</strong></span>
                            </div>
                        ))}
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

/* ─── Premium Pie Chart ─── */
export const PremiumPieChart = ({ data, title, subtitle }) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="premium-chart-container">
            <div className="an-card-header">
                <div>
                    <h3>{title}</h3>
                    {subtitle && <p style={{ fontSize: '11px', color: 'var(--dash-text-sub)', margin: '4px 0 0' }}>{subtitle}</p>}
                </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
                <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '180px', height: '180px' }}>
                    {/* Background Ring for Empty State */}
                    <circle r="0.875" fill="none" stroke="var(--dash-border)" strokeWidth="0.25" opacity="0.5" />
                    
                    {data.map((slice, i) => {
                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += slice.value / (total || 1);
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                        const largeArcFlag = slice.value / (total || 1) > 0.5 ? 1 : 0;
                        const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                        return <path key={i} d={pathData} fill={slice.color} style={{ transition: 'all 0.3s' }} />;
                    })}
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ 
                        fontSize: '24px', fontWeight: '800', color: total === 0 ? 'var(--dash-text-sub)' : 'white',
                        textShadow: total === 0 ? 'none' : '0 2px 10px rgba(0,0,0,0.3)' 
                    }}>{total}</div>
                    <div style={{ 
                        fontSize: '10px', fontWeight: '700', color: total === 0 ? 'var(--dash-text-sub)' : 'white', 
                        textTransform: 'uppercase', opacity: 0.8,
                        textShadow: total === 0 ? 'none' : '0 1px 4px rgba(0,0,0,0.3)'
                    }}>Volume</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '10px' }}>
                {data.map((slice, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--dash-text-sub)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: slice.color }}></span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slice.label}</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--dash-text-main)' }}>{slice.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Premium Bar Chart ─── */
export const PremiumBarChart = ({ labels, datasets, title, subtitle }) => {
    const width = 1000;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const allData = datasets.flatMap(ds => ds.data);
    const maxValue = Math.max(...allData, 1);
    const maxChartValue = Math.ceil(maxValue * 1.2);

    const getX = (i) => padding.left + (i * (chartWidth / labels.length));
    const getY = (v) => height - padding.bottom - ((v / maxChartValue) * chartHeight);
    const barWidth = (chartWidth / labels.length) * 0.5;

    return (
        <div className="premium-chart-container">
            <div className="an-card-header">
                <div>
                    <h3>{title}</h3>
                    {subtitle && <p style={{ fontSize: '11px', color: 'var(--dash-text-sub)', margin: '4px 0 0' }}>{subtitle}</p>}
                </div>
            </div>
            <div style={{ marginTop: '20px' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
                    {[0, 0.5, 1].map(p => {
                        const val = Math.round(p * maxChartValue);
                        const y = getY(val);
                        return (
                            <g key={p}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--dash-border)" strokeDasharray="4" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: '12px', fill: 'var(--dash-text-sub)', fontWeight: 500 }}>{val}</text>
                            </g>
                        );
                    })}
                    {labels.map((label, i) => {
                        const xBase = getX(i) + (chartWidth / labels.length) / 2;
                        return (
                            <g key={i}>
                                {datasets.map((ds, di) => {
                                    const h = (ds.data[i] / maxChartValue) * chartHeight;
                                    const x = xBase - barWidth / 2;
                                    return (
                                        <rect 
                                            key={di} x={x} y={getY(ds.data[i])} 
                                            width={barWidth} height={h} 
                                            fill={ds.color} rx="4"
                                            style={{ transition: 'all 1s ease-out' }} 
                                        />
                                    );
                                })}
                                <text x={xBase} y={height - 10} textAnchor="middle" style={{ fontSize: '12px', fill: 'var(--dash-text-sub)', fontWeight: 500 }}>{label}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

/* ─── Premium KPI Card ─── */
export const PremiumKPICard = ({ title, value, subtitle, icon, trend, colorClass }) => {
    return (
        <div className={`an-card kpi-modern ${colorClass}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--dash-text-sub)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>{title}</div>
                <div style={{ color: 'var(--dash-text-sub)', opacity: 0.8 }}>{icon}</div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--dash-text-main)', margin: '8px 0' }}>{value}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--dash-text-sub)', fontWeight: 500 }}>{subtitle}</div>
                {trend && (
                    <div style={{ 
                        fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', 
                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--p-indigo)'
                    }}>
                        {trend.value}
                    </div>
                )}
            </div>
            <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', 
                background: colorClass === 'blue' ? 'var(--p-blue)' : colorClass === 'red' ? 'var(--p-rose)' : colorClass === 'amber' ? 'var(--p-amber)' : 'var(--p-indigo)',
                opacity: 0.8
            }}></div>
        </div>
    );
};
