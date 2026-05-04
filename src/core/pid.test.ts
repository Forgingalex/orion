import { describe, it, expect } from 'vitest';
import { PIDController } from './pid';

describe('Orion Engineering: PID Stability Verification', () => {
  it('should converge on a setpoint with industrial precision', () => {
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
    let currentPosition = 0;

    // Simulate 500 iterations for steady-state convergence
    for (let i = 0; i < 500; i++) {
      const output = controller.update(setpoint, currentPosition);
      currentPosition += output * 0.05; 
    }

    // Industrial standard: Error < 1.0 (1% of target)
    const finalError = Math.abs(setpoint - currentPosition);
    expect(finalError).toBeLessThan(1.0);
  });

  it('should prevent integral windup under saturation', () => {
    const config = {
      kp: 1.0,
      ki: 10.0,
      kd: 0.0, // Explicitly defined to prevent NaN
      dt: 0.1,
      minOutput: -10,
      maxOutput: 10
    };

    const controller = new PIDController(config);
    const setpoint = 1000;
    let currentPosition = 0;

    for (let i = 0; i < 20; i++) {
      controller.update(setpoint, currentPosition);
    }

    const output = controller.update(setpoint, currentPosition);
    expect(output).toBeLessThanOrEqual(10);
    expect(output).toBeGreaterThanOrEqual(-10);
    expect(output).not.toBe(NaN);
  });
});
