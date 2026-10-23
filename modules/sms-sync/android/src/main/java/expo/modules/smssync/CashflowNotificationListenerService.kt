package expo.modules.smssync

import android.app.Notification
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.Executors

/**
 * CASHFLOW NOTIFICATION LISTENER SERVICE
 * Intercepts bank alerts from Google Messages RCS, Truecaller, and direct UPI apps.
 * Immediately pushes raw notification text into local SQLite cache without parsing.
 */
class CashflowNotificationListenerService : NotificationListenerService() {

    companion object {
        private val backgroundExecutor = Executors.newSingleThreadExecutor()

        private val MONITORED_PACKAGES = setOf(
            "com.google.android.apps.messaging",
            "com.truecaller",
            "com.android.mms",
            "com.samsung.android.messaging",
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                        // PhonePe
            "net.one97.paytm",                        // Paytm
            "in.amazon.mShop.android.shopping",       // Amazon Pay
            "com.dreamplug.androidapp",               // CRED
            "com.snapwork.hdfc",                      // HDFC
            "com.csam.icici.bank.imobile",            // ICICI
            "com.sbi.lotusintouch",                   // SBI
            "com.axis.mobile"                         // Axis
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        try {
            val pkgName = sbn.packageName ?: return
            if (!MONITORED_PACKAGES.contains(pkgName)) return

            val extras: Bundle = sbn.notification?.extras ?: return

            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

            val content = if (bigText.isNotBlank()) bigText else text
            if (content.isBlank()) return

            val sender = if (title.isNotBlank()) title else pkgName
            val timestamp = sbn.postTime.toDouble()
            val appContext = applicationContext

            backgroundExecutor.execute {
                try {
                    val db = RawSmsDatabaseHelper.getInstance(appContext)
                    db.insertRawMessage(
                        sender = sender,
                        body = content,
                        timestamp = timestamp,
                        sourcePackage = pkgName
                    )
                } catch (t: Throwable) {
                    CrashLogger.log(appContext, "NotificationListener.async", t)
                }
            }
        } catch (t: Throwable) {
            CrashLogger.log(applicationContext, "NotificationListener.onNotificationPosted", t)
        }
    }
}
