export interface Project {
  id: string;
  created_at: string;
  frame_width: number;
  frame_height: number;
  steps: number;
  speed: number;
}

export interface Folder {
  id: string;
  project_id: string;
  name: string;
  position_index: number;
  created_at?: string;
}

export interface Subfolder {
  id: string;
  folder_id: string;
  name: string;
  position_index: number;
  created_at?: string;
}

export interface Frame {
  id: string;
  subfolder_id: string;
  project_id: string;
  image_url: string;
  position_index: number;
  created_at?: string;
}

export interface Snapshot {
  id: string;
  project_id: string;
  name: string;
  data: any;
  created_at?: string;
}

export interface Settings {
  frameWidth: number;
  frameHeight: number;
  steps: number;
  speed: number;
}

export interface PresenceUser {
  cursor: { x: number; y: number } | null;
  color: string;
}
