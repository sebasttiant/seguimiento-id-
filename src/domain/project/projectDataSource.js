const REQUIRED_METHODS = ["list", "getById", "create", "update"];

export function assertProjectDataSource(dataSource) {
  const missing = REQUIRED_METHODS.filter((method) => typeof dataSource?.[method] !== "function");
  if (missing.length > 0) {
    throw new Error(`ProjectDataSource incompleto: faltan ${missing.join(", ")}`);
  }
  return dataSource;
}
