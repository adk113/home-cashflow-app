package com.aditya.homecashflow.sms

import java.text.SimpleDateFormat
import java.util.*
import java.util.regex.Pattern

/**
 * 2. BANKING SMS & NOTIFICATION PARSER ENGINE
 * Pure Kotlin parsing engine supporting Google Messages (RCS), Truecaller,
 * Carrier cellular SMS, and UPI direct notifications.
 */

data class ParsedBankTransaction(
    val amount: Double,
    val type: String, // "income" or "expense"
    val activity: String, // "operating", "investing", "financing"
    val suggestedCategoryId: String,
    val sourceAccount: String,
    val rawSender: String,
    val rawBody: String,
    val dateIso: String,
    val sourceApp: String,
    val hash: String
)

object SmsTransactionParser {

    private val BANK_SENDER_MAP = mapOf(
        "HDFC" to "HDFC Bank",
        "SBI" to "SBI Bank",
        "ICICI" to "ICICI Bank",
        "AXIS" to "Axis Bank",
        "KOTAK" to "Kotak Bank",
        "PNB" to "Punjab National Bank",
        "YESB" to "Yes Bank",
        "BOB" to "Bank of Baroda",
        "CANARA" to "Canara Bank",
        "IDFC" to "IDFC First Bank",
        "PAYTM" to "Paytm Bank",
        "PHONEPE" to "PhonePe UPI",
        "GPAY" to "Google Pay"
    )

    // Regex for Currency Amount: "Rs. 1,450.50", "INR 250", "₹ 5,000.00", "paid 450"
    private val AMOUNT_PATTERN = Pattern.compile(
        """(?:(?:rs\.?|inr|₹|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received|sent)\s*(?:by|of|for)?\s*(?:rs\.?|inr|₹|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?))""",
        Pattern.CASE_INSENSITIVE
    )

    // Regex for Account indicator: "A/c XX1234", "Account ending 5678", "Card XX9812"
    private val ACCOUNT_PATTERN = Pattern.compile(
        """(?:a/c|acct|acc|account|card)\s*(?:no\.?)?\s*[*Xx]*([0-9]{3,4})""",
        Pattern.CASE_INSENSITIVE
    )

    // Credit indicators (Income)
    private val CREDIT_PATTERN = Pattern.compile(
        """(?:credited|received|deposited|refunded|refund|cashback|salary)""",
        Pattern.CASE_INSENSITIVE
    )

    // Debit indicators (Expense)
    private val DEBIT_PATTERN = Pattern.compile(
        """(?:debited|spent|paid|withdrawn|sent|deducted|charged)""",
        Pattern.CASE_INSENSITIVE
    )

    // Category Keyword Rules
    private val CATEGORY_RULES = listOf(
        Pair(listOf("swiggy", "zomato", "restaurant", "cafe", "starbucks", "mcdonald", "eats"), Pair("cat_dining", "operating")),
        Pair(listOf("blinkit", "zepto", "instamart", "bigbasket", "grocery", "dmart"), Pair("cat_groceries", "operating")),
        Pair(listOf("uber", "ola", "fuel", "petrol", "diesel", "fastag", "metro"), Pair("cat_transport", "operating")),
        Pair(listOf("electricity", "bescom", "water", "gas", "billdesk", "wifi", "broadband"), Pair("cat_utilities", "operating")),
        Pair(listOf("pharmacy", "apollo", "medplus", "1mg", "hospital"), Pair("cat_healthcare", "operating")),
        Pair(listOf("salary", "payroll", "stipend", "wages", "remuneration"), Pair("cat_salary", "operating")),
        Pair(listOf("dividend", "mutual fund", "zerodha", "groww", "sip"), Pair("cat_invest_return", "investing")),
        Pair(listOf("emi", "loan", "mortgage", "credit card payment"), Pair("cat_mortgage_paydown", "financing"))
    )

    fun parse(sender: String, body: String, sourceApp: String = "carrier_sms"): ParsedBankTransaction? {
        val cleanBody = body.replace("\n", " ").trim()
        val lowerBody = cleanBody.lowercase(Locale.ROOT)
        val upperSender = sender.uppercase(Locale.ROOT)

        // 1. Amount Extraction
        val amountMatcher = AMOUNT_PATTERN.matcher(cleanBody)
        if (!amountMatcher.find()) return null

        val rawAmountStr = (amountMatcher.group(1) ?: amountMatcher.group(2) ?: "").replace(",", "")
        val amount = rawAmountStr.toDoubleOrNull() ?: return null
        if (amount <= 0.0) return null

        // 2. Type Extraction (Income vs Expense)
        val type = when {
            CREDIT_PATTERN.matcher(lowerBody).find() -> "income"
            DEBIT_PATTERN.matcher(lowerBody).find() -> "expense"
            else -> return null // Ambiguous, not a transaction alert
        }

        // 3. Account Extraction
        val accountMatcher = ACCOUNT_PATTERN.matcher(cleanBody)
        val accountSuffix = if (accountMatcher.find()) {
            "A/c XX" + accountMatcher.group(1)
        } else {
            ""
        }

        // 4. Bank Name
        var bankName = "Bank Account"
        for ((key, name) in BANK_SENDER_MAP) {
            if (upperSender.contains(key) || cleanBody.uppercase(Locale.ROOT).contains(key)) {
                bankName = name
                break
            }
        }
        val sourceAccount = if (accountSuffix.isNotBlank()) "$bankName ($accountSuffix)" else bankName

        // 5. Category & Activity
        var suggestedCategoryId = if (type == "income") "cat_salary" else "cat_groceries"
        var activity = "operating"

        for (rule in CATEGORY_RULES) {
            val keywords = rule.first
            if (keywords.any { lowerBody.contains(it) }) {
                suggestedCategoryId = rule.second.first
                activity = rule.second.second
                break
            }
        }

        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val dateIso = sdf.format(Date())

        // 6. Generate canonical deduplication hash
        val normAccount = sourceAccount.lowercase(Locale.ROOT).replace(Regex("[^a-z0-9]"), "")
        val normAmount = Math.round(amount * 100)
        val hash = "tx_${type}_${normAmount}_${normAccount.take(16)}_$dateIso"

        return ParsedBankTransaction(
            amount = amount,
            type = type,
            activity = activity,
            suggestedCategoryId = suggestedCategoryId,
            sourceAccount = sourceAccount,
            rawSender = sender,
            rawBody = cleanBody,
            dateIso = dateIso,
            sourceApp = sourceApp,
            hash = hash
        )
    }
}
