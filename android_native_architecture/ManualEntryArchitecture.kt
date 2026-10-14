package com.aditya.homecashflow.ui.transaction

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aditya.homecashflow.data.local.AccountingActivity
import com.aditya.homecashflow.data.local.EntryMode
import com.aditya.homecashflow.data.local.TransactionDao
import com.aditya.homecashflow.data.local.TransactionEntity
import com.aditya.homecashflow.data.local.TransactionType
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * ANDROID NATIVE ARCHITECTURE: MANUAL ENTRY WITH FLEXIBLE BANK/SMS SELECTION
 *
 * Problem Solved:
 * Manual entries should NOT be locked to entry_mode = "MANUAL" and "Cash".
 * When a bank or UPI transaction occurred where SMS was NOT triggered (missed SMS,
 * server delay, offline transaction), the user enters it manually and can explicitly tag
 * it as an AUTOMATED/Bank transaction from a specific account.
 */

// 1. UI State for Manual Transaction Form
data class ManualEntryUiState(
    val amount: Double = 0.0,
    val type: TransactionType = TransactionType.EXPENSE,
    val activity: AccountingActivity = AccountingActivity.OPERATING,
    val categoryId: String = "",
    val date: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
    val notes: String = "",
    val entryMode: EntryMode = EntryMode.MANUAL, // Can be MANUAL or AUTOMATED
    val sourceAccount: String = "Cash",           // e.g. "Cash", "HDFC Bank", "SBI UPI"
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null
)

// 2. ViewModel managing business logic, bank auto-sync & persistence
class ManualEntryViewModel(
    private val transactionDao: TransactionDao,
    private val context: Context
) : ViewModel() {

    private val prefs = context.getSharedPreferences("home_cashflow_prefs", Context.MODE_PRIVATE)

    private val _uiState = MutableStateFlow(
        ManualEntryUiState(
            // Restore last used account & mode so user doesn't have to re-select every time
            sourceAccount = prefs.getString("last_source_account", "Cash") ?: "Cash",
            entryMode = EntryMode.valueOf(prefs.getString("last_entry_mode", EntryMode.MANUAL.name) ?: EntryMode.MANUAL.name)
        )
    )
    val uiState: StateFlow<ManualEntryUiState> = _uiState.asStateFlow()

    fun setAmount(amount: Double) {
        _uiState.update { it.copy(amount = amount) }
    }

    fun setType(type: TransactionType) {
        _uiState.update { it.copy(type = type) }
    }

    fun setCategory(categoryId: String, activity: AccountingActivity) {
        _uiState.update { it.copy(categoryId = categoryId, activity = activity) }
    }

    /**
     * User explicitly toggles between Manual (Cash/Personal) and Bank/Electronic (Missed SMS).
     */
    fun setEntryMode(mode: EntryMode) {
        _uiState.update { current ->
            val updatedAccount = if (mode == EntryMode.AUTOMATED && current.sourceAccount.equals("Cash", ignoreCase = true)) {
                "HDFC Bank" // Default to bank when automated is selected
            } else if (mode == EntryMode.MANUAL && !current.sourceAccount.equals("Cash", ignoreCase = true)) {
                current.sourceAccount // Keep or allow custom
            } else {
                current.sourceAccount
            }
            current.copy(entryMode = mode, sourceAccount = updatedAccount)
        }
    }

    /**
     * When user taps an Account Chip (e.g., Cash, HDFC, SBI, UPI):
     * - Tapping "Cash" auto-sets mode to EntryMode.MANUAL
     * - Tapping any Bank or UPI auto-sets mode to EntryMode.AUTOMATED
     */
    fun setSourceAccount(account: String) {
        _uiState.update { current ->
            val inferredMode = if (account.equals("Cash", ignoreCase = true)) {
                EntryMode.MANUAL
            } else {
                EntryMode.AUTOMATED // Bank transactions tagged as AUTOMATED even when entered manually
            }
            current.copy(sourceAccount = account, entryMode = inferredMode)
        }
    }

    fun setNotes(notes: String) {
        _uiState.update { it.copy(notes = notes) }
    }

    fun saveTransaction(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.amount <= 0.0) {
            _uiState.update { it.copy(errorMessage = "Please enter an amount greater than 0") }
            return
        }
        if (state.categoryId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please select a category") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                val entity = TransactionEntity(
                    id = "tx_${UUID.randomUUID()}",
                    amount = state.amount,
                    type = state.type.name.lowercase(),
                    activity = state.activity.name.lowercase(),
                    categoryId = state.categoryId,
                    date = state.date,
                    notes = state.notes.ifBlank { null },
                    entryMode = state.entryMode.name,      // "MANUAL" or "AUTOMATED"
                    sourceAccount = state.sourceAccount,    // e.g. "HDFC Bank", "Cash", "UPI"
                    createdAt = System.currentTimeMillis()
                )

                transactionDao.insertTransaction(entity)

                // Persist preferred account & mode for seamless next entry
                prefs.edit()
                    .putString("last_source_account", state.sourceAccount)
                    .putString("last_entry_mode", state.entryMode.name)
                    .apply()

                onSuccess()
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.localizedMessage, isSubmitting = false) }
            }
        }
    }
}

/**
 * 3. BottomSheet Dialog Fragment presenting the Dual Entry & Account Selector
 */
class AddTransactionBottomSheet : BottomSheetDialogFragment() {

    // View references
    private lateinit var toggleEntryMode: MaterialButtonToggleGroup
    private lateinit var chipGroupAccounts: ChipGroup
    private lateinit var editCustomAccount: TextInputEditText
    private lateinit var editAmount: TextInputEditText

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate fragment_add_transaction_bottom_sheet.xml
        return super.onCreateView(inflater, container, savedInstanceState)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // 1. Entry Mode Toggle Listener
        toggleEntryMode.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (isChecked) {
                // val mode = if (checkedId == R.id.btn_mode_auto) EntryMode.AUTOMATED else EntryMode.MANUAL
                // viewModel.setEntryMode(mode)
            }
        }

        // 2. ChipGroup Account Selection Listener
        chipGroupAccounts.setOnCheckedStateChangeListener { group, checkedIds ->
            if (checkedIds.isNotEmpty()) {
                val chip = group.findViewById<Chip>(checkedIds.first())
                val accountName = chip.tag as? String ?: chip.text.toString()
                // viewModel.setSourceAccount(accountName)
            }
        }
    }
}
