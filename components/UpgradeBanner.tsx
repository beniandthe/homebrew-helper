import { Pressable, StyleSheet, View } from 'react-native';

import { BodyText, Label } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';

type UpgradeBannerProps = {
    title?: string;
    message: string;
    buttonLabel?: string;
    onPress: () => void;
};

export function UpgradeBanner({
    title = 'Upgrade to Pro',
    message,
    buttonLabel = 'Upgrade',
    onPress,
}: UpgradeBannerProps) {
    return (
        <View style={styles.container}>
            <View style={styles.copyBlock}>
                <Label>{title}</Label>
                <BodyText>{message}</BodyText>
            </View>

            <Pressable style={styles.button} onPress={onPress}>
                <Label style={styles.buttonText}>{buttonLabel}</Label>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.elevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    copyBlock: {
        gap: 4,
    },
    button: {
        backgroundColor: '#6d28d9',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
    },
});