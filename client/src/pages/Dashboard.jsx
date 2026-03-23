import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Building,
  Calendar,
  ClipboardList,
  Download,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Plus,
  ScrollText,
  Sparkles,
  Upload,
  Users,
  Wrench
} from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import FloatingHint from '../components/FloatingHint';
import {
  ManagementCharts,
  StaffCharts,
  SuperAdminCharts,
  TenantCharts
} from '../components/charts/DashboardCharts';
import Landing from './Landing';
import {
  confirmAction,
  promptRepairUpdate,
  showErrorAlert,
  showInfoAlert,
  showToast
} from '../lib/alerts';
import { useSession } from '../hooks/useSession';
import { getApiErrorMessage } from '../lib/api';
import { adminService } from '../services/adminService';
import { leaseService } from '../services/leaseService';
import { notificationService } from '../services/notificationService';
import { paymentService } from '../services/paymentService';
import { propertyService } from '../services/propertyService';
import { reminderService } from '../services/reminderService';
import { repairService } from '../services/repairService';
import { suggestionService } from '../services/suggestionService';
import { unitService } from '../services/unitService';
import { formatCurrency, formatDate } from '../utils/format';
import { downloadBlob, openBlobInNewTab } from '../utils/files';
import { formatRoleLabel, isManagementRole, isStaffRole, ROLES } from '../utils/roles';
import '../styles/Dashboard.css';

const emptyRepairDraft = {
  description: '',
  propertyId: '',
  unit: '',
  category: 'general',
  image: null
};

const emptyLeaseDraft = {
  tenantId: '',
  propertyId: '',
  unit: '',
  startDate: '',
  endDate: '',
  depositAmount: '',
  penaltyTerms: '',
  file: null
};

const emptyPropertyDraft = {
  name: '',
  address: '',
  description: '',
  type: 'apartment',
  units: ''
};

const emptyUnitDraft = {
  unitNumber: '',
  rentAmount: '',
  occupancyStatus: 'vacant',
  water: '',
  electricity: ''
};

const StatCard = ({ color = 'var(--primary)', highlight = false, hint, icon, label, subtext, value }) => {
  const content = (
    <div className={`stat-card glass-card ${highlight ? 'highlight-pulse' : ''}`}>
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-subtext" style={highlight ? { color: 'var(--primary)', fontWeight: 700 } : {}}>
          {subtext}
        </div>
      </div>
    </div>
  );

  return hint ? <FloatingHint content={hint}>{content}</FloatingHint> : content;
};

const NotificationSection = ({ notifications, onMarkRead }) => (
  <AnimatedSection as="section" className="notifications-section" delay={60}>
    <div className="section-header">
      <h2><Bell size={20} /> Notifications</h2>
      <span className="badge">{notifications.filter((notification) => !notification.isRead).length} unread</span>
    </div>
    <div className="notification-grid">
      {notifications.length > 0 ? notifications.map((notification) => (
        <div key={notification._id} className={`notification-item glass-card ${notification.isRead ? 'read' : 'unread'}`}>
          <div className="notification-header">
            <strong>{notification.title}</strong>
            <span className="date">{formatDate(notification.createdAt)}</span>
          </div>
          <p>{notification.message}</p>
          <div className="notification-footer">
            <span className="property-tag">{notification.type.replace(/_/g, ' ')}</span>
            {!notification.isRead && (
              <FloatingHint content="Mark this notice as handled so it drops out of your unread queue.">
                <button type="button" className="btn-secondary btn-sm" onClick={() => onMarkRead(notification._id)}>
                  Mark read
                </button>
              </FloatingHint>
            )}
          </div>
        </div>
      )) : (
        <div className="empty-state glass-card">
          <p>No notifications yet.</p>
        </div>
      )}
    </div>
  </AnimatedSection>
);

const RepairSection = ({
  canCreate,
  canManage,
  currentPropertyLabel,
  newRepair,
  onSubmit,
  onUpdate,
  properties,
  requests,
  setNewRepair,
  setShowForm,
  showForm,
  unitReadonly
}) => (
  <AnimatedSection as="section" className="repair-section" delay={120}>
    <div className="section-header">
      <h2><Wrench size={20} /> Maintenance Requests</h2>
      {canCreate && (
        <FloatingHint content="Raise a new maintenance ticket with category, unit, and photo evidence.">
          <button onClick={() => setShowForm(true)} className="btn-primary" type="button">
            <Plus size={18} /> New Request
          </button>
        </FloatingHint>
      )}
    </div>

    {showForm && (
      <div className="repair-form glass-card">
        <h3>Submit Maintenance Request</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Issue Category</label>
            <select
              value={newRepair.category}
              onChange={(event) => setNewRepair({ ...newRepair, category: event.target.value })}
            >
              <option value="general">General</option>
              <option value="plumbing">Plumbing</option>
              <option value="electricity">Electricity</option>
              <option value="security">Security</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description of Issue</label>
            <textarea
              value={newRepair.description}
              onChange={(event) => setNewRepair({ ...newRepair, description: event.target.value })}
              placeholder="Describe the problem..."
              required
            />
          </div>
          <div className="form-group">
            <label>Property</label>
            <select
              value={newRepair.propertyId}
              onChange={(event) => setNewRepair({ ...newRepair, propertyId: event.target.value })}
              required
              disabled={properties.length === 1}
            >
              <option value="">{currentPropertyLabel || 'Select Property'}</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>{property.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Unit</label>
            <input
              type="text"
              placeholder="Unit"
              value={newRepair.unit}
              onChange={(event) => setNewRepair({ ...newRepair, unit: event.target.value })}
              readOnly={unitReadonly}
              required
            />
          </div>
          <div className="form-group">
            <label>Attach Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setNewRepair({ ...newRepair, image: event.target.files?.[0] || null })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Submit Request</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    )}

    <div className="repair-grid">
      {requests.length > 0 ? requests.map((request) => (
        <div key={request._id} className={`repair-item glass-card status-${request.status}`}>
          <div className="repair-header">
            <span className={`status-badge ${request.status}`}>{request.status}</span>
            <span className="date">{formatDate(request.createdAt)}</span>
          </div>
          <div className="repair-body">
            <div className="repair-meta">
              <span className="property-tag">{request.category || 'general'}</span>
              {request.property?.name && <span>{request.property.name}</span>}
            </div>
            <p className="description">{request.description}</p>
            <p className="date">Unit {request.unit}</p>
            {request.tenant?.name && <p className="date">Requested by {request.tenant.name}</p>}
            {request.landlordResponse && (
              <div className="response-box">
                <strong>Management Response</strong>
                <p>{request.landlordResponse}</p>
                {request.technicianDetails && <p className="tech">Assigned: {request.technicianDetails}</p>}
              </div>
            )}
          </div>
          {canManage && request.status !== 'resolved' && (
            <div className="repair-footer">
              <FloatingHint content="Capture the next action and technician details in a SweetAlert update sheet.">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    const update = await promptRepairUpdate({
                      currentTechnician: request.technicianDetails || ''
                    });

                    if (update) {
                      onUpdate(request._id, 'in-progress', update.response, update.technician);
                    }
                  }}
                >
                  Mark In Progress
                </button>
              </FloatingHint>
              <FloatingHint content="Close this ticket and notify the tenant that the issue is complete.">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onUpdate(request._id, 'resolved', 'Issue resolved and closed.', request.technicianDetails || '')}
                >
                  Resolve
                </button>
              </FloatingHint>
            </div>
          )}
        </div>
      )) : (
        <div className="empty-state glass-card">
          <p>No maintenance requests found.</p>
        </div>
      )}
    </div>
  </AnimatedSection>
);

const WorkspaceShell = ({
  activeSection,
  footer,
  onSelect,
  sections,
  subtitle,
  title,
  children
}) => (
  <div className="workspace-shell">
    <aside className="workspace-sidebar glass-card">
      <div className="workspace-sidebar-header">
        <span className="workspace-sidebar-kicker">Workspace</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="workspace-nav">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              className={`workspace-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(section.id)}
            >
              <span className="workspace-nav-icon">
                <Icon size={18} />
              </span>
              <span className="workspace-nav-copy">
                <span className="workspace-nav-label">{section.label}</span>
                <span className="workspace-nav-note">{section.note}</span>
              </span>
              {section.badge !== undefined && section.badge !== null && (
                <span className={`workspace-nav-badge ${isActive ? 'active' : ''}`}>
                  {section.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {footer && <div className="workspace-sidebar-footer">{footer}</div>}
    </aside>

    <div className="workspace-main">
      {children}
    </div>
  </div>
);

const ActivityLogSection = ({ logs }) => (
  <AnimatedSection as="section" className="activity-log-section" delay={100}>
    <div className="section-header">
      <h2><ScrollText size={20} /> System Logs</h2>
      <span className="badge">{logs.length} recent</span>
    </div>

    <div className="activity-log-list">
      {logs.length > 0 ? logs.map((log) => (
        <article key={log._id} className="activity-log-item glass-card">
          <div className="activity-log-header">
            <div>
              <h3>{log.action}</h3>
              <p>
                {log.actor?.name || 'System'}
                {' • '}
                {formatDate(log.createdAt)}
              </p>
            </div>
            <span className="property-tag">{(log.entityType || 'system').replace(/_/g, ' ')}</span>
          </div>

          <div className="activity-log-meta">
            {log.organization?.name && <span>{log.organization.name}</span>}
            {log.actor?.role && <span>{formatRoleLabel(log.actor.role)}</span>}
            {log.metadata?.method && <span>{log.metadata.method}</span>}
          </div>

          {log.metadata?.summary && (
            <p className="activity-log-summary">{log.metadata.summary}</p>
          )}
        </article>
      )) : (
        <div className="empty-state glass-card">
          <p>No system logs yet.</p>
        </div>
      )}
    </div>
  </AnimatedSection>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { loading: sessionLoading, refreshSession, signOut, user } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [propertyUnits, setPropertyUnits] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [repairRequests, setRepairRequests] = useState([]);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [newRepair, setNewRepair] = useState(emptyRepairDraft);
  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRentAmount, setSelectedRentAmount] = useState(0);
  const [leases, setLeases] = useState([]);
  const [leaseActionLoading, setLeaseActionLoading] = useState('');
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [newLease, setNewLease] = useState(emptyLeaseDraft);
  const [leaseTenants, setLeaseTenants] = useState([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [newProperty, setNewProperty] = useState(emptyPropertyDraft);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [unitDraft, setUnitDraft] = useState(emptyUnitDraft);
  const [unitSaving, setUnitSaving] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState('');
  const [approvalAmounts, setApprovalAmounts] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionContent, setSuggestionContent] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [adminSummary, setAdminSummary] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState('overview');

  const userRole = user?.role;
  const isTenant = userRole === ROLES.TENANT;
  const isManagement = isManagementRole(userRole);
  const isStaff = isStaffRole(userRole);
  const isSuperAdmin = userRole === ROLES.SUPER_ADMIN;
  const tenantLease = leases[0] || null;
  const tenantProperties = tenantLease?.property ? [tenantLease.property] : user?.interestedProperty ? [user.interestedProperty] : [];
  const currentTenantUnit = tenantLease?.unit || user?.interestedUnit || '';

  useEffect(() => {
    if (isSuperAdmin) {
      setActiveWorkspaceSection((currentSection) => (
        ['platform', 'overview', 'notifications', 'leases', 'payments', 'portfolio', 'suggestions', 'repairs', 'logs']
          .includes(currentSection)
          ? currentSection
          : 'platform'
      ));
      return;
    }

    if (isManagement) {
      setActiveWorkspaceSection((currentSection) => (
        ['overview', 'notifications', 'leases', 'payments', 'portfolio', 'suggestions', 'repairs']
          .includes(currentSection)
          ? currentSection
          : 'overview'
      ));
      return;
    }

    setActiveWorkspaceSection('overview');
  }, [isManagement, isSuperAdmin]);

  useEffect(() => {
    if (isTenant) {
      setNewRepair((currentDraft) => ({
        ...currentDraft,
        propertyId: currentDraft.propertyId || tenantLease?.property?._id || user?.interestedProperty?._id || '',
        unit: currentDraft.unit || currentTenantUnit
      }));
    }
  }, [currentTenantUnit, isTenant, tenantLease?.property?._id, user?.interestedProperty?._id]);

  useEffect(() => {
    if (!user || !isManagement || !newLease.propertyId) {
      setLeaseTenants([]);
      return;
    }

    const fetchTenants = async () => {
      try {
        const propertyTenants = await propertyService.getPropertyTenants(newLease.propertyId);
        setLeaseTenants(propertyTenants);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Failed to load property tenants.'));
      }
    };

    fetchTenants();
  }, [isManagement, newLease.propertyId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadDashboard();
  }, [user?.id, user?.role]);

  const loadDashboard = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isTenant) {
        const [nextNotifications, nextRepairs, nextPayments, nextLease] = await Promise.all([
          notificationService.getNotifications(),
          repairService.getRepairs(),
          paymentService.getPayments(),
          leaseService.getTenantLease()
        ]);

        setNotifications(nextNotifications);
        setRepairRequests(nextRepairs);
        setPayments(nextPayments);
        setLeases(nextLease ? [nextLease] : []);
        setProperties([]);
        setPendingRegistrations([]);
        setSuggestions([]);
        setAdminSummary(null);
        setOrganizations([]);
        setAuditLogs([]);
      } else if (isManagement) {
        const [
          nextNotifications,
          nextProperties,
          nextRepairs,
          nextPayments,
          nextLeases,
          nextSuggestions,
          nextPendingRegistrations,
          nextAdminSummary,
          nextOrganizations,
          nextAuditLogs
        ] = await Promise.all([
          notificationService.getNotifications(),
          propertyService.getProperties(),
          repairService.getRepairs(),
          paymentService.getPayments(),
          leaseService.getManagementLeases(),
          suggestionService.getSuggestions(),
          propertyService.getPendingRegistrations(),
          isSuperAdmin ? adminService.getSummary() : Promise.resolve(null),
          isSuperAdmin ? adminService.getOrganizations() : Promise.resolve([]),
          isSuperAdmin ? adminService.getAuditLogs() : Promise.resolve([])
        ]);

        setNotifications(nextNotifications);
        setProperties(nextProperties);
        setRepairRequests(nextRepairs);
        setPayments(nextPayments);
        setLeases(nextLeases);
        setSuggestions(nextSuggestions);
        setPendingRegistrations(nextPendingRegistrations);
        setAdminSummary(nextAdminSummary);
        setOrganizations(nextOrganizations);
        setAuditLogs(nextAuditLogs);
      } else if (isStaff) {
        const [nextNotifications, nextRepairs] = await Promise.all([
          notificationService.getNotifications(),
          repairService.getRepairs()
        ]);

        setNotifications(nextNotifications);
        setRepairRequests(nextRepairs);
        setProperties([]);
        setPayments([]);
        setLeases([]);
        setPendingRegistrations([]);
        setSuggestions([]);
        setAdminSummary(null);
        setOrganizations([]);
        setAuditLogs([]);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await notificationService.markRead(notificationId);
      setNotifications((currentNotifications) => (
        currentNotifications.map((notification) => (
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        ))
      ));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to mark notification as read.'));
    }
  };

  const handleOpenUnits = async (property) => {
    setSelectedProperty(property);
    setUnitsLoading(true);

    try {
      const units = await unitService.getUnitsByProperty(property._id);
      setPropertyUnits(units);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load units for this property.'));
      setPropertyUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber.trim()) {
      await showInfoAlert('Phone Number Needed', 'Enter a phone number in the M-Pesa format to receive the STK push.');
      return;
    }

    setPaymentLoading(true);

    try {
      await paymentService.initiateStkPush({
        amount: selectedRentAmount,
        phoneNumber,
        tenantId: user.id
      });
      await showToast({
        icon: 'success',
        title: 'STK Push Sent',
        text: 'Check your phone to complete the M-Pesa payment.'
      });
      setShowPaymentModal(false);
    } catch (requestError) {
      await showErrorAlert('Payment Failed', getApiErrorMessage(requestError, 'Payment initiation failed.'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleApproveRegistration = async (registration) => {
    const rentAmount = Number(approvalAmounts[registration._id] || 0);

    if (!rentAmount) {
      await showInfoAlert('Rent Amount Required', 'Enter the monthly rent amount before approving this application.');
      return;
    }

    setApprovalLoading(registration._id);

    try {
      await propertyService.approveRegistration(registration._id, { rentAmount });
      await showToast({
        icon: 'success',
        title: 'Application Approved',
        text: `${registration.name} is now an active tenant.`
      });
      setApprovalAmounts((currentAmounts) => ({ ...currentAmounts, [registration._id]: '' }));
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Approval Failed', getApiErrorMessage(requestError, 'Approval failed.'));
    } finally {
      setApprovalLoading('');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    const confirmed = await confirmAction({
      title: 'Reject Application?',
      text: 'The applicant will be marked as rejected and notified immediately.',
      confirmButtonText: 'Reject Application',
      cancelButtonText: 'Keep Pending',
      icon: 'warning'
    });

    if (!confirmed) {
      return;
    }

    setApprovalLoading(registrationId);

    try {
      await propertyService.rejectRegistration(registrationId);
      await showToast({
        icon: 'success',
        title: 'Application Rejected',
        text: 'The applicant has been updated and notified.'
      });
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Rejection Failed', getApiErrorMessage(requestError, 'Rejection failed.'));
    } finally {
      setApprovalLoading('');
    }
  };

  const handleSendSuggestion = async (event) => {
    event.preventDefault();
    if (!suggestionContent.trim()) {
      return;
    }

    setSuggestionLoading(true);

    try {
      await suggestionService.createSuggestion({ content: suggestionContent.trim() });
      setSuggestionContent('');
      await showToast({
        icon: 'success',
        title: 'Suggestion Sent',
        text: 'Your message was delivered anonymously.'
      });
    } catch (requestError) {
      await showErrorAlert('Suggestion Failed', getApiErrorMessage(requestError, 'Failed to send suggestion.'));
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleLeaseUpload = async (event) => {
    event.preventDefault();
    if (!newLease.file) {
      await showInfoAlert('Lease File Required', 'Select the lease document before uploading it.');
      return;
    }

    const formData = new FormData();
    formData.append('lease', newLease.file);
    formData.append('tenantId', newLease.tenantId);
    formData.append('propertyId', newLease.propertyId);
    formData.append('unit', newLease.unit);
    formData.append('startDate', newLease.startDate);
    formData.append('endDate', newLease.endDate);
    formData.append('depositAmount', newLease.depositAmount);
    formData.append('penaltyTerms', newLease.penaltyTerms);

    try {
      await leaseService.uploadLease(formData);
      await showToast({
        icon: 'success',
        title: 'Lease Uploaded',
        text: 'The lease agreement is now available to the tenant.'
      });
      setShowLeaseForm(false);
      setNewLease(emptyLeaseDraft);
      setLeaseTenants([]);
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Upload Failed', getApiErrorMessage(requestError, 'Lease upload failed.'));
    }
  };

  const handleLeaseTenantSelect = (tenantUserId) => {
    const selectedTenant = leaseTenants.find((tenant) => tenant.user?._id === tenantUserId);

    setNewLease((currentLease) => ({
      ...currentLease,
      tenantId: tenantUserId,
      unit: selectedTenant?.unit || ''
    }));
  };

  const handleViewLease = async (lease) => {
    setLeaseActionLoading(`view-${lease._id}`);

    try {
      const blob = await leaseService.fetchLeaseFile(lease._id);
      openBlobInNewTab(blob);
    } catch (requestError) {
      await showErrorAlert('Open Failed', getApiErrorMessage(requestError, 'Failed to open the lease document.'));
    } finally {
      setLeaseActionLoading('');
    }
  };

  const handleDownloadLease = async (lease) => {
    setLeaseActionLoading(`download-${lease._id}`);

    try {
      const blob = await leaseService.fetchLeaseFile(lease._id);
      downloadBlob(blob, lease.fileName || `lease-${lease._id}.pdf`);
      await showToast({
        icon: 'success',
        title: 'Download Started',
        text: lease.fileName || 'Lease document download triggered.'
      });
    } catch (requestError) {
      await showErrorAlert('Download Failed', getApiErrorMessage(requestError, 'Failed to download the lease document.'));
    } finally {
      setLeaseActionLoading('');
    }
  };

  const handlePropertySubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...newProperty,
      units: newProperty.units.split(',').map((unit) => unit.trim()).filter(Boolean)
    };

    try {
      if (editingPropertyId) {
        await propertyService.updateProperty(editingPropertyId, payload);
        await showToast({
          icon: 'success',
          title: 'Property Updated',
          text: `${payload.name} has been updated.`
        });
      } else {
        await propertyService.createProperty(payload);
        await showToast({
          icon: 'success',
          title: 'Property Added',
          text: `${payload.name} is now part of your portfolio.`
        });
      }

      setShowPropertyForm(false);
      setEditingPropertyId(null);
      setNewProperty(emptyPropertyDraft);
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Save Failed', getApiErrorMessage(requestError, 'Failed to save property.'));
    }
  };

  const handleGenerateReminder = async (tenantId) => {
    try {
      const response = await reminderService.generateReminder({ tenantId });
      await showInfoAlert('AI Reminder Draft', response.reminderText, {
        width: 720
      });
    } catch (requestError) {
      await showErrorAlert('Reminder Failed', getApiErrorMessage(requestError, 'Failed to generate a reminder.'));
    }
  };

  const handleRepairSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append('description', newRepair.description);
    formData.append('propertyId', newRepair.propertyId);
    formData.append('unit', newRepair.unit);
    formData.append('category', newRepair.category);

    if (newRepair.image) {
      formData.append('image', newRepair.image);
    }

    try {
      await repairService.createRepair(formData);
      await showToast({
        icon: 'success',
        title: 'Maintenance Request Sent',
        text: 'The maintenance team has been notified.'
      });
      setShowRepairForm(false);
      setNewRepair({
        ...emptyRepairDraft,
        propertyId: isTenant ? tenantLease?.property?._id || user?.interestedProperty?._id || '' : '',
        unit: isTenant ? currentTenantUnit : ''
      });
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Request Failed', getApiErrorMessage(requestError, 'Failed to submit the maintenance request.'));
    }
  };

  const handleUpdateRepair = async (repairId, status, landlordResponse = '', technicianDetails = '') => {
    try {
      await repairService.updateRepair(repairId, { status, landlordResponse, technicianDetails });
      await showToast({
        icon: 'success',
        title: status === 'resolved' ? 'Ticket Resolved' : 'Maintenance Updated',
        text: 'The tenant-facing maintenance status has been refreshed.'
      });
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Update Failed', getApiErrorMessage(requestError, 'Failed to update the maintenance request.'));
    }
  };

  useEffect(() => {
    if (activeWorkspaceSection !== 'portfolio') {
      setSelectedProperty(null);
    }
  }, [activeWorkspaceSection]);

  useEffect(() => {
    if (!selectedProperty) {
      setShowUnitForm(false);
      setEditingUnitId(null);
      setUnitDraft(emptyUnitDraft);
    }
  }, [selectedProperty]);

  const managementSections = [
    {
      id: 'overview',
      label: 'Overview',
      note: 'Stats and approvals',
      icon: LayoutDashboard,
      badge: pendingRegistrations.length
    },
    {
      id: 'notifications',
      label: 'Notices',
      note: 'Unread updates',
      icon: Bell,
      badge: notifications.filter((notification) => !notification.isRead).length
    },
    {
      id: 'leases',
      label: 'Leases',
      note: 'Files and terms',
      icon: FileText,
      badge: leases.length
    },
    {
      id: 'payments',
      label: 'Payments',
      note: 'Collections',
      icon: DollarSign,
      badge: payments.length
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      note: 'Properties and units',
      icon: Home,
      badge: properties.length
    },
    {
      id: 'suggestions',
      label: 'Feedback',
      note: 'Tenant ideas',
      icon: MessageCircle,
      badge: suggestions.length
    },
    {
      id: 'repairs',
      label: 'Repairs',
      note: 'Maintenance queue',
      icon: Wrench,
      badge: repairRequests.filter((request) => request.status !== 'resolved').length
    }
  ];

  const workspaceSections = isSuperAdmin
    ? [
      {
        id: 'platform',
        label: 'Platform',
        note: 'Global totals',
        icon: Building,
        badge: adminSummary?.organizations ?? 0
      },
      ...managementSections,
      {
        id: 'logs',
        label: 'Logs',
        note: 'System activity',
        icon: ScrollText,
        badge: auditLogs.length
      }
    ]
    : managementSections;

  const resetUnitEditor = () => {
    setShowUnitForm(false);
    setEditingUnitId(null);
    setUnitDraft(emptyUnitDraft);
  };

  const handleUnitSubmit = async (event) => {
    event.preventDefault();

    if (!selectedProperty) {
      return;
    }

    setUnitSaving(true);

    const payload = {
      propertyId: selectedProperty._id,
      unitNumber: unitDraft.unitNumber.trim(),
      rentAmount: Number(unitDraft.rentAmount || 0),
      occupancyStatus: unitDraft.occupancyStatus,
      meterReadings: {
        water: Number(unitDraft.water || 0),
        electricity: Number(unitDraft.electricity || 0)
      }
    };

    try {
      if (editingUnitId) {
        await unitService.updateUnit(editingUnitId, payload);
        await showToast({
          icon: 'success',
          title: 'Unit Updated',
          text: `Unit ${payload.unitNumber} has been updated.`
        });
      } else {
        await unitService.createUnit(payload);
        await showToast({
          icon: 'success',
          title: 'Unit Added',
          text: `Unit ${payload.unitNumber} is now available in ${selectedProperty.name}.`
        });
      }

      resetUnitEditor();
      await handleOpenUnits(selectedProperty);
      loadDashboard();
    } catch (requestError) {
      await showErrorAlert('Unit Save Failed', getApiErrorMessage(requestError, 'Failed to save the unit.'));
    } finally {
      setUnitSaving(false);
    }
  };

  const handleEditUnit = (unit) => {
    setEditingUnitId(unit._id);
    setUnitDraft({
      unitNumber: unit.unitNumber || '',
      rentAmount: unit.rentAmount ?? '',
      occupancyStatus: unit.occupancyStatus || 'vacant',
      water: unit.meterReadings?.water ?? '',
      electricity: unit.meterReadings?.electricity ?? ''
    });
    setShowUnitForm(true);
  };

  if (!user && !sessionLoading) {
    return <Landing />;
  }

  if (sessionLoading || loading) {
    return (
      <div className="dashboard-container pending-view">
        <div className="pending-card glass-card">
          <Sparkles size={48} className="pending-icon animate-pulse" />
          <h1>Loading your workspace</h1>
          <p className="subtext">We are syncing your dashboard and latest account state.</p>
        </div>
      </div>
    );
  }

  if (isTenant && user.status === 'pending') {
    return (
      <div className="dashboard-container pending-view">
        <div className="pending-card glass-card">
          <Sparkles size={48} className="pending-icon animate-pulse" />
          <h1>Application Pending</h1>
          <p>
            Your registration request for <strong>{user.interestedProperty?.name || 'the selected property'}</strong>,
            {' '}Unit <strong>{user.interestedUnit}</strong> is being reviewed by management.
          </p>
          <p className="subtext">Use the refresh action below to pull your latest account status from the server.</p>
          <button onClick={refreshSession} className="btn-secondary mt-4" type="button">Refresh Status</button>
        </div>
      </div>
    );
  }

  if (isTenant && user.status === 'rejected') {
    return (
      <div className="dashboard-container pending-view">
        <div className="pending-card glass-card">
          <Bell size={48} className="text-red-500" />
          <h1>Application Rejected</h1>
          <p>Your registration request was not approved.</p>
          <p className="subtext">You can clear this session and submit a new application.</p>
          <button
            onClick={() => {
              signOut();
              navigate('/register');
            }}
            className="btn-primary mt-4"
            type="button"
          >
            Apply Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div className="header-text">
          <h1>Welcome, {user.name}</h1>
          <p>
            {isManagement
              ? 'Manage properties, leases, applications, and collections from one place.'
              : isStaff
                ? 'Track assigned maintenance work and stay aligned with management.'
                : 'Everything you need for your rental stay is here.'}
          </p>
          {error && <div className="error-msg dashboard-error">{error}</div>}
        </div>
        <FloatingHint content="Role-aware dashboards, actions, and analytics now adapt to this access level.">
          <div className="header-badge glass-card">
            <span className="role-tag">{formatRoleLabel(user.role)}</span>
          </div>
        </FloatingHint>
      </header>

      {isManagement && (
        <WorkspaceShell
          activeSection={activeWorkspaceSection}
          footer={(
            <div className="workspace-sidebar-status">
              <span className="role-tag">{formatRoleLabel(user.role)}</span>
              <p>{isSuperAdmin ? 'Full platform access' : 'Fast property controls'}</p>
            </div>
          )}
          onSelect={setActiveWorkspaceSection}
          sections={workspaceSections}
          subtitle={isSuperAdmin ? 'Short labels. Clear state. Global view.' : 'Responsive tools for daily admin work.'}
          title={isSuperAdmin ? 'Admin Control' : 'Property Admin'}
        >
          {isSuperAdmin && adminSummary && activeWorkspaceSection === 'platform' && (
            <>
              <AnimatedSection as="div" className="dash-grid" delay={60}>
                <StatCard icon={<Building />} label="Organizations" value={adminSummary.organizations} subtext="Active SaaS accounts" hint="Total organizations currently tracked on the platform." />
                <StatCard icon={<Users />} label="Landlords" value={adminSummary.landlords} subtext="Portfolio owners" color="var(--secondary)" hint="Landlord accounts operating on the SaaS platform." />
                <StatCard icon={<Home />} label="Units" value={adminSummary.units} subtext="Tracked inventory" color="#10b981" hint="Active units tracked across all organizations." />
                <StatCard icon={<DollarSign />} label="Payments" value={adminSummary.successfulPayments} subtext="Confirmed receipts" color="var(--accent)" hint="Platform-wide payment confirmations recorded as paid." />
                <StatCard icon={<Activity />} label="Logs" value={adminSummary.auditEvents} subtext="Recorded activity" color="#f59e0b" hint="Audit events captured across the system." />
              </AnimatedSection>

              <SuperAdminCharts adminSummary={adminSummary} organizations={organizations} />

              <AnimatedSection as="section" className="organization-section" delay={100}>
                <div className="section-header">
                  <h2><Building size={20} /> Organizations</h2>
                  <span className="badge">{organizations.length} total</span>
                </div>
                <div className="organization-grid">
                  {organizations.length > 0 ? organizations.map((organization) => (
                    <div key={organization._id} className="organization-item glass-card">
                      <h3>{organization.name}</h3>
                      <p>{organization.owner?.name || 'No owner assigned'}</p>
                      <div className="organization-meta">
                        <span className="property-tag">{organization.subscriptionPlan || 'plan unavailable'}</span>
                        <span className={`status-badge ${organization.status || 'pending'}`}>{organization.status}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state glass-card">
                      <p>No organizations found.</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </>
          )}

          {activeWorkspaceSection === 'notifications' && (
            <NotificationSection notifications={notifications} onMarkRead={handleMarkNotificationRead} />
          )}

          {activeWorkspaceSection === 'overview' && (
            <>
              {pendingRegistrations.length > 0 && (
                <AnimatedSection as="section" className="pending-approvals-section" delay={70}>
                  <div className="section-header">
                    <h2><ClipboardList size={20} /> Pending Registrations</h2>
                    <span className="badge">{pendingRegistrations.length} awaiting review</span>
                  </div>
                  <div className="pending-grid">
                    {pendingRegistrations.map((registration) => (
                      <div key={registration._id} className="pending-item glass-card colored-border">
                        <div className="pending-user-info">
                          <h3>{registration.name}</h3>
                          <p>{registration.email}</p>
                          <div className="selection-badge">
                            <Building size={14} />
                            <span>
                              Unit <strong>{registration.interestedUnit}</strong> at {registration.interestedProperty?.name}
                            </span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            placeholder="Monthly rent amount"
                            value={approvalAmounts[registration._id] || ''}
                            onChange={(event) => setApprovalAmounts((currentAmounts) => ({
                              ...currentAmounts,
                              [registration._id]: event.target.value
                            }))}
                          />
                        </div>
                        <div className="pending-actions">
                          <FloatingHint content="Approve the application and create the active tenant record using the rent amount above.">
                            <button
                              onClick={() => handleApproveRegistration(registration)}
                              className="btn-primary btn-sm"
                              type="button"
                              disabled={approvalLoading === registration._id}
                            >
                              {approvalLoading === registration._id ? 'Saving...' : 'Approve'}
                            </button>
                          </FloatingHint>
                          <FloatingHint content="Reject the application and notify the applicant immediately.">
                            <button
                              onClick={() => handleRejectRegistration(registration._id)}
                              className="btn-secondary btn-sm"
                              type="button"
                              disabled={approvalLoading === registration._id}
                            >
                              Reject
                            </button>
                          </FloatingHint>
                        </div>
                      </div>
                    ))}
                  </div>
                </AnimatedSection>
              )}

              <AnimatedSection as="div" className="dash-grid" delay={100}>
                <StatCard
                  icon={<Home />}
                  label="Properties"
                  value={properties.length}
                  subtext={pendingRegistrations.length > 0 ? `${pendingRegistrations.length} new applications` : 'Tracked properties'}
                  highlight={pendingRegistrations.length > 0}
                  hint="This count reflects the properties attached to your account and organization."
                />
                <StatCard icon={<Users />} label="Leases" value={leases.length} subtext="Signed agreements" color="var(--secondary)" hint="Uploaded lease agreements stored in the system." />
                <StatCard
                  icon={<DollarSign />}
                  label="Collection"
                  value={formatCurrency(payments.reduce((sum, payment) => sum + (payment.status === 'paid' ? payment.amount : 0), 0))}
                  subtext="Confirmed payments"
                  color="#10b981"
                  hint="Only payments marked as paid contribute to this collection total."
                />
                <StatCard icon={<Wrench />} label="Repairs" value={repairRequests.length} subtext="Open and resolved tickets" color="var(--accent)" hint="Maintenance totals include pending, in-progress, and resolved requests." />
              </AnimatedSection>

              <ManagementCharts payments={payments} repairs={repairRequests} title={isSuperAdmin ? 'Portfolio Operations' : 'Portfolio Performance'} />
            </>
          )}

          {activeWorkspaceSection === 'leases' && (
            <AnimatedSection as="section" className="lease-section" delay={130}>
              <div className="section-header">
                <h2><FileText size={20} /> Lease Management</h2>
                <FloatingHint content="Upload a protected lease file together with dates, deposit, and penalty terms.">
                  <button onClick={() => setShowLeaseForm(true)} className="btn-primary" type="button">
                    <Upload size={18} /> Upload Lease
                  </button>
                </FloatingHint>
              </div>

              {showLeaseForm && (
                <div className="repair-form glass-card">
                  <h3>Upload Lease Agreement</h3>
                  <form onSubmit={handleLeaseUpload}>
                    <div className="form-group">
                      <label>Property</label>
                      <select
                        value={newLease.propertyId}
                        onChange={(event) => {
                          setNewLease({
                            ...newLease,
                            propertyId: event.target.value,
                            tenantId: '',
                            unit: ''
                          });
                        }}
                        required
                      >
                        <option value="">Select Property</option>
                        {properties.map((property) => (
                          <option key={property._id} value={property._id}>{property.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tenant</label>
                      <select
                        value={newLease.tenantId}
                        onChange={(event) => handleLeaseTenantSelect(event.target.value)}
                        required
                        disabled={!newLease.propertyId}
                      >
                        <option value="">Select Tenant</option>
                        {leaseTenants.map((tenant) => (
                          <option key={tenant._id} value={tenant.user?._id}>
                            {tenant.user?.name} - Unit {tenant.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Unit</label>
                      <input
                        type="text"
                        value={newLease.unit}
                        onChange={(event) => setNewLease({ ...newLease, unit: event.target.value })}
                        required
                      />
                    </div>
                    <div className="lease-grid">
                      <div className="form-group">
                        <label>Lease Start</label>
                        <input
                          type="date"
                          value={newLease.startDate}
                          onChange={(event) => setNewLease({ ...newLease, startDate: event.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Lease End</label>
                        <input
                          type="date"
                          value={newLease.endDate}
                          onChange={(event) => setNewLease({ ...newLease, endDate: event.target.value })}
                        />
                      </div>
                    </div>
                    <div className="lease-grid">
                      <div className="form-group">
                        <label>Deposit Amount</label>
                        <input
                          type="number"
                          min="0"
                          value={newLease.depositAmount}
                          onChange={(event) => setNewLease({ ...newLease, depositAmount: event.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Penalty Terms</label>
                        <input
                          type="text"
                          value={newLease.penaltyTerms}
                          onChange={(event) => setNewLease({ ...newLease, penaltyTerms: event.target.value })}
                          placeholder="Late fee or notice terms"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Lease Document</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(event) => setNewLease({ ...newLease, file: event.target.files?.[0] || null })}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">Upload Agreement</button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLeaseForm(false);
                          setNewLease(emptyLeaseDraft);
                          setLeaseTenants([]);
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="repair-grid">
                {leases.length > 0 ? leases.map((lease) => (
                  <div key={lease._id} className="repair-item glass-card">
                    <div className="repair-header">
                      <span className="status-badge resolved">Active</span>
                      <span className="date">{formatDate(lease.uploadedAt)}</span>
                    </div>
                    <div className="repair-body">
                      <p><strong>Tenant:</strong> {lease.tenant?.name}</p>
                      <p><strong>Property:</strong> {lease.property?.name} (Unit {lease.unit})</p>
                      <p><strong>Document:</strong> {lease.fileName}</p>
                      {(lease.startDate || lease.endDate) && (
                        <p className="date">Term: {formatDate(lease.startDate)} to {formatDate(lease.endDate)}</p>
                      )}
                    </div>
                    <div className="repair-footer">
                      <FloatingHint content="Open the protected lease file in a new tab.">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleViewLease(lease)}
                          disabled={leaseActionLoading === `view-${lease._id}`}
                        >
                          <FileText size={16} /> View
                        </button>
                      </FloatingHint>
                      <FloatingHint content="Download the protected lease file to your device.">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleDownloadLease(lease)}
                          disabled={leaseActionLoading === `download-${lease._id}`}
                        >
                          <Download size={16} /> Download
                        </button>
                      </FloatingHint>
                    </div>
                  </div>
                )) : <p className="empty-msg">No leases uploaded yet.</p>}
              </div>
            </AnimatedSection>
          )}

          {activeWorkspaceSection === 'payments' && (
            <AnimatedSection as="section" className="payment-history-section" delay={160}>
              <div className="section-header">
                <h2><DollarSign size={20} /> Recent Payments</h2>
              </div>
              <div className="payment-grid glass-card">
                {payments.length > 0 ? (
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due</th>
                        <th>Reminder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{payment.tenant?.user?.name}</td>
                          <td>{payment.tenant?.unit}</td>
                          <td>{formatCurrency(payment.amount, payment.currency)}</td>
                          <td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td>
                          <td>{formatDate(payment.dueDate)}</td>
                          <td>
                            <FloatingHint content="Generate an AI draft reminder for this tenant based on their rent details.">
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => handleGenerateReminder(payment.tenant?._id)}
                                disabled={!payment.tenant?._id}
                              >
                                <Sparkles size={14} /> Draft
                              </button>
                            </FloatingHint>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="empty-msg">No payments recorded.</p>}
              </div>
            </AnimatedSection>
          )}

          {activeWorkspaceSection === 'portfolio' && (
            <>
              <AnimatedSection as="section" className="property-section" delay={190}>
                <div className="section-header">
                  <h2>Your Portfolio</h2>
                  <FloatingHint content="Create a new property with type, address, description, and units.">
                    <button onClick={() => setShowPropertyForm(true)} className="btn-primary" type="button">
                      <Plus size={18} /> Add Property
                    </button>
                  </FloatingHint>
                </div>

                {showPropertyForm && (
                  <div className="repair-form glass-card">
                    <h3>{editingPropertyId ? 'Edit Property' : 'Add New Property'}</h3>
                    <form onSubmit={handlePropertySubmit}>
                      <div className="form-group">
                        <label>Property Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Sunset Meadows"
                          value={newProperty.name}
                          onChange={(event) => setNewProperty({ ...newProperty, name: event.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Property Type</label>
                        <select
                          value={newProperty.type}
                          onChange={(event) => setNewProperty({ ...newProperty, type: event.target.value })}
                        >
                          <option value="apartment">Apartment</option>
                          <option value="bedsitter">Bedsitter</option>
                          <option value="maisonette">Maisonette</option>
                          <option value="commercial">Commercial</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <input
                          type="text"
                          placeholder="e.g. 123 Street, Nairobi"
                          value={newProperty.address}
                          onChange={(event) => setNewProperty({ ...newProperty, address: event.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={newProperty.description}
                          onChange={(event) => setNewProperty({ ...newProperty, description: event.target.value })}
                          placeholder="Describe the property..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Units (comma separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. 101, 102, 103"
                          value={newProperty.units}
                          onChange={(event) => setNewProperty({ ...newProperty, units: event.target.value })}
                          required
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary">
                          {editingPropertyId ? 'Save Changes' : 'Add Property'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPropertyForm(false);
                            setEditingPropertyId(null);
                            setNewProperty(emptyPropertyDraft);
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="property-grid">
                  {properties.length > 0 ? properties.map((property) => (
                    <div key={property._id} className="property-item glass-card">
                      <div className="property-header">
                        <MapPin size={20} className="text-primary" />
                        <h4>{property.name}</h4>
                      </div>
                      <p className="address">{property.address}</p>
                      <p className="description">{property.description || 'No description provided yet.'}</p>
                      <div className="property-meta">
                        <span className="property-tag">{property.type || 'apartment'}</span>
                        <span>{property.units?.length || 0} units</span>
                      </div>
                      <div className="property-footer">
                        <FloatingHint content="Inspect occupancy, rent amount, and meter readings for this property.">
                          <button onClick={() => handleOpenUnits(property)} className="btn-secondary" type="button">View Units</button>
                        </FloatingHint>
                        <FloatingHint content="Edit the property details and unit list.">
                          <button
                            onClick={() => {
                              setEditingPropertyId(property._id);
                              setNewProperty({
                                name: property.name,
                                address: property.address,
                                description: property.description || '',
                                type: property.type || 'apartment',
                                units: property.units?.join(', ') || ''
                              });
                              setShowPropertyForm(true);
                            }}
                            className="btn-secondary"
                            type="button"
                          >
                            Edit
                          </button>
                        </FloatingHint>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state glass-card">
                      <p>No properties listed yet.</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {selectedProperty && (
                <div className="modal-overlay">
                  <div className="payment-modal glass-card wide-modal">
                    <div className="section-header">
                      <h3>Units for {selectedProperty.name}</h3>
                      <div className="modal-inline-actions">
                        <button
                          onClick={() => {
                            setShowUnitForm(true);
                            setEditingUnitId(null);
                            setUnitDraft(emptyUnitDraft);
                          }}
                          className="btn-primary"
                          type="button"
                        >
                          <Plus size={16} /> Add Unit
                        </button>
                        <button onClick={() => setSelectedProperty(null)} className="btn-secondary" type="button">Close</button>
                      </div>
                    </div>
                    {showUnitForm && (
                      <form className="unit-editor glass-card" onSubmit={handleUnitSubmit}>
                        <div className="section-header">
                          <h4>{editingUnitId ? 'Edit Unit' : 'New Unit'}</h4>
                          <button type="button" className="btn-secondary btn-sm" onClick={resetUnitEditor}>Cancel</button>
                        </div>
                        <div className="unit-editor-grid">
                          <div className="form-group">
                            <label>Unit Number</label>
                            <input
                              type="text"
                              value={unitDraft.unitNumber}
                              onChange={(event) => setUnitDraft({ ...unitDraft, unitNumber: event.target.value })}
                              placeholder="A1"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Rent Amount</label>
                            <input
                              type="number"
                              min="0"
                              value={unitDraft.rentAmount}
                              onChange={(event) => setUnitDraft({ ...unitDraft, rentAmount: event.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Status</label>
                            <select
                              value={unitDraft.occupancyStatus}
                              onChange={(event) => setUnitDraft({ ...unitDraft, occupancyStatus: event.target.value })}
                            >
                              <option value="vacant">Vacant</option>
                              <option value="occupied">Occupied</option>
                              <option value="reserved">Reserved</option>
                              <option value="maintenance">Maintenance</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Water Meter</label>
                            <input
                              type="number"
                              min="0"
                              value={unitDraft.water}
                              onChange={(event) => setUnitDraft({ ...unitDraft, water: event.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Electricity Meter</label>
                            <input
                              type="number"
                              min="0"
                              value={unitDraft.electricity}
                              onChange={(event) => setUnitDraft({ ...unitDraft, electricity: event.target.value })}
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn-primary" disabled={unitSaving}>
                            {unitSaving ? 'Saving...' : editingUnitId ? 'Save Unit' : 'Create Unit'}
                          </button>
                        </div>
                      </form>
                    )}
                    {unitsLoading ? (
                      <p className="empty-msg">Loading units...</p>
                    ) : propertyUnits.length > 0 ? (
                      <div className="unit-grid-modal">
                        {propertyUnits.map((unit) => (
                          <div key={unit._id} className="unit-card glass-card">
                            <div className="repair-header">
                              <strong>Unit {unit.unitNumber}</strong>
                              <span className={`status-badge ${unit.occupancyStatus}`}>{unit.occupancyStatus}</span>
                            </div>
                            <p>{formatCurrency(unit.rentAmount)}</p>
                            <p className="date">Water: {unit.meterReadings?.water || 0}</p>
                            <p className="date">Electricity: {unit.meterReadings?.electricity || 0}</p>
                            <div className="unit-card-actions">
                              <button type="button" className="btn-secondary btn-sm" onClick={() => handleEditUnit(unit)}>
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-msg">No units defined for this property.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeWorkspaceSection === 'suggestions' && (
            <AnimatedSection as="section" className="suggestions-section" delay={220}>
              <div className="section-header">
                <h2><MessageCircle size={20} /> Tenant Suggestions</h2>
                <span className="badge">{suggestions.length} total</span>
              </div>
              <div className="suggestions-grid">
                {suggestions.length > 0 ? suggestions.map((suggestion) => (
                  <div key={suggestion._id} className="suggestion-item glass-card">
                    <div className="suggestion-header">
                      <span className="property-tag"><Building size={14} /> {suggestion.property?.name}</span>
                      <span className="date">{formatDate(suggestion.createdAt)}</span>
                    </div>
                    <p className="suggestion-content">{suggestion.content}</p>
                  </div>
                )) : <p className="empty-msg">No suggestions received yet.</p>}
              </div>
            </AnimatedSection>
          )}

          {activeWorkspaceSection === 'repairs' && (
            <RepairSection
              canCreate={false}
              canManage={true}
              currentPropertyLabel=""
              newRepair={newRepair}
              onSubmit={handleRepairSubmit}
              onUpdate={handleUpdateRepair}
              properties={properties}
              requests={repairRequests}
              setNewRepair={setNewRepair}
              setShowForm={setShowRepairForm}
              showForm={showRepairForm}
              unitReadonly={false}
            />
          )}

          {isSuperAdmin && activeWorkspaceSection === 'logs' && (
            <ActivityLogSection logs={auditLogs} />
          )}
        </WorkspaceShell>
      )}

      {!isManagement && <NotificationSection notifications={notifications} onMarkRead={handleMarkNotificationRead} />}

      {isTenant && (
        <>
          <AnimatedSection as="div" className="dash-grid" delay={80}>
            <StatCard
              icon={<Home />}
              label="My Unit"
              value={tenantLease ? `Unit ${tenantLease.unit}` : 'Pending assignment'}
              subtext={tenantLease?.property?.name || 'Awaiting lease details'}
              hint="Your current property and unit assignment from the lease record."
            />
            <StatCard
              icon={<Calendar />}
              label="Next Payment"
              value={payments[0]?.dueDate ? formatDate(payments[0].dueDate) : 'Pending'}
              subtext="Based on your latest invoice"
              color="var(--secondary)"
              hint="Derived from the latest invoice or payment due date on your account."
            />
            <StatCard
              icon={<DollarSign />}
              label="Rent Amount"
              value={payments[0] ? formatCurrency(payments[0].amount, payments[0].currency) : 'Refer to lease'}
              subtext="Latest payment record"
              color="#10b981"
              hint="The latest rent amount recorded in your payment history."
            />
            <StatCard icon={<MessageCircle />} label="Messages" value="Community" subtext="Chat with neighbors" color="var(--accent)" hint="Use the community lounge to speak with neighbors and management." />
          </AnimatedSection>

          <TenantCharts notifications={notifications} payments={payments} repairs={repairRequests} />

          <AnimatedSection as="section" className="suggestion-box-section glass-card" delay={120}>
            <div className="section-header">
              <div>
                <h3><Sparkles size={20} className="text-secondary" /> Suggestions Box</h3>
                <p>Send an anonymous suggestion to management.</p>
              </div>
            </div>
            <form onSubmit={handleSendSuggestion} className="suggestion-form">
              <textarea
                placeholder="Share your thoughts or ideas anonymously..."
                value={suggestionContent}
                onChange={(event) => setSuggestionContent(event.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={suggestionLoading || !suggestionContent.trim()}>
                {suggestionLoading ? 'Sending...' : 'Send Anonymously'}
              </button>
            </form>
          </AnimatedSection>

          <AnimatedSection as="section" className="payment-actions glass-card" delay={150}>
            <div className="payment-header">
              <h3><DollarSign size={20} /> Rent Payment</h3>
              <p>Pay your rent securely via M-Pesa.</p>
            </div>
            <div className="payment-body">
              <div className="amount-display">
                <span>Amount Due:</span>
                <h2>{payments[0] ? formatCurrency(payments[0].amount, payments[0].currency) : '---'}</h2>
              </div>
              <FloatingHint content="Launch the M-Pesa payment flow for your latest recorded invoice amount.">
                <button
                  onClick={() => {
                    setSelectedRentAmount(payments[0]?.amount || 0);
                    setShowPaymentModal(true);
                  }}
                  className="btn-primary"
                  type="button"
                  disabled={!payments[0]}
                >
                  {payments[0] ? 'Pay with M-Pesa' : 'No Invoice Found'}
                </button>
              </FloatingHint>
            </div>
          </AnimatedSection>

          {showPaymentModal && (
            <div className="modal-overlay">
              <div className="payment-modal glass-card">
                <h3>M-Pesa Checkout</h3>
                <p>Enter your phone number to receive the STK Push.</p>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    placeholder="2547XXXXXXXX"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={handleMpesaPayment} className="btn-primary" type="button" disabled={paymentLoading}>
                    {paymentLoading ? 'Processing...' : 'Send STK Push'}
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="btn-secondary" type="button">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <AnimatedSection as="section" className="tenant-details" delay={180}>
            <div className="section-header">
              <h2><FileText size={20} /> My Lease Agreement</h2>
            </div>
            <div className="details-grid">
              {tenantLease ? (
                <div className="detail-card glass-card w-full">
                  <h4>{tenantLease.property?.name} - Unit {tenantLease.unit}</h4>
                  <p>Uploaded on {formatDate(tenantLease.uploadedAt)}</p>
                  {(tenantLease.startDate || tenantLease.endDate) && (
                    <p className="date">Lease term: {formatDate(tenantLease.startDate)} to {formatDate(tenantLease.endDate)}</p>
                  )}
                  <div className="flex gap-4 mt-4">
                    <FloatingHint content="Open the protected lease document in a new tab.">
                      <button type="button" className="btn-primary" onClick={() => handleViewLease(tenantLease)}>
                        <FileText size={18} /> View Agreement
                      </button>
                    </FloatingHint>
                    <FloatingHint content="Download your protected lease file.">
                      <button type="button" className="btn-secondary" onClick={() => handleDownloadLease(tenantLease)}>
                        <Download size={18} /> Download
                      </button>
                    </FloatingHint>
                  </div>
                </div>
              ) : (
                <div className="detail-card glass-card w-full opacity-50">
                  <p>Your lease agreement has not been uploaded yet. Please contact management.</p>
                </div>
              )}
            </div>
          </AnimatedSection>

          <RepairSection
            canCreate={true}
            canManage={false}
            currentPropertyLabel={tenantLease?.property?.name || user.interestedProperty?.name || 'Select Property'}
            newRepair={newRepair}
            onSubmit={handleRepairSubmit}
            onUpdate={handleUpdateRepair}
            properties={tenantProperties}
            requests={repairRequests}
            setNewRepair={setNewRepair}
            setShowForm={setShowRepairForm}
            showForm={showRepairForm}
            unitReadonly={Boolean(currentTenantUnit)}
          />
        </>
      )}

      {isStaff && (
        <>
          <AnimatedSection as="div" className="dash-grid" delay={80}>
            <StatCard icon={<Wrench />} label="Assigned Tickets" value={repairRequests.length} subtext="Maintenance queue" hint="All current maintenance tickets assigned to your role." />
            <StatCard icon={<Bell />} label="Notifications" value={notifications.length} subtext="Team updates" color="var(--secondary)" hint="Unread notices and workflow updates tied to your account." />
          </AnimatedSection>
          <StaffCharts repairs={repairRequests} />
          <RepairSection
            canCreate={false}
            canManage={true}
            currentPropertyLabel=""
            newRepair={newRepair}
            onSubmit={handleRepairSubmit}
            onUpdate={handleUpdateRepair}
            properties={[]}
            requests={repairRequests}
            setNewRepair={setNewRepair}
            setShowForm={setShowRepairForm}
            showForm={false}
            unitReadonly={false}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
