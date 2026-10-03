export type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'CLOSED';
export type Category = 'SECURITY' | 'HARASSMENT' | 'MISCONDUCT' | 'FRAUD' | 'OTHER';
export interface Update { status: Status; message: string; created_at: string }
export interface TrackedReport { case_code: string; category: Category; status: Status; created_at: string; updated_at: string; updates: Update[] }
export interface ModeratorReport extends TrackedReport { id: number; description: string; reference_url?: string | null; closed_at?: string | null; evidence: { id: number; original_filename: string; content_type: string; file_size: number; created_at: string }[] }
