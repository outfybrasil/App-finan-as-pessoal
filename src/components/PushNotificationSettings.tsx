import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useFinanceStore } from '../store';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const user = useFinanceStore(state => state.user);
  const activeUserEmail = user?.email;

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(sub !== null);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    try {
      if (!activeUserEmail) {
        alert('Você precisa estar logado para ativar as notificações.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      
      const response = await fetch('/api/vapidPublicKey');
      const vapidPublicKey = await response.text();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription: sub, email: activeUserEmail })
      });

      setIsSubscribed(true);
    } catch (e) {
      console.error('Error subscribing to push:', e);
      if (Notification.permission === 'denied') {
        alert('As notificações foram bloqueadas nas configurações do seu navegador.');
      }
    }
  };

  const testNotification = async () => {
    try {
      await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeUserEmail })
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="bg-gray-900 border border-dark-border rounded-[32px] p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-display mb-1 flex items-center gap-2">
            Notificações de Pagamentos Agendados
          </h3>
          <p className="text-xs text-gray-400">
            Receba alertas no seu celular quando uma conta agendada vencer hoje.
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        {!isSubscribed ? (
          <button
            onClick={subscribeUser}
            className="px-4 py-2 bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent hover:bg-emerald-accent/20 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <Bell size={14} /> Ativar Notificações
          </button>
        ) : (
          <>
            <button
              disabled
              className="px-4 py-2 bg-white/5 border border-white/10 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 opacity-80 cursor-not-allowed"
            >
              <Bell size={14} /> Ativadas
            </button>
            <button
              onClick={testNotification}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Testar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
