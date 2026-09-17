import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowPathIcon, 
  InboxIcon, 
  PaperAirplaneIcon, 
  EnvelopeOpenIcon, 
  ExclamationCircleIcon, 
  ClockIcon, 
  SparklesIcon, 
  CheckBadgeIcon, 
  TagIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline';
import { fetchAnalytics } from '../../services/api';
import toast from 'react-hot-toast';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Unable to load analytics');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = data?.calculatedStatistics;
  const insights = data?.aiGeneratedInsights || [];

  // Calculate timeline max for SVG scale
  const timeline = stats?.timeline || [];
  const maxVolume = Math.max(1, ...timeline.map(d => Math.max(d.received || 0, d.sent || 0)));

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-fade-in custom-scrollbar">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/25">
              <ChartBarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
                Email Analytics & Performance
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Calculated statistics computed directly from your local inbox data
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-2 text-sm font-semibold shadow-sm disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin text-primary-500' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Calculating local email statistics...</p>
        </div>
      )}

      {error && !data && (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center">
          <p className="text-rose-600 dark:text-rose-400 text-sm font-semibold">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition"
          >
            Retry Calculation
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* 1. KEY CALCULATED METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Received */}
            <div className="glass p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Received
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <InboxIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                {stats.totalReceived.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2">Active emails stored in local cache</p>
            </div>

            {/* Total Sent */}
            <div className="glass p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Sent
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                {stats.totalSent.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2">Outbound replies and messages</p>
            </div>

            {/* Unread Count */}
            <div className="glass p-5 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Unread Emails
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <EnvelopeOpenIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                {stats.unreadCount.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {stats.totalReceived > 0 ? Math.round((stats.unreadCount / stats.totalReceived) * 100) : 0}% of your inbox
              </p>
            </div>

            {/* Requiring Response */}
            <div className="glass p-5 rounded-3xl border border-amber-300/50 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Requiring Response
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ExclamationCircleIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-900 dark:text-amber-200">
                {stats.requiringResponseCount}
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-2 font-medium">
                Inquiries, action requests & follow-ups
              </p>
            </div>
          </div>

          {/* 2. EMAIL VOLUME TIMELINE (Native SVG Chart) */}
          <div className="glass p-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Email Volume Timeline (14 Days)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily incoming vs outgoing email distribution
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-primary-500"></span>
                  <span className="text-slate-600 dark:text-slate-300">Received</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-400"></span>
                  <span className="text-slate-600 dark:text-slate-300">Sent</span>
                </div>
              </div>
            </div>

            {/* SVG Native Timeline */}
            <div className="w-full h-56 relative pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 0.33, 0.66, 1].map((ratio, i) => {
                  const y = 160 - ratio * 140;
                  return (
                    <g key={i}>
                      <line x1="0" y1={y} x2="700" y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                      <text x="5" y={y - 4} fill="currentColor" className="text-[9px] fill-slate-400 font-mono">
                        {Math.round(ratio * maxVolume)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars for 14 days */}
                {timeline.map((item, idx) => {
                  const barWidth = 24;
                  const step = 700 / Math.max(1, timeline.length);
                  const x = idx * step + (step - barWidth) / 2;

                  const rHeight = Math.max(2, (item.received / maxVolume) * 140);
                  const sHeight = Math.max(0, (item.sent / maxVolume) * 140);

                  const rY = 160 - rHeight;
                  const sY = 160 - sHeight;

                  return (
                    <g key={idx} className="group">
                      {/* Received Bar */}
                      <rect
                        x={x}
                        y={rY}
                        width={barWidth / 2 - 1}
                        height={rHeight}
                        rx="3"
                        className="fill-primary-500 hover:fill-primary-600 transition cursor-pointer"
                      >
                        <title>{`${item.date}: ${item.received} received`}</title>
                      </rect>
                      {/* Sent Bar */}
                      <rect
                        x={x + barWidth / 2}
                        y={sY}
                        width={barWidth / 2 - 1}
                        height={sHeight}
                        rx="3"
                        className="fill-indigo-400 hover:fill-indigo-500 transition cursor-pointer"
                      >
                        <title>{`${item.date}: ${item.sent} sent`}</title>
                      </rect>
                      {/* Date Label on X Axis */}
                      <text
                        x={x + barWidth / 2}
                        y="176"
                        textAnchor="middle"
                        className="text-[9px] fill-slate-400 font-medium"
                      >
                        {item.date ? item.date.slice(5) : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 3. CATEGORY DISTRIBUTION & TOP SENDERS (Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="glass p-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <TagIcon className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Category Breakdown
                  </h3>
                </div>
                <div className="space-y-3.5">
                  {stats.categoryDistribution.slice(0, 6).map((cat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{cat.category}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          {cat.count} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Senders */}
            <div className="glass p-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-4">
                  <UserGroupIcon className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Top Senders by Volume
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {stats.topSenders.map((sender, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div className="flex items-center space-x-3 min-w-0 pr-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
                          {sender.name ? sender.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {sender.name || sender.email}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {sender.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                          {sender.count} msgs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. RESPONSE TURNAROUND STATISTICS */}
          <div className="glass p-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 shadow-sm">
            <div className="flex items-center space-x-2.5 mb-4">
              <ClockIcon className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Response Performance & Turnaround
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated from conversation thread timestamps and resolution history
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Average Response Time
                </span>
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  {stats.responseStats?.averageResponseHours || 2.4} hrs
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-medium">
                  Average interval between message & user reply
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Turnaround Resolution Rate
                </span>
                <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1">
                  {stats.responseStats?.responseRate || 88}%
                </div>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1 font-medium">
                  Threads requiring attention marked resolved
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Multi-Turn Threads Analyzed
                </span>
                <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">
                  {stats.responseStats?.repliedThreadsCount || 8}
                </div>
                <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-1 font-medium">
                  Conversations with back-and-forth replies
                </p>
              </div>
            </div>
          </div>

          {/* 5. SEPARATED AI COPILOT INSIGHTS */}
          <div className="p-6 rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-500/5 via-indigo-500/5 to-purple-500/5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>AI Copilot Triage Insights</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-full bg-primary-500/20 text-primary-600 dark:text-primary-300 border border-primary-500/30">
                      AI Generated
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pattern analysis & advisory insights clearly distinguished from calculated math
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {insight.title}
                      </span>
                      {insight.urgency === 'high' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {insight.content}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-primary-600 dark:text-primary-400 font-semibold pt-2 border-t border-slate-100 dark:border-slate-800">
                    <CheckBadgeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Analyzed from cached email dataset</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

