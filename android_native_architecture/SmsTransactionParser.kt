package com.aditya.homecashflow.sms

import java.text.SimpleDateFormat
import java.util.*
import java.util.regex.Pattern

/**
 * 2. BANKING SMS PARSER ENGINE
 * Pure Kotlin parsing engine for automated transaction detection from incoming SMS.
 */

data class ParsedBankTransaction(
    val amount: Double,
    val type: String, // "income" or "expense"
    val activity: String, // "operating", "investing", "financing"
    val suggestedCategoryId: String,
    val sourceAccount: String,
    val rawSender: String,
    val rawBody: String,
    val dateIso: String
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
        "PAYTM" to "Paytm Bank"
    )

    // Regex for Currency Amount: "Rs. 1,450.50", "INR 250", "₹ 5,000.00"
    private val AMOUNT_PATTERN = Pattern.compile(
        """(?:(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited|credited|paid|spent|withdrawn|received)\s*(?:by|of|for)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?))""",
        Pattern.CASE_INSENSITIVE
    )

    // Regex for Account indicator: "A/c XX1234", "Account ending 5678", "Card XX9812"
    private val ACCOUNT_PATTERN = Pattern.compile(
        """(?:a/c|acct|acc|account|card)\s*(?:no\.?)?\s*[*Xx]*([0-9]{3,4})""",
        Pattern.CASE_INSENSITIVE
    )

    // Credit indicators (Income)
    private val CREDIT_PATTERN = Pattern.compile(
        """(?:credited|received|deposited|refunded|refund)""",
        Pattern.CASE_INSENSITIVE
    )

    // Debit indicators (Expense)
    private val DEBIT_PATTERN = Pattern.compile(
        """(?:debited|spent|paid|withdrawn|sent|deducted)""",
        Pattern.CASE_INSENSITIVE
    )

    fun parse(sender: String, body: String): ParsedBankTransaction? {
        val cleanBody = body.replace("\r", " ").replace("\n", " ")

        // 1. Validate if this is a financial SMS
        val hasCurrency = cleanBody.contains("Rs", ignoreCase = true) ||
                cleanBody.contains("INR", ignoreCase = true) ||
                cleanBody.contains("₹")
        val hasAction = CREDIT_PATTERN.matcher(cleanBody).find() || DEBIT_PATTERN.matcher(cleanBody).find()

        if (!hasCurrency && !hasAction) return null

        // 2. Extract Amount
        val amountMatcher = AMOUNT_PATTERN.matcher(cleanBody)
        if (!amountMatcher.find()) return null

        val amountStr = (amountMatcher.group(1) ?: amountMatcher.group(2))
            ?.replace(",", "") ?: return null
        val amount = amountStr.toDoubleOrNull() ?: return null
        if (amount <= 0.0) return null

        // 3. Determine Flow Type (Income vs Expense)
        val isCredit = CREDIT_PATTERN.matcher(cleanBody).find()
        val type = if (isCredit) "income" else "expense"

        // 4. Extract Account Suffix
        val accountMatcher = ACCOUNT_PATTERN.matcher(cleanBody)
        val accountSuffix = if (accountMatcher.find()) {
            "A/c XX" + accountMatcher.group(1)
        } else {
            ""
        }

        // 5. Detect Bank Name from Sender
        val upperSender = sender.uppercase()
        var detectedBank = "Bank Account"
        for ((key, bank) in BANK_SENDER_MAP) {
            if (upperSender.contains(key) || cleanBody.uppercase().contains(key)) {
                detectedBank = bank
                break
            }
        }

        val sourceAccount = if (accountSuffix.isNotEmpty()) "$detectedBank ($accountSuffix)" else detectedBank

        // 6. Suggest Category & Pillar based on keywords
        val lowerBody = cleanBody.lowercase()
        var suggestedCategory = if (isCredit) "cat_salary" else "cat_groceries"
        var activity = "operating"

        when {
            lowerBody.contains("swiggy") || lowerBody.contains("zomato") || lowerBody.contains("restaurant") -> {
                suggestedCategory = "cat_dining"
                activity = "operating"
            }
            lowerBody.contains("blinkit") || lowerBody.contains("zepto") || lowerBody.contains("grocery") -> {
                suggestedCategory = "cat_groceries"
                activity = "operating"
            }
            lowerBody.contains("uber") || lowerBody.contains("ola") || lowerBody.contains("fuel") || lowerBody.contains("petrol") -> {
                suggestedCategory = "cat_transport"
                activity = "operating"
            }
            lowerBody.contains("electricity") || lowerBody.contains("billdesk") || lowerBody.contains("wifi") -> {
                suggestedCategory = "cat_utilities"
                activity = "operating"
            }
            lowerBody.contains("salary") || lowerBody.contains("payroll") -> {
                suggestedCategory = "cat_salary"
                activity = "operating"
            }
            lowerBody.contains("mutual fund") || lowerBody.contains("sip") || lowerBody.contains("zerodha") || lowerBody.contains("dividend") -> {
                suggestedCategory = "cat_invest_return"
                activity = "investing"
            }
            lowerBody.contains("emi") || lowerBody.contains("loan") || lowerBody.contains("mortgage") -> {
                suggestedCategory = "cat_mortgage_paydown"
                activity = "financing"
            }
        }

        val todayIso = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        return ParsedBankTransaction(
            amount = amount,
            type = type,
            activity = activity,
            suggestedCategoryId = suggestedCategory,
            sourceAccount = sourceAccount,
            rawSender = sender,
            rawBody = cleanBody,
            dateIso = todayIso
        )
    }
}
