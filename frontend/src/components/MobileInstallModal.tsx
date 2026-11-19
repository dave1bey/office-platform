import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  X,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Sparkles,
  QrCode
} from 'lucide-react';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt
}) => {
  const [activeTab, setActiveTab] = useState<'ANDROID' | 'IOS' | 'DESKTOP'>('ANDROID');
  const [networkUrls, setNetworkUrls] = useState<string[]>([]);
  const [primaryUrl, setPrimaryUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // If running on a cloud domain (e.g. onrender.com) or over HTTPS, prioritize current public URL
    const isCloudHost = window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '127.0.0.1' &&
                        !window.location.hostname.startsWith('192.168.') &&
                        !window.location.hostname.endsWith('.local');

    if (isCloudHost || window.location.protocol === 'https:') {
      const publicUrl = window.location.origin + '/';
      setPrimaryUrl(publicUrl);
      setNetworkUrls([publicUrl]);
    }

    // Fetch network LAN IPs from backend
    fetch('/api/system/network-info')
      .then(r => r.json())
      .then(data => {
        if (data.cloudUrl) {
          setPrimaryUrl(data.cloudUrl);
          setNetworkUrls([data.cloudUrl]);
        } else if (isCloudHost || window.location.protocol === 'https:') {
          setPrimaryUrl(window.location.origin + '/');
        } else if (data.networkUrls && data.networkUrls.length > 0) {
          const urls = data.networkUrls.map((u: any) => u.url);
          setNetworkUrls(urls);
          setPrimaryUrl(data.primaryLanUrl || urls[0]);
        } else {
          setPrimaryUrl(window.location.origin + '/');
        }
      })
      .catch(() => {
        setPrimaryUrl(window.location.origin + '/');
      });
  }, []);

  if (!isOpen) return null;

  const currentUrl = primaryUrl || window.location.origin + '/';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
      }
      setInstalling(false);
    } else {
      alert("To install, open this page in Google Chrome or Edge, click the browser menu (⋮), and choose 'Install App' or 'Add to Home Screen'.");
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-blue-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Install as Mobile & Desktop App
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                PWA installable on Android, iPhone (iOS), and PC browsers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LAN Access Address Box with QR Code */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Office Wi-Fi / LAN Mobile Address:</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              LAN Active
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* QR Code for Instant Smartphone Camera Scan */}
            <div className="bg-white p-2 rounded-xl border border-blue-200 shadow-sm shrink-0 flex flex-col items-center">
              <img
                src={qrImageUrl}
                alt="Scan to open on Mobile"
                className="w-28 h-28 object-contain"
                onError={(e) => {
                  // Fallback if offline
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[9px] text-slate-500 font-semibold mt-1">
                Scan with Phone Camera
              </span>
            </div>

            {/* URL Display and Copy Button */}
            <div className="flex-1 space-y-2 w-full">
              <p className="text-xs text-slate-600">
                Connect your phone to the same office Wi-Fi, then scan the QR code or visit this URL:
              </p>
              <div className="flex items-center space-x-1.5 bg-white border border-blue-200 rounded-lg p-2 font-mono text-xs text-blue-800 font-bold select-all break-all">
                <span>{currentUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm shadow-blue-600/20"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Mobile Address"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1-Click Native Install Trigger (if supported on current browser) */}
        {deferredPrompt && !installSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-xs font-bold text-emerald-900">Install Ready!</div>
                <div className="text-[11px] text-emerald-700">Add to your device home screen in 1 click.</div>
              </div>
            </div>
            <button
              onClick={handleTriggerPwaInstall}
              disabled={installing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{installing ? "Installing..." : "Install App"}</span>
            </button>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('ANDROID')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'ANDROID'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('IOS')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'IOS'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍎 iPhone / iPad (iOS)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DESKTOP')}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'DESKTOP'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💻 Windows PC / Mac
          </button>
        </div>

        {/* Tab Content: Platform-Specific Instructions */}
        {activeTab === 'ANDROID' && (
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <span>Install on Android Phone (Chrome / Samsung Internet):</span>
            </div>
            <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-200">
              <li>
                Open <strong>Google Chrome</strong> on your Android phone and visit:
                <div className="font-mono text-blue-700 font-bold text-[11px] mt-0.5 ml-4">{currentUrl}</div>
              </li>
              <li>
                Tap the <strong>three dots menu (⋮)</strong> in the top right corner of Chrome.
              </li>
              <li>
                Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </li>
              <li>
                Confirm by tapping <strong>"Install"</strong>. The app icon will appear directly on your Android home screen and app drawer!
              </li>
            </ol>

            {/* Direct APK Download Option */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Or Download Native Android Package:</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">.APK (Android 8.0+)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                You can download the APK file directly to your phone and install it:
              </p>
              <a
                href="/Office-Action.apk?v=3"
                download="Office-Action.apk"
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Office-Action.apk</span>
              </a>
              <p className="text-[10px] text-slate-400">
                💡 Note: When opening the downloaded APK, if prompted, allow "Install unknown apps" for Chrome in your Android Settings.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'IOS' && (
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <span>Install on iPhone or iPad (Apple Safari):</span>
            </div>
            <ol className="space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-200">
              <li>
                Open <strong>Apple Safari</strong> on your iPhone and go to:
                <div className="font-mono text-blue-700 font-bold text-[11px] mt-0.5 ml-4">{currentUrl}</div>
              </li>
              <li>
                Tap the <strong>Share button</strong> at the bottom of the screen (the square icon with an upward arrow <Share2 className="w-3.5 h-3.5 inline text-blue-600" />).
              </li>
              <li>
                Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).
              </li>
              <li>
                Tap <strong>"Add"</strong> in the top right. The <strong>OfficePlan</strong> app icon will be pinned to your iPhone home screen and opens full-screen!
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'DESKTOP' && (
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <span>Use in Web Browser or Install on Desktop:</span>
            </div>
            <ul className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>In Web Browser:</strong> Bookmark <code className="bg-white px-1 rounded border font-mono">{currentUrl}</code> in Chrome, Edge, Firefox, or Safari.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>As Desktop App:</strong> In Chrome or Edge, click the <strong>Install</strong> icon in the address bar (or Menu &rarr; "Install OfficePlan"). It opens in an independent standalone window with taskbar pinning.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Zero cloud cost &bull; 100% confidential local office LAN
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

