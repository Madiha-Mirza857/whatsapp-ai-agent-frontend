export interface User {
  id: string;
  email: string;
  role: string;
  phoneNumber?: string;
}

export interface Hospital {
  id: string;
  hospitalName: string;
  address?: string;
  contactPhone?: string;
  adminName: string;
  userId: string;
  user?: User;
  adminEmail?: string;
  adminPhone?: string;

 
  openingTime?: string;   
  closingTime?: string;   
  workingDays?: string[];
  is24Hours?: boolean;    
  holidays?: { date: string; reason: string }[];

  plan: 'basic' | 'professional' | 'enterprise';
  status: 'pending' | 'active' | 'suspended';
}