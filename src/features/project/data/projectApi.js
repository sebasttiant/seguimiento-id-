import { httpClient } from "../../../infrastructure/http/httpClient.js";

function unwrapCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export const projectApi = {
  async list() {
    const { data } = await httpClient.get("/projects/");
    return unwrapCollection(data);
  },

  async getById(id) {
    const { data } = await httpClient.get(`/projects/${encodeURIComponent(id)}/`);
    return data;
  },

  async createProject(payload) {
    const { data } = await httpClient.post("/projects/", payload);
    return data;
  },

  async updateProject(id, payload) {
    const { data } = await httpClient.patch(`/projects/${encodeURIComponent(id)}/`, payload);
    return data;
  },

  async getAdvancedModules(id) {
    const { data } = await httpClient.get(`/projects/${encodeURIComponent(id)}/advanced-modules/`);
    return data;
  },

  async updateAdvancedModules(id, payload) {
    const { data } = await httpClient.patch(`/projects/${encodeURIComponent(id)}/advanced-modules/`, payload);
    return data;
  },

  async updateAdvancedModule(id, moduleName, payload) {
    const { data } = await httpClient.patch(
      `/projects/${encodeURIComponent(id)}/advanced-modules/${encodeURIComponent(moduleName)}/`,
      payload
    );
    return data;
  },

  async getAdvancedModuleImage(id, moduleName) {
    const { data } = await httpClient.get(
      `/projects/${encodeURIComponent(id)}/advanced-modules/image/${encodeURIComponent(moduleName)}/`
    );
    return data;
  },

  async deleteProject(id) {
    await httpClient.delete(`/projects/${encodeURIComponent(id)}/`);
  },
};

export const taskApi = {
  async listByProject(projectId) {
    const { data } = await httpClient.get("/tasks/", {
      params: {
        project: projectId,
      },
    });
    return unwrapCollection(data);
  },

  async createTask(payload) {
    const { data } = await httpClient.post("/tasks/", payload);
    return data;
  },

  async updateTask(id, payload) {
    const { data } = await httpClient.patch(`/tasks/${encodeURIComponent(id)}/`, payload);
    return data;
  },
};
