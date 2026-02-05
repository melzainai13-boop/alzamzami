
export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  items: string;
  timestamp: string;
  status: 'جديد' | 'مكتمل';
}

export interface AdminSettings {
  welcomeMessage: string;
  contactNumber: string;
  adminUser: string;
  adminPass: string;
  systemInstruction: string;
  orders: Order[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppRoute {
  HOME = 'HOME',
  ADMIN = 'ADMIN'
}
