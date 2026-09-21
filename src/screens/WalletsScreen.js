import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import IOSSpinner from "../components/IOSSpinner";
import { getCurrentUser } from "../services/authService";
import {
  getWallets,
  ensureDefaultWallets,
  addWallet,
  deleteWallet,
  repayCredit,
  getMonthlySummary,
  updateMonthlySummary,
  getSpending,
  getInvestments,
  getUnassignedRecords,
  getUserProfile,
} from "../services/firestoreService";
import { useFocusEffect } from "@react-navigation/native";

const WalletsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const uid = user?.uid;
  const selectedMonth = route?.params?.selectedMonth || new Date().toISOString().slice(0, 7);

  const walletButtonRefs = React.useRef({}).current;

  const [wallets, setWallets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthSpending, setMonthSpending] = useState([]);
  const [monthInvestments, setMonthInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [menuWalletId, setMenuWalletId] = useState(null);
  const [menuPositionY, setMenuPositionY] = useState(0);
  const [repayWallet, setRepayWallet] = useState(null);
  const [transferFrom, setTransferFrom] = useState(null);
  const [transferToId, setTransferToId] = useState(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadWallets = useCallback(async () => {
    if (!uid) return;
    try {
      await ensureDefaultWallets(uid);
      const [all, prof, summary, spending, investments, unassigned] =
        await Promise.all([
          getWallets(uid),
          getUserProfile(uid),
          getMonthlySummary(uid, selectedMonth),
          getSpending(uid, selectedMonth),
          getInvestments(uid, selectedMonth),
          getUnassignedRecords(uid),
        ]);
      setWallets(all);
      setProfile(prof);
      setMonthlySummary(summary);
      setMonthSpending(spending || []);
      setMonthInvestments(investments || []);
      setUnassignedCount((unassigned || []).length);
    } catch (error) {
      console.error("Failed to load wallets:", error);
    } finally {
      setLoading(false);
    }
  }, [uid, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadWallets();
    }, [loadWallets]),
  );

  const handleAddCredit = async () => {
    const limit = parseFloat(newLimit);
    if (!newName.trim()) {
      Alert.alert("Required", "Please enter a name for the credit account.");
      return;
    }
    if (!limit || limit <= 0) {
      Alert.alert("Required", "Please enter a valid credit limit.");
      return;
    }
    setSaving(true);
    try {
      await addWallet(uid, { name: newName.trim(), limit });
      setShowAddModal(false);
      setNewName("");
      setNewLimit("");
      await loadWallets();
      Alert.alert("Success", "Credit account added.");
    } catch (error) {
      console.error("Failed to add credit:", error);
      Alert.alert("Error", "Could not add credit account.");
    } finally {
      setSaving(false);
    }
  };

  const handleRepay = async () => {
    const amount = parseFloat(repayAmount);
    if (!repayWallet || !amount || amount <= 0) {
      Alert.alert("Required", "Please enter a valid repayment amount.");
      return;
    }
    setSaving(true);
    try {
      await repayCredit(uid, repayWallet.id, amount);
      setShowRepayModal(false);
      setRepayAmount("");
      setRepayWallet(null);
      await loadWallets();
      Alert.alert("Success", "Repayment recorded.");
    } catch (error) {
      console.error("Failed to repay credit:", error);
      Alert.alert("Error", "Could not record repayment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (wallet) => {
    Alert.alert(
      "Delete Account",
      `Delete ${wallet.name}? Existing spending records will keep their wallet reference but this account will no longer appear.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWallet(uid, wallet.id);
              await loadWallets();
            } catch (error) {
              console.error("Failed to delete wallet:", error);
              Alert.alert("Error", "Could not delete account.");
            }
          },
        },
      ],
    );
  };

  const openTransfer = (wallet) => {
    setTransferFrom(wallet);
    setTransferToId(null);
    setTransferAmount("");
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferToId) {
      Alert.alert("Required", "Please select the account to transfer to.");
      return;
    }
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Required", "Please enter a valid amount.");
      return;
    }
    const fromStats = walletStats[transferFrom.id] || { balance: 0 };
    if (amount > fromStats.balance) {
      Alert.alert(
        "Insufficient Balance",
        `You can't transfer ${fmt(amount)} — ${transferFrom.name} only has ${fmt(fromStats.balance)}.`,
      );
      return;
    }
    const toWallet = (wallets || []).find((w) => w.id === transferToId);
    if (!toWallet) return;

    setSaving(true);
    try {
      // Adjust the funded amounts of both wallets in the monthly record,
      // and recompute each entry's percentage relative to monthly income so
      // the record screen's wallet funding shows matching figures.
      const income = monthlySummary?.income || 0;
      const existingFunding = Array.isArray(monthlySummary?.walletFunding)
        ? monthlySummary.walletFunding
        : [];
      const getEntry = (walletId) =>
        existingFunding.find((f) => f.walletId === walletId) || {
          walletId,
          name: (wallets || []).find((w) => w.id === walletId)?.name || "Account",
          amount: 0,
          percent: 0,
          mode: "amount",
        };
      const fromEntry = getEntry(transferFrom.id);
      const toEntry = getEntry(transferToId);
      const fromAmount = Math.max(0, (fromEntry.amount || 0) - amount);
      const toAmount = (toEntry.amount || 0) + amount;
      const toPercent = income > 0 ? (toAmount / income) * 100 : 0;
      const fromPercent = income > 0 ? (fromAmount / income) * 100 : 0;
      const nextFunding = existingFunding
        .filter((f) => f.walletId !== transferFrom.id && f.walletId !== transferToId)
        .concat([
          {
            ...fromEntry,
            amount: fromAmount,
            percent: Math.round(fromPercent * 100) / 100,
            mode: "amount",
          },
          {
            ...toEntry,
            amount: toAmount,
            percent: Math.round(toPercent * 100) / 100,
            mode: "amount",
          },
        ]);
      await updateMonthlySummary(uid, selectedMonth, { walletFunding: nextFunding });
      setShowTransferModal(false);
      setTransferFrom(null);
      setTransferToId(null);
      setTransferAmount("");
      await loadWallets();
      Alert.alert("Success", `Transferred ${fmt(amount)} to ${toWallet.name}.`);
    } catch (error) {
      console.error("Failed to transfer:", error);
      Alert.alert("Error", "Could not complete the transfer.");
    } finally {
      setSaving(false);
    }
  };

  const assetWallets = wallets.filter((w) => w.type === "asset");
  const creditWallets = wallets.filter((w) => w.type === "credit");

  const currencyCode = profile?.currency || "KES";
  const fmt = (amount) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Per-wallet month stats:
  // asset: funded (from monthly summary walletFunding) − spent (from month spending + investments)
  // Only records explicitly tied to a wallet count toward that wallet's "Used";
  // legacy records without a walletId are not attributed to any account.
  const walletStats = (() => {
    const fundingMap = {};
    (monthlySummary?.walletFunding || []).forEach((f) => {
      fundingMap[f.walletId] = f.amount || 0;
    });
    const walletIds = new Set(assetWallets.map((w) => w.id));
    const spentByWallet = {};
    (monthSpending || []).forEach((s) => {
      if (!s.walletId || !walletIds.has(s.walletId)) return;
      spentByWallet[s.walletId] =
        (spentByWallet[s.walletId] || 0) + (s.totalSpending || s.amount || 0);
    });
    (monthInvestments || []).forEach((inv) => {
      if (!inv.walletId || !walletIds.has(inv.walletId)) return;
      spentByWallet[inv.walletId] =
        (spentByWallet[inv.walletId] || 0) + (inv.totalInvestment || inv.amount || 0);
    });
    const stats = {};
    assetWallets.forEach((w) => {
      const funded = fundingMap[w.id] || 0;
      const spent = spentByWallet[w.id] || 0;
      stats[w.id] = { total: funded, used: spent, balance: funded - spent };
    });
    return stats;
  })();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Accounts
        </Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={{ padding: 8 }}>
          <Ionicons name="add" size={26} color={theme.colors.tabBarActive} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <IOSSpinner size={40} color={theme.colors.tabBarActive} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your money across cash, mobile money, cards, and credit.
          </Text>

          {unassignedCount > 0 && (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.tabBarActive,
                },
              ]}
              onPress={() => navigation.navigate("UnassignedRecords")}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name="link-outline"
                  size={22}
                  color={theme.colors.tabBarActive}
                />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {unassignedCount} record{unassignedCount === 1 ? "" : "s"} without an account
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </View>
              <Text
                style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}
              >
                They aren't reducing any balance yet. Assign them to an account.
              </Text>
            </TouchableOpacity>
          )}

          {/* Asset wallets */}
          {assetWallets.map((w) => {
            const stats = walletStats[w.id] || { total: 0, used: 0, balance: 0 };
            const pct = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;
            const iconName =
              w.name === "Mobile Money"
                ? "phone-portrait-outline"
                : w.name === "Cash"
                  ? "cash-outline"
                  : "card-outline";
            return (
              <View key={w.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name={iconName} size={22} color={theme.colors.tabBarActive} />
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                    {w.name}
                  </Text>
                  <TouchableOpacity
                    ref={(ref) => {
                      if (ref && w.id) walletButtonRefs[w.id] = ref;
                    }}
                    onPress={() => {
                      walletButtonRefs[w.id]?.measureInWindow((x, y) => {
                        setMenuPositionY(y);
                        setMenuWalletId(w.id);
                      });
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: theme.colors.tabBarActive, width: `${Math.min(100, pct)}%` },
                    ]}
                  />
                </View>
                <View style={styles.statsRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Total {fmt(stats.total)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    Used {fmt(stats.used)}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: stats.balance >= 0 ? "#10b981" : "#ef4444", fontWeight: "600" },
                    ]}
                  >
                    Bal {fmt(stats.balance)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Credit wallets */}
          {creditWallets.length > 0 && (
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Credit Accounts
            </Text>
          )}
          {creditWallets.map((w) => {
            const used = w.used || 0;
            const limit = w.limit || 0;
            const remaining = w.remaining || 0;
            const pct = limit > 0 ? (used / limit) * 100 : 0;
            return (
              <View key={w.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="card-outline" size={22} color={theme.colors.tabBarActive} />
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                    {w.name}
                  </Text>
                  <TouchableOpacity
                    ref={(ref) => {
                      if (ref && w.id) walletButtonRefs[w.id] = ref;
                    }}
                    onPress={() => {
                      walletButtonRefs[w.id]?.measureInWindow((x, y) => {
                        setMenuPositionY(y);
                        setMenuWalletId(w.id);
                      });
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: pct > 90 ? "#ef4444" : theme.colors.tabBarActive, width: `${Math.min(100, pct)}%` },
                    ]}
                  />
                </View>
                <View style={styles.creditRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Used</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>
                    {used.toLocaleString()} / {limit.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.creditRow}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Remaining</Text>
                  <Text style={{ color: remaining > 0 ? "#10b981" : "#ef4444", fontSize: 12, fontWeight: "600" }}>
                    {remaining.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.repayButton, { backgroundColor: theme.colors.tabBarActive }]}
                  onPress={() => {
                    setRepayWallet(w);
                    setRepayAmount("");
                    setShowRepayModal(true);
                  }}
                >
                  <Text style={styles.repayButtonText}>Repay</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {creditWallets.length === 0 && (
            <TouchableOpacity
              style={[styles.addCreditCard, { borderColor: theme.colors.border }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.tabBarActive} />
              <Text style={{ color: theme.colors.tabBarActive, fontWeight: "600" }}>
                Add a credit account
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Add Credit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add Credit Account
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                Track borrowed money (e.g. bank loan, credit card, friend).
              </Text>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="e.g. Credit Card, Bank Loan"
                placeholderTextColor={theme.colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
              <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 12 }]}>Credit Limit *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={newLimit}
                onChangeText={setNewLimit}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
                  onPress={handleAddCredit}
                  disabled={saving}
                >
                  {saving ? (
                    <IOSSpinner size={18} color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Repay Modal */}
      <Modal
        visible={showRepayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRepayModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Repay {repayWallet?.name || "Credit"}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                Remaining: {(repayWallet?.remaining || 0).toLocaleString()}
              </Text>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={repayAmount}
                onChangeText={setRepayAmount}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                  onPress={() => setShowRepayModal(false)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
                  onPress={handleRepay}
                  disabled={saving}
                >
                  {saving ? (
                    <IOSSpinner size={18} color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Repay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Wallet Action Menu (overlay dropdown like the record menu) */}
      <Modal
        visible={menuWalletId !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuWalletId(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          activeOpacity={1}
          onPress={() => setMenuWalletId(null)}
        >
          <View
            style={[
              styles.walletMenu,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                top: menuPositionY,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.walletMenuItem}
              onPress={() => {
                const w = (wallets || []).find((x) => x.id === menuWalletId);
                setMenuWalletId(null);
                if (w) openTransfer(w);
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.tabBarActive} />
              <Text style={[styles.walletMenuText, { color: theme.colors.text }]}>Transfer</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
            <TouchableOpacity
              style={styles.walletMenuItem}
              onPress={() => {
                const w = (wallets || []).find((x) => x.id === menuWalletId);
                setMenuWalletId(null);
                if (w) handleDelete(w);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.walletMenuText, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Transfer from {transferFrom?.name || "Account"}
              </Text>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                To *
              </Text>
              <View style={{ marginBottom: 16 }}>
                {(wallets || [])
                  .filter((w) => w.id !== transferFrom?.id)
                  .map((w) => {
                    const isSelected = w.id === transferToId;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: isSelected
                            ? theme.colors.tabBarActive + "15"
                            : theme.colors.background,
                        }}
                        onPress={() => setTransferToId(w.id)}
                      >
                        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "600" }}>
                          {w.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.tabBarActive} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={transferAmount}
                onChangeText={setTransferAmount}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                  onPress={() => setShowTransferModal(false)}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: saving ? theme.colors.textSecondary : theme.colors.tabBarActive }]}
                  onPress={handleTransfer}
                  disabled={saving}
                >
                  {saving ? (
                    <IOSSpinner size={18} color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Transfer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: "center" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    flex: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  creditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  repayButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  repayButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  addCreditCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  walletMenu: {
    position: "absolute",
    right: 16,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  walletMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  walletMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default WalletsScreen;
