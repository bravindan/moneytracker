import React from "react";
import { View, StyleSheet } from "react-native";
import IOSSpinner from "./IOSSpinner";

const LoadingOverlay = ({ size = 40, color = "#10b981", style }) => {
  return (
    <View style={[styles.container, style]}>
      <IOSSpinner size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default LoadingOverlay;
