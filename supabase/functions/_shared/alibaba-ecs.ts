import { sleep } from "./translation-utils.ts";

const ECS_API_VERSION = "2014-05-26";

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function hmacSha1Base64(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function signAlibabaQuery(
  params: Record<string, string>,
  accessKeySecret: string,
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  const stringToSign = `GET&%2F&${percentEncode(sorted)}`;
  const signature = await hmacSha1Base64(`${accessKeySecret}&`, stringToSign);
  return `${sorted}&Signature=${percentEncode(signature)}`;
}

async function callAlibabaEcs(
  action: string,
  extra: Record<string, string>,
): Promise<any> {
  const accessKeyId = Deno.env.get("ALIBABA_ACCESS_KEY_ID");
  const accessKeySecret = Deno.env.get("ALIBABA_ACCESS_KEY_SECRET");
  const regionId = Deno.env.get("ALIBABA_REGION_ID");

  if (!accessKeyId || !accessKeySecret || !regionId) {
    throw new Error("Missing Alibaba ECS credentials or region.");
  }

  const params: Record<string, string> = {
    Action: action,
    Format: "JSON",
    Version: ECS_API_VERSION,
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: new Date().toISOString(),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    RegionId: regionId,
    ...extra,
  };

  const query = await signAlibabaQuery(params, accessKeySecret);
  const url = `https://ecs.aliyuncs.com/?${query}`;

  const res = await fetch(url, { method: "GET" });
  const bodyText = await res.text();

  if (!res.ok) {
    throw new Error(`Alibaba ECS API failed: ${res.status} ${bodyText}`);
  }

  return JSON.parse(bodyText);
}

export async function startInstance(instanceId: string): Promise<void> {
  await callAlibabaEcs("StartInstance", {
    InstanceId: instanceId,
  });
}

export async function stopInstance(instanceId: string): Promise<void> {
  await callAlibabaEcs("StopInstance", {
    InstanceId: instanceId,
    ForceStop: "false",
    StoppedMode: "StopCharging",
  });
}

export async function getInstanceStatus(instanceId: string): Promise<string> {
  const data = await callAlibabaEcs("DescribeInstances", {
    InstanceIds: JSON.stringify([instanceId]),
  });

  const item = data?.Instances?.Instance?.[0];
  return String(item?.Status ?? "Unknown");
}

export async function waitForInstanceRunning(
  instanceId: string,
  timeoutMs = 60_000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = await getInstanceStatus(instanceId);
    if (status === "Running") return;
    await sleep(4000);
  }

  throw new Error("ECS instance did not become Running before timeout.");
}
