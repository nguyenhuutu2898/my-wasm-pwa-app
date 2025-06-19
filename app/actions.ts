'use server'

import webpush from 'web-push'

// Thiết lập VAPID (hãy đảm bảo bạn đã tạo VAPID keys)
webpush.setVapidDetails(
  'mailto:tuhuu.spam@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Subscription tạm thời lưu trong RAM (chỉ dùng để demo)
// Trong thực tế: nên lưu vào DB hoặc cache
let subscription: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
} | null = null;

// ✅ Nhận subscription từ client
export async function subscribeUser(sub: any) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { success: false, error: 'Invalid subscription object' }
  }

  subscription = sub

  console.log("📥 Subscription saved:", subscription)

  return { success: true }
}

// ✅ Huỷ đăng ký
export async function unsubscribeUser() {
  subscription = null
  console.log("🚫 Subscription removed.")
  return { success: true }
}

// ✅ Gửi notification
export async function sendNotification(message: string) {
  if (!subscription) {
    console.error("❌ No subscription available",subscription)
    return { success: false, error: 'No subscription available' }
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: '🔔 Test Notification',
      body: message,
      icon: '/icon.png',
    }))

    console.log("✅ Notification sent")
    return { success: true }

  } catch (error) {
    console.error('❌ Error sending push notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}
