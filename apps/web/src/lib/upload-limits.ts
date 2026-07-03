import {
  FREE_PLAN_MAX_UPLOAD_SIZE,
  MAX_UPLOAD_SIZE,
} from "@agentset/storage/constants";
import { isFreePlan } from "@agentset/stripe/plans";
import { capitalize, formatBytes } from "@agentset/utils";

export const getMaxUploadSize = (plan: string) =>
  isFreePlan(plan) ? FREE_PLAN_MAX_UPLOAD_SIZE : MAX_UPLOAD_SIZE;

export const uploadSizeLimitMessage = (plan: string, fileNames: string[]) => {
  const subject =
    fileNames.length === 1
      ? `"${fileNames[0]}" exceeds`
      : `${fileNames.length} files exceed`;
  return `${subject} the ${formatBytes(getMaxUploadSize(plan))} file size limit on the ${capitalize(plan)} plan.`;
};

export const uploadSizeLimitError = (plan: string, fileNames: string[]) => {
  const message = uploadSizeLimitMessage(plan, fileNames);

  if (!isFreePlan(plan)) return message;
  return `${message} Upgrade to Pro to upload files up to ${formatBytes(MAX_UPLOAD_SIZE)}.`;
};
