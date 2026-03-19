
import React, { useState, useEffect } from 'react';

// Centralized RBAC Configuration
const ROLES = {
    POLICYHOLDER: {
        canViewDashboard: true,
        canViewClaimDetail: true,
        canSubmitClaim: true,
        canEditOwnClaim: true,
        canApproveClaim: false,
        canRejectClaim: false,
        canViewAuditLogs: false,
        canPerformBulkActions: false,
    },
    CLAIMS_OFFICER: {
        canViewDashboard: true,
        canViewClaimDetail: true,
        canSubmitClaim: false, // Officers review, not submit
        canEditOwnClaim: false, // Claims are policyholder-owned
        canApproveClaim: true,
        canRejectClaim: true,
        canViewAuditLogs: true,
        canPerformBulkActions: true,
    },
    CLAIMS_MANAGER: {
        canViewDashboard: true,
        canViewClaimDetail: true,
        canSubmitClaim: false,
        canEditOwnClaim: false,
        canApproveClaim: true, // Oversight
        canRejectClaim: true, // Oversight
        canViewAuditLogs: true,
        canPerformBulkActions: true,
        canExportData: true,
    },
    VERIFICATION_TEAM: {
        canViewDashboard: true,
        canViewClaimDetail: true,
        canSubmitClaim: false,
        canEditOwnClaim: false,
        canApproveClaim: false,
        canRejectClaim: false,
        canPerformVerification: true,
        canViewAuditLogs: true,
    },
    FINANCE_TEAM: {
        canViewDashboard: true,
        canViewClaimDetail: true,
        canSubmitClaim: false,
        canEditOwnClaim: false,
        canApproveClaim: true, // For payout approval
        canRejectClaim: false,
        canViewAuditLogs: true,
    },
};

// --- Reusable UI Components ---

const StatusBadge = ({ status, style }) => {
    const statusClass = status?.toLowerCase().replace(/\s/g, '-');
    let displayStatus = status;
    let icon = null;

    switch (status) {
        case 'Approved': icon = <span className="icon icon-check" style={{ fontSize: '0.8em' }}></span>; break;
        case 'In Progress': icon = <span className="icon icon-activity" style={{ fontSize: '0.8em' }}></span>; break;
        case 'Pending': icon = <span className="icon icon-filter" style={{ fontSize: '0.8em' }}></span>; break;
        case 'Rejected': icon = <span className="icon icon-x" style={{ fontSize: '0.8em' }}></span>; break;
        case 'Exception': icon = <span className="icon icon-alert-triangle" style={{ fontSize: '0.8em' }}></span>; break; // Placeholder
        default: break;
    }

    return (
        <span className={`status-badge status-${statusClass}`} style={style}>
            {icon} {displayStatus}
        </span>
    );
};

const Button = ({ children, onClick, variant = 'primary', icon: Icon, disabled = false, style, type = 'button' }) => (
    <button
        onClick={onClick}
        className={`button button-${variant}`}
        disabled={disabled}
        style={style}
        type={type}
    >
        {Icon && <span className={`icon ${Icon}`} style={{ marginRight: 'var(--spacing-xs)', fontSize: '1em' }}></span>}
        {children}
    </button>
);

const Card = ({ children, onClick, style, className = '' }) => (
    <div
        className={`card ${onClick ? 'card-clickable' : ''} ${className}`}
        onClick={onClick}
        style={style}
    >
        {children}
    </div>
);

const ChartPlaceholder = ({ title, type }) => (
    <Card className="chart-container" style={{ minHeight: '300px' }}>
        <h3 className="chart-title">{title}</h3>
        <p>Dynamic {type} chart visualization will be rendered here in real-time.</p>
        <span className="icon icon-chart" style={{ fontSize: '2em', color: 'var(--accent-blue)', opacity: '0.6', marginTop: 'var(--spacing-md)' }}></span>
    </Card>
);

const KPIStatusCard = ({ title, value, change, trend = 'neutral', status, onClick, live = false }) => {
    let trendColor = 'var(--text-secondary)';
    let trendIndicator = '';
    if (trend === 'up') { trendColor = 'var(--status-approved-border)'; trendIndicator = '↑'; }
    else if (trend === 'down') { trendColor = 'var(--status-rejected-border)'; trendIndicator = '↓'; }

    return (
        <Card onClick={onClick} className={live ? 'live-pulse' : ''}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                    {status && <StatusBadge status={status} />}
                </div>
                <div style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 'var(--spacing-sm)' }}>
                    {value}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    <span style={{ color: trendColor }}>{trendIndicator} {change}</span>
                    <span>Last 24h</span>
                </div>
            </div>
        </Card>
    );
};

// --- Main Application ---

const App = () => {
    const [view, setView] = useState({ screen: 'DASHBOARD', params: {} });
    const [currentUserRole, setCurrentUserRole] = useState('CLAIMS_OFFICER'); // Default role
    const [claimsData, setClaimsData] = useState([
        {
            id: 'CLAIM-001',
            policyholder: 'Alice Smith',
            policyNumber: 'PN-87654',
            claimType: 'Vehicle Accident',
            amount: 15000,
            status: 'In Progress',
            submissionDate: '2023-10-26',
            lastUpdated: '2023-10-28',
            description: 'Collision with another vehicle on main street.',
            documents: ['report.pdf', 'photos.zip'],
            auditLog: [
                { id: 1, timestamp: '2023-10-26 10:00', actor: 'Alice Smith', action: 'Claim Submitted' },
                { id: 2, timestamp: '2023-10-27 14:30', actor: 'Claims Officer John Doe', action: 'Initial Review Started' },
            ],
            milestones: [
                { id: 1, name: 'Claim Submitted', status: 'Completed', date: '2023-10-26', sla: '0 days' },
                { id: 2, name: 'Initial Review', status: 'In Progress', date: '2023-10-27', sla: '2 days (SLA: 5 days)' },
                { id: 3, name: 'Document Verification', status: 'Pending', date: null, sla: '5 days' },
                { id: 4, name: 'Approval/Rejection', status: 'Pending', date: null, sla: '7 days' },
                { id: 5, name: 'Payment Processing', status: 'Pending', date: null, sla: '3 days' },
            ]
        },
        {
            id: 'CLAIM-002',
            policyholder: 'Bob Johnson',
            policyNumber: 'PN-12345',
            claimType: 'Home Burglary',
            amount: 5000,
            status: 'Approved',
            submissionDate: '2023-10-20',
            lastUpdated: '2023-10-25',
            description: 'Home ransacked, valuable items stolen.',
            documents: ['police_report.pdf', 'inventory.xlsx'],
            auditLog: [
                { id: 1, timestamp: '2023-10-20 09:00', actor: 'Bob Johnson', action: 'Claim Submitted' },
                { id: 2, timestamp: '2023-10-21 11:00', actor: 'Claims Officer Jane Doe', action: 'Initial Review Completed' },
                { id: 3, timestamp: '2023-10-23 15:00', actor: 'Verification Team', action: 'Documents Verified' },
                { id: 4, timestamp: '2023-10-25 09:30', actor: 'Claims Manager', action: 'Claim Approved' },
            ],
            milestones: [
                { id: 1, name: 'Claim Submitted', status: 'Completed', date: '2023-10-20', sla: '0 days' },
                { id: 2, name: 'Initial Review', status: 'Completed', date: '2023-10-21', sla: '1 day' },
                { id: 3, name: 'Document Verification', status: 'Completed', date: '2023-10-23', sla: '3 days' },
                { id: 4, name: 'Approval/Rejection', status: 'Completed', date: '2023-10-25', sla: '5 days' },
                { id: 5, name: 'Payment Processing', status: 'In Progress', date: null, sla: '2 days (SLA: 3 days)' },
            ]
        },
        {
            id: 'CLAIM-003',
            policyholder: 'Charlie Brown',
            policyNumber: 'PN-98765',
            claimType: 'Medical Emergency',
            amount: 2500,
            status: 'Pending',
            submissionDate: '2023-10-29',
            lastUpdated: '2023-10-29',
            description: 'Emergency hospitalization for sudden illness.',
            documents: ['medical_bill.pdf'],
            auditLog: [
                { id: 1, timestamp: '2023-10-29 11:00', actor: 'Charlie Brown', action: 'Claim Submitted' },
            ],
            milestones: [
                { id: 1, name: 'Claim Submitted', status: 'Completed', date: '2023-10-29', sla: '0 days' },
                { id: 2, name: 'Initial Review', status: 'Pending', date: null, sla: '1 day (SLA: 5 days)' },
                { id: 3, name: 'Document Verification', status: 'Pending', date: null, sla: '5 days' },
                { id: 4, name: 'Approval/Rejection', status: 'Pending', date: null, sla: '7 days' },
                { id: 5, name: 'Payment Processing', status: 'Pending', date: null, sla: '3 days' },
            ]
        },
    ]);
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    const getRolePermissions = (role) => ROLES[role] || {};
    const permissions = getRolePermissions(currentUserRole);

    const navigateTo = (screen, params = {}) => {
        setView({ screen, params });
    };

    const handleCardClick = (claimId) => {
        if (permissions.canViewClaimDetail) {
            navigateTo('CLAIM_DETAIL', { claimId });
        } else {
            alert('You do not have permission to view claim details.');
        }
    };

    const handleGlobalSearchToggle = () => {
        setIsGlobalSearchOpen(prev => !prev);
        setGlobalSearchTerm('');
    };

    const handleGlobalSearchChange = (e) => {
        setGlobalSearchTerm(e.target.value);
    };

    const handlePerformAction = (claimId, actionType) => {
        setClaimsData(prevClaims =>
            prevClaims.map(claim => {
                if (claim.id === claimId) {
                    const newStatus = actionType === 'approve' ? 'Approved' : 'Rejected';
                    const newAuditEntry = {
                        id: claim.auditLog.length + 1,
                        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        actor: `Claims Officer ${currentUserRole}`,
                        action: `Claim ${newStatus}`,
                    };
                    const updatedMilestones = claim.milestones.map(m =>
                        m.name === 'Approval/Rejection' && (newStatus === 'Approved' || newStatus === 'Rejected')
                            ? { ...m, status: 'Completed', date: new Date().toISOString().split('T')[0], sla: '0 days' }
                            : m
                    );
                    return {
                        ...claim,
                        status: newStatus,
                        lastUpdated: new Date().toISOString().split('T')[0],
                        auditLog: [...claim.auditLog, newAuditEntry],
                        milestones: updatedMilestones,
                    };
                }
                return claim;
            })
        );
        alert(`Claim ${claimId} has been ${actionType === 'approve' ? 'Approved' : 'Rejected'}.`);
        navigateTo('DASHBOARD');
    };

    const handleSubmitNewClaim = (formData) => {
        const newClaimId = `CLAIM-${String(claimsData.length + 1).padStart(3, '0')}`;
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTimestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

        const newClaim = {
            id: newClaimId,
            policyholder: formData.policyholder,
            policyNumber: formData.policyNumber,
            claimType: formData.claimType,
            amount: parseFloat(formData.amount),
            status: 'Pending', // Initial status for new claims
            submissionDate: currentDate,
            lastUpdated: currentDate,
            description: formData.description,
            documents: formData.documents, // Assuming an array of strings
            auditLog: [
                { id: 1, timestamp: currentTimestamp, actor: formData.policyholder || 'System', action: 'Claim Submitted' },
            ],
            milestones: [
                { id: 1, name: 'Claim Submitted', status: 'Completed', date: currentDate, sla: '0 days' },
                { id: 2, name: 'Initial Review', status: 'Pending', date: null, sla: '1 day (SLA: 5 days)' },
                { id: 3, name: 'Document Verification', status: 'Pending', date: null, sla: '5 days' },
                { id: 4, name: 'Approval/Rejection', status: 'Pending', date: null, sla: '7 days' },
                { id: 5, name: 'Payment Processing', status: 'Pending', date: null, sla: '3 days' },
            ]
        };

        setClaimsData(prevClaims => [...prevClaims, newClaim]);
        alert(`New claim ${newClaimId} submitted successfully!`);
        navigateTo('DASHBOARD');
    };

    const filteredClaims = globalSearchTerm
        ? claimsData.filter(claim =>
              Object.values(claim).some(val =>
                  String(val).toLowerCase().includes(globalSearchTerm.toLowerCase())
              )
          )
        : [];

    const Dashboard = () => (
        <div className="main-content">
            <div className="dashboard-section-header">
                <h1 className="dashboard-section-title">Insurance Claims Dashboard</h1>
                <div className="flex-row gap-md">
                    <Button variant="ghost" icon="icon-refresh" onClick={() => alert('Refreshing data...')}>Refresh</Button>
                    <Button variant="secondary" icon="icon-filter" onClick={() => alert('Opening filter panel...')}>Filters</Button>
                    {permissions.canPerformBulkActions && (
                        <Button variant="primary" onClick={() => alert('Initiating bulk actions...')}>Bulk Actions</Button>
                    )}
                    {permissions.canSubmitClaim && (
                        <Button variant="primary" icon="icon-file-text" onClick={() => navigateTo('SUBMIT_CLAIM')}>Initiate New Claim</Button>
                    )}
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <KPIStatusCard
                    title="Total Claims"
                    value={claimsData.length}
                    change="+5%"
                    trend="up"
                    onClick={() => alert('View all claims report')}
                    live={true}
                />
                <KPIStatusCard
                    title="Claims In Progress"
                    value={claimsData.filter(c => c.status === 'In Progress').length}
                    change="-2%"
                    trend="down"
                    status="In Progress"
                    onClick={() => alert('View in-progress claims')}
                />
                <KPIStatusCard
                    title="Claims Pending Approval"
                    value={claimsData.filter(c => c.status === 'Pending').length}
                    change="+10%"
                    trend="up"
                    status="Pending"
                    onClick={() => alert('View pending claims')}
                />
                <KPIStatusCard
                    title="Total Approved Payout"
                    value={`$${claimsData.filter(c => c.status === 'Approved').reduce((acc, c) => acc + (c?.amount || 0), 0).toLocaleString()}`}
                    change="+8%"
                    trend="up"
                    onClick={() => alert('View approved payouts')}
                />
            </div>

            <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Recent Claims</h2>
                {/* Moved "Initiate New Claim" button here to top section */}
            </div>

            <div className="dashboard-grid">
                {claimsData.length > 0 ? (
                    // Sort claims by submissionDate descending to show latest first
                    [...claimsData].sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate)).map(claim => (
                        <Card key={claim.id} onClick={() => handleCardClick(claim.id)} style={{ padding: 'var(--spacing-lg)' }}>
                            <div className="card-header" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <h3 className="card-title">{claim.policyholder?.split(' ')[0]}'s {claim.claimType}</h3>
                                <StatusBadge status={claim.status} />
                            </div>
                            <p className="card-description" style={{ marginBottom: 'var(--spacing-md)' }}>
                                Policy: {claim.policyNumber} &bull; Amount: ${claim.amount?.toLocaleString()}
                            </p>
                            <div className="card-footer">
                                <span>ID: {claim.id}</span>
                                <span className="text-secondary">Last Updated: {claim.lastUpdated}</span>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
                        <h3 style={{ fontSize: 'var(--font-xl)', color: 'var(--text-main)', marginBottom: 'var(--spacing-md)' }}>No Claims Found</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>It looks like there are no claims in the system yet. Let's get started!</p>
                        {permissions.canSubmitClaim && (
                            <Button variant="primary" icon="icon-file-text" onClick={() => navigateTo('SUBMIT_CLAIM')}>Submit Your First Claim</Button>
                        )}
                    </Card>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-xl)' }}>
                <div>
                    <h2 className="dashboard-section-title" style={{ marginBottom: 'var(--spacing-lg)' }}>Claim Trends</h2>
                    <ChartPlaceholder title="Claims by Type" type="Donut" />
                </div>
                <div>
                    <h2 className="dashboard-section-title" style={{ marginBottom: 'var(--spacing-lg)' }}>Processing Time</h2>
                    <ChartPlaceholder title="Average Processing Time" type="Line" />
                </div>
            </div>
        </div>
    );

    const ClaimDetail = ({ claimId }) => {
        const claim = claimsData.find(c => c.id === claimId);

        if (!claim) {
            return (
                <div className="detail-view-container" style={{ textAlign: 'center', paddingTop: 'var(--spacing-xxl)' }}>
                    <h1 style={{ fontSize: 'var(--font-3xl)', color: 'var(--text-main)' }}>Claim Not Found</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)' }}>The claim you are looking for does not exist or you do not have access.</p>
                    <Button onClick={() => navigateTo('DASHBOARD')} style={{ marginTop: 'var(--spacing-xl)' }}>Back to Dashboard</Button>
                </div>
            );
        }

        return (
            <div className="detail-view-container">
                <div className="breadcrumbs">
                    <a href="#" onClick={() => navigateTo('DASHBOARD')}>Dashboard</a>
                    <span className="icon icon-arrow-right" style={{ fontSize: '0.8em' }}></span>
                    <span>Claim: {claim.id}</span>
                </div>

                <div className="detail-header flex-row justify-between items-center">
                    <div>
                        <h1 className="detail-title">{claim.claimType} Claim ({claim.id})</h1>
                        <p className="text-secondary" style={{ fontSize: 'var(--font-lg)' }}>
                            Policyholder: {claim.policyholder} &bull; Policy: {claim.policyNumber}
                        </p>
                        <StatusBadge status={claim.status} style={{ marginTop: 'var(--spacing-md)' }} />
                    </div>
                    <div className="detail-actions">
                        {permissions.canApproveClaim && (
                            <Button variant="primary" icon="icon-check" onClick={() => handlePerformAction(claim.id, 'approve')}>Approve</Button>
                        )}
                        {permissions.canRejectClaim && (
                            <Button variant="secondary" icon="icon-x" onClick={() => handlePerformAction(claim.id, 'reject')}>Reject</Button>
                        )}
                        {(permissions.canEditOwnClaim || currentUserRole === 'CLAIMS_OFFICER') && ( // Example: Claims Officer can edit
                            <Button variant="secondary" icon="icon-edit" onClick={() => navigateTo('EDIT_CLAIM', { claimId: claim.id })}>Edit Claim</Button>
                        )}
                    </div>
                </div>

                <div className="detail-summary-grid">
                    <Card style={{ padding: 'var(--spacing-lg)' }}>
                        <h2 className="detail-section-title">Claim Summary</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="summary-item">
                                <p className="summary-item-label">Claim Type</p>
                                <p className="summary-item-value">{claim.claimType}</p>
                            </div>
                            <div className="summary-item">
                                <p className="summary-item-label">Amount</p>
                                <p className="summary-item-value">${claim.amount?.toLocaleString()}</p>
                            </div>
                            <div className="summary-item">
                                <p className="summary-item-label">Submission Date</p>
                                <p className="summary-item-value">{claim.submissionDate}</p>
                            </div>
                            <div className="summary-item">
                                <p className="summary-item-label">Last Updated</p>
                                <p className="summary-item-value">{claim.lastUpdated}</p>
                            </div>
                        </div>
                        <p style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-base)', color: 'var(--text-main)' }}>
                            **Description:** {claim.description}
                        </p>
                    </Card>

                    <Card style={{ padding: 'var(--spacing-lg)' }}>
                        <h2 className="detail-section-title">Workflow Progress</h2>
                        <div className="milestone-tracker">
                            {claim.milestones?.map(milestone => (
                                <div
                                    key={milestone.id}
                                    className={`milestone-item ${milestone.status === 'Completed' ? 'completed' : ''} ${milestone.status === 'In Progress' ? 'active' : ''}`}
                                >
                                    <div className="milestone-item-marker"></div>
                                    <div className="milestone-item-content">
                                        <p className="milestone-item-title">{milestone.name}</p>
                                        {milestone.date && <p className="milestone-item-date">{milestone.date}</p>}
                                        <p className="milestone-item-status">{milestone.status}</p>
                                        {milestone.sla && <p className="milestone-item-sla">SLA: {milestone.sla}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    <Card style={{ padding: 'var(--spacing-lg)' }}>
                        <h2 className="detail-section-title">Documents</h2>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {claim.documents?.map((doc, index) => (
                                <li key={index} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                    <div className="flex-row justify-between items-center">
                                        <span className="flex-row items-center gap-sm">
                                            <span className="icon icon-document" style={{ color: 'var(--accent-blue)' }}></span>
                                            <span style={{ fontWeight: 500 }}>{doc}</span>
                                        </span>
                                        <div className="flex-row gap-sm">
                                            <Button variant="ghost" icon="icon-download" onClick={() => alert(`Downloading ${doc}`)}>Download</Button>
                                            <Button variant="ghost" onClick={() => alert(`Previewing ${doc}`)}>Preview</Button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {claim.documents?.length === 0 && <p className="text-secondary">No documents uploaded.</p>}
                        </ul>
                    </Card>

                    <Card style={{ padding: 'var(--spacing-lg)' }}>
                        <h2 className="detail-section-title">Related Records</h2>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div className="flex-row justify-between items-center">
                                    <span className="flex-row items-center gap-sm">
                                        <span className="icon icon-link" style={{ color: 'var(--text-secondary)' }}></span>
                                        <span style={{ fontWeight: 500 }}>Policy: {claim.policyNumber}</span>
                                    </span>
                                    <Button variant="ghost" onClick={() => alert(`Navigating to Policy ${claim.policyNumber}`)}>View</Button>
                                </div>
                            </li>
                            {/* Add more related records dynamically */}
                            {/* <li style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div className="flex-row justify-between items-center">
                                    <span className="flex-row items-center gap-sm">
                                        <span className="icon icon-user" style={{ color: 'var(--text-secondary)' }}></span>
                                        <span style={{ fontWeight: 500 }}>Policyholder: {claim.policyholder}</span>
                                    </span>
                                    <Button variant="ghost" onClick={() => alert(`Navigating to Policyholder ${claim.policyholder}`)}>View</Button>
                                </div>
                            </li> */}
                            <li style={{ padding: 'var(--spacing-sm) 0' }}>
                                <p className="text-secondary">No additional related records for this claim.</p>
                            </li>
                        </ul>
                    </Card>
                </div>

                {permissions.canViewAuditLogs && (
                    <div>
                        <h2 className="detail-section-title">News & Audit Feed</h2>
                        <div className="audit-feed-list">
                            {claim.auditLog?.length > 0 ? (
                                claim.auditLog.map(entry => (
                                    <div key={entry.id} className="audit-feed-item">
                                        <span className="audit-icon icon icon-activity"></span>
                                        <p className="audit-text">
                                            <span className="font-semibold">{entry.actor}</span> {entry.action}
                                        </p>
                                        <span className="audit-timestamp">{entry.timestamp}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-secondary" style={{ padding: 'var(--spacing-md)' }}>No audit entries available.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const SubmitClaimForm = ({ onSubmit, onCancel }) => {
        const [formData, setFormData] = useState({
            policyholder: '',
            policyNumber: '',
            claimType: '',
            amount: '',
            description: '',
            documents: [], // Simplified for now, could be file objects
        });

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleFormSubmit = (e) => {
            e.preventDefault();
            if (!formData.policyholder || !formData.policyNumber || !formData.claimType || !formData.amount || !formData.description) {
                alert('Please fill in all required fields.');
                return;
            }
            onSubmit(formData);
        };

        return (
            <div className="form-container">
                <div className="breadcrumbs">
                    <a href="#" onClick={onCancel}>Dashboard</a>
                    <span className="icon icon-arrow-right" style={{ fontSize: '0.8em' }}></span>
                    <span>Submit New Claim</span>
                </div>

                <h1 className="detail-title" style={{ marginBottom: 'var(--spacing-xl)' }}>Submit New Claim</h1>

                <Card style={{ padding: 'var(--spacing-lg)' }}>
                    <form onSubmit={handleFormSubmit}>
                        <div className="form-group">
                            <label htmlFor="policyholder" className="form-label">Policyholder Name</label>
                            <input
                                type="text"
                                id="policyholder"
                                name="policyholder"
                                className="form-input"
                                value={formData.policyholder}
                                onChange={handleInputChange}
                                placeholder="e.g., Jane Doe"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="policyNumber" className="form-label">Policy Number</label>
                            <input
                                type="text"
                                id="policyNumber"
                                name="policyNumber"
                                className="form-input"
                                value={formData.policyNumber}
                                onChange={handleInputChange}
                                placeholder="e.g., PN-12345"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="claimType" className="form-label">Claim Type</label>
                            <select
                                id="claimType"
                                name="claimType"
                                className="form-select"
                                value={formData.claimType}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Claim Type</option>
                                <option value="Vehicle Accident">Vehicle Accident</option>
                                <option value="Home Burglary">Home Burglary</option>
                                <option value="Medical Emergency">Medical Emergency</option>
                                <option value="Property Damage">Property Damage</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount" className="form-label">Claim Amount ($)</label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                className="form-input"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="e.g., 1500.00"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">Description of Incident</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Provide a detailed description of the incident..."
                                required
                            ></textarea>
                        </div>

                        {/* Simplified document upload, for now just a text input for filenames */}
                        <div className="form-group">
                            <label htmlFor="documents" className="form-label">Supporting Documents (comma-separated filenames)</label>
                            <input
                                type="text"
                                id="documents"
                                name="documents"
                                className="form-input"
                                value={formData.documents.join(', ')}
                                onChange={(e) => setFormData(prev => ({ ...prev, documents: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                placeholder="e.g., police_report.pdf, photos.zip"
                            />
                        </div>

                        <div className="form-actions">
                            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                            <Button type="submit" variant="primary" icon="icon-send">Submit Claim</Button>
                        </div>
                    </form>
                </Card>
            </div>
        );
    };

    const GlobalSearchOverlay = () => {
        if (!isGlobalSearchOpen) return null;

        return (
            <div className="global-search-overlay" onClick={handleGlobalSearchToggle}>
                <div className="floating-search-box" onClick={(e) => e.stopPropagation()}>
                    <div className="search-input-wrapper">
                        <span className="search-icon icon icon-search"></span>
                        <input
                            type="text"
                            placeholder="Search claims, policies, documents..."
                            value={globalSearchTerm}
                            onChange={handleGlobalSearchChange}
                            autoFocus
                        />
                        <button className="search-close-button" onClick={handleGlobalSearchToggle}>
                            <span className="icon icon-close"></span>
                        </button>
                    </div>

                    {globalSearchTerm && (
                        <div className="search-results-list">
                            {filteredClaims.length > 0 ? (
                                filteredClaims.map(claim => (
                                    <div
                                        key={claim.id}
                                        className="search-result-item"
                                        onClick={() => {
                                            handleCardClick(claim.id);
                                            handleGlobalSearchToggle();
                                        }}
                                    >
                                        <p className="search-result-title">{claim.claimType} - {claim.policyholder}</p>
                                        <p className="search-result-description">Claim ID: {claim.id} | Status: {claim.status}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>No results found for "{globalSearchTerm}"</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Placeholder for other screens
    const OtherScreen = ({ name }) => (
        <div className="main-content" style={{ textAlign: 'center', paddingTop: 'var(--spacing-xxl)' }}>
            <h1 style={{ fontSize: 'var(--font-3xl)', color: 'var(--text-main)' }}>{name} Screen</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)' }}>This is a placeholder for the {name} functionality.</p>
            <Button onClick={() => navigateTo('DASHBOARD')} style={{ marginTop: 'var(--spacing-xl)' }}>Back to Dashboard</Button>
        </div>
    );

    return (
        <div className="app-container">
            <header className="app-header">
                <a href="#" className="app-logo" onClick={() => navigateTo('DASHBOARD')}>
                    InsurancePRO
                </a>
                <div className="header-user-info">
                    <button className="search-button" onClick={handleGlobalSearchToggle}>
                        <span className="icon icon-search"></span>
                    </button>
                    <span>{currentUserRole}</span>
                    <div className="header-avatar">
                        {currentUserRole.charAt(0)}
                    </div>
                </div>
            </header>

            {isGlobalSearchOpen && <GlobalSearchOverlay />}

            {view.screen === 'DASHBOARD' && <Dashboard />}
            {view.screen === 'CLAIM_DETAIL' && <ClaimDetail claimId={view.params?.claimId} />}
            {view.screen === 'SUBMIT_CLAIM' && <SubmitClaimForm onSubmit={handleSubmitNewClaim} onCancel={() => navigateTo('DASHBOARD')} />}
            {view.screen === 'EDIT_CLAIM' && <OtherScreen name={`Edit Claim: ${view.params?.claimId}`} />}
        </div>
    );
};

export default App;