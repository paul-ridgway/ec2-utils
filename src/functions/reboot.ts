import { RebootInstancesCommand } from "@aws-sdk/client-ec2";
import { getClient } from "../utils/ec2-client-provider";
import { info } from "../utils/logger";

export async function reboot(instanceId: string): Promise<void> {
  info("Issuing a reboot over the API");
  await getClient().send(new RebootInstancesCommand({ InstanceIds: [instanceId] }));
  info("Command succeeded");
}
