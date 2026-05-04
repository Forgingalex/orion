/**
 * Verification Suite
 * Generates industrial step-response stability plots via remote asset fetching.
 */
import { PIDController } from './pid.js';
import QuickChart from 'quickchart-js';
import fs from 'node:fs';

async function generateVisualProof() {
  const config = {
    kp: 2.5,
    ki: 0.8,
    kd: 0.1,
    dt: 0.01,
    minOutput: -255,
    maxOutput: 255
  };

  const controller = new PIDController(config);
  const setpoint = 100;
  let currentPos = 0;
  
  const timeLabels: string[] = [];
  const posData: number[] = [];

  // Simulate 200 iterations (2 seconds of 100Hz control)
  for (let i = 0; i < 200; i++) {
    const output = controller.update(setpoint, currentPos);
    currentPos += output * 0.05; 

    if (i % 5 === 0) {
      timeLabels.push((i * 0.01).toFixed(2) + 's');
      posData.push(Number(currentPos.toFixed(2)));
    }
  }

  // Construct the chart object
  const chart = new (QuickChart as any)();
  chart.setConfig({
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'System Response (Position)',
        data: posData,
        borderColor: 'rgb(75, 192, 192)',
        fill: false,
        pointRadius: 0,
        borderWidth: 3
      }, {
        label: 'Setpoint',
        data: timeLabels.map(() => 100),
        borderColor: 'rgba(255, 99, 132, 0.5)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }]
    },
    options: {
      title: { display: true, text: 'ORION: PID Step Response Stability' },
      scales: {
        yAxes: [{ scaleLabel: { display: true, labelString: 'Magnitude' } }],
        xAxes: [{ scaleLabel: { display: true, labelString: 'Time (s)' } }]
      }
    }
  });

  console.log('Fetching verification plot from QuickChart...');
  
  const url = chart.getUrl();
  const response = await fetch(url);
  
  if (!response.ok) throw new Error('Failed to fetch chart image');
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (!fs.existsSync('./assets')) fs.mkdirSync('./assets');
  fs.writeFileSync('./assets/verification_plot.png', buffer);
  
  console.log('Engineering plot generated: ./assets/verification_plot.png');
}

generateVisualProof().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
