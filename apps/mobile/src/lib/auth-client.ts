import { createAuthClient } from "better-auth/vue"

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000", // The base URL of your auth server
    basePath: "/api/auth",
    fetchOptions: {
        auth: {
            type: "Bearer",
            token: () => localStorage.getItem("auth_token") || ""
        }
    }
})
