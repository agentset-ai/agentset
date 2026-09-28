import { EU_TRIGGER_REGION, isEuRegion } from "@agentset/utils";
import {
  enforceEuConfig,
  EU_UNSET_TINYBIRD_ENV,
  getEuDatabaseConfigIssues,
  getEuEngineConfigIssues,
  getEuRedisConfigIssues,
  getEuRequiredIssues,
  getEuStorageConfigIssues,
  getEuUnsetIssues,
} from "@agentset/utils/region-guard";

type EnvSource = Record<string, string | undefined>;

export const getJobsEuConfigIssues = (env: EnvSource) => [
  ...getEuDatabaseConfigIssues(env),
  ...getEuStorageConfigIssues(env),
  ...getEuEngineConfigIssues(env),
  ...getEuRedisConfigIssues(env),
  ...getEuUnsetIssues(env, EU_UNSET_TINYBIRD_ENV),
  ...getEuRequiredIssues(env, ["APP_DOMAIN"]),
];

export const assertJobsEuConfig = () =>
  enforceEuConfig(() => getJobsEuConfigIssues(process.env));

/** EU: fails deployed runs that execute outside the EU worker region. */
export const assertJobsRunRegion = ({
  region,
  environmentType,
}: {
  region?: string;
  environmentType: string;
}) => {
  if (!isEuRegion) return;

  // dev runs execute on the local machine
  if (environmentType === "DEVELOPMENT") return;

  // scheduled runs report a suffixed region, e.g. "eu-central-1:scheduled"
  if (region?.split(":")[0] !== EU_TRIGGER_REGION) {
    throw new Error(`EU runs must execute in ${EU_TRIGGER_REGION}`);
  }
};
