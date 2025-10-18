import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import '../../styles/academic-theme.css';

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      await login(username, password);
      // ✅ Redirect to role-specific dashboard after successful login
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-academic-light flex items-center justify-center p-2">
      <style>
        {`
          /* Hide browser's default password visibility toggle */
          input[data-password-input="true"]::-ms-reveal,
          input[data-password-input="true"]::-ms-clear,
          input[type="password"]::-webkit-credentials-auto-fill-button,
          input[type="password"]::-webkit-caps-lock-indicator {
            display: none !important;
          }
          
          /* Additional rule to hide the eye icon in Chromium-based browsers */
          input[type="password"]::-webkit-inner-spin-button,
          input[type="password"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        `}
      </style>
      <div className="bg-academic-white rounded-lg shadow-academic-shadow p-6 w-full max-w-sm border border-academic-border">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-center" style={{ color: 'var(--academic-primary)' }}>PaperTrail</h1>
          <p className="text-academic-description text-center text-sm mt-1" style={{ color: 'var(--academic-text)' }}>Login to your account</p>
        </div>
        
        {error && (
          <div className="alert-academic alert-academic-error mb-4 p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="form-label-academic text-sm mb-1">Username</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input-academic w-full py-2 px-3 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="form-label-academic text-sm">Password</label>
              <a href="#" className="text-xs text-academic-primary hover:text-academic-secondary">Forgot password?</a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input-academic w-full py-2 px-3 text-sm pr-10"
                // Disable browser's built-in password visibility toggle
                data-password-input="true"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full btn-academic mt-4 py-2 text-sm"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="spinner-academic w-4 h-4 mr-2"></div>
              <span className="text-sm">Logging in...</span>
            </div>
          ) : "Login"}
        </button>

        <div className="mt-4 text-center">
          <p className="text-academic-muted text-xs">
            © {new Date().getFullYear()} PaperTrail. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;