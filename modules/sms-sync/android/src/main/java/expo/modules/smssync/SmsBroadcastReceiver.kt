package expo.modules.smssync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import java.util.concurrent.Executors

/**
 * SMS BROADCAST RECEIVER
 * Dedicated cellular SMS receiver for Android telephony.
 * Completely isolates reception from the main UI thread, saves raw incoming
 * SMS directly to local SQLite cache, and never blocks app boot or crashes.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private val backgroundExecutor = Executors.newSingleThreadExecutor()
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        try {
            if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

            val pendingResult = goAsync()
            val appContext = context.applicationContext

            backgroundExecutor.execute {
                try {
                    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                    if (messages.isNullOrEmpty()) return@execute

                    val sender = messages[0].displayOriginatingAddress ?: "Unknown Sender"
                    val bodyBuilder = StringBuilder()
                    var msgTimestamp = System.currentTimeMillis().toDouble()

                    for (msg in messages) {
                        bodyBuilder.append(msg.displayMessageBody ?: "")
                        if (msg.timestampMillis > 0) {
                            msgTimestamp = msg.timestampMillis.toDouble()
                        }
                    }

                    val fullBody = bodyBuilder.toString()
                    if (fullBody.isNotBlank()) {
                        // Immediately persist raw SMS string to SQLite cache without parsing
                        val db = RawSmsDatabaseHelper.getInstance(appContext)
                        db.insertRawMessage(
                            sender = sender,
                            body = fullBody,
                            timestamp = msgTimestamp,
                            sourcePackage = "content://sms/inbox"
                        )
                    }
                } catch (t: Throwable) {
                    // Silently log error, preventing thread crash or boot loop
                    CrashLogger.log(appContext, "SmsBroadcastReceiver.async", t)
                } finally {
                    try {
                        pendingResult.finish()
                    } catch (e: Throwable) {
                        // Ignore finish error
                    }
                }
            }
        } catch (t: Throwable) {
            // Top-level catch to ensure receiver never brings down process
            CrashLogger.log(context, "SmsBroadcastReceiver.onReceive", t)
        }
    }
}
