package com.aditya.homecashflow.sms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import androidx.core.app.NotificationCompat
import com.aditya.homecashflow.data.local.AppDatabase
import com.aditya.homecashflow.data.local.PendingSmsEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * SMS BROADCAST RECEIVER
 * Standard cellular SMS receiver for carrier/telephony SMS.
 * Enqueues into PendingSmsQueue with deduplication checks.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        // Concatenate multi-part SMS if needed
        val sender = messages[0].displayOriginatingAddress ?: return
        val fullBody = StringBuilder()
        for (msg in messages) {
            fullBody.append(msg.displayMessageBody)
        }
        val body = fullBody.toString()

        // Parse banking contents
        val parsed = SmsTransactionParser.parse(sender, body, "carrier_sms") ?: return

        // Asynchronously insert into Pending Queue (Room DB) with deduplication
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = AppDatabase.getInstance(context)

                // Check if already captured via Google Messages or Truecaller notification
                val exists = db.pendingSmsDao().getPendingByHash(parsed.hash) != null
                if (exists) {
                    return@launch
                }

                val entity = PendingSmsEntity(
                    id = "sms_${UUID.randomUUID()}",
                    sender = sender,
                    body = body,
                    amount = parsed.amount,
                    type = parsed.type,
                    activity = parsed.activity,
                    suggestedCategoryId = parsed.suggestedCategoryId,
                    sourceAccount = parsed.sourceAccount,
                    date = parsed.dateIso,
                    detectedAt = System.currentTimeMillis(),
                    sourceApp = "carrier_sms",
                    hash = parsed.hash
                )

                db.pendingSmsDao().enqueueSms(entity)

                // Show local review notification to the user
                showApprovalNotification(context, parsed)
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun showApprovalNotification(context: Context, parsed: ParsedBankTransaction) {
        val channelId = "cashflow_pending_sms"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Bank SMS Approvals",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when a banking transaction is detected for approval"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val sign = if (parsed.type == "income") "+" else "-"
        val formattedAmount = String.format("%.2f", parsed.amount)

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("New $sign$formattedAmount from ${parsed.sourceAccount}")
            .setContentText("Tap to review and approve into Home CashFlow ledger")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), builder.build())
    }
}
