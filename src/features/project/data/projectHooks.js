import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectRepository } from "./projectRepository.js";

export function useProject(projectId) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectRepository.getById(projectId),
  });
}

export function useProjectSummaries() {
  return useQuery({
    queryKey: ["projects", "summaries"],
    queryFn: () => projectRepository.listSummaries(),
  });
}

function makeMutation(projectId, updater) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updater(projectId, payload),
    onSuccess: (data) => qc.setQueryData(["project", projectId], data),
  });
}

export const useUpdateClientBrief = (id) => makeMutation(id, projectRepository.updateClientBrief);
export const useUpdatePreBrief = (id) => makeMutation(id, projectRepository.updatePreBrief);
export const useUpdateTechSpecs = (id) => makeMutation(id, projectRepository.updateTechSpecs);
export const useUpdateSamples = (id) => makeMutation(id, projectRepository.updateSamples);
export const useUpdateQualityReg = (id) => makeMutation(id, projectRepository.updateQualityReg);
export const useUpdateChanges = (id) => makeMutation(id, projectRepository.updateChanges);

export function useSetLocked(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locked) => projectRepository.setLocked(projectId, locked),
    onSuccess: (data) => qc.setQueryData(["project", projectId], data),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => projectRepository.createProject(payload),
    onSuccess: () => {
      // refresca dashboard
      qc.invalidateQueries({ queryKey: ["projects", "summaries"] });
    },
  });
}
