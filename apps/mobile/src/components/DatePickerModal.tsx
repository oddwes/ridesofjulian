import { Modal, Pressable, View, StyleSheet, Platform } from 'react-native';

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, date, onChange, onClose }: DatePickerModalProps) {
  const DateTimePicker =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@react-native-community/datetimepicker').default ||
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@react-native-community/datetimepicker');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              // @ts-ignore - iOS-only prop, safe to ignore on Android
              textColor="#f9fafb"
              // @ts-ignore - iOS-only prop
              themeVariant="dark"
              onChange={(_: any, selected?: Date) => {
                if (!selected) return;
                onChange(selected);
                onClose();
              }}
            />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  datePickerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
});


