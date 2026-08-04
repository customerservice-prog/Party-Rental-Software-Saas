"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

      const res = await signIn("credentials", {
              username,
              password,
              redirect: false,
      });

      setLoading(false);

      if (res?.error) {
              setError("Invalid username or password");
              return;
      }

      const session = await getSession();
    if ((session?.user as any)?.role === "platform_admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
        <div className="max-w-sm mx-auto py-16 px-4">
              <h1 className="text-2xl font-bold mb-6">Control Panel Login</h1>
        
          {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                    {error}
                  </div>
              )}
        
              <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                              className="w-full border rounded p-2"
                                              value={username}
                                              onChange={(e) => setUsername(e.target.value)}
                                              required
                                            />
                      </div>
              
                      <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                              type="password"
                                              className="w-full border rounded p-2"
                                              value={password}
                                              onChange={(e) => setPassword(e.target.value)}
                                              required
                                            />
                      </div>
              
                      <button
                                  type="submit"
                                  disabled={loading}
                                  className="w-full bg-brand-600 text-white rounded p-2 font-medium disabled:opacity-50"
                                >
                        {loading ? "Signing in..." : "Sign In"}
                      </button>
              </form>
        </div>
      );
}
