// types/index.ts

export interface School {
  id: string;
  name: string;
  subdomain: string;
  admin_email: string;
  admin_password_hash: string;
  required_hours_per_year: number;
  ghl_api_key: string | null;
  ghl_location_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Parent {
  id: string;
  school_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
  student_names: string;
  total_hours_completed: number;
  ghl_contact_id: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface VolunteerOpportunity {
  id: string;
  school_id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  hours_credit: number;
  total_slots: number;
  slots_remaining: number;
  location: string;
  status: "active" | "inactive";
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Signup {
  id: string;
  opportunity_id: string;
  parent_id: string;
  signup_date: Date;
  status: "confirmed" | "cancelled";
  attended: boolean;
  hours_credited: number;
  notes: string | null;
  reminder_sent: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SignupWithDetails extends Signup {
  opportunity_title?: string;
  opportunity_date?: string;
  opportunity_location?: string;
  opportunity_hours_credit?: number;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_email?: string;
  parent_phone?: string;
  parent_student_names?: string;
}

export interface EmailLog {
  id: string;
  parent_id: string;
  email_type: string;
  subject: string;
  sent_at: Date;
  status: "sent" | "failed";
  error_message: string | null;
}

export interface AdminSetting {
  id: string;
  school_id: string;
  setting_key: string;
  setting_value: string;
  updated_at: Date;
}

export interface DashboardData {
  parent: Parent;
  hours_completed: number;
  hours_required: number;
  hours_remaining: number;
  progress_percentage: number;
  upcoming_signups: SignupWithDetails[];
  recent_history: SignupWithDetails[];
}

export interface AdminDashboardStats {
  total_parents: number;
  total_hours: number;
  upcoming_events: number;
  avg_hours_per_parent: number;
  completion_rate: number;
  recent_signups: SignupWithDetails[];
}

export interface GHLContact {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  customFields?: Record<string, string | number>;
  tags?: string[];
}

// NextAuth type extensions
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "parent" | "admin";
      school_id: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: "parent" | "admin";
    school_id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "parent" | "admin";
    school_id: string;
  }
}
