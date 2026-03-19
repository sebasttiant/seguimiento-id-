import { assertProjectDataSource } from "../../../domain/project/projectDataSource.js";
import { createApiProjectDataSource } from "../../../infrastructure/data/apiProjectDataSource.js";
import { appEnv } from "../../../shared/config/env.js";

export function createProjectDataSource(source = appEnv.projectDataSource) {
  if (source !== "api" && typeof console !== "undefined") {
    console.warn("VITE_PROJECT_DATA_SOURCE distinto de api fue ignorado para mantener persistencia 100% en backend.");
  }
  const dataSource = createApiProjectDataSource();
  return assertProjectDataSource(dataSource);
}
