/** CRM (Client Relationship Management) types */

export interface CRMClient {
  id: string;
  name: string;
  // Birth data
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  latitude: number;
  longitude: number;
  locationName: string;
  // Meta
  notes: string;
  createdAt: number; // unix timestamp ms
  updatedAt: number;
}

export type CRMClientInput = Omit<CRMClient, 'id' | 'createdAt' | 'updatedAt'>;

export const EMPTY_CLIENT_INPUT: CRMClientInput = {
  name: '',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 1,
  birthHour: 0,
  birthMinute: 0,
  latitude: 25.05,
  longitude: 121.5,
  locationName: '台北市',
  notes: '',
};
