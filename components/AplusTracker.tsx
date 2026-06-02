'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AplusTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const q = (window as any).aplus_queue || ((window as any).aplus_queue = []);
    q.push({ action: 'aplus.sendPV', arguments: [{ is_auto: false }, {}] });
  }, [pathname]);

  useEffect(() => {
    const handler = () => {
      const q = (window as any).aplus_queue || ((window as any).aplus_queue = []);
      q.push({ action: 'aplus.record', arguments: ['/seo.vertical.page_clk', 'CLK', { origin: location.origin }] });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
