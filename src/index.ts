import { DescribeInstancesCommand, DescribeInstanceStatusCommand, EC2Client, Instance, RebootInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import inquirer from "inquirer";
import { info } from "./utils/logger";
import ora from 'ora';
import { reboot } from "./functions/reboot";
import { forceStopReboot } from "./functions/force-stop-and-reboot";
import { resize } from "./functions/resize";
import { viewDetails } from "./functions/view-details";
import { getClient } from "./utils/ec2-client-provider";
import { Action } from "./functions/functions";

// TODO: Profile select
// TODO: Properly handle regions?

async function selectInstance(): Promise<string> {
  const client = getClient();
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

  const prompt = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'instance',
        message: 'Select an instance',
        choices: instanceList,
      }]);
  return prompt.instance;
}

async function selectAction(): Promise<Action> {
  const prompt = await inquirer
    .prompt([{
      type: 'list',
      name: 'action',
      loop: false,
      message: 'What do you want to do?',
      choices: [
        { name: 'View Details', value: viewDetails },
        { name: 'Resize', value: resize },
        { name: 'Reboot', value: reboot },
        { name: 'Force (stop) reboot', value: forceStopReboot }
      ],
    },
    ]);
  return prompt.action;
}

async function run(): Promise<void> {
  const instance = await selectInstance();
  const action = await selectAction();
  await action(instance);
}

run()
  .then((): void => process.exit(0))
  .catch((err): void => { throw (err); });
