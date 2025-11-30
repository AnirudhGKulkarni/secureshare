import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import Navbar from "@/components/FrontNavbar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Optional Firestore imports (uncomment and ensure src/firebase.ts exports `db`)
// import { collection, onSnapshot, query } from "firebase/firestore";
// import { db } from "@/firebase";

type AttackDataPoint = { label: string; count: number };

const mockData: AttackDataPoint[] = [
  { label: "Phishing", count: 42 },
  { label: "Malware", count: 31 },
  { label: "DDoS", count: 18 },
  { label: "Ransomware", count: 12 },
  { label: "Insider", count: 6 },
];

const FrontPage: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<AttackDataPoint[]>(mockData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If you want live Firestore data, uncomment and adapt below.
    /*
    setLoading(true);
    const q = query(collection(db, "attackCounts"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AttackDataPoint[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          arr.push({ label: d.label || doc.id, count: Number(d.count || 0) });
        });
        setDataPoints(arr.length ? arr : mockData);
        setLoading(false);
      },
      (err) => {
        console.error("snapshot error", err);
        setLoading(false);
      }
    );
    return () => unsub();
    */
  }, []);

  const labels = dataPoints.map((d) => d.label);
  const counts = dataPoints.map((d) => d.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Number of incidents",
        data: counts,
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Cyber Attacks by Type (Last 30 days)" },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 5 } },
    },
  };

  const total = counts.reduce((a, b) => a + b, 0);
  const top = dataPoints.slice().sort((a, b) => b.count - a.count)[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-accent p-6">
      <Navbar />
      <main className="max-w-7xl mx-auto mt-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow">
            <h3 className="text-lg font-semibold mb-4">Attack Trends</h3>
            <div className="h-72">
              <Bar data={chartData} options={chartOptions} />
            </div>
            {loading && <div className="text-sm mt-2 text-muted-foreground">Loading live data...</div>}
          </div>

          <aside className="space-y-4">
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow">
              <h4 className="text-sm text-muted-foreground">Total Incidents</h4>
              <div className="mt-2 text-3xl font-bold">{total}</div>
              <div className="text-sm text-muted-foreground mt-1">Last 30 days</div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow">
              <h4 className="text-sm text-muted-foreground">Top Attack Type</h4>
              <div className="mt-2 text-xl font-semibold">{top ? top.label : "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">Based on reported incidents</div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow">
              <h4 className="text-sm text-muted-foreground">Data Source</h4>
              <div className="mt-2 text-sm">Using Firestore realtime (optional) or demo data</div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow md:col-span-2">
            <h4 className="text-lg font-semibold mb-3">Recent Alerts</h4>
            <div className="text-sm text-muted-foreground">You can show latest incidents, severity, timestamps here.</div>
            {/* Replace with list or table of alerts */}
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow">
            <h4 className="text-lg font-semibold mb-3">Quick Actions</h4>
            <div className="flex flex-col gap-3">
              <button className="px-3 py-2 rounded bg-primary text-white">Add Incident</button>
              <button className="px-3 py-2 rounded border">Export CSV</button>
              <button className="px-3 py-2 rounded border">View Audit Log</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FrontPage;
