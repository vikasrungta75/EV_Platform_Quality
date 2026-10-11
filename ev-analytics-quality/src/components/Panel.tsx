'use client';
import { ReactNode, useState } from 'react';
import { useApp } from './AppContext';
import { factsFromChart, chartData } from '@/lib/facts';

export const Spark = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
    <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" fill="currentColor" />
  </svg>
);

// A titled card. Every panel that shows data carries an "AI analysis" button fed by the panel's own numbers.
export default function Panel({ title, sub, span = 6, charts = [], facts = [], data, children, tools, noAi }: { title: string; sub?: string; span?: number; charts?: any[]; facts?: string[]; data?: any; children: ReactNode; tools?: ReactNode; noAi?: boolean }) {
  const { openAnalysis } = useApp();
  const [full, setFull] = useState(false);
  const analyse = () =>
    openAnalysis({
      title,
      sub,
      facts: [...facts, ...charts.filter(Boolean).flatMap((c) => factsFromChart(c))],
      data: data ? JSON.stringify(data).slice(0, 5000) : charts.filter(Boolean).map(chartData).join('\n'),
    });
  return (
    <section className={`panel s${span}${full ? ' full' : ''}`}>
      <header>
        <div className="phead">
          <h3>{title}</h3>
          <span className="ptools">
            {tools}
            {!noAi && (
              <button className="sumbtn" onClick={analyse} title="AI analysis of this section">
                <Spark />
                AI analysis
              </button>
            )}
            <button className="picon" onClick={() => setFull(!full)} title={full ? 'Exit full screen' : 'Full screen'} aria-label="Toggle full screen">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </span>
        </div>
        {sub && <div className="small muted">{sub}</div>}
      </header>
      {children}
    </section>
  );
}
