import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignOut } from '@/src/services/firebaseAuth';

interface Props {
  user: User | null;
  onUserChange?: (user: User | null) => void;
  onNavigateToServices?: () => void;
  showDetails?: boolean;
}

export const GoogleSignInButton: React.FC<Props> = ({
  user,
  onUserChange,
  onNavigateToServices,
  showDetails = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result && onUserChange) {
        onUserChange(result.user);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // Normal cancellation, no error display needed
      } else {
        setError(err?.message || 'حدث خطأ أثناء تسجيل الدخول باستخدام Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await googleSignOut();
      if (onUserChange) onUserChange(null);
      setMenuOpen(false);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl bg-white/80 dark:bg-dark-surface/80 hover:bg-beige-200/70 dark:hover:bg-dark-border border border-beige-200 dark:border-dark-border transition-all cursor-pointer shadow-xs"
          title="إدارة حساب Google"
        >
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'المستخدم'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-olive-400"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-olive-700 text-beige-50 flex items-center justify-center font-bold text-sm">
                {(user.displayName || user.email || 'م').charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-dark-surface"
              title="متصل بخدمات Google"
            ></span>
          </div>

          <div className="hidden sm:flex flex-col items-start text-right">
            <span className="text-sm font-bold text-olive-900 dark:text-beige-50 line-clamp-1">
              {user.displayName || 'مستخدم Google'}
            </span>
            <span className="text-xs text-olive-600 dark:text-olive-400 flex items-center gap-1">
              <i className="fa-brands fa-google text-[10px]"></i>
              متصل بـ Google
            </span>
          </div>

          <i className="fa-solid fa-chevron-down text-xs text-beige-500 mr-1 hidden sm:inline-block"></i>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-beige-200 dark:border-dark-border p-4 z-50 animate-slide-up text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-beige-100 dark:border-dark-border/60">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  className="w-11 h-11 rounded-full object-cover border border-olive-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-olive-700 text-white flex items-center justify-center font-bold text-lg">
                  {(user.displayName || 'م').charAt(0)}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm text-dark dark:text-beige-50 truncate">
                  {user.displayName || 'مستخدم أصالة'}
                </p>
                <p className="text-xs text-beige-500 truncate">{user.email}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  جلسة مصادقة نشطة
                </span>
              </div>
            </div>

            <div className="py-2 space-y-1">
              {onNavigateToServices && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigateToServices();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-olive-800 dark:text-beige-200 hover:bg-beige-100 dark:hover:bg-dark-bg rounded-xl transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-cloud-arrow-up text-olive-600"></i>
                    إدارة الخدمات المتصلة
                  </span>
                  <i className="fa-solid fa-chevron-left text-xs text-beige-400"></i>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-beige-100 dark:border-dark-border/60">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors cursor-pointer font-medium"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                )}
                تسجيل الخروج وفصل الجلسة
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not signed in: Official Google Sign-In Button
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleSignIn}
        disabled={loading}
        type="button"
        className="group relative flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-white hover:bg-gray-50 dark:bg-dark-surface dark:hover:bg-neutral-800 border border-beige-300 dark:border-dark-border text-gray-700 dark:text-beige-100 font-medium text-sm shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loading ? (
          <i className="fa-solid fa-spinner fa-spin text-olive-600"></i>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span className="font-sans font-medium">
          {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول باستخدام Google'}
        </span>
      </button>

      {showDetails && (
        <span className="text-[11px] text-beige-500 mr-2 flex items-center gap-1">
          <i className="fa-solid fa-shield-halved text-olive-600"></i>
          مصادقة رسمية وآمنة عبر Google
        </span>
      )}

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded-lg mt-1 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
    </div>
  );
};
