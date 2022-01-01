import { DescribeInstancesCommand, DescribeInstanceTypesCommand, DescribeInstanceTypesResult, EC2Client, Instance, InstanceTypeInfo, ModifyInstanceAttributeCommand, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import inquirer from "inquirer";
import { getClient } from "../utils/ec2-client-provider";
import { error, info } from "../utils/logger";
import { spinnerWrapper } from "../utils/spinner-wrapper";
import { Action } from "./functions";
import { startAndWaitForRunning, stopAndWaitForStop } from "./shared/state";

export const resize: Action = async (instanceId: string): Promise<void> => {
  info("Issuing a reboot over the API");

  const description = await spinnerWrapper("Fetching current instance size", async (): Promise<Instance | undefined> => {
    const details = await getClient().send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    return details.Reservations?.filter((r): boolean => !!r.Instances).flatMap((r): Instance[] => r.Instances!)[0];
  });

  if (!description) {
    error("Failed to find instance");
    return;
  }

  const size = await selectSize(description.InstanceType!);
  await stopAndWaitForStop(instanceId);
  await spinnerWrapper(`Resizing instance from ${description.InstanceType} to ${size}`, async (): Promise<void> => {
    await getClient().send(new ModifyInstanceAttributeCommand({ InstanceId: instanceId, InstanceType: { Value: size } }));
  });
  await startAndWaitForRunning(instanceId);

  info(`Resize to ${size} complete`);
};

async function selectSize(currentSize: string): Promise<string> {
  const instanceTypes: InstanceTypeInfo[] = [];
  let next;
  do {
    const types: DescribeInstanceTypesResult = await getClient().send(new DescribeInstanceTypesCommand({ MaxResults: 100, NextToken: next }));
    if (types.InstanceTypes) {
      instanceTypes.push(...types.InstanceTypes);
    }
    next = types.NextToken;
  } while (next);

  // TODO: Autocomplete
  const choices = (instanceTypes ?? [])
    .filter((t): boolean => !!t.InstanceType)
    .map((t): { name: string, value: string; } => ({
      name: t.InstanceType!,
      value: t.InstanceType!,
    }))
    .sort((a, b): number => a.name.localeCompare(b.name));
  const prompt = await inquirer
    .prompt([{
      type: 'list',
      name: 'action',
      default: currentSize,
      loop: false,
      message: `New instance size (currently ${currentSize})?`,
      choices,
    },
    ]);
  return prompt.action;
}