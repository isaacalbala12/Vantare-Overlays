import { useEffect, useRef } from "react";

export function RatingChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
    const pad = { top: 16, bottom: 24, left: 40, right: 16 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const data = [2100, 2150, 2120, 2300, 2450, 2400, 2847];
    const labels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Actual"];
    const minY = 2000;
    const maxY = 3000;
    const rangeY = maxY - minY;
    const stepX = chartW / (data.length - 1);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
      const yy = pad.top + (chartH / 4) * y;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(w - pad.right, yy);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "#7A7A7A";
    ctx.font = "10px Space Mono";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y <= 4; y++) {
      const val = minY + (rangeY / 4) * (4 - y);
      const yy = pad.top + (chartH / 4) * y;
      ctx.fillText(String(val), pad.left - 8, yy);
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < labels.length; i++) {
      const xx = pad.left + stepX * i;
      ctx.fillText(labels[i], xx, h - pad.bottom + 6);
    }

    // Area fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, "rgba(193, 18, 31, 0.4)");
    gradient.addColorStop(1, "rgba(193, 18, 31, 0.0)");
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH);
    for (let i = 0; i < data.length; i++) {
      const xx = pad.left + stepX * i;
      const yy = pad.top + chartH - ((data[i] - minY) / rangeY) * chartH;
      ctx.lineTo(xx, yy);
    }
    ctx.lineTo(pad.left + stepX * (data.length - 1), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const xx = pad.left + stepX * i;
      const yy = pad.top + chartH - ((data[i] - minY) / rangeY) * chartH;
      if (i === 0) ctx.moveTo(xx, yy);
      else {
        const prevX = pad.left + stepX * (i - 1);
        const prevY = pad.top + chartH - ((data[i - 1] - minY) / rangeY) * chartH;
        const cpX = (prevX + xx) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, yy, xx, yy);
      }
    }
    ctx.strokeStyle = "#E63946";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    for (let i = 0; i < data.length; i++) {
      const xx = pad.left + stepX * i;
      const yy = pad.top + chartH - ((data[i] - minY) / rangeY) * chartH;
      ctx.beginPath();
      ctx.arc(xx, yy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.strokeStyle = "#E63946";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-xl tracking-wider text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-vantare-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          PROGRESIÓN DE IRATING
        </h2>
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
          <button type="button" className="px-3 py-1 text-xs font-bold text-white bg-white/10 rounded shadow rounded-md">1M</button>
          <button type="button" className="px-3 py-1 text-xs font-bold text-vantare-textMuted hover:text-white transition-colors">3M</button>
          <button type="button" className="px-3 py-1 text-xs font-bold text-vantare-textMuted hover:text-white transition-colors">TODO</button>
        </div>
      </div>
      <div className="h-56 w-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </section>
  );
}
