"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, CreditCard, MapPin, User2 } from "lucide-react";

const tabs = [
  { id: "personal", label: "Personal", icon: <User2 size={16} /> },
  { id: "academic", label: "Academic", icon: <BookMarked size={16} /> },
  { id: "financial", label: "Financial", icon: <CreditCard size={16} /> },
];

export default function StudentProfilePage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/student/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const { personal = {}, academic = {}, financial = {} } = data || {};
  const fee = financial?.fees?.[0] || {};
  const outstanding =
    (Number(fee.total_amount) || 0) -
    (Number(fee.paid_amount) || 0) -
    (Number(fee.discount) || 0);

  const topStats = useMemo(
    () => [
      { label: "Student code", value: personal.student_code || "--" },
      { label: "Current class", value: academic.classes?.[0]?.class_name || "Not assigned" },
      { label: "Fee status", value: fee.status || "No record" },
    ],
    [academic.classes, fee.status, personal.student_code]
  );

  if (loading) {
    return (
      <div className="glass-panel px-6 py-16 text-center">
        <p className="font-display text-3xl tracking-[-0.04em] text-slate-950">
          Loading student profile
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Pulling personal, academic, and financial records.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-16 text-center text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)]">
        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="eyebrow border-white/15 bg-white/10 text-cyan-100">
              Profile
            </p>
            <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] sm:text-5xl">
              {personal.first_name} {personal.last_name}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              A cleaner profile view for student identity, enrollment details, and payment records.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <div className="space-y-4">
              {topStats.map((item) => (
                <div key={item.label} className="rounded-[22px] bg-white/8 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white shadow-lg"
                : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {activeTab === "personal" ? (
            <Panel title="Identity information" copy="Core personal records from your student account.">
              <div className="grid gap-5 sm:grid-cols-2">
                <InfoBlock label="Gender" value={personal.gender} />
                <InfoBlock
                  label="Date of birth"
                  value={personal.dob ? new Date(personal.dob).toLocaleDateString() : ""}
                />
                <InfoBlock label="Email" value={personal.email} />
                <InfoBlock label="Phone" value={personal.phone} />
              </div>
              <div className="soft-panel mt-6 px-5 py-5">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <MapPin size={16} />
                  <span className="text-sm font-semibold">Residential address</span>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {[personal.address, personal.city, personal.state].filter(Boolean).join(", ") || "Not registered"}
                </p>
              </div>
            </Panel>
          ) : null}

          {activeTab === "academic" ? (
            <>
              <Panel title="Current enrollment" copy="Classes and active academic status.">
                <div className="space-y-4">
                  {(academic.classes || []).map((item) => (
                    <RowItem key={item.id} title={item.class_name || "Assigned class"} status={item.status} />
                  ))}
                  {!academic.classes?.length ? <EmptyState message="No class assignments available." /> : null}
                </div>
              </Panel>

              <Panel title="Batch assignments" copy="Time-bound academic group allocations.">
                <div className="space-y-4">
                  {(academic.batches || []).map((item) => (
                    <RowItem
                      key={item.id}
                      title={item.batch_name || "Study batch"}
                      subtitle={`${new Date(item.start_date).toLocaleDateString()} to ${
                        item.end_date ? new Date(item.end_date).toLocaleDateString() : "Present"
                      }`}
                    />
                  ))}
                  {!academic.batches?.length ? <EmptyState message="No batch assignments available." /> : null}
                </div>
              </Panel>
            </>
          ) : null}

          {activeTab === "financial" ? (
            <Panel title="Recent payments" copy="Latest recorded payments and references.">
              <div className="space-y-4">
                {(financial.payments || []).map((payment) => (
                  <div
                    key={payment.id}
                    className="soft-panel flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        Rs. {payment.amount}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {payment.payment_mode} | Ref: {payment.reference_no}
                      </p>
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {new Date(payment.paid_on).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {!financial.payments?.length ? <EmptyState message="No payment entries available." /> : null}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel title="Financial summary" copy="At-a-glance fee overview.">
            <StatRow label="Total fee" value={`Rs. ${fee.total_amount || 0}`} />
            <StatRow label="Paid" value={`Rs. ${fee.paid_amount || 0}`} />
            <StatRow label="Discount" value={`Rs. ${fee.discount || 0}`} />
            <div className="rounded-[22px] bg-rose-50 px-4 py-4">
              <StatRow label="Outstanding" value={`Rs. ${outstanding.toFixed(2)}`} emphasize />
            </div>
          </Panel>

          <div className="glass-panel overflow-hidden p-6">
            <div className="rounded-[28px] bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-500 px-6 py-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Academic alert
              </p>
              <p className="mt-4 font-display text-3xl tracking-[-0.04em]">
                Keep records ready
              </p>
              <p className="mt-3 text-sm leading-6 text-cyan-50">
                Ensure your biometric and profile information is updated before the next examination cycle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, copy, children }) {
  return (
    <div className="glass-panel p-6">
      <p className="eyebrow">Details</p>
      <h2 className="mt-4 section-title text-[2rem]">{title}</h2>
      <p className="mt-3 section-copy">{copy}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="soft-panel px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-slate-900">
        {value || "Not registered"}
      </p>
    </div>
  );
}

function RowItem({ title, subtitle, status }) {
  return (
    <div className="soft-panel px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {status ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {status}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatRow({ label, value, emphasize = false }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <span className={`text-sm font-semibold ${emphasize ? "text-rose-700" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="soft-panel px-5 py-6 text-sm text-slate-500">
      {message}
    </div>
  );
}
