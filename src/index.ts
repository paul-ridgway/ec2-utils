import { DescribeInstancesCommand, DescribeInstanceStatusCommand, EC2Client, Instance, RebootInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import inquirer from "inquirer";
import { info } from "./utils/logger";
import ora from 'ora';

// TODO: Profile select
// TODO: Properly handle regions?

const client = new EC2Client({ region: "eu-west-2" });

async function selectInstance(): Promise<void> {
  info("Fetching instance list...");
  // TODO: Iterate over tokens
  const cmd = new DescribeInstancesCommand({ MaxResults: 1000 });
  const reservations = await client.send(cmd);
  const instances = reservations.Reservations!.map((r): Instance[] => r.Instances ?? []).flat();
  const statuses = await client.send(new DescribeInstanceStatusCommand({ InstanceIds: instances.filter((i): boolean => !!i.InstanceId).map((i): string => i.InstanceId!) }));
  const instanceList: { name: string, value: string; }[] = [];
  instances.forEach((i): void => {
    const tags = i.Tags ?? [];
    const name = tags
      .filter((t): boolean => t.Key?.toLocaleLowerCase() === "name")
      .map((t): string => t.Value ?? "")
      .join(' ');
    const status = statuses.InstanceStatuses?.filter((s): boolean => s.InstanceId === i.InstanceId)[0];
    instanceList.push({
      name: `Instance: ${i.InstanceId} - ${name} - ${status?.SystemStatus?.Status} / ${status?.InstanceStatus?.Status}`,
      value: i.InstanceId!
    });
  });

  const answer = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'instance',
        message: 'Select an instance',
        choices: instanceList,
      },
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: 'Reboot', value: reboot },
          { name: 'Force (stop) reboot', value: forceStopReboot }
        ],
      },
    ]);

  await answer.action(answer.instance);

}

// TODO: Move to function files?
async function reboot(instanceId: string): Promise<void> {
  info("Issuing a reboot over the API");
  await client.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }));
  info("Done");
}

// TODO: Move to function files?
async function forceStopReboot(instanceId: string): Promise<void> {
  info("Rebooting using a forced stop");
  await waitForStopState(instanceId, true);
  await waitForRunningState(instanceId);
}

async function waitForStopState(instanceId: string, force: boolean = false): Promise<void> {
  info(`Stopping instance{force ? " (forcing)" : ""}...`);
  await client.send(new StopInstancesCommand({ InstanceIds: [instanceId], Force: force }));
  await waitForState(instanceId, "stopped");
}

async function waitForRunningState(instanceId: string): Promise<void> {
  info("Starting instance...");
  await client.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
  await waitForState(instanceId, "running");
}

function waitForState(instanceId: string, targetState: string): Promise<void> {
  const spinner = ora('Loading unicorns').start();
  spinner.color = 'yellow';
  spinner.text = `Waiting for instance to reach target: ${targetState}, fetching state...`;

  return new Promise((res): void => {
    setInterval(async (): Promise<void> => {
      const status = await client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
      const instances = (status.Reservations ?? [])
        .filter((r): boolean => !!r.Instances)
        .map((r): Instance[] => r.Instances!)
        .flat();

      const state = instances[0].State?.Name ?? "Unknown";
      spinner.text = `Waiting for instance to reach target: ${targetState}, currently: ${state}`;
      if (state.toLowerCase() === targetState.toLowerCase()) {
        spinner.stop();
        res();
      }
    }, 1000);
  });
}

async function run(): Promise<void> {
  await selectInstance();
}

// TODO: Switch to logging lib and set no-console
run()
  .then((): void => info("Done!"))
  .catch((err): void => { throw (err); });
