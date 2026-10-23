package expo.modules.smssync

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * RAW SMS DATABASE HELPER
 * Ultra-lightweight, zero-dependency SQLiteOpenHelper that immediately
 * persists raw messages upon receipt. Completely isolated from the main thread
 * and React Native runtime.
 */
class RawSmsDatabaseHelper(context: Context) : SQLiteOpenHelper(
    context.applicationContext,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {
    companion object {
        private const val DATABASE_NAME = "raw_sms_cache.db"
        private const val DATABASE_VERSION = 1

        const val TABLE_NAME = "raw_sms_inbox"
        const val COL_ID = "id"
        const val COL_SENDER = "sender"
        const val COL_BODY = "body"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_SOURCE_PACKAGE = "source_package"
        const val COL_CREATED_AT = "created_at"
        const val COL_PROCESSED = "processed"

        @Volatile
        private var instance: RawSmsDatabaseHelper? = null

        fun getInstance(context: Context): RawSmsDatabaseHelper {
            return instance ?: synchronized(this) {
                instance ?: RawSmsDatabaseHelper(context.applicationContext).also { instance = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_NAME (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_SENDER TEXT NOT NULL,
                $COL_BODY TEXT NOT NULL,
                $COL_TIMESTAMP REAL NOT NULL,
                $COL_SOURCE_PACKAGE TEXT,
                $COL_CREATED_AT INTEGER NOT NULL,
                $COL_PROCESSED INTEGER DEFAULT 0
            );
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_processed ON $TABLE_NAME($COL_PROCESSED);")
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_created_at ON $TABLE_NAME($COL_CREATED_AT);")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Safe forward migration
    }

    /**
     * Non-blocking raw message insertion
     */
    @Synchronized
    fun insertRawMessage(sender: String, body: String, timestamp: Double, sourcePackage: String?): Long {
        return try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put(COL_SENDER, sender)
                put(COL_BODY, body)
                put(COL_TIMESTAMP, timestamp)
                put(COL_SOURCE_PACKAGE, sourcePackage ?: "content://sms")
                put(COL_CREATED_AT, System.currentTimeMillis())
                put(COL_PROCESSED, 0)
            }
            db.insert(TABLE_NAME, null, values)
        } catch (e: Throwable) {
            e.printStackTrace()
            -1L
        }
    }

    /**
     * Retrieve unprocessed messages
     */
    @Synchronized
    fun getUnprocessedMessages(limit: Int = 100): List<Map<String, Any>> {
        val results = mutableListOf<Map<String, Any>>()
        var cursor: Cursor? = null
        try {
            val db = readableDatabase
            cursor = db.query(
                TABLE_NAME,
                arrayOf(COL_ID, COL_SENDER, COL_BODY, COL_TIMESTAMP, COL_SOURCE_PACKAGE, COL_CREATED_AT),
                "$COL_PROCESSED = 0",
                null,
                null,
                null,
                "$COL_CREATED_AT ASC",
                limit.toString()
            )

            if (cursor != null && cursor.moveToFirst()) {
                val idIdx = cursor.getColumnIndex(COL_ID)
                val senderIdx = cursor.getColumnIndex(COL_SENDER)
                val bodyIdx = cursor.getColumnIndex(COL_BODY)
                val tsIdx = cursor.getColumnIndex(COL_TIMESTAMP)
                val pkgIdx = cursor.getColumnIndex(COL_SOURCE_PACKAGE)
                val createdIdx = cursor.getColumnIndex(COL_CREATED_AT)

                do {
                    val id = if (idIdx != -1) cursor.getInt(idIdx) else 0
                    val sender = if (senderIdx != -1) cursor.getString(senderIdx) ?: "" else ""
                    val body = if (bodyIdx != -1) cursor.getString(bodyIdx) ?: "" else ""
                    val ts = if (tsIdx != -1) cursor.getDouble(tsIdx) else 0.0
                    val pkg = if (pkgIdx != -1) cursor.getString(pkgIdx) ?: "" else ""
                    val created = if (createdIdx != -1) cursor.getLong(createdIdx) else 0L

                    results.add(
                        mapOf(
                            "id" to id,
                            "sender" to sender,
                            "body" to body,
                            "timestamp" to ts,
                            "sourcePackage" to pkg,
                            "createdAt" to created.toDouble()
                        )
                    )
                } while (cursor.moveToNext())
            }
        } catch (e: Throwable) {
            e.printStackTrace()
        } finally {
            cursor?.close()
        }
        return results
    }

    /**
     * Mark messages as processed so they are not parsed again
     */
    @Synchronized
    fun markProcessed(ids: List<Int>) {
        if (ids.isEmpty()) return
        try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put(COL_PROCESSED, 1)
            }
            val placeholders = ids.joinToString(",") { "?" }
            val args = ids.map { it.toString() }.toTypedArray()
            db.update(TABLE_NAME, values, "$COL_ID IN ($placeholders)", args)
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    /**
     * Clean up ancient processed records to prevent unbounded database growth
     */
    @Synchronized
    fun pruneOldProcessed(maxAgeDays: Int = 30) {
        try {
            val db = writableDatabase
            val cutoff = System.currentTimeMillis() - (maxAgeDays.toLong() * 24L * 60L * 60L * 1000L)
            db.delete(TABLE_NAME, "$COL_PROCESSED = 1 AND $COL_CREATED_AT < ?", arrayOf(cutoff.toString()))
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }
}
