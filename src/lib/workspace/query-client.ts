"use client";

import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30 seconds
          refetchInterval: 30 * 1000, // Poll every 30s
          retry: 2,
          refetchOnWindowFocus: true,
        },
      },
    });
  }
  return queryClient;
}
