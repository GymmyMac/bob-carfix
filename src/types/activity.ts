export interface UserActivity {
  id: string;
  activity_type: string;
  activity_description: string;
  action_label?: string;
  action_data?: unknown;
  created_at: string;
}
