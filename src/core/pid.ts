/**
 * ORION Autonomous Control Systems
 * Senior-grade functional PID implementation.
 * logic utilizes integral clamping for saturation management.
 */

export interface PIDConfig {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly dt: number;
  readonly minOutput: number;
  readonly maxOutput: number;
}

export interface PIDState {
  readonly integral: number;
  readonly previousError: number;
}

export class PIDController {
  private state: PIDState = { integral: 0, previousError: 0 };

  constructor(private readonly config: PIDConfig) {}

  public update(setpoint: number, current: number): number {
    const error = setpoint - current;
    
    // Safety check: ensure coefficients exist to prevent NaN
    const kp = this.config.kp || 0;
    const ki = this.config.ki || 0;
    const kd = this.config.kd || 0;
    const dt = this.config.dt || 0.01;

    const p = kp * error;
    
    const newIntegral = this.state.integral + (error * dt);
    const i = ki * newIntegral;

    const d = kd * (error - this.state.previousError) / dt;

    const rawOutput = p + i + d;
    const output = Math.max(this.config.minOutput, Math.min(this.config.maxOutput, rawOutput));

    // Integral clamping (Anti-windup)
    this.state = {
      integral: (output === rawOutput) ? newIntegral : this.state.integral,
      previousError: error
    };

    return output;
  }

  public reset(): void {
    this.state = { integral: 0, previousError: 0 };
  }
}
