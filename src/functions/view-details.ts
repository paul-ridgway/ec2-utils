import { DescribeInstancesCommand, EC2Client, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import { getClient } from "../utils/ec2-client-provider";
import { info } from "../utils/logger";
import { Action } from "./functions";

export const viewDetails: Action = async (instanceId: string): Promise<void> => {
  info("Issuing a reboot over the API");
  const details = await getClient().send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
  info(JSON.stringify(details, null, 2));
}
