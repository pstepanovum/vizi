import { StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { CameraView } from '@/features/camera/camera-view';
import { colors, spacing, typography } from '@/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Vizi</Text>
      </View>
      <CameraView />
      <View style={styles.footer}>
        <RoundedButton
          label="Start"
          onPress={() => {
            // Voice conversation entry point — wired up in the next milestone.
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
