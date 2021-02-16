import { DescribeInstancesCommand, Instance, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { info } from "../../utils/logger";
import { getClient } from "../../utils/ec2-client-provider";
import { spinnerWrapper } from "../../utils/spinner-wrapper";

export async function stopAndWaitForStop(instanceId: string, force: boolean = false): Promise<void> {
  info(`Stopping instance${force ? " (forcing)" : ""}...`);
  await getClient().send(new StopInstancesCommand({ InstanceIds: [instanceId], Force: force }));
  await waitForState(instanceId, "stopped");
}

export async function startAndWaitForRunning(instanceId: string): Promise<void> {
  info("Starting instance...");
  await getClient().send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
  await waitForState(instanceId, "running");
}

export function waitForState(instanceId: string, targetState: string): Promise<void> {
  return spinnerWrapper(`Waiting for instance to reach target: ${targetState}, fetching state...`, (spinner): Promise<void> =>
    new Promise((res): void => {
      setInterval(async (): Promise<void> => {
        const status = await getClient().send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
        const instances = (status.Reservations ?? [])
          .filter((r): boolean => !!r.Instances)
          .map((r): Instance[] => r.Instances!)
          .flat();

        const state = instances[0].State?.Name ?? "Unknown";
        spinner.text = `Waiting for instance to reach target: ${targetState}, currently: ${state}`;
        if (state.toLowerCase() === targetState.toLowerCase()) {
          spinner.stopAndPersist();
          res();
        }
      }, 1000);
    })
  );
}