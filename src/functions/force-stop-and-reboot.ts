import { EC2Client } from "@aws-sdk/client-ec2";
import { info } from "../utils/logger";
import { startAndWaitForRunning, stopAndWaitForStop } from "./shared/state";

// TODO: EC2 Client Provider?
export async function forceStopReboot(instanceId: string): Promise<void> {
  info("Rebooting using a forced stop");
  await stopAndWaitForStop(instanceId, true);
  await startAndWaitForRunning(instanceId);
}