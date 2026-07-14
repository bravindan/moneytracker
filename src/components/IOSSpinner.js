import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";

const IOSSpinner = ({ size = 40, color = "#999", strokeWidth = 3 }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Create arc segments (iOS-style has 12 segments that fade)
  const segments = 12;
  const segmentElements = [];

  for (let i = 0; i < segments; i++) {
    const opacity = (i + 1) / segments;
    segmentElements.push(
      <View
        key={i}
        style={{
          position: "absolute",
          width: strokeWidth,
          height: size * 0.25,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          top: 0,
          left: size / 2 - strokeWidth / 2,
          opacity,
          transformOrigin: `center ${size / 2}px`,
          transform: [{ rotate: `${(360 / segments) * i}deg` }],
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            transform: [{ rotate }],
          },
        ]}
      >
        {segmentElements}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    position: "relative",
  },
});

export default IOSSpinner;
