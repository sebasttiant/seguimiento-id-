import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App.jsx";
import { AuthProvider } from "./features/auth/context/AuthContext.jsx";
import "./styles/globals.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("Query error:", error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
