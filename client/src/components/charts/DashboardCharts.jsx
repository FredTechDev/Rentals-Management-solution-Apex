import React from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Activity, BarChart3 } from 'lucide-react';
import FloatingHint from '../FloatingHint';
import { formatCurrency } from '../../utils/format';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const baseLegendColor = '#cbd5e1';
const gridColor = 'rgba(148, 163, 184, 0.16)';

const sharedOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: baseLegendColor,
        usePointStyle: true
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8'
      },
      grid: {
        color: gridColor
      }
    },
    y: {
      ticks: {
        color: '#94a3b8'
      },
      grid: {
        color: gridColor
      }
    }
  }
};

const ChartCard = ({ title, caption, children, hint }) => (
  <div className="chart-card glass-card">
    <div className="chart-card-header">
      <div>
        <h3>{title}</h3>
        <p>{caption}</p>
      </div>
      {hint && (
        <FloatingHint content={hint} placement="left">
          <button type="button" className="chart-hint-btn" aria-label={`More about ${title}`}>
            <Activity size={16} />
          </button>
        </FloatingHint>
      )}
    </div>
    <div className="chart-card-body">{children}</div>
  </div>
);

const getPaymentBuckets = (payments = []) => {
  const buckets = {
    paid: 0,
    pending: 0,
    overdue: 0,
    failed: 0
  };

  for (const payment of payments) {
    const key = payment.status || 'pending';
    buckets[key] = (buckets[key] || 0) + Number(payment.amount || 0);
  }

  return buckets;
};

const getRepairBuckets = (repairs = []) => repairs.reduce((accumulator, repair) => {
  const key = repair.status || 'pending';
  accumulator[key] = (accumulator[key] || 0) + 1;
  return accumulator;
}, { pending: 0, 'in-progress': 0, resolved: 0 });

const buildCollectionTrend = (payments = []) => {
  const monthlyTotals = new Map();

  payments.forEach((payment) => {
    const sourceDate = payment.paymentDate || payment.createdAt || payment.dueDate;
    if (!sourceDate) {
      return;
    }

    const date = new Date(sourceDate);
    const label = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
    monthlyTotals.set(label, (monthlyTotals.get(label) || 0) + Number(payment.amount || 0));
  });

  const entries = [...monthlyTotals.entries()].slice(-6);
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, value]) => value)
  };
};

export const ManagementCharts = ({ payments, repairs, title = 'Performance Snapshot' }) => {
  const paymentBuckets = getPaymentBuckets(payments);
  const repairBuckets = getRepairBuckets(repairs);
  const trend = buildCollectionTrend(payments);

  return (
    <section className="analytics-section">
      <div className="section-header">
        <h2><BarChart3 size={20} /> {title}</h2>
        <span className="badge">Chart.js live analytics</span>
      </div>
      <div className="analytics-grid">
        <ChartCard
          title="Collections by Status"
          caption={`Paid rent totals ${formatCurrency(paymentBuckets.paid)}`}
          hint="This chart breaks payment value by current payment state."
        >
          <Bar
            data={{
              labels: ['Paid', 'Pending', 'Overdue', 'Failed'],
              datasets: [
                {
                  label: 'Amount (KSh)',
                  data: [paymentBuckets.paid, paymentBuckets.pending, paymentBuckets.overdue, paymentBuckets.failed],
                  backgroundColor: ['#0f766e', '#2563eb', '#f59e0b', '#dc2626'],
                  borderRadius: 12
                }
              ]
            }}
            options={sharedOptions}
          />
        </ChartCard>
        <ChartCard
          title="Maintenance Workflow"
          caption={`${repairs.length} maintenance tickets tracked`}
          hint="Track how many maintenance requests are still waiting, active, or resolved."
        >
          <Doughnut
            data={{
              labels: ['Pending', 'In Progress', 'Resolved'],
              datasets: [
                {
                  label: 'Requests',
                  data: [repairBuckets.pending || 0, repairBuckets['in-progress'] || 0, repairBuckets.resolved || 0],
                  backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                  borderWidth: 0
                }
              ]
            }}
            options={{
              ...sharedOptions,
              scales: undefined
            }}
          />
        </ChartCard>
        <ChartCard
          title="Collection Trend"
          caption="Latest collection movement across recent recorded months"
          hint="The line shows how payment totals are moving over the latest available months."
        >
          <Line
            data={{
              labels: trend.labels.length ? trend.labels : ['No data'],
              datasets: [
                {
                  label: 'Collected',
                  data: trend.values.length ? trend.values : [0],
                  fill: true,
                  tension: 0.35,
                  borderColor: '#60a5fa',
                  backgroundColor: 'rgba(96, 165, 250, 0.18)',
                  pointBackgroundColor: '#f8fafc'
                }
              ]
            }}
            options={sharedOptions}
          />
        </ChartCard>
      </div>
    </section>
  );
};

export const TenantCharts = ({ notifications, payments, repairs }) => {
  const paymentBuckets = getPaymentBuckets(payments);
  const repairBuckets = getRepairBuckets(repairs);
  const unread = notifications.filter((notification) => !notification.isRead).length;
  const read = notifications.length - unread;

  return (
    <section className="analytics-section">
      <div className="section-header">
        <h2><BarChart3 size={20} /> My Activity</h2>
        <span className="badge">Chart.js personal overview</span>
      </div>
      <div className="analytics-grid">
        <ChartCard
          title="Payment Status"
          caption="Your payment history by amount"
          hint="See how much value sits in each payment state on your account."
        >
          <Doughnut
            data={{
              labels: ['Paid', 'Pending', 'Overdue', 'Failed'],
              datasets: [
                {
                  data: [paymentBuckets.paid, paymentBuckets.pending, paymentBuckets.overdue, paymentBuckets.failed],
                  backgroundColor: ['#10b981', '#2563eb', '#f59e0b', '#dc2626'],
                  borderWidth: 0
                }
              ]
            }}
            options={{
              ...sharedOptions,
              scales: undefined
            }}
          />
        </ChartCard>
        <ChartCard
          title="Maintenance Progress"
          caption={`${repairs.length} requests linked to your stay`}
          hint="This chart shows how far your maintenance requests have moved."
        >
          <Bar
            data={{
              labels: ['Pending', 'In Progress', 'Resolved'],
              datasets: [
                {
                  label: 'Requests',
                  data: [repairBuckets.pending || 0, repairBuckets['in-progress'] || 0, repairBuckets.resolved || 0],
                  backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                  borderRadius: 12
                }
              ]
            }}
            options={sharedOptions}
          />
        </ChartCard>
        <ChartCard
          title="Notification Mix"
          caption={`${unread} unread notices still need attention`}
          hint="Unread notices usually include reminders, confirmations, and maintenance updates."
        >
          <Doughnut
            data={{
              labels: ['Unread', 'Read'],
              datasets: [
                {
                  data: [unread, read],
                  backgroundColor: ['#f43f5e', '#334155'],
                  borderWidth: 0
                }
              ]
            }}
            options={{
              ...sharedOptions,
              scales: undefined
            }}
          />
        </ChartCard>
      </div>
    </section>
  );
};

export const StaffCharts = ({ repairs }) => {
  const repairBuckets = getRepairBuckets(repairs);
  const categoryBuckets = repairs.reduce((accumulator, repair) => {
    const key = repair.category || 'general';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <section className="analytics-section">
      <div className="section-header">
        <h2><BarChart3 size={20} /> Workload Overview</h2>
        <span className="badge">Chart.js team board</span>
      </div>
      <div className="analytics-grid">
        <ChartCard
          title="Ticket Status"
          caption="Assigned maintenance progression"
          hint="See where your current tickets sit in the workflow."
        >
          <Doughnut
            data={{
              labels: ['Pending', 'In Progress', 'Resolved'],
              datasets: [
                {
                  data: [repairBuckets.pending || 0, repairBuckets['in-progress'] || 0, repairBuckets.resolved || 0],
                  backgroundColor: ['#f59e0b', '#2563eb', '#10b981'],
                  borderWidth: 0
                }
              ]
            }}
            options={{
              ...sharedOptions,
              scales: undefined
            }}
          />
        </ChartCard>
        <ChartCard
          title="Issue Categories"
          caption="What kind of work is coming in"
          hint="Category counts help plan specialized support or contractor allocation."
        >
          <Bar
            data={{
              labels: Object.keys(categoryBuckets).length ? Object.keys(categoryBuckets) : ['general'],
              datasets: [
                {
                  label: 'Requests',
                  data: Object.keys(categoryBuckets).length ? Object.values(categoryBuckets) : [0],
                  backgroundColor: '#38bdf8',
                  borderRadius: 12
                }
              ]
            }}
            options={sharedOptions}
          />
        </ChartCard>
      </div>
    </section>
  );
};

export const SuperAdminCharts = ({ adminSummary, organizations }) => {
  const statusBuckets = organizations.reduce((accumulator, organization) => {
    const key = organization.status || 'trial';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return (
    <section className="analytics-section">
      <div className="section-header">
        <h2><BarChart3 size={20} /> SaaS Analytics</h2>
        <span className="badge">Chart.js control tower</span>
      </div>
      <div className="analytics-grid">
        <ChartCard
          title="Platform Scale"
          caption="Core multi-tenant footprint"
          hint="This bar chart compares the current platform-wide operating counts."
        >
          <Bar
            data={{
              labels: ['Organizations', 'Landlords', 'Tenants', 'Properties', 'Units', 'Subscriptions'],
              datasets: [
                {
                  label: 'Count',
                  data: [
                    adminSummary.organizations,
                    adminSummary.landlords,
                    adminSummary.tenants,
                    adminSummary.properties,
                    adminSummary.units,
                    adminSummary.activeSubscriptions
                  ],
                  backgroundColor: ['#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316', '#22c55e', '#f43f5e'],
                  borderRadius: 12
                }
              ]
            }}
            options={sharedOptions}
          />
        </ChartCard>
        <ChartCard
          title="Organization Status"
          caption={`${organizations.length} customer organizations tracked`}
          hint="Use this to watch trial vs active vs suspended portfolio distribution."
        >
          <Doughnut
            data={{
              labels: Object.keys(statusBuckets).length ? Object.keys(statusBuckets) : ['trial'],
              datasets: [
                {
                  data: Object.keys(statusBuckets).length ? Object.values(statusBuckets) : [0],
                  backgroundColor: ['#38bdf8', '#10b981', '#f59e0b', '#ef4444'],
                  borderWidth: 0
                }
              ]
            }}
            options={{
              ...sharedOptions,
              scales: undefined
            }}
          />
        </ChartCard>
      </div>
    </section>
  );
};
