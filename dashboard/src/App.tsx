import React, { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";
const SCOPES = [`api://${import.meta.env.VITE_CLIENT_ID}/.default`];

interface DashboardData {
  totalFlags: number;
  totalReports: number;
  reportsByReason: { reasonCode: string; _count: { reasonCode: number } }[];
  recentFlags: {
    source: string;
    senderUpn: string;
    wordCount: number;
    computedWpm: number;
    createdAt: string;
    flagReason: string;
  }[];
}

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadDashboard();
  }, [isAuthenticated]);

  async function loadDashboard() {
    try {
      const tokenResp = await instance.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] });
      const res = await fetch(`${BACKEND}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${tokenResp.accessToken}` },
      });
      if (res.status === 403) { setError("Admin access required."); return; }
      if (!res.ok) { setError("Failed to load data."); return; }
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="login">
        <h1>Second Look — Admin Dashboard</h1>
        <button onClick={() => instance.loginPopup({ scopes: SCOPES })}>Sign in with Microsoft</button>
      </div>
    );
  }

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const reasonLabels = data.reportsByReason.map((r) => r.reasonCode);
  const reasonCounts = data.reportsByReason.map((r) => r._count.reasonCode);

  return (
    <div className="dashboard">
      <header>
        <h1>Second Look Dashboard</h1>
        <p className="subtitle">Pattern reporting only — no individual message content stored</p>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__value">{data.totalFlags}</span>
          <span className="stat__label">Total auto-flags</span>
        </div>
        <div className="stat">
          <span className="stat__value">{data.totalReports}</span>
          <span className="stat__label">Total manual reports</span>
        </div>
      </div>

      <section>
        <h2>Reports by reason</h2>
        <Bar
          data={{
            labels: reasonLabels,
            datasets: [{ label: "Reports", data: reasonCounts, backgroundColor: "#e8a020" }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </section>

      <section>
        <h2>Recent auto-flags</h2>
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Sender</th>
              <th>Words</th>
              <th>WPM</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentFlags.map((f, i) => (
              <tr key={i}>
                <td>{f.source}</td>
                <td>{f.senderUpn}</td>
                <td>{f.wordCount}</td>
                <td>{f.computedWpm}</td>
                <td>{f.flagReason}</td>
                <td>{new Date(f.createdAt).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
