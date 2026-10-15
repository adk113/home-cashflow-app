package com.aditya.homecashflow.data.local

import android.content.Context
import androidx.room.*
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * 1. HYBRID ROOM DATABASE SCHEMA
 * Supports manual ledger entries, cellular SMS captures, Google Messages RCS,
 * Truecaller alerts, and cross-source deduplication.
 */

enum class EntryMode {
    MANUAL,
    AUTOMATED
}

enum class TransactionType {
    INCOME,
    EXPENSE
}

enum class AccountingActivity {
    OPERATING,
    INVESTING,
    FINANCING
}

@Entity(
    tableName = "transactions",
    indices = [
        Index(value = ["date"]),
        Index(value = ["activity"]),
        Index(value = ["type"]),
        Index(value = ["entry_mode"])
    ]
)
data class TransactionEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "amount")
    val amount: Double,

    @ColumnInfo(name = "type")
    val type: String, // "income" or "expense"

    @ColumnInfo(name = "activity")
    val activity: String, // "operating", "investing", "financing"

    @ColumnInfo(name = "category_id")
    val categoryId: String,

    @ColumnInfo(name = "date")
    val date: String, // ISO "YYYY-MM-DD"

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "entry_mode", defaultValue = "'MANUAL'")
    val entryMode: String = "MANUAL",

    @ColumnInfo(name = "source_account", defaultValue = "'Cash'")
    val sourceAccount: String = "Cash",

    @ColumnInfo(name = "source_app")
    val sourceApp: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "pending_sms_queue",
    indices = [
        Index(value = ["detected_at"]),
        Index(value = ["hash"])
    ]
)
data class PendingSmsEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,

    @ColumnInfo(name = "sender")
    val sender: String, // e.g. "VM-HDFCBK"

    @ColumnInfo(name = "body")
    val body: String, // Raw SMS / Notification text

    @ColumnInfo(name = "amount")
    val amount: Double,

    @ColumnInfo(name = "type")
    val type: String, // "income" or "expense"

    @ColumnInfo(name = "activity")
    val activity: String,

    @ColumnInfo(name = "suggested_category_id")
    val suggestedCategoryId: String,

    @ColumnInfo(name = "source_account")
    val sourceAccount: String, // e.g. "HDFC Bank (A/c XX4521)"

    @ColumnInfo(name = "date")
    val date: String,

    @ColumnInfo(name = "detected_at")
    val detectedAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "source_app")
    val sourceApp: String? = "carrier_sms", // "google_messages", "truecaller", "carrier_sms", "bank_apps"

    @ColumnInfo(name = "hash")
    val hash: String = "" // canonical fingerprint for deduplication
)

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY date DESC, created_at DESC")
    suspend fun getAllTransactions(): List<TransactionEntity>

    @Query("SELECT * FROM transactions WHERE date BETWEEN :startDate AND :endDate ORDER BY date DESC")
    suspend fun getTransactionsByDateRange(startDate: String, endDate: String): List<TransactionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity)

    @Update
    suspend fun updateTransaction(transaction: TransactionEntity)

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM transactions WHERE id IN (:ids)")
    suspend fun deleteBatch(ids: List<String>)

    @Query("DELETE FROM transactions")
    suspend fun clearAll()
}

@Dao
interface PendingSmsDao {
    @Query("SELECT * FROM pending_sms_queue ORDER BY detected_at DESC")
    suspend fun getPendingQueue(): List<PendingSmsEntity>

    @Query("SELECT * FROM pending_sms_queue WHERE hash = :hash LIMIT 1")
    suspend fun getPendingByHash(hash: String): PendingSmsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueueSms(pending: PendingSmsEntity)

    @Query("DELETE FROM pending_sms_queue WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM pending_sms_queue")
    suspend fun clearQueue()
}

@Database(
    entities = [TransactionEntity::class, PendingSmsEntity::class],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun pendingSmsDao(): PendingSmsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "cashflow_app.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
