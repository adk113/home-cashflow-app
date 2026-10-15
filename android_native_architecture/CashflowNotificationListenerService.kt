package com.aditya.homecashflow.sms

import android.app.Notification
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.aditya.homecashflow.data.local.AppDatabase
import com.aditya.homecashflow.data.local.PendingSmsEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * CASHFLOW NOTIFICATION LISTENER SERVICE
 * Essential for Google Messages (RCS) and Truecaller:
 * 
 * Why this is necessary:
 * 1. Google Messages uses RCS Chat by default. RCS messages bypass cellular SMS network
 *    and standard SMS_RECEIVED broadcast receivers completely.
 * 2. Truecaller intercepts SMS and posts categorized smart alerts.
 * 3. Direct UPI apps (GPay, PhonePe, Paytm) send instant push notifications.
 *
 * This listener catches notifications from these target packages, parses the banking
 * content offline, and enqueues into PendingSmsQueue with deduplication.
 */
class CashflowNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "CashflowNotifListener"

        // Target messaging & financial apps to monitor
        val MONITORED_PACKAGES = mapOf(
            "com.google.android.apps.messaging" to "google_messages",
            "com.truecaller" to "truecaller",
            "com.android.mms" to "carrier_sms",
            "com.samsung.android.messaging" to "carrier_sms",
            "com.google.android.apps.nbu.paisa.user" to "bank_apps", // Google Pay
            "com.phonepe.app" to "bank_apps",                     // PhonePe
            "net.one97.paytm" to "bank_apps",                     // Paytm
            "com.snapwork.hdfc" to "bank_apps",                   // HDFC Mobile
            "com.csam.icici.bank.imobile" to "bank_apps"          // ICICI iMobile
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return
        val sourceApp = MONITORED_PACKAGES[pkgName] ?: return

        val extras: Bundle = sbn.notification.extras ?: return

        // Extract title & text
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        val content = if (bigText.isNotBlank()) bigText else text
        if (content.isBlank()) return

        Log.d(TAG, "Intercepted alert from $pkgName ($sourceApp): $title - $content")

        // Parse financial details
        val sender = if (title.isNotBlank()) title else pkgName
        val parsed = SmsTransactionParser.parse(sender, content, sourceApp) ?: return

        // Insert into Room DB pending queue with deduplication check
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = AppDatabase.getInstance(applicationContext)

                // Check if this transaction hash is already known (deduplication)
                val isExisting = db.pendingSmsDao().getPendingByHash(parsed.hash) != null
                if (isExisting) {
                    Log.d(TAG, "Duplicate transaction prevented: ${parsed.hash}")
                    return@launch
                }

                val entity = PendingSmsEntity(
                    id = "sms_${UUID.randomUUID()}",
                    sender = sender,
                    body = content,
                    amount = parsed.amount,
                    type = parsed.type,
                    activity = parsed.activity,
                    suggestedCategoryId = parsed.suggestedCategoryId,
                    sourceAccount = parsed.sourceAccount,
                    date = parsed.dateIso,
                    detectedAt = System.currentTimeMillis(),
                    sourceApp = sourceApp,
                    hash = parsed.hash
                )

                db.pendingSmsDao().enqueueSms(entity)
                Log.d(TAG, "Enqueued bank alert from $sourceApp: ₹${parsed.amount}")
            } catch (e: Exception) {
                Log.e(TAG, "Error saving intercepted notification", e)
            }
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "CashflowNotificationListenerService connected successfully.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "CashflowNotificationListenerService disconnected.")
    }
}
