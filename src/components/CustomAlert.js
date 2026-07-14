import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  const { theme } = useTheme();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <View style={styles.alertHeader}>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>{title}</Text>
          </View>
          
          {/* Content */}
          <View style={styles.alertContent}>
            <Text style={[styles.alertMessage, { color: theme.colors.textSecondary }]}>{message}</Text>
          </View>
          
          {/* Buttons */}
          <View style={styles.alertButtons}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertButton,
                  button.style === 'cancel' ? styles.cancelButton : styles.confirmButton,
                  { backgroundColor: button.style === 'cancel' ? theme.colors.background : theme.colors.tabBarActive }
                ]}
                onPress={() => {
                  onClose();
                  button.onPress && button.onPress();
                }}
              >
                <Text style={[
                  styles.alertButtonText,
                  { color: button.style === 'cancel' ? theme.colors.tabBarActive : '#ffffff' }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    borderRadius: 14,
    width: screenWidth * 0.85,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  alertHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  alertContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  alertMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  alertButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert;
