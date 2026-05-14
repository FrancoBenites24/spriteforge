export interface Project {
  id: string;
  created_at: string;
  frame_width: number;
  frame_height: number;
  steps: number;
  speed: number;
}

export interface Frame {
  id: string;
  project_id: string;
  image_url: string;
  position_index: number;
  created_at?: string;
}

export interface Settings {
  frameWidth: number;
  frameHeight: number;
  steps: number;
  speed: number;
}
