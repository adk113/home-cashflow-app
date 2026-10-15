package com.aditya.homecashflow.sms

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import java.util.*

/**
 * REACT NATIVE BRIDGE MODULE (SmsSyncModule)
 * Exposes native device SMS querying, Notification access verification,
 * and deep-linking to Android Special App Access settings.
 */
class SmsContentReaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsSyncModule"
    }

    /**
     * Checks if Home CashFlow has been granted Android Notification Access
     * (Required for Google Messages RCS and Truecaller)
     */
    @ReactMethod
    fun isNotificationAccessGranted(promise: Promise) {
        try {
            val packageName = reactContext.packageName
            val flat = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners"
            )
            val isEnabled = flat != null && flat.contains(packageName)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ERR_NOTIF_CHECK", e.message)
        }
    }

    /**
     * Directs the user to Android Settings -> Special App Access -> Notification Access
     */
    @ReactMethod
    fun openNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        } else {
            Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        }
        reactContext.startActivity(intent)
    }

    /**
     * Reads recent cellular SMS from Android Telephony database (content://sms/inbox)
     */
    @ReactMethod
    fun readMessagesFromSource(params: ReadableMap, promise: Promise) {
        val days = if (params.hasKey("days")) params.getInt("days") else 7
        val cutoffTimestamp = System.currentTimeMillis() - (days * 24L * 60L * 60L * 1000L)

        val results = Arguments.createArray()
        val uri = Uri.parse("content://sms/inbox")

        var cursor: Cursor? = null
        try {
            val projection = arrayOf("_id", "address", "body", "date")
            val selection = "date >= ?"
            val selectionArgs = arrayOf(cutoffTimestamp.toString())
            val sortOrder = "date DESC LIMIT 100"

            cursor = reactContext.contentResolver.query(
                uri,
                projection,
                selection,
                selectionArgs,
                sortOrder
            )

            if (cursor != null && cursor.moveToFirst()) {
                val addressIdx = cursor.getColumnIndex("address")
                val bodyIdx = cursor.getColumnIndex("body")
                val dateIdx = cursor.getColumnIndex("date")

                do {
                    val address = if (addressIdx != -1) cursor.getString(addressIdx) ?: "" else ""
                    val body = if (bodyIdx != -1) cursor.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx != -1) cursor.getLong(dateIdx) else 0L

                    val map = Arguments.createMap()
                    map.putString("sender", address)
                    map.putString("body", body)
                    map.putDouble("timestamp", date.toDouble())
                    map.putString("sourcePackage", "com.android.mms")

                    results.pushMap(map)
                } while (cursor.moveToNext())
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("ERR_READ_SMS", e.message)
        } finally {
            cursor?.close()
        }
    }
}
