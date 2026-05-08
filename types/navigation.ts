export type Page =
  | "landing"
  | "login"
  | "patient-dashboard"
  | "doctor-dashboard"
  | "admin-dashboard"
  | "appointment"
  | "browse-doctors";

export type UserRole = "patient" | "doctor" | "admin";

export interface UserInfo {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  gender?: string;
}

export interface NavigateOptions {
  requireAuth?: boolean;
}

export type NavigateFn = (
  page: Page,
  options?: NavigateOptions
) => void;

