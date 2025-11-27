"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleConnectButton } from "@/components/google-connect-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Unlink } from "lucide-react";

export default function GoogleAccountPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    setLoading(true);
    try {
      // Check if we can fetch sheets (implies connected)
      const res = await fetch("/api/sheets/list");
      if (res.ok) {
        setIsConnected(true);
        // Get session info
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
          setConnectionInfo({
            provider: "google",
            connected_at: session.expires_at ? new Date(session.expires_at * 1000 - session.expires_in * 1000) : new Date(),
            expires_at: session.expires_at ? new Date(session.expires_at * 1000) : null,
          });
        }
      } else {
        setIsConnected(false);
        setConnectionInfo(null);
      }
    } catch {
      setIsConnected(false);
      setConnectionInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      // Call our disconnect API endpoint
      const response = await fetch("/api/auth/disconnect-google", {
        method: "POST",
      });
      
      if (response.ok) {
        // Successfully disconnected, redirect to login
        window.location.href = "/login";
      } else {
        const error = await response.json();
        console.error("Failed to disconnect:", error);
        // Fallback: just sign out locally
        await supabase.auth.signOut();
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      // Fallback: just sign out locally
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Google Account</h1>
        <p className="text-slate-600 mt-1">
          Manage your Google Sheets connection and authentication settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Google Sheets Integration
                {isConnected ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="size-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                    <AlertCircle className="size-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isConnected 
                  ? "Your Google account is connected and ready to access your spreadsheets."
                  : "Connect your Google account to access and view your Google Sheets data."
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-4">
              {connectionInfo && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-slate-900">Connection Details</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>Provider: Google</div>
                    <div>Connected: {connectionInfo.connected_at?.toLocaleDateString()}</div>
                    {connectionInfo.expires_at && (
                      <div>Expires: {connectionInfo.expires_at.toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {disconnecting ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="size-4 mr-2" />
                  )}
                  Disconnect Account
                </Button>
                <Button
                  variant="outline"
                  onClick={checkGoogleConnection}
                  disabled={loading}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">What you'll get:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Access to your Google Sheets</li>
                  <li>• Read spreadsheet data</li>
                  <li>• View sheet metadata</li>
                  <li>• Secure authentication with Google</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-3">
                <GoogleConnectButton />
                <Button
                  variant="outline"
                  onClick={checkGoogleConnection}
                  disabled={loading}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & Security</CardTitle>
          <CardDescription>
            Your data privacy and security information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600 space-y-2">
            <p>• We only request read-only access to your Google Sheets</p>
            <p>• Your authentication tokens are stored securely</p>
            <p>• You can disconnect your account at any time</p>
            <p>• We don't store your spreadsheet data permanently</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
