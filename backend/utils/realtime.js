import crypto from 'crypto'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config/supabase.js'

/**
 * Socket.io yerine Supabase Realtime Broadcast.
 *
 * Vercel serverless kalıcı WebSocket tutamadığı için backend bildirimleri
 * Supabase'in REST broadcast endpoint'i ile gönderir; frontend bu kanalları dinler.
 *
 * Kanal adları sunucu sırrıyla (HMAC) türetilir ve sadece giriş yapmış
 * kullanıcıya /api/auth/realtime üzerinden verilir. Admin kanalının adını
 * yalnızca admin rolündeki kullanıcı öğrenebilir.
 */

const channelSecret = () => process.env.REALTIME_CHANNEL_SECRET || process.env.JWT_SECRET || ''

const sign = (value) =>
  crypto.createHmac('sha256', channelSecret()).update(value).digest('hex').slice(0, 32)

export const adminChannel = () => `admin-${sign('admin')}`
export const userChannel = (userId) => `user-${sign(`user:${userId}`)}`

/**
 * @param {string} topic kanal adı (adminChannel() / userChannel(id))
 * @param {string} event olay adı (newOrder, newUser, orderCreated)
 * @param {object} payload
 */
export const broadcast = async (topic, event, payload) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    }
    // Eski (JWT) service_role anahtarı Authorization da ister; yeni sb_secret_ anahtarı istemez
    if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }

    const response = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages: [{ topic, event, payload }] }),
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      console.log(`Realtime bildirimi gönderilemedi (${event}): HTTP ${response.status}`)
    }
  } catch (err) {
    // Bildirim hatası asıl işlemi (sipariş vb.) asla bozmamalı
    console.log(`Realtime bildirimi gönderilemedi (${event}):`, err.message)
  }
}
