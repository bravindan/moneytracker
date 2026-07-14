import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  getInvestments,
  getMonthlySummary,
  getUserProfile,
} from "../services/firestoreService";
import { Table, Row, Rows } from "react-native-table-component";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const InvestmentsDetailScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  ); // YYYY-MM format

  const user = getCurrentUser();
  const uid = user?.uid;
  const [profile, setProfile] = useState(null);

  // Fetch profile for currency
  useEffect(() => {
    if (!uid) return;
    getUserProfile(uid).then(setProfile).catch(() => {});
  }, [uid]);

  const currencyCode = profile?.currency || "KES";
  const fmt = (amount) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(num);
  };

  useEffect(() => {
    if (uid) {
      loadInvestments();
      loadMonthlyData();
    }
  }, [uid, selectedMonth]);

  const loadMonthlyData = async () => {
    try {
      const monthlyData = await getMonthlySummary(uid, selectedMonth);
      // Use same calculation as dashboard: savingsAmount + investmentAmount
      const savingsInvestments =
        (monthlyData?.savingsAmount || 0) +
        (monthlyData?.investmentAmount || 0);
      setAllocatedAmount(savingsInvestments);
    } catch (error) {
      console.error("Failed to load monthly data:", error);
      setAllocatedAmount(0);
    }
  };

  const loadInvestments = async () => {
    try {
      const data = await getInvestments(uid, selectedMonth);
      setInvestments(data || []);
    } catch (error) {
      console.error("Failed to load investments:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadInvestments(), loadMonthlyData()]);
    setRefreshing(false);
  }, [uid, selectedMonth]);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalTransactionCosts = investments.reduce(
    (sum, inv) => sum + (inv.transactionCosts || 0),
    0,
  );
  const totalOutlay = investments.reduce(
    (sum, inv) =>
      sum + (inv.totalInvestment || inv.amount + (inv.transactionCosts || 0)),
    0,
  );

  const getInvestmentPercentage = (amount) => {
    if (allocatedAmount <= 0) return 0;
    return ((amount / allocatedAmount) * 100).toFixed(1);
  };

  const generatePDF = async () => {
    try {
      const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = dateString.toDate
          ? dateString.toDate()
          : new Date(dateString);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };

      const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      // Generate HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .summary { margin-bottom: 30px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: #f8fafc; }
            .summary-label { font-weight: 600; }
            .summary-value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
            td { padding: 10px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Investment Summary Report</div>
            <div class="subtitle">Generated on ${currentDate}</div>
          </div>
          
          <div class="summary">
            <h3>Investment Summary</h3>
            <div class="summary-row">
              <span class="summary-label">Total Invested:</span>
              <span class="summary-value">${fmt(totalInvested)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Transaction Costs:</span>
              <span class="summary-value">${fmt(totalTransactionCosts)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Outlay:</span>
              <span class="summary-value">${fmt(totalOutlay)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Allocated Amount:</span>
              <span class="summary-value">${fmt(allocatedAmount)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Number of Investments:</span>
              <span class="summary-value">${investments.length}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Remaining:</span>
              <span class="summary-value">${fmt(Math.max(0, allocatedAmount - totalOutlay))}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Investment Rate:</span>
              <span class="summary-value">${allocatedAmount > 0 ? Math.round((totalOutlay / allocatedAmount) * 100) : 0}%</span>
            </div>
          </div>
          
          <h3>Investment Details</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Platform</th>
                <th>Amount (${currencyCode})</th>
                <th>Cost (${currencyCode})</th>
                <th>Date</th>
                <th>% of Allocated</th>
              </tr>
            </thead>
            <tbody>
              ${investments
                .map((investment) => {
                  const totalInvestment =
                    investment.totalInvestment ||
                    investment.amount + (investment.transactionCosts || 0);
                  const percentage = getInvestmentPercentage(totalInvestment);
                  return `
                  <tr>
                    <td>${investment.category || "N/A"}</td>
                    <td>${investment.platform || "N/A"}</td>
                    <td>${fmt(investment.amount)}</td>
                    <td>${fmt(investment.transactionCosts || 0)}</td>
                    <td>${formatDate(investment.createdAt)}</td>
                    <td>${percentage}%</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This is an automated investment summary report from MoneyTracker App</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Investment Summary PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF. Please try again.");
    }
  };

  // Prepare table data
  const tableHead = [
    "Category",
    "Platform",
    `Amount (${currencyCode})`,
    `Cost (${currencyCode})`,
    "Date",
  ];

  const tableData = investments.map((investment) => {
    const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      // Handle Firebase timestamp or ISO string
      const date = dateString.toDate
        ? dateString.toDate()
        : new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    return [
      investment.category || "",
      investment.platform || "",
      investment.amount.toLocaleString(),
      (investment.transactionCosts || 0).toLocaleString(),
      formatDate(investment.createdAt),
    ];
  });

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <Text style={{ color: theme.colors.textSecondary }}>
          Loading investments...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.colors.tabBarActive}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Investment Summary
        </Text>
        <TouchableOpacity
          style={[styles.pdfButton, { borderColor: theme.colors.border }]}
          onPress={generatePDF}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.colors.tabBarActive}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.tabBarActive} />
        }
      >
        {/* Summary */}
        <View
          style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}
        >
          <Text
            style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}
          >
            Investment Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Total Invested:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {fmt(totalInvested)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Transaction Costs:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {fmt(totalTransactionCosts)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Total Outlay:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {fmt(totalOutlay)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Allocated Amount:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {fmt(allocatedAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Number of Investments:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {investments.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Remaining:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {fmt(Math.max(0, allocatedAmount - totalInvested))}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Investment Rate:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {allocatedAmount > 0
                ? Math.round((totalOutlay / allocatedAmount) * 100)
                : 0}
              %
            </Text>
          </View>
        </View>

        {/* Investments */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Investment Platforms
        </Text>
        {investments.length > 0 ? (
          <View style={styles.tableContainer}>
            <Table borderStyle={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Row
                data={tableHead}
                style={[
                  styles.tableHead,
                  { backgroundColor: theme.colors.card },
                ]}
                textStyle={[
                  styles.headText,
                  { color: theme.colors.textSecondary },
                ]}
              />
              <Rows
                data={tableData}
                style={[
                  styles.tableRow,
                  { backgroundColor: theme.colors.card },
                ]}
                textStyle={[styles.rowText, { color: theme.colors.text }]}
              />
            </Table>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="wallet-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}
            >
              No investments yet
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textSecondary },
              ]}
            >
              Start by adding your first investment
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  pdfButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  scrollContainer: {
    padding: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  listContainer: {
    marginTop: 8,
  },
  tableContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHead: {
    height: 40,
    backgroundColor: "#f1f5f9",
  },
  tableRow: {
    height: 35,
  },
  headText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  rowText: {
    fontSize: 11,
    textAlign: "left",
    paddingLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});

export default InvestmentsDetailScreen;
