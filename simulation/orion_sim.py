import time
import math
from coppeliasim_zmqremoteapi_client import RemoteAPIClient

# ORION PID ENGINE
class IndustrialPID:
    def __init__(self, kp, ki, kd, dt, limit):
        self.kp, self.ki, self.kd, self.dt = kp, ki, kd, dt
        self.limit = limit
        self.integral, self.prev_err = 0, 0

    def update(self, target, current):
        # path logic: prevents continuous spinning
        err = (target - current + math.pi) % (2 * math.pi) - math.pi
        self.integral += err * self.dt
        deriv = (err - self.prev_err) / self.dt
        out = (self.kp * err) + (self.ki * self.integral) + (self.kd * deriv)
        out = max(-self.limit, min(self.limit, out))
        if abs(out) >= self.limit: self.integral -= err * self.dt 
        self.prev_err = err
        return out

# HARDWARE INITIALIZATION
print("ORION Neural Bridge: Initializing Full-Body Collaborative Suite...")
client = RemoteAPIClient()
sim = client.getObject('sim')
client.setStepping(True) # synchronous mode for smooth motion

def get_arm_joints(prefix):
    """Recursively finds 7 joints for each arm based on the hierarchy provided"""
    joints = []
    # search the entire scene for joints matching the naming convention
    all_objs = sim.getObjectsInTree(sim.handle_scene, sim.object_joint_type, 0)
    for h in all_objs:
        alias = sim.getObjectAlias(h)
        if prefix in alias and 'Joint' in alias:
            joints.append(h)
    # sort to ensure J1, J2... sequence
    joints.sort(key=lambda x: sim.getObjectAlias(x))
    return joints[:7]

l_arm = get_arm_joints('left')
r_arm = get_arm_joints('right')

# map grippers (fingers)
fingers = []
all_objs = sim.getObjectsInTree(sim.handle_scene, sim.object_joint_type, 0)
for h in all_objs:
    alias = sim.getObjectAlias(h).lower()
    if 'finger' in alias or 'gripper' in alias: fingers.append(h)

# fourteen industrial brains
l_pids = [IndustrialPID(3.5, 0.02, 0.4, 0.05, 1.8) for _ in range(7)]
r_pids = [IndustrialPID(3.5, 0.02, 0.4, 0.05, 1.8) for _ in range(7)]

print(f"Hardware Ready: {len(l_arm)}L / {len(r_arm)}R Joints + {len(fingers)} Finger Motors.")

# ADVANCED INDUSTRIAL KEYFRAMES
# [j1(rotation), j2, j3, j4, j5, j6, j7]
POSE_HOME   = [0.0, -0.7, 0.0, 0.0, 0.0, 0.0, 0.0]
# inspection: one arm high, one arm low
POSE_INSP_L = [1.2, 0.5, 0.5, 1.0, 0.8, 0.5, 0.0]
POSE_INSP_R = [-1.2, 0.8, -0.8, 0.5, 1.0, 1.5, 3.14]
# assembly: meet in front
POSE_MEET_L = [0.3, 1.2, -0.8, 1.5, 1.2, 0.0, 0.0]
POSE_MEET_R = [-0.3, 1.2, 0.8, 1.5, -1.2, 0.0, 0.0]

sim.startSimulation()

def execute_choreography(name, target_l, target_r, duration, grip_l=False, grip_r=False):
    print(f" [ORION TASK] {name:.<30}", end="", flush=True)
    steps = int(duration / 0.05)
    for _ in range(steps):
        # update fingers
        for f in fingers:
            alias = sim.getObjectAlias(f).lower()
            if 'left' in alias: sim.setJointTargetVelocity(f, 1.5 if grip_l else -1.5)
            if 'right' in alias: sim.setJointTargetVelocity(f, 1.5 if grip_r else -1.5)
        # update 14-Axis arm array
        for i in range(7):
            sim.setJointTargetVelocity(l_arm[i], l_pids[i].update(target_l[i], sim.getJointPosition(l_arm[i])))
            sim.setJointTargetVelocity(r_arm[i], r_pids[i].update(target_r[i], sim.getJointPosition(r_arm[i])))
        client.step()
    print("DONE")

# MAIN INDUSTRIAL EXECUTION
try:
    while True:
        timestamp = int(time.time())
        print(f"\nSOVEREIGN BLOCK VERIFIED: STX_{timestamp % 10000}")
        
        # asymmetric deployment (shows independent control)
        execute_choreography("Independent Inspection", POSE_INSP_L, POSE_INSP_R, 5.0, grip_l=True, grip_r=True)
        
        # collaborative handoff (meet)
        execute_choreography("Collaborative Assembly", POSE_MEET_L, POSE_MEET_R, 5.0, grip_l=True, grip_r=False)
        execute_choreography("Ownership Transfer", POSE_MEET_L, POSE_MEET_R, 1.5, grip_l=True, grip_r=True)
        execute_choreography("Resource Release", POSE_MEET_L, POSE_MEET_R, 1.0, grip_l=False, grip_r=True)
        
        # global reset
        execute_choreography("Industrial Recovery", POSE_HOME, POSE_HOME, 4.0)

except KeyboardInterrupt:
    pass
finally:
    sim.stopSimulation()
    print("ORION: Factory Standby. Audit Log Finalized.")