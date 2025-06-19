'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from './actions'
import Header from './components/header'

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  if (isStandalone) {
    return null // Don't show install button if already installed
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-lg font-semibold mb-2">Install App</h3>
      <button className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition">Add to Home Screen</button>
      {isIOS && (
        <p className="text-sm text-gray-600 mt-2 text-center">
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon"> ⎋ </span>
          and then "Add to Home Screen"
          <span role="img" aria-label="plus icon"> ➕ </span>.
        </p>
      )}
    </div>
  )
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    const sub = await registration.pushManager.getSubscription()
    setSubscription(sub)
  }

  async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    })
    setSubscription(sub)
    const serializedSub = JSON.parse(JSON.stringify(sub))
    await subscribeUser(serializedSub)
  }

  async function unsubscribeFromPush() {
    await subscription?.unsubscribe()
    setSubscription(null)
    await unsubscribeUser()
  }

  async function sendTestNotification() {
    if (subscription) {
      await sendNotification(message)
      setMessage('')
    }
  }

  if (!isSupported) {
    return <p className="text-red-500">Push notifications are not supported in this browser.</p>
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
      {subscription ? (
        <>
          <p className="text-green-600">You are subscribed to push notifications.</p>
          <button onClick={unsubscribeFromPush} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">Unsubscribe</button>
          <input
            type="text"
            placeholder="Enter notification message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="border rounded px-3 py-2 w-full mt-2"
          />
          <button onClick={sendTestNotification} className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition mt-2">Send Test</button>
        </>
      ) : (
        <>
          <p className="text-gray-600">You are not subscribed to push notifications.</p>
          <button onClick={subscribeToPush} className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition">Subscribe</button>
        </>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

    </div>
  )
}