'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { buildOption, THEME } from '@/lib/charts';

// Draws either a server chart descriptor ({k, a}) or a custom option builder.
export default function Chart({ desc, option, height = 250, onClick }: { desc?: any; option?: (t: any) => any; height?: number; onClick?: (p: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: 'svg' });
    try {
      c.setOption(option ? option(THEME) : buildOption(desc));
    } catch (e: any) {
      ref.current.textContent = 'Chart could not be drawn: ' + e.message;
    }
    if (onClick) c.on('click', onClick);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(desc), option]);
  return <div ref={ref} className="ch" style={{ height }} role="img" />;
}
