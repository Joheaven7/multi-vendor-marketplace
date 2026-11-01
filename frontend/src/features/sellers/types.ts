export type SellerStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export type SellerAddress = {
  region: string;
  city: string;
  subcity?: string;
  details?: string;
};

export type SellerOwner = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export type Seller = {
  id: string;
  storeName: string;
  slug: string;
  description?: string;
  logo?: { url: string };
  businessName: string;
  phone: string;
  address: SellerAddress;
  tinNumber?: string;
  documents: { url: string; type: string }[];
  status: SellerStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  owner?: SellerOwner;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SellerApplicationInput = {
  storeName: string;
  description?: string;
  businessName: string;
  phone: string;
  tinNumber?: string;
  address: SellerAddress;
};

export type SellerAction = "approve" | "reject" | "suspend" | "reactivate";

export type AdminSellerListParams = {
  status?: SellerStatus;
  search?: string;
  page: number;
  limit: number;
};