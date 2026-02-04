import api from '../api';

export type Focus = {
  id: string;
  userId: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  isSystem: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FocusCreatePayload = {
  name: string;
  emoji?: string;
  color?: string;
};

export type FocusUpdatePayload = {
  name?: string;
  emoji?: string;
  color?: string;
  isHidden?: boolean;
};

export async function getFocuses(): Promise<Focus[]> {
  const res = await api.get<{ focuses: Focus[] }>('/focuses');
  return res.data.focuses;
}

export async function getFocusesForManage(): Promise<Focus[]> {
  const res = await api.get<{ focuses: Focus[] }>('/focuses/manage');
  return res.data.focuses;
}

export async function createFocus(payload: FocusCreatePayload): Promise<Focus> {
  const res = await api.post<{ focus: Focus }>('/focuses', payload);
  return res.data.focus;
}

export async function updateFocus(id: string, payload: FocusUpdatePayload): Promise<Focus> {
  const res = await api.put<{ focus: Focus }>(`/focuses/${id}`, payload);
  return res.data.focus;
}

export async function deleteFocus(id: string): Promise<void> {
  await api.delete(`/focuses/${id}`);
}











