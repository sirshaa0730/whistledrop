import type { ModeratorReport, TrackedReport, Status } from '../types';
const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const evidenceUrl = (reportId:number,evidenceId:number) => `${base}/api/moderator/reports/${reportId}/evidence/${evidenceId}`;
export async function downloadEvidence(token:string,reportId:number,evidenceId:number) {
  const response=await fetch(evidenceUrl(reportId,evidenceId),{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok) throw new Error('Evidence download failed.');
  const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download='evidence';link.click();URL.revokeObjectURL(url);
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(base + path, options);
  if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiError(response.status, body?.detail ?? `Request failed (${response.status})`); }
  return response.json();
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export const api = {
  submit: (data: {category:string;description:string;reference_url?:string}) => request<{case_code:string}>('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),
  track: (code:string) => request<TrackedReport>(`/api/reports/${encodeURIComponent(code)}`),
  upload: (code:string,file:File) => { const body=new FormData();body.append('file',file);return request(`/api/reports/${encodeURIComponent(code)}/evidence`,{method:'POST',body}); },
  list: (token:string, filters:Record<string,string>) => { const q=new URLSearchParams(Object.entries(filters).filter(([,v])=>v));return request<ModeratorReport[]>(`/api/moderator/reports?${q}`,{headers:{Authorization:`Bearer ${token}`}}); },
  detail: (token:string,id:number) => request<ModeratorReport>(`/api/moderator/reports/${id}`,{headers:{Authorization:`Bearer ${token}`}}),
  change: (token:string,id:number,status:Status,message:string) => request<ModeratorReport>(`/api/moderator/reports/${id}/status`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({status,message})}),
  close: (token:string,id:number) => request<ModeratorReport>(`/api/moderator/reports/${id}/close`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}),
  update: (token:string,id:number,message:string) => request(`/api/moderator/reports/${id}/updates`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({message})})
};
