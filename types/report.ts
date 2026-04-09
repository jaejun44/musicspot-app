export interface StudioReport {
  id: string;
  studio_id: string | null;
  report_type: 'correction' | 'new_studio' | 'closed';
  content: string;
  reporter_name?: string;
  reporter_contact?: string;
  status: 'pending' | 'resolved';
  created_at: string;
  studios?: { name: string };
}
