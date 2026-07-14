import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getCurrentUser } from "../services/authService";
import {
  getMonthlySummary,
  getSpending,
  getInvestments,
  getUserProfile,
} from "../services/firestoreService";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const ReportsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then(setProfile).catch(() => {});
  }, [user?.uid]);

  const currencyCode = profile?.currency || "KES";
  const [selectedMonth, setSelectedMonth] = useState(
    route?.params?.selectedMonth || getCurrentMonth(),
  );
  const [reportData, setReportData] = useState(null);

  const formatMonthName = (monthString) => {
    const [year, month] = monthString.split("-").map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const fmt = (val) => {
    const num = typeof val === "number" ? val : parseFloat(val) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [summary, spendings, invs] = await Promise.all([
        getMonthlySummary(user.uid, selectedMonth),
        getSpending(user.uid, selectedMonth),
        getInvestments(user.uid, selectedMonth),
      ]);
      setReportData({
        summary,
        spendings: spendings || [],
        investments: invs || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = async () => {
    if (!reportData?.summary) return;
    setPrinting(true);
    try {
      const { summary, spendings, investments } = reportData;
      const totalAllocated = summary.expensesAmount || 0;
      const totalSpent = spendings.reduce(
        (acc, s) => acc + (s.totalSpending || s.amount || 0), 0,
      );
      const totalTxnCosts = spendings.reduce(
        (acc, s) => acc + (s.transactionCosts || 0), 0,
      );
      const totalInvested = investments.reduce(
        (acc, i) => acc + (i.amount || 0), 0,
      );
      const totalInvestmentCosts = investments.reduce(
        (acc, i) => acc + (i.transactionCosts || 0), 0,
      );
      const savingsInvestments = (summary.investmentAmount || 0);
      const balance = (summary.balance || 0) - spendings
        .filter((s) => s.category === "Unallocated")
        .reduce((sum, s) => sum + (s.totalSpending || s.amount || 0), 0);

      // Category breakdown
      const categoryTotals = {};
      spendings.forEach((s) => {
        categoryTotals[s.category] = (categoryTotals[s.category] || 0) + (s.totalSpending || s.amount || 0);
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1f2937; }
              h1 { color: #059669; text-align: center; border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 5px; }
              h2 { color: #374151; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
              .header-sub { text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 14px; }
              .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0; }
              .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
              .summary-row:last-child { border-bottom: none; }
              .summary-label { color: #6b7280; }
              .summary-value { font-weight: bold; }
              .positive { color: #059669; }
              .negative { color: #dc2626; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f3f4f6; text-align: left; padding: 10px 8px; border: 1px solid #e5e7eb; font-size: 13px; }
              td { padding: 10px 8px; border: 1px solid #e5e7eb; font-size: 13px; }
              .insight-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 15px 0; }
              .insight-title { font-weight: bold; color: #92400e; margin-bottom: 8px; }
              .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>MoneyTracker Monthly Report</h1>
            <p class="header-sub">${formatMonthName(selectedMonth)} | Generated: ${new Date().toLocaleDateString()}</p>

            <div class="summary-box">
              <h2 style="margin-top:0; border:none;">Financial Summary</h2>
              <div class="summary-row">
                <span class="summary-label">Total Income</span>
                <span class="summary-value positive">${fmt(summary.income)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Expenses Allocated</span>
                <span class="summary-value">${fmt(totalAllocated)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Expenses Spent</span>
                <span class="summary-value">${fmt(totalSpent)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Remaining Expenses</span>
                <span class="summary-value ${totalAllocated - totalSpent >= 0 ? 'positive' : 'negative'}">${fmt(totalAllocated - totalSpent)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Investments Allocated</span>
                <span class="summary-value">${fmt(savingsInvestments)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Invested</span>
                <span class="summary-value">${fmt(totalInvested)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Savings/Unallocated Balance</span>
                <span class="summary-value ${balance >= 0 ? 'positive' : 'negative'}">${fmt(balance)}</span>
              </div>
            </div>

            <h2>Expense Breakdown</h2>
            <table>
              <thead>
                <tr><th>Category</th><th>Amount</th><th>% of Budget</th></tr>
              </thead>
              <tbody>
                ${Object.entries(categoryTotals).map(([cat, amount]) => `
                  <tr>
                    <td>${cat}</td>
                    <td>${fmt(amount)}</td>
                    <td>${totalAllocated > 0 ? ((amount / totalAllocated) * 100).toFixed(1) : 0}%</td>
                  </tr>
                `).join('')}
                ${Object.keys(categoryTotals).length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">No expenses recorded</td></tr>' : ''}
              </tbody>
            </table>
            <div class="summary-row" style="margin-top:10px;font-weight:bold;">
              <span>Total Expenses</span>
              <span>${fmt(totalSpent)}</span>
            </div>
            <div class="summary-row">
              <span>Transaction Costs</span>
              <span class="negative">${fmt(totalTxnCosts)}</span>
            </div>

            <h2>Investment Portfolio</h2>
            ${investments.length > 0 ? `
              <table>
                <thead>
                  <tr><th>Platform</th><th>Category</th><th>Amount</th><th>Cost</th><th>Total</th></tr>
                </thead>
                <tbody>
                  ${investments.map(inv => `
                    <tr>
                      <td>${inv.platform || 'N/A'}</td>
                      <td>${inv.category || 'N/A'}</td>
                      <td>${fmt(inv.amount)}</td>
                      <td>${fmt(inv.transactionCosts || 0)}</td>
                      <td><strong>${fmt(inv.totalInvestment || inv.amount + (inv.transactionCosts || 0))}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="summary-row" style="margin-top:10px;">
                <span>Total Invested Principal</span>
                <span>${fmt(totalInvested)}</span>
              </div>
              <div class="summary-row">
                <span>Total Transaction Costs</span>
                <span class="negative">${fmt(totalInvestmentCosts)}</span>
              </div>
            ` : '<p style="color:#9ca3af;">No investments recorded this month.</p>'}

            <div class="insight-box">
              <div class="insight-title">Financial Health Score</div>
              <p>${generateHealthSummary(summary, totalSpent, totalAllocated, savingsInvestments, balance, categoryTotals)}</p>
            </div>

            <p class="footer">Generated by MoneyTracker App — Your Personal Finance Companion</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Monthly Report",
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.tabBarActive} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>
          Generating AI Report...
        </Text>
      </View>
    );
  }

  if (!reportData?.summary) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <View
          style={[
            styles.headerContainer,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.tabBarActive}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Intelligence Report
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16, textAlign: "center" }}>
            No data found for {formatMonthName(selectedMonth)}.
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            Create a monthly record to see your report.
          </Text>
        </View>
      </View>
    );
  }

  const { summary, spendings, investments } = reportData;
  const totalAllocated = summary.expensesAmount || 0;
  const spent = spendings.reduce(
    (acc, curr) => acc + (curr.totalSpending || curr.amount || 0), 0,
  );
  const totalTxnCosts = spendings.reduce(
    (acc, curr) => acc + (curr.transactionCosts || 0), 0,
  );
  const totalInvestmentTxnCosts = investments.reduce(
    (acc, curr) => acc + (curr.transactionCosts || 0), 0,
  );
  const totalInvested = investments.reduce(
    (acc, curr) => acc + (curr.amount || 0), 0,
  );
  const savingsInvestments = (summary.investmentAmount || 0);
  const balance = (summary.balance || 0) - spendings
    .filter((s) => s.category === "Unallocated")
    .reduce((sum, s) => sum + (s.totalSpending || s.amount || 0), 0);

  // Dynamic AI recommendations
  const isOverSpent = spent > totalAllocated;
  const savingsRate = summary.income > 0 ? (savingsInvestments / summary.income) * 100 : 0;
  const expenseRate = summary.income > 0 ? (spent / summary.income) * 100 : 0;
  const investmentRate = summary.income > 0 ? (totalInvested / summary.income) * 100 : 0;

  const categoryTotals = {};
  spendings.forEach((s) => {
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + (s.totalSpending || s.amount || 0);
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const highestCategory = sortedCategories[0];
  const lowestCategory = sortedCategories[sortedCategories.length - 1];

  // Generate dynamic recommendations
  const recommendations = [];

  // Budget recommendation
  if (isOverSpent) {
    const overAmount = spent - totalAllocated;
    const overPct = totalAllocated > 0 ? ((overAmount / totalAllocated) * 100).toFixed(0) : 0;
    recommendations.push({
      icon: "alert-circle-outline",
      color: "#ef4444",
      title: "Budget Overspend",
      text: `You exceeded your expense budget by ${fmt(overAmount)} (${overPct}% over). Consider setting aside an emergency buffer next month.`,
    });
  } else {
    const underAmount = totalAllocated - spent;
    const utilization = totalAllocated > 0 ? ((spent / totalAllocated) * 100).toFixed(0) : 0;
    recommendations.push({
      icon: "checkmark-circle-outline",
      color: "#10b981",
      title: "Budget On Track",
      text: `You utilized ${utilization}% of your expense budget with ${fmt(underAmount)} remaining. ${utilization < 70 ? "You have room to allocate more to savings or investments." : "Good discipline — keep it up!"}`,
    });
  }

  // Savings recommendation
  if (savingsRate >= 20) {
    recommendations.push({
      icon: "trending-up-outline",
      color: "#10b981",
      title: "Strong Savings Rate",
      text: `Your savings/investment rate is ${savingsRate.toFixed(1)}% of income. This meets the recommended 20% threshold for long-term financial health.`,
    });
  } else if (savingsRate > 0) {
    const gap = 20 - savingsRate;
    recommendations.push({
      icon: "trending-up-outline",
      color: "#f59e0b",
      title: "Room to Save More",
      text: `Currently saving ${savingsRate.toFixed(1)}% of income. Aim for 20% by reducing "${highestCategory?.[0] || "miscellaneous"}" spending by ${fmt(summary.income * (gap / 100))}.`,
    });
  } else {
    recommendations.push({
      icon: "warning-outline",
      color: "#ef4444",
      title: "No Savings Allocated",
      text: `No income allocated to savings or investments this month. Even 10% (${fmt(summary.income * 0.1)}) makes a significant difference over time.`,
    });
  }

  // Expense concentration
  if (highestCategory) {
    const [catName, catAmount] = highestCategory;
    const catPct = totalAllocated > 0 ? ((catAmount / totalAllocated) * 100).toFixed(0) : 0;
    if (parseInt(catPct) > 40) {
      recommendations.push({
        icon: "pie-chart-outline",
        color: "#f59e0b",
        title: "High Expense Concentration",
        text: `"${catName}" accounts for ${catPct}% of total expenses (${fmt(catAmount)}). Diversifying spending can reduce financial risk.`,
      });
    }
  }

  // Investment recommendation
  if (investmentRate < 10 && summary.income > 0) {
    recommendations.push({
      icon: "wallet-outline",
      color: "#8b5cf6",
      title: "Increase Investments",
      text: `Only ${investmentRate.toFixed(1)}% of income went to investments. Even small consistent amounts compound significantly over time.`,
    });
  } else if (investmentRate >= 10) {
    recommendations.push({
      icon: "wallet-outline",
      color: "#10b981",
      title: "Investment Progress",
      text: `You invested ${investmentRate.toFixed(1)}% of income this month. ${investmentRate >= 20 ? "Excellent — you're building wealth aggressively." : "Keep increasing this toward 20%."}`,
    });
  }

  // Transaction costs
  if (totalTxnCosts > 0) {
    const costPct = spent > 0 ? ((totalTxnCosts / spent) * 100).toFixed(1) : 0;
    recommendations.push({
      icon: "receipt-outline",
      color: "#f59e0b",
      title: "Transaction Costs",
      text: `Transaction fees total ${fmt(totalTxnCosts)} (${costPct}% of spending). Look for ways to minimize fees — they erode your budget silently.`,
    });
  }

  // Balance health
  if (balance > 0) {
    recommendations.push({
      icon: "shield-checkmark-outline",
      color: "#10b981",
      title: "Healthy Unallocated Balance",
      text: `You have ${fmt(balance)} in unallocated funds. Consider directing this toward debt repayment or investments.`,
    });
  } else if (balance < 0) {
    recommendations.push({
      icon: "alert-circle-outline",
      color: "#ef4444",
      title: "Negative Balance",
      text: `Unallocated funds are ${fmt(Math.abs(balance))} below zero. Review recent unallocated spending to avoid overspending.`,
    });
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        style={[
          styles.headerContainer,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.tabBarActive}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Insights & Reports
        </Text>
        <TouchableOpacity
          onPress={handlePrint}
          disabled={printing}
          style={{ padding: 8 }}
        >
          {printing ? (
            <ActivityIndicator size="small" color={theme.colors.tabBarActive} />
          ) : (
            <Ionicons
              name="print-outline"
              size={22}
              color={theme.colors.tabBarActive}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: theme.colors.text,
            marginBottom: 16,
          }}
        >
          {formatMonthName(selectedMonth)}
        </Text>

        {/* Dynamic AI Recommendations */}
        <View
          style={[
            styles.insightCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="bulb-outline"
              size={24}
              color="#f59e0b"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: theme.colors.text,
              }}
            >
              AI Recommendations
            </Text>
          </View>
          {recommendations.map((rec, idx) => (
            <View key={idx} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Ionicons name={rec.icon} size={16} color={rec.color} style={{ marginRight: 6 }} />
                <Text style={{ fontWeight: "600", color: theme.colors.text, fontSize: 13 }}>
                  {rec.title}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginLeft: 22 }}>
                {rec.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Income Statement */}
        <View
          style={[
            styles.sectionBlock,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Income Statement
          </Text>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>
              Total Verified Income
            </Text>
            <Text style={{ color: "#10b981", fontWeight: "bold" }}>
              {fmt(summary.income)}
            </Text>
          </View>
          {summary.incomeSources && summary.incomeSources.length > 0 && (
            <>
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 }]}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: "600" }}>Income Sources</Text>
              </View>
              {summary.incomeSources.map((src, idx) => (
                <View key={idx} style={[styles.row, { marginBottom: 4 }]}>
                  <Text style={{ color: theme.colors.textSecondary, marginLeft: 8 }}>{src.name}</Text>
                  <Text style={{ color: theme.colors.text }}>{fmt(src.amount || 0)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Expenditures Matrix */}
        <View
          style={[
            styles.sectionBlock,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Expenditures Matrix
          </Text>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Maximum Allocation</Text>
            <Text style={{ color: theme.colors.text }}>{fmt(totalAllocated)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Logged Spending</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "bold" }}>{fmt(spent)}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, marginTop: 12 }]}>
            <Text style={{ color: theme.colors.textSecondary, fontWeight: "bold" }}>Cash Available</Text>
            <Text style={{ color: totalAllocated - spent >= 0 ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
              {fmt(totalAllocated - spent)}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={{ color: theme.colors.textSecondary }}>Total Transaction Costs</Text>
            <Text style={{ color: "#ef4444" }}>{fmt(totalTxnCosts)}</Text>
          </View>
          {sortedCategories.length > 0 && (
            <>
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 8 }]}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: "600" }}>By Category</Text>
              </View>
              {sortedCategories.map(([cat, amount]) => (
                <View key={cat} style={[styles.row, { marginBottom: 4 }]}>
                  <Text style={{ color: theme.colors.textSecondary, marginLeft: 8 }}>{cat}</Text>
                  <Text style={{ color: theme.colors.text }}>{fmt(amount)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Capital Investments */}
        <View
          style={[
            styles.sectionBlock,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Capital Investments
          </Text>
          {investments.length > 0 && (
            <View style={[styles.row, { marginBottom: 12 }]}>
              <Text style={{ color: theme.colors.textSecondary }}>Investment Transaction Costs</Text>
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{fmt(totalInvestmentTxnCosts)}</Text>
            </View>
          )}
          {investments.length > 0 ? (
            investments.map((inv, idx) => (
              <View key={idx} style={[styles.row, { marginBottom: 8 }]}>
                <View>
                  <Text style={{ color: theme.colors.textSecondary }}>{inv.platform}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Cost: {fmt(inv.transactionCosts || 0)}</Text>
                </View>
                <Text style={{ color: theme.colors.tabBarActive, fontWeight: "600" }}>
                  {fmt(inv.totalInvestment || inv.amount + (inv.transactionCosts || 0))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.colors.textSecondary }}>No investments recorded this month.</Text>
          )}
        </View>

        {/* Savings & Unallocated */}
        <View
          style={[
            styles.sectionBlock,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Savings & Unallocated
          </Text>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Unallocated Balance</Text>
            <Text style={{ color: balance >= 0 ? "#10b981" : "#ef4444", fontWeight: "bold" }}>{fmt(balance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary }}>Savings/Investment Allocation</Text>
            <Text style={{ color: theme.colors.text }}>{fmt(savingsInvestments)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const generateHealthSummary = (summary, totalSpent, totalAllocated, savingsInvestments, balance, categoryTotals) => {
  const income = summary.income || 0;
  if (income === 0) return "No income data to assess financial health.";

  const expenseRate = income > 0 ? (totalSpent / income) * 100 : 0;
  const savingsRate = income > 0 ? (savingsInvestments / income) * 100 : 0;
  const utilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  let score = 0;
  let factors = [];

  // Budget adherence (30 points)
  if (utilization <= 100) { score += 30; factors.push("stayed within budget"); }
  else if (utilization <= 110) { score += 15; factors.push("slightly over budget"); }

  // Savings rate (30 points)
  if (savingsRate >= 20) { score += 30; factors.push(`${savingsRate.toFixed(0)}% savings rate`); }
  else if (savingsRate >= 10) { score += 15; factors.push(`${savingsRate.toFixed(0)}% savings rate`); }

  // Expense to income ratio (20 points)
  if (expenseRate <= 50) { score += 20; }
  else if (expenseRate <= 70) { score += 10; }

  // Unallocated balance (20 points)
  if (balance > 0) { score += 20; }
  else if (balance === 0) { score += 10; }

  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  let grade = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Improvement";
  let emoji = score >= 80 ? "🌟" : score >= 60 ? "✅" : score >= 40 ? "⚠️" : "📉";

  return `${emoji} Financial Health: ${grade} (${score}/100). ${factors.length > 0 ? "Key strengths: " + factors.join(", ") + "." : ""} Total cash flow: ${income > 0 ? fmt(income - totalSpent) : "N/A"}.`;
};

const fmt = (val) => {
  const num = typeof val === "number" ? val : parseFloat(val) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(num);
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: { flexDirection: "row", alignItems: "center", padding: 16 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  insightCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionBlock: { padding: 16, borderRadius: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
});

export default ReportsScreen;
