// lib/models/MetaLead.ts
export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLead {
  leadId: string;
  created_time: Date | string;
  field_data: MetaLeadField[];
  form_id?: string;
  page_id?: string;
  platform: "facebook" | "instagram";
  processed: boolean;
  error_message?: string;
}

export interface MetaLeadForm {
  formId: string;
  locale: string;
  name: string;
  status: string;
  leads: MetaLead[];
}

export interface MetaPage {
  pageId: string;
  name: string;
  fan_count?: number;
  link?: string;
  location?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    street?: string;
    zip?: string;
  };
  phone?: string;
  website?: string;
  category?: string;
  leadForms: MetaLeadForm[];
  lastUpdated: Date;
  isActive: boolean;
  accessToken?: string; // We'll store encrypted access token
}

export interface CRMLead {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  source: "facebook" | "instagram" | "manual" | "website" | "other";
  status: "New" | "contacted" | "qualified" | "closed" | "lost";
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  metaData?: {
    leadId: string;
    formId: string;
    pageId: string;
    platform: "facebook" | "instagram";
    originalFields: MetaLeadField[];
    allFields?: Record<string, any>; // All extracted form fields
  };
  notes?: string;
  priority: "low" | "medium" | "high";
  tags?: string[];
}
