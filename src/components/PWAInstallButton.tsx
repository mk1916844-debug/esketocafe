import React, { useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
        <span>تثبيت على الكمبيوتر</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl text-right">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">تثبيت برنامج بن اسكتو</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white rounded cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                <p>1. اضغط على زر <strong>مشاركة (Share)</strong> أسفل متصفح Safari.</p>
                <p>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                <p>3. سيظهر التطبيق كأيقونة مستقلة ويعمل بدون إنترنت.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                <p>لتثبيت السيستم كبرنامج مستقل على سطح المكتب (Windows / Mac):</p>
                <p>1. افتح التطبيق في متصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong> في نافذة مباشرة.</p>
                <p>2. اضغط على أيقونة التثبيت الموجودة في شريط العنوان بالأعلى، أو من قائمة المتصفح اختر <strong>تثبيت التطبيق (Install App)</strong>.</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 pt-1">
                  بعد التثبيت ستظهر أيقونة «بن اسكتو» على سطح المكتب ويعمل البرنامج بالكامل حتى بدون إنترنت.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-stone-900 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors cursor-pointer"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
