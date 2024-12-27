import { Layout } from "./components/Layout";
import { Toaster } from "react-hot-toast";
import { MoneriumProvider } from "@monerium/sdk-react-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
const queryClient = new QueryClient();

function App() {
  const [refreshToken, setRefreshToken] = React.useState<string | null>(
    localStorage.getItem("monerium_refresh_token"),
  );

  const handleRefreshTokenUpdate = (token: string) => {
    localStorage.setItem("monerium_refresh_token", token);
    setRefreshToken(token);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MoneriumProvider
        clientId={import.meta.env.VITE_MONERIUM_CLIENT_ID || ""}
        redirectUri={import.meta.env.VITE_MONERIUM_REDIRECT_URI || ""}
        environment="production"
        refreshToken={refreshToken || undefined}
        onRefreshTokenUpdate={handleRefreshTokenUpdate}
      >
        <Layout />
        <Toaster position="top-right" />
      </MoneriumProvider>
    </QueryClientProvider>
  );
}

export default App;
