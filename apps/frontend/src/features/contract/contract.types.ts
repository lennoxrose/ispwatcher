export type Contract = {
  id: number;
  ispName: string;
  ispAddress: string;
  maxSpeedMbit: number;
  normalSpeedMbit: number;
  minSpeedMbit: number;
  createdAt: string;
};

export type ContractInput = {
  ispName: string;
  ispAddress: string;
  maxSpeedMbit: number;
  normalSpeedMbit: number;
  minSpeedMbit: number;
};
