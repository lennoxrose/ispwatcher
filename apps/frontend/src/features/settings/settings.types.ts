export type Settings = {
  id: number;
  senderName: string;
  senderAddress: string;
  senderCity: string;
  apiToken: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateIdentityInput = {
  senderName: string;
  senderAddress: string;
  senderCity: string;
};
