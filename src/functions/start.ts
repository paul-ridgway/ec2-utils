import { StartInstancesCommand } from "@aws-sdk/client-ec2";
import { getClient } from "../utils/ec2-client-provider";
import { info } from "../utils/logger";

export async function start(instanceId: string): Promise<void> {
  info("Issuing a start over the API");
  await getClient().send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
  info("Command succeeded");
}
