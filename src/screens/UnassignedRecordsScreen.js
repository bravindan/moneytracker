import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import IOSSpinner from "../components/IOSSpinner";
import { getCurrentUser } from "../services/authService";
import {
  getWallets,
  ensureDefaultWallets,
  getUnassignedRecords,
  assignWalletToRecords,
  getUserProfile,
} from "../services/firestoreService";

const recordKey = (record) => `${record.recordType}:${record.id}`;

const recordTitle = (record) =>
  record.itemName || record.platform || record.category || "Record";

const recordAmount = (record) =>
  record.totalSpending ?? record.totalInvestment ?? record.amount ?? 0;

const UnassignedRecordsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const uid = user?.uid;

  const [records, setRecords] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selected, setSelected] = useState({});
  const [targetWalletId, setTargetWalletId] = useState(null);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currencyCode = profile?.currency || "KES";
  const fmt = (amount) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      await ensureDefaultWallets(uid);
      const [allWallets, unassigned, prof] = await Promise.all([
        getWallets(uid),
        getUnassignedRecords(uid),
        getUserProfile(uid),
      ]);
      const list = unassigned || [];
      setWallets(allWallets || []);
      setRecords(list);
      setProfile(prof);
      setSelected(
        list.reduce((acc, record) => ({ ...acc, [recordKey(record)]: true }), {}),
      );
    } catch (error) {
      console.error("Failed to load records without an account:", error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRecords = records.filter((record) => selected[recordKey(record)]);
  const targetWallet = (wallets || []).find((w) => w.id === targetWalletId) || null;
  const allSelected = records.length > 0 && selectedRecords.length === records.length;

  const toggleRecord = (record) =>
    setSelected((prev) => ({
      ...prev,
      [recordKey(record)]: !prev[recordKey(record)],
    }));

  const toggleAll = () =>
    setSelected(
      records.reduce(
        (acc, record) => ({ ...acc, [recordKey(record)]: !allSelected }),
        {},
      ),
    );

  const performAssign = async () => {
    setSaving(true);
    try {
      await assignWalletToRecords(uid, selectedRecords, targetWallet);
      const walletName = targetWallet.name;
      setTargetWalletId(null);
      await load();
      Alert.alert("Success", `Records now count against ${walletName}.`);
    } catch (error) {
      console.error("Failed to assign records:", error);
      Alert.alert("Error", "Could not assign the records.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = () => {
    if (!selectedRecords.length) {
      Alert.alert("Required", "Select at least one record to assign.");
      return;
    }
    if (!targetWallet) {
      Alert.alert(
        "Required",
        "Choose the account these records should count against.",
      );
      return;
    }
    Alert.alert(
      "Assign Records",
      `Count ${selectedRecords.length} record${selectedRecords.length === 1 ? "" : "s"} (${fmt(
        selectedRecords.reduce((sum, record) => sum + recordAmount(record), 0),
      )}) against ${targetWallet.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Assign", onPress: performAssign },
      ],
    );
  };

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
          Records Without Account
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <IOSSpinner size={40} color={theme.colors.tabBarActive} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="checkmark-circle-outline"
            size={48}
            color={theme.colors.tabBarActive}
          />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Every record counts against an account.
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Nothing to assign.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            These records were saved before accounts existed, so they don't
            reduce any account balance yet. Pick the account they should count
            against.
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll}>
              <Ionicons
                name={allSelected ? "checkbox" : "square-outline"}
                size={22}
                color={allSelected ? theme.colors.tabBarActive : theme.colors.textSecondary}
              />
              <Text style={[styles.selectAllText, { color: theme.colors.text }]}>
                {allSelected ? "Clear all" : "Select all"}
              </Text>
              <Text style={[styles.selectAllCount, { color: theme.colors.textSecondary }]}>
                {selectedRecords.length}/{records.length}
              </Text>
            </TouchableOpacity>

            {records.map((record) => {
              const isSelected = !!selected[recordKey(record)];
              return (
                <TouchableOpacity
                  key={recordKey(record)}
                  style={[styles.recordRow, { borderTopColor: theme.colors.border }]}
                  onPress={() => toggleRecord(record)}
                >
                  <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={22}
                    color={isSelected ? theme.colors.tabBarActive : theme.colors.textSecondary}
                  />
                  <View style={styles.recordInfo}>
                    <Text
                      style={[styles.recordTitle, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {recordTitle(record)}
                    </Text>
                    <Text
                      style={[styles.recordMeta, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {record.recordType === "investment" ? "Investment" : "Spending"}
                      {record.month ? ` · ${record.month}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={[styles.recordAmount, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {fmt(recordAmount(record))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>
            Count against
          </Text>
          <TouchableOpacity
            style={[styles.pickerField, { borderColor: theme.colors.border }]}
            onPress={() => setShowWalletPicker(true)}
          >
            <Text
              style={{
                color: targetWallet ? theme.colors.text : theme.colors.textSecondary,
                fontSize: 15,
              }}
            >
              {targetWallet?.name || "Select account"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.assignButton,
              {
                backgroundColor: theme.colors.tabBarActive,
                opacity: saving || !selectedRecords.length || !targetWallet ? 0.5 : 1,
              },
            ]}
            onPress={handleAssign}
            disabled={saving}
          >
            {saving ? (
              <IOSSpinner size={20} color="#fff" />
            ) : (
              <Text style={styles.assignButtonText}>
                Assign {selectedRecords.length} record
                {selectedRecords.length === 1 ? "" : "s"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal
        visible={showWalletPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWalletPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Count Against
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(wallets || []).map((wallet) => {
                const isSelected = wallet.id === targetWalletId;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    style={styles.walletOption}
                    onPress={() => {
                      setTargetWalletId(wallet.id);
                      setShowWalletPicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.walletOptionName, { color: theme.colors.text }]}>
                        {wallet.name}
                      </Text>
                      <Text
                        style={[styles.walletOptionMeta, { color: theme.colors.textSecondary }]}
                      >
                        {wallet.type === "credit"
                          ? `Credit · Remaining ${fmt(wallet.remaining || 0)}`
                          : "Account"}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.tabBarActive}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: theme.colors.border }]}
              onPress={() => setShowWalletPicker(false)}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 16, textAlign: "center", lineHeight: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
  },
  selectAllText: { fontSize: 15, fontWeight: "600", flex: 1 },
  selectAllCount: { fontSize: 13 },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  recordInfo: { flex: 1 },
  recordTitle: { fontSize: 15, fontWeight: "500" },
  recordMeta: { fontSize: 12, marginTop: 2 },
  recordAmount: { fontSize: 14, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  assignButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  assignButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  walletOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  walletOptionName: { fontSize: 15, fontWeight: "500" },
  walletOptionMeta: { fontSize: 12, marginTop: 2 },
  modalCancel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
});

export default UnassignedRecordsScreen;
