/**
 * Meltdown - High-Octane Quantum Processor Core & Dual Gauge Canvas Renderer
 * Features:
 * - Central Silicon Die with thermal color transitions (Cyan -> Amber -> Plasma Red -> Ultra Violet)
 * - Dual Analog Gauges: Core Temperature Dial & RPM Tachometer with physics needles
 * - Rotating Cooling Turbine Fan Blades
 * - Dynamic Plasma Lightning Bolts & Circuit Arcs
 * - Liquid Nitrogen Frost Fog & Blowout Fireballs
 */

export class CoreRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.step = 0;
    this.ghz = 2.0;
    this.temp = 35;
    this.rpm = 2000;
    this.status = 'IDLE';
    this.cryoActive = false;
    this.screenShake = 0;
    this.time = 0;
    this.fanAngle = 0;

    // Needles for analog meters (smooth easing)
    this.needleTemp = 35;
    this.needleRpm = 2000;

    this.particles = [];
    this.frostVapor = [];
    this.lightningArcs = [];

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = (rect.height || 480) * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = rect.width || 800;
    this.height = rect.height || 480;
  }

  setStepData(stepData, cryo = false) {
    this.step = stepData.step;
    this.ghz = stepData.ghz;
    this.temp = stepData.temp;
    this.rpm = stepData.rpm;
    this.status = 'OVERCLOCKING';
    this.cryoActive = cryo;

    const cx = this.width / 2;
    const cy = this.height / 2;
    this.spawnPulseSparks(cx, cy, this.getHeatColor(), 20);

    // Spawn lightning arcs on high load (Step >= 4)
    if (this.step >= 4) {
      this.spawnLightningArcs(cx, cy);
    }
  }

  spawnLightningArcs(cx, cy) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r1 = 60;
      const r2 = 140 + Math.random() * 40;
      this.lightningArcs.push({
        x1: cx + Math.cos(angle) * r1,
        y1: cy + Math.sin(angle) * r1,
        x2: cx + Math.cos(angle) * r2,
        y2: cy + Math.sin(angle) * r2,
        alpha: 1.0,
        color: this.step >= 7 ? '#d000ff' : '#00f0ff'
      });
    }
  }

  triggerMeltdown() {
    this.status = 'MELTDOWN';
    this.screenShake = 30;
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: Math.random() > 0.3 ? '#ff3300' : (Math.random() > 0.5 ? '#ffaa00' : '#ffffff'),
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.01
      });
    }
  }

  triggerCryoVapor() {
    this.cryoActive = true;
    const cx = this.width / 2;
    const cy = this.height / 2;

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.frostVapor.push({
        x: cx + (Math.random() - 0.5) * 90,
        y: cy + (Math.random() - 0.5) * 90,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        radius: Math.random() * 18 + 10,
        alpha: 0.85,
        decay: 0.012
      });
    }
  }

  reset() {
    this.step = 0;
    this.ghz = 2.0;
    this.temp = 35;
    this.rpm = 2000;
    this.status = 'IDLE';
    this.cryoActive = false;
    this.particles = [];
    this.frostVapor = [];
    this.lightningArcs = [];
  }

  getHeatColor() {
    if (this.cryoActive) return '#aae6ff';
    if (this.status === 'MELTDOWN') return '#ff1100';
    if (this.temp < 60) return '#00f0ff';
    if (this.temp < 90) return '#ffaa00';
    if (this.temp < 120) return '#ff0055';
    return '#d000ff'; // Supercritical plasma
  }

  spawnPulseSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  render() {
    this.time += 0.03;
    // Fan rotation speed scales smoothly with RPM
    this.fanAngle += (this.rpm / 60000) * Math.PI * 2;

    // Smooth needle physics
    this.needleTemp += (this.temp - this.needleTemp) * 0.1;
    this.needleRpm += (this.rpm - this.needleRpm) * 0.1;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // Screen Shake
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
      this.screenShake *= 0.9;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    const cx = this.width / 2;
    const cy = this.height / 2;
    const heatColor = this.getHeatColor();

    // 1. Draw Dual Analog Gauges (Left: Temp, Right: Tachometer)
    this.drawAnalogGauge(cx - 240, cy, 'TEMP °C', this.needleTemp, 30, 180, '°C', heatColor);
    this.drawAnalogGauge(cx + 240, cy, 'FAN RPM', this.needleRpm, 1000, 24000, 'RPM', '#00f0ff');

    // 2. Draw Motherboard Circuit Traces & Rotating Fans
    this.drawCircuitTraces(cx, cy, heatColor);
    this.drawCoolingFan(cx, cy);

    // 3. Draw Lightning Bolts
    this.drawLightningArcs();

    // 4. Draw Central Quantum Processor Die
    this.drawProcessorChip(cx, cy, heatColor);

    // 5. Draw Cryo Vapor & Spark Particles
    this.drawFrostVapor();
    this.drawParticles();

    ctx.restore();
  }

  drawAnalogGauge(x, y, label, value, minVal, maxVal, unit, activeColor) {
    const ctx = this.ctx;
    const radius = 60;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;

    ctx.save();
    ctx.translate(x, y);

    // Gauge Bezel
    ctx.fillStyle = '#0a0f1d';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gauge Track Arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, startAngle, endAngle);
    ctx.stroke();

    // Active Colored Arc
    const pct = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
    const currentAngle = startAngle + pct * (endAngle - startAngle);

    ctx.strokeStyle = activeColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = activeColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, startAngle, currentAngle);
    ctx.stroke();

    // Gauge Needle
    const needleAngle = currentAngle;
    const needleLength = radius - 16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(needleAngle) * needleLength, Math.sin(needleAngle) * needleLength);
    ctx.stroke();

    // Needle Cap
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label & Value
    ctx.fillStyle = 'var(--text-dim)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    const displayVal = unit === 'RPM' ? Math.round(value).toLocaleString() : Math.round(value);
    ctx.fillText(`${displayVal} ${unit}`, 0, 38);

    ctx.restore();
  }

  drawCoolingFan(cx, cy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.fanAngle);

    // 8 Fan Blades
    ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
    const bladeCount = 8;
    for (let i = 0; i < bladeCount; i++) {
      ctx.rotate((Math.PI * 2) / bladeCount);
      ctx.beginPath();
      ctx.ellipse(55, 0, 35, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLightningArcs() {
    const ctx = this.ctx;
    ctx.save();
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const arc = this.lightningArcs[i];
      arc.alpha -= 0.08;
      if (arc.alpha <= 0) {
        this.lightningArcs.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = arc.alpha;
      ctx.shadowBlur = 12;
      ctx.shadowColor = arc.color;

      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 20;
      const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 20;
      ctx.lineTo(midX, midY);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCircuitTraces(cx, cy, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = `${color}28`;
    ctx.lineWidth = 2;

    const traceCount = 8;
    for (let i = 0; i < traceCount; i++) {
      const angle = (i * Math.PI * 2) / traceCount;
      const length = 150 + Math.sin(this.time * 2 + i) * 12;
      const x2 = cx + Math.cos(angle) * length;
      const y2 = cy + Math.sin(angle) * length;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 75, cy + Math.sin(angle) * 75);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 3 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawProcessorChip(cx, cy, color) {
    const ctx = this.ctx;
    const chipSize = 136;
    const half = chipSize / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const pulse = Math.sin(this.time * (2 + this.step * 1.2)) * 12;
    ctx.shadowBlur = 25 + this.step * 9 + pulse;
    ctx.shadowColor = color;

    // Carrier Socket
    ctx.fillStyle = '#0a0f1d';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-half - 12, -half - 12, chipSize + 24, chipSize + 24, 10);
    ctx.fill();
    ctx.stroke();

    // Gold Contact Pins
    ctx.fillStyle = '#ffd700';
    for (let i = -half + 8; i <= half - 8; i += 14) {
      ctx.fillRect(i, -half - 16, 6, 5);
      ctx.fillRect(i, half + 11, 6, 5);
      ctx.fillRect(-half - 16, i, 5, 6);
      ctx.fillRect(half + 11, i, 5, 6);
    }

    // Silicon Die
    ctx.fillStyle = this.status === 'MELTDOWN' ? '#240000' : '#141c2e';
    ctx.strokeStyle = `${color}aa`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-half, -half, chipSize, chipSize, 6);
    ctx.fill();
    ctx.stroke();

    // Core Crystal Glow
    ctx.fillStyle = `${color}44`;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();

    // Text Overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.status === 'MELTDOWN') {
      ctx.fillStyle = '#ff1100';
      ctx.fillText('💥 BLOWOUT', 0, -6);
      ctx.font = '10px monospace';
      ctx.fillText('CORE MELTED', 0, 12);
    } else if (this.status === 'IDLE') {
      ctx.fillText('QUANTUM V2', 0, -6);
      ctx.font = '11px monospace';
      ctx.fillStyle = color;
      ctx.fillText('STANDBY', 0, 12);
    } else {
      ctx.fillText(`${this.ghz.toFixed(1)} GHz`, 0, -8);
      ctx.font = '12px monospace';
      ctx.fillStyle = color;
      ctx.fillText(`${this.temp}°C`, 0, 10);
    }

    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    ctx.restore();
  }

  drawFrostVapor() {
    const ctx = this.ctx;
    ctx.save();
    for (let i = this.frostVapor.length - 1; i >= 0; i--) {
      const v = this.frostVapor[i];
      v.x += v.vx;
      v.y += v.vy;
      v.radius += 0.45;
      v.alpha -= v.decay;

      if (v.alpha <= 0) {
        this.frostVapor.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(170, 230, 255, 0.4)';
      ctx.globalAlpha = v.alpha;
      ctx.fill();
    }
    ctx.restore();
  }
}
