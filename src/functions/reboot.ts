import { EC2Client, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import { info } from "../utils/logger";

export async function reboot(client: EC2Client, instanceId: string): Promise<void> {
  info("Issuing a reboot over the API");
  await client.send(new RebootInstancesCommand({ InstanceIds: [instanceId] }));
  info("Command succeeded");
}
