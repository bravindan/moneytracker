import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import CustomAlert from './CustomAlert';

let globalAlertRef = null;

export const setAlertRef = (ref) => { globalAlertRef = ref; };

export const overrideAlert = () => {
  const originalAlert = Alert.alert;
  Alert.alert = (title, message, buttons) => {
    if (globalAlertRef) {
      if (!buttons || buttons.length === 0) {
        buttons = [{ text: 'OK', onPress: () => {} }];
      }
      globalAlertRef(title, message, buttons);
    } else {
      originalAlert(title, message, buttons);
    }
  };
};

export const GlobalAlertComponent = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '', buttons: [] });

  useEffect(() => {
    setAlertRef((title, message, buttons) => {
      setConfig({ title, message, buttons });
      setVisible(true);
    });
    overrideAlert();
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <CustomAlert
      visible={visible}
      title={config.title}
      message={config.message}
      buttons={config.buttons.map(btn => ({
        ...btn,
        text: btn.text || 'OK',
        onPress: () => {
          handleClose();
          if (btn.onPress) btn.onPress();
        }
      }))}
      onClose={handleClose}
    />
  );
};
