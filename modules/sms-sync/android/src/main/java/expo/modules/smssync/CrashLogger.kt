package expo.modules.smssync

import android.content.Context
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * CRASH LOGGER
 * Silently logs any background listener exceptions to an internal file.
 * Prevents app crashes, ANRs, or restart loops on unexpected SMS inputs.
 */
object CrashLogger {
    private const val TAG = "SmsCrashLogger"
    private const val LOG_FILE_NAME = "sms_crash_log.txt"
    private const val MAX_FILE_SIZE_BYTES = 512 * 1024 // 512 KB cap

    fun log(context: Context?, source: String, throwable: Throwable) {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        val stackTrace = sw.toString()
        log(context, source, "${throwable.message}\n$stackTrace")
    }

    @Synchronized
    fun log(context: Context?, source: String, message: String) {
        Log.e(TAG, "[$source] $message")
        if (context == null) return

        try {
            val file = File(context.filesDir, LOG_FILE_NAME)
            // Trim if file is getting too large
            if (file.exists() && file.length() > MAX_FILE_SIZE_BYTES) {
                file.delete()
            }

            val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(Date())
            val entry = "[$timestamp] [$source] $message\n----------------------------------------\n"
            file.appendText(entry)
        } catch (e: Throwable) {
            // Silently swallow file write exceptions
            Log.e(TAG, "Failed to write to crash log file: ${e.message}")
        }
    }

    @Synchronized
    fun readLogs(context: Context?): String {
        if (context == null) return ""
        return try {
            val file = File(context.filesDir, LOG_FILE_NAME)
            if (file.exists()) file.readText() else ""
        } catch (e: Throwable) {
            "Unable to read logs: ${e.message}"
        }
    }

    @Synchronized
    fun clearLogs(context: Context?): Boolean {
        if (context == null) return false
        return try {
            val file = File(context.filesDir, LOG_FILE_NAME)
            if (file.exists()) file.delete() else true
        } catch (e: Throwable) {
            false
        }
    }
}
