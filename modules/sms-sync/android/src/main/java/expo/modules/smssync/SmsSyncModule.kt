package expo.modules.smssync

import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsSyncModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsSyncModule")

    Function("isAvailable") {
      true
    }

    Function("isNotificationAccessGranted") {
      val context = appContext.reactContext ?: return@Function false
      val packageName = context.packageName
      val flat = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      )
      flat != null && flat.contains(packageName)
    }

    Function("openNotificationSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      } else {
        Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      }
      context.startActivity(intent)
      true
    }

    AsyncFunction("readInboxMessages") { days: Int ->
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val results = mutableListOf<Map<String, Any>>()
      val safeDays = if (days <= 0) 14 else days
      val cutoff = System.currentTimeMillis() - (safeDays.toLong() * 24L * 60L * 60L * 1000L)
      val uri = Uri.parse("content://sms/inbox")

      var cursor: Cursor? = null
      try {
        val projection = arrayOf("_id", "address", "body", "date")
        val selection = "date >= ?"
        val selectionArgs = arrayOf(cutoff.toString())
        val sortOrder = "date DESC LIMIT 300"

        cursor = context.contentResolver.query(
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

            if (body.isNotBlank()) {
              results.add(
                mapOf(
                  "sender" to address,
                  "body" to body,
                  "timestamp" to date.toDouble(),
                  "sourcePackage" to "content://sms/inbox"
                )
              )
            }
          } while (cursor.moveToNext())
        }
      } catch (e: Throwable) {
        CrashLogger.log(context, "readInboxMessages", e)
      } finally {
        cursor?.close()
      }

      results
    }

    AsyncFunction("getPendingRawMessages") {
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      try {
        val db = RawSmsDatabaseHelper.getInstance(context)
        db.getUnprocessedMessages(100)
      } catch (e: Throwable) {
        CrashLogger.log(context, "getPendingRawMessages", e)
        emptyList<Map<String, Any>>()
      }
    }

    AsyncFunction("markRawMessagesProcessed") { ids: List<Int> ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      try {
        val db = RawSmsDatabaseHelper.getInstance(context)
        db.markProcessed(ids)
        true
      } catch (e: Throwable) {
        CrashLogger.log(context, "markRawMessagesProcessed", e)
        false
      }
    }

    Function("getCrashLogs") {
      val context = appContext.reactContext ?: return@Function ""
      CrashLogger.readLogs(context)
    }

    Function("clearCrashLogs") {
      val context = appContext.reactContext ?: return@Function false
      CrashLogger.clearLogs(context)
    }

    Function("logCrash") { source: String, message: String ->
      val context = appContext.reactContext ?: return@Function false
      CrashLogger.log(context, source, message)
      true
    }
  }
}
