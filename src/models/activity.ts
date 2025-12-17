export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface ActivityItem {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  timestamp: number;
}
