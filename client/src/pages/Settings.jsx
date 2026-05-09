import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Building,
  CreditCard,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Wrench,
  Wallet,
  Users,
  Settings2,
  CheckCircle2,
  Building2,
  BellRing
} from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { billingService } from '../services/billingService';
import { messageService } from '../services/messageService';
import { paymentService } from '../services/paymentService';
import { reminderService } from '../services/reminderService';
import { showErrorAlert, showInfoAlert, showToast } from '../lib/alerts';
import { getApiErrorMessage } from '../lib/api';
import { confirmAction } from '../lib/alerts';
import { ROLES, isManagementRole } from '../utils/roles';
import '../styles/Dashboard.css';
import '../styles/Auth.css';

const defaultPaymentForm = {
  mpesaShortcode: '',
  mpesaConsumerKey: '',
  mpesaConsumerSecret: '',
  mpesaPasskey: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  paymentMethods: {
    mpesa: true,
    bank_transfer: false
  }
};

const defaultOrgBillingDraft = {
  pricePerUnit: '',
  billingCycleMonths: '',
  status: 'trial'
};

const normalizeMaskedValue = (value) => (value && value !== '********' ? value : '');

const Section = ({ icon: Icon, title, subtitle, children, action }) => (
  <section className="repair-form glass-card" style={{ marginBottom: 20 }}>
    <div className="section-header">
      <div>
        <h2 style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <Icon size={20} />}
          {title}
        </h2>
        {subtitle && <p className="subtext">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Settings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, organization, requiresPasswordChange } = useSession();
  const isOrgManager = user?.role !== ROLES.SUPER_ADMIN && isManagementRole(user?.role);
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const [loadingState, setLoadingState] = useState(true);
  const [billing, setBilling] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [staff, setStaff] = useState([]);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffDraft, setStaffDraft] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: ROLES.PROPERTY_MANAGER
  });
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    enabled: false,
    beforeDays: 3,
    afterDays: 3
  });
  const [reminderBusy, setReminderBusy] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [orgBillingDrafts, setOrgBillingDrafts] = useState({});
  const [adminBusy, setAdminBusy] = useState(false);

  const [messageBusy, setMessageBusy] = useState(false);

  const organizationId = organization?._id || organization?.id || null;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const load = async () => {
      setLoadingState(true);
      try {
        const tasks = [];

        if (isOrgManager) {
          tasks.push(
            billingService.getMyBilling().then(setBilling),
            authService.getStaff().then(setStaff),
            paymentService.getPaymentSettings().then((data) => {
              setPaymentForm({
                mpesaShortcode: normalizeMaskedValue(data.mpesaShortcode),
                mpesaConsumerKey: normalizeMaskedValue(data.mpesaConsumerKey),
                mpesaConsumerSecret: normalizeMaskedValue(data.mpesaConsumerSecret),
                mpesaPasskey: normalizeMaskedValue(data.mpesaPasskey),
                bankName: data.bankDetails?.bankName || '',
                accountNumber: data.bankDetails?.accountNumber || '',
                accountName: data.bankDetails?.accountName || '',
                paymentMethods: {
                  mpesa: (data.paymentMethods || []).includes('mpesa'),
                  bank_transfer: (data.paymentMethods || []).includes('bank_transfer')
                }
              });
            }).catch(() => null)
          );
        }

        if (isSuperAdmin) {
          tasks.push(
            adminService.getPendingUsers().then(setPendingUsers),
            adminService.getOrganizations().then((items) => {
              setOrganizations(items);
              const draftMap = {};
              for (const item of items) {
                draftMap[item._id || item.id] = {
                  pricePerUnit: item.pricePerUnit ?? item.price_per_unit ?? '',
                  billingCycleMonths: item.billingCycleMonths ?? item.billing_cycle_months ?? '',
                  status: item.status || 'trial'
                };
              }
              setOrgBillingDrafts(draftMap);
            })
          );
        }

        await Promise.all(tasks);
      } catch (requestError) {
        await showErrorAlert('Settings Load Failed', getApiErrorMessage(requestError, 'Failed to load settings.'));
      } finally {
        setLoadingState(false);
      }
    };

    load();
  }, [isAuthenticated, isOrgManager, isSuperAdmin]);

  const selectedPaymentMethods = useMemo(() => (
    Object.entries(paymentForm.paymentMethods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method)
  ), [paymentForm.paymentMethods]);

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handlePaymentMethodChange = (method, enabled) => {
    setPaymentForm((current) => ({
      ...current,
      paymentMethods: {
        ...current.paymentMethods,
        [method]: enabled
      }
    }));
  };

  const savePaymentSettings = async (event) => {
    event.preventDefault();
    setPaymentBusy(true);
    try {
      await paymentService.updatePaymentSettings({
        ...(paymentForm.mpesaShortcode ? { mpesaShortcode: paymentForm.mpesaShortcode } : {}),
        ...(paymentForm.mpesaConsumerKey ? { mpesaConsumerKey: paymentForm.mpesaConsumerKey } : {}),
        ...(paymentForm.mpesaConsumerSecret ? { mpesaConsumerSecret: paymentForm.mpesaConsumerSecret } : {}),
        ...(paymentForm.mpesaPasskey ? { mpesaPasskey: paymentForm.mpesaPasskey } : {}),
        bankDetails: {
          bankName: paymentForm.bankName,
          accountNumber: paymentForm.accountNumber,
          accountName: paymentForm.accountName
        },
        paymentMethods: selectedPaymentMethods
      });

      await showToast({
        icon: 'success',
        title: 'Payment Settings Saved',
        text: 'The payment configuration has been updated.'
      });
    } catch (requestError) {
      await showErrorAlert('Payment Settings Failed', getApiErrorMessage(requestError, 'Failed to update payment settings.'));
    } finally {
      setPaymentBusy(false);
    }
  };

  const updateStaffDraft = (field, value) => {
    setStaffDraft((current) => ({ ...current, [field]: value }));
  };

  const addStaff = async (event) => {
    event.preventDefault();
    setStaffBusy(true);
    try {
      await authService.addStaff({
        name: staffDraft.name,
        email: staffDraft.email,
        password: staffDraft.password,
        phoneNumber: staffDraft.phoneNumber,
        role: ROLES.PROPERTY_MANAGER
      });
      await showToast({
        icon: 'success',
        title: 'Staff Added',
        text: `${staffDraft.name} can now sign in.`
      });
      setStaffDraft({ name: '', email: '', password: '', phoneNumber: '', role: ROLES.PROPERTY_MANAGER });
      const nextStaff = await authService.getStaff();
      setStaff(nextStaff);
    } catch (requestError) {
      await showErrorAlert('Staff Creation Failed', getApiErrorMessage(requestError, 'Failed to add staff.'));
    } finally {
      setStaffBusy(false);
    }
  };

  const handlePaySubscription = async () => {
    const confirmed = await confirmAction({
      title: 'Open subscription payment?',
      text: 'This will open the Paystack payment link returned by the backend.',
      confirmButtonText: 'Open Link',
      cancelButtonText: 'Cancel',
      icon: 'question'
    });

    if (!confirmed) return;

    setBillingBusy(true);
    try {
      const response = await billingService.paySubscription();
      if (response.paymentUrl) {
        window.open(response.paymentUrl, '_blank', 'noopener,noreferrer');
      } else {
        await showInfoAlert('Billing Status', response.message || 'No balance due at this time.');
      }
    } catch (requestError) {
      await showErrorAlert('Billing Failed', getApiErrorMessage(requestError, 'Failed to initialize subscription payment.'));
    } finally {
      setBillingBusy(false);
    }
  };

  const toggleReminders = async (enabled) => {
    setReminderBusy(true);
    try {
      const response = await reminderService.toggleAutoReminders(enabled);
      await showToast({
        icon: 'success',
        title: response.message || 'Reminder setting updated',
        text: ''
      });
      setReminderForm((current) => ({ ...current, enabled }));
    } catch (requestError) {
      await showErrorAlert('Reminder Toggle Failed', getApiErrorMessage(requestError, 'Failed to update reminder state.'));
    } finally {
      setReminderBusy(false);
    }
  };

  const saveReminderSettings = async (event) => {
    event.preventDefault();
    setReminderBusy(true);
    try {
      const response = await reminderService.updateReminderSettings({
        beforeDays: reminderForm.beforeDays,
        afterDays: reminderForm.afterDays
      });
      await showToast({
        icon: 'success',
        title: response.message || 'Reminder settings updated',
        text: ''
      });
    } catch (requestError) {
      await showErrorAlert('Reminder Settings Failed', getApiErrorMessage(requestError, 'Failed to save reminder settings.'));
    } finally {
      setReminderBusy(false);
    }
  };

  const runAllReminders = async () => {
    setReminderBusy(true);
    try {
      const response = await reminderService.triggerAllReminders();
      await showInfoAlert('Reminders Triggered', response.message || 'Reminder batch executed.');
    } catch (requestError) {
      await showErrorAlert('Reminder Batch Failed', getApiErrorMessage(requestError, 'Failed to trigger reminders.'));
    } finally {
      setReminderBusy(false);
    }
  };

  const toggleGlobalChat = async (enabled) => {
    setMessageBusy(true);
    try {
      const response = await messageService.toggleGlobalChat(enabled);
      await showToast({
        icon: 'success',
        title: response.message || 'Global chat updated',
        text: ''
      });
    } catch (requestError) {
      await showErrorAlert('Chat Toggle Failed', getApiErrorMessage(requestError, 'Failed to update chat availability.'));
    } finally {
      setMessageBusy(false);
    }
  };

  const updateOrgBillingDraft = (orgId, field, value) => {
    setOrgBillingDrafts((current) => ({
      ...current,
      [orgId]: {
        ...current[orgId],
        [field]: value
      }
    }));
  };

  const saveOrgBilling = async (orgId) => {
    const draft = orgBillingDrafts[orgId];
    if (!draft) return;

    setAdminBusy(true);
    try {
      await adminService.updateOrganizationBilling(orgId, {
        pricePerUnit: Number(draft.pricePerUnit || 0),
        billingCycleMonths: Number(draft.billingCycleMonths || 1),
        status: draft.status
      });
      await showToast({
        icon: 'success',
        title: 'Organization Updated',
        text: 'Billing settings saved.'
      });
    } catch (requestError) {
      await showErrorAlert('Organization Billing Failed', getApiErrorMessage(requestError, 'Failed to update organization billing.'));
    } finally {
      setAdminBusy(false);
    }
  };

  const approvePendingUser = async (userId, name) => {
    setAdminBusy(true);
    try {
      await adminService.approveUser(userId);
      setPendingUsers((current) => current.filter((item) => item._id !== userId));
      await showToast({
        icon: 'success',
        title: 'User Approved',
        text: `${name} is now active.`
      });
    } catch (requestError) {
      await showErrorAlert('Approval Failed', getApiErrorMessage(requestError, 'Failed to approve user.'));
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Settings2 size={24} /> Settings</h1>
          <p className="subtext">Backend-aligned workspace controls, billing, and platform administration.</p>
        </div>
      </div>

      <Section
        icon={ShieldCheck}
        title="Account"
        subtitle="Your current backend session and password state."
      >
        <div className="details-grid">
          <div className="detail-card glass-card w-full">
            <p><strong>User:</strong> {user?.name}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Organization:</strong> {organization?.name || 'No active organization'}</p>
            <p><strong>Password change required:</strong> {requiresPasswordChange ? 'Yes' : 'No'}</p>
            <button type="button" className="btn-secondary mt-4" onClick={() => navigate('/change-password')}>
              Change Password
            </button>
          </div>
        </div>
      </Section>

      {isOrgManager && (
        <>
          <Section
            icon={Wallet}
            title="Billing"
            subtitle="Subscription billing uses the backend /billing routes."
            action={<button type="button" className="btn-primary" onClick={handlePaySubscription} disabled={billingBusy}>{billingBusy ? 'Opening...' : 'Pay Subscription'}</button>}
          >
            {billing ? (
              <div className="details-grid">
                <div className="detail-card glass-card w-full">
                  <p><strong>Organization:</strong> {billing.organization?.name}</p>
                  <p><strong>Status:</strong> {billing.organization?.status}</p>
                  <p><strong>Occupied units:</strong> {billing.currentUsage?.occupiedUnits ?? 0}</p>
                  <p><strong>Estimated next bill:</strong> {billing.currentUsage?.estimatedNextBill ?? 0}</p>
                </div>
              </div>
            ) : <p className="empty-msg">Billing data not loaded.</p>}
          </Section>

          <Section icon={Users} title="Staff" subtitle="Add organization staff through the backend auth route.">
            <form onSubmit={addStaff}>
              <div className="unit-editor-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input value={staffDraft.name} onChange={(event) => updateStaffDraft('name', event.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={staffDraft.email} onChange={(event) => updateStaffDraft('email', event.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={staffDraft.phoneNumber} onChange={(event) => updateStaffDraft('phoneNumber', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input type="password" value={staffDraft.password} onChange={(event) => updateStaffDraft('password', event.target.value)} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={staffBusy}>{staffBusy ? 'Adding...' : 'Add Property Manager'}</button>
              </div>
            </form>

            <div className="suggestions-grid" style={{ marginTop: 16 }}>
              {staff.length > 0 ? staff.map((item) => (
                <div key={item._id} className="suggestion-item glass-card">
                  <div className="suggestion-header">
                    <strong>{item.name}</strong>
                    <span className="property-tag">{item.role}</span>
                  </div>
                  <p>{item.email}</p>
                  <p className="date">{item.status}</p>
                </div>
              )) : <p className="empty-msg">No staff records loaded.</p>}
            </div>
          </Section>

          <Section icon={CreditCard} title="Payment Settings" subtitle="M-Pesa and bank transfer settings saved to the backend.">
            <form onSubmit={savePaymentSettings}>
              <div className="unit-editor-grid">
                <div className="form-group">
                  <label>M-Pesa Shortcode</label>
                  <input value={paymentForm.mpesaShortcode} onChange={(event) => setPaymentForm((current) => ({ ...current, mpesaShortcode: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Consumer Key</label>
                  <input value={paymentForm.mpesaConsumerKey} onChange={(event) => setPaymentForm((current) => ({ ...current, mpesaConsumerKey: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Consumer Secret</label>
                  <input value={paymentForm.mpesaConsumerSecret} onChange={(event) => setPaymentForm((current) => ({ ...current, mpesaConsumerSecret: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Passkey</label>
                  <input value={paymentForm.mpesaPasskey} onChange={(event) => setPaymentForm((current) => ({ ...current, mpesaPasskey: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input value={paymentForm.bankName} onChange={(event) => setPaymentForm((current) => ({ ...current, bankName: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input value={paymentForm.accountNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, accountNumber: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Account Name</label>
                  <input value={paymentForm.accountName} onChange={(event) => setPaymentForm((current) => ({ ...current, accountName: event.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Payment Methods</label>
                <div className="auth-chip-list">
                  <button type="button" className={`auth-chip ${paymentForm.paymentMethods.mpesa ? 'selected' : ''}`} onClick={() => handlePaymentMethodChange('mpesa', !paymentForm.paymentMethods.mpesa)}>
                    M-Pesa
                  </button>
                  <button type="button" className={`auth-chip ${paymentForm.paymentMethods.bank_transfer ? 'selected' : ''}`} onClick={() => handlePaymentMethodChange('bank_transfer', !paymentForm.paymentMethods.bank_transfer)}>
                    Bank Transfer
                  </button>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={paymentBusy}>{paymentBusy ? 'Saving...' : 'Save Payment Settings'}</button>
              </div>
            </form>
          </Section>

          <Section icon={BellRing} title="Reminders" subtitle="Toggle automation and edit reminder timing.">
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn-secondary" onClick={() => toggleReminders(true)} disabled={reminderBusy}>Enable Auto Reminders</button>
              <button type="button" className="btn-secondary" onClick={() => toggleReminders(false)} disabled={reminderBusy}>Disable Auto Reminders</button>
              <button type="button" className="btn-primary" onClick={runAllReminders} disabled={reminderBusy}>Trigger All Reminders</button>
            </div>
            <form onSubmit={saveReminderSettings} style={{ marginTop: 16 }}>
              <div className="unit-editor-grid">
                <div className="form-group">
                  <label>Before Days</label>
                  <input
                    type="number"
                    min="0"
                    value={reminderForm.beforeDays}
                    onChange={(event) => setReminderForm((current) => ({ ...current, beforeDays: Number(event.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label>After Days</label>
                  <input
                    type="number"
                    min="0"
                    value={reminderForm.afterDays}
                    onChange={(event) => setReminderForm((current) => ({ ...current, afterDays: Number(event.target.value) }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={reminderBusy}>{reminderBusy ? 'Saving...' : 'Save Reminder Timing'}</button>
              </div>
            </form>
          </Section>

          <Section icon={MessageCircle} title="Community Chat" subtitle="Enable or disable organization-wide chat.">
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn-primary" onClick={() => toggleGlobalChat(true)} disabled={messageBusy}>Enable Global Chat</button>
              <button type="button" className="btn-secondary" onClick={() => toggleGlobalChat(false)} disabled={messageBusy}>Disable Global Chat</button>
            </div>
          </Section>
        </>
      )}

      {isSuperAdmin && (
        <>
          <Section icon={Building2} title="Pending Users" subtitle="Approve tenant registrations from the backend admin queue.">
            <div className="suggestions-grid">
              {pendingUsers.length > 0 ? pendingUsers.map((item) => (
                <div key={item._id} className="suggestion-item glass-card">
                  <div className="suggestion-header">
                    <strong>{item.name}</strong>
                    <span className="property-tag">{item.role}</span>
                  </div>
                  <p>{item.email}</p>
                  <p className="date">{item.interestedProperty?.name || 'No property attached'}</p>
                  <button type="button" className="btn-primary btn-sm" onClick={() => approvePendingUser(item._id, item.name)} disabled={adminBusy}>
                    Approve
                  </button>
                </div>
              )) : <p className="empty-msg">No pending users.</p>}
            </div>
          </Section>

          <Section icon={Building} title="Organization Billing" subtitle="Update pricing and billing cycle for each organization.">
            <div className="suggestions-grid">
              {organizations.length > 0 ? organizations.map((item) => {
                const id = item._id || item.id;
                const draft = orgBillingDrafts[id] || defaultOrgBillingDraft;
                return (
                  <div key={id} className="suggestion-item glass-card">
                    <div className="suggestion-header">
                      <strong>{item.name}</strong>
                      <span className="property-tag">{item.status}</span>
                    </div>
                    <div className="form-group">
                      <label>Price Per Unit</label>
                      <input
                        type="number"
                        min="0"
                        value={draft.pricePerUnit}
                        onChange={(event) => updateOrgBillingDraft(id, 'pricePerUnit', event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Billing Cycle Months</label>
                      <input
                        type="number"
                        min="1"
                        value={draft.billingCycleMonths}
                        onChange={(event) => updateOrgBillingDraft(id, 'billingCycleMonths', event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={draft.status} onChange={(event) => updateOrgBillingDraft(id, 'status', event.target.value)}>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <button type="button" className="btn-primary btn-sm" onClick={() => saveOrgBilling(id)} disabled={adminBusy}>
                      Save Billing
                    </button>
                  </div>
                );
              }) : <p className="empty-msg">No organizations found.</p>}
            </div>
          </Section>
        </>
      )}

      {loadingState && <p className="empty-msg">Loading settings...</p>}
    </div>
  );
};

export default Settings;
