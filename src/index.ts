import { DescribeInstancesCommand, DescribeInstanceStatusCommand, EC2Client, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import inquirer from "inquirer";

//TODO: Profile select
// TODO: Properly handle regions?
const client = new EC2Client({ region: "eu-west-2" });

async function selectInstance(): Promise<void> {
  // TODO: Iterate over tokens
  const cmd = new DescribeInstancesCommand({ MaxResults: 1000 });
  const reservations = await client.send(cmd);
  const instances = reservations.Reservations!.map((r) => r.Instances ?? []).flat();
  const statuses = await client.send(new DescribeInstanceStatusCommand({ InstanceIds: instances.filter(i => i.InstanceId).map(i => i.InstanceId!) }));
  const instanceList: { name: string, value: string; }[] = [];
  instances.forEach((i): void => {
    const tags = i.Tags ?? [];
    const name = tags
      .filter((t): boolean => t.Key?.toLocaleLowerCase() === "name")
      .map((t): string => t.Value ?? "")
      .join(' ');
    const status = statuses.InstanceStatuses?.filter(s => s.InstanceId === i.InstanceId)[0];
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

  answer.action(answer.instance);

}

// TODO: Move to function files?
async function reboot(instanceId: string) {
  console.log("Reboot!", instanceId);
  await client.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }));
  console.log("Reboot requested");
}

// TODO: Move to function files?
function forceStopReboot(instanceId: string) {
  console.log("forceStopReboot!", instanceId);
}

async function run(): Promise<void> {
  await selectInstance();
}

// TODO: Switch to logging lib and set no-console
run()
  .then((): void => console.log("Done!"))
  .catch((err): void => { throw (err); });
