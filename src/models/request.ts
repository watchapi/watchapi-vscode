export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type RequestLike = {
  method: HttpMethod;
  url: string;
  timestamp: number;
};

